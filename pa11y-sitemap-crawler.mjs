#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import xml2js from 'xml2js';
import pa11y from 'pa11y';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { program } from 'commander';
import cheerio from 'cheerio';
import { URL } from 'url';
import { stringify } from 'csv-stringify/sync';

let isShuttingDown = false;
let results = {
    pa11y: [],
    lighthouse: [],
    internalLinks: [],
    contentAnalysis: [],
    orphanedUrls: new Set()
};

function debug(message) {
    // console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`);
}

debug('Script started');

const pa11yOptions = {
    timeout: 60000,
    wait: 2000,
    ignore: [
        'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2',
        'css-parsing-error',
        'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.A.EmptyNoId',
        'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail'
    ],
    viewport: {
        width: 1280,
        height: 1024
    },
    chromeLaunchConfig: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-gpu',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-extensions'
        ],
        ignoreHTTPSErrors: true
    }
};

const lighthouseOptions = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['seo'],
    chromeFlags: ['--headless']
};

const axiosInstance = axios.create({
    headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
});

function fixUrl(url) {
    return url.replace(/([^:]\/)\/+/g, "$1");
}

async function fetchAndParseSitemap(url) {
    debug(`Fetching sitemap from: ${url}`);
    try {
        const response = await axiosInstance.get(url);
        debug('Sitemap fetched successfully');
        const parser = new xml2js.Parser();
        debug('Parsing sitemap XML');
        const result = await parser.parseStringPromise(response.data);
        debug('Sitemap parsed successfully');
        return result;
    } catch (error) {
        console.error(`Error fetching or parsing sitemap from ${url}:`, error.message);
        throw error;
    }
}

async function extractUrls(parsedXml) {
    if (parsedXml.sitemapindex) {
        debug('Found a sitemap index. Processing nested sitemaps...');
        const sitemapUrls = parsedXml.sitemapindex.sitemap.map(sitemap => fixUrl(sitemap.loc[0]));
        let allUrls = [];
        for (const sitemapUrl of sitemapUrls) {
            if (isShuttingDown) break;
            debug(`Processing nested sitemap: ${sitemapUrl}`);
            try {
                const nestedParsedXml = await fetchAndParseSitemap(sitemapUrl);
                const nestedUrls = await extractUrls(nestedParsedXml);
                allUrls = allUrls.concat(nestedUrls);
            } catch (error) {
                console.error(`Error processing nested sitemap ${sitemapUrl}:`, error.message);
            }
        }
        return allUrls;
    } else if (parsedXml.urlset) {
        debug('Extracting URLs from sitemap');
        return parsedXml.urlset.url.map(url => fixUrl(url.loc[0]));
    } else {
        throw new Error('Unknown sitemap format');
    }
}

async function runLighthouse(testUrl, opts, config = null) {
    debug(`Running Lighthouse for: ${testUrl}`);
    const chrome = await chromeLauncher.launch({chromeFlags: opts.chromeFlags});
    opts.port = chrome.port;
    try {
        const runnerResult = await lighthouse(testUrl, opts, config);
        debug(`Lighthouse completed for: ${testUrl}`);
        return JSON.parse(runnerResult.report);
    } catch (error) {
        console.error(`Lighthouse error for ${testUrl}:`, error.message);
        return null;
    } finally {
        await chrome.kill();
    }
}

async function getInternalLinks(pageUrl, baseUrl) {
    debug(`Fetching internal links from: ${pageUrl}`);
    try {
        const response = await axiosInstance.get(pageUrl);
        const $ = cheerio.load(response.data);
        const links = new Set();

        $('a').each((i, element) => {
            const href = $(element).attr('href');
            if (href) {
                const absoluteUrl = new URL(href, baseUrl).href;
                if (absoluteUrl.startsWith(baseUrl)) {
                    links.add(fixUrl(absoluteUrl));
                }
            }
        });

        debug(`Found ${links.size} internal links on: ${pageUrl}`);
        return Array.from(links);
    } catch (error) {
        console.error(`Error fetching internal links from ${pageUrl}:`, error.message);
        return [];
    }
}

async function analyzeContent(pageUrl) {
    debug(`Analyzing content of: ${pageUrl}`);
    try {
        const response = await axiosInstance.get(pageUrl);
        const $ = cheerio.load(response.data);

        const title = $('title').text();
        const metaDescription = $('meta[name="description"]').attr('content');
        const h1 = $('h1').first().text();
        const wordCount = $('body').text().trim().split(/\s+/).length;

        const headings = {};
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(h => {
            headings[h] = $(h).length;
        });

        // Simple keyword extraction (top 5 most frequent words)
        const words = $('body').text().toLowerCase().match(/\b\w+\b/g);
        const wordFrequency = {};
        words.forEach(word => {
            if (word.length > 3) {  // Ignore short words
                wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            }
        });
        const keywords = Object.entries(wordFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(entry => entry[0]);

        debug(`Content analysis completed for: ${pageUrl}`);
        return {
            title,
            metaDescription,
            h1,
            wordCount,
            headings,
            keywords
        };
    } catch (error) {
        console.error(`Error analyzing content of ${pageUrl}:`, error.message);
        return null;
    }
}

async function runTestsOnSitemap(sitemapUrl, outputDir, limit = -1) {
    debug(`Starting process for sitemap: ${sitemapUrl}`);
    debug(`Results will be saved to: ${outputDir}`);

    try {
        await fs.mkdir(outputDir, { recursive: true });
        debug(`Output directory created: ${outputDir}`);

        const parsedXml = await fetchAndParseSitemap(sitemapUrl);
        debug('Sitemap fetched and parsed successfully');

        const urls = await extractUrls(parsedXml);
        debug(`Found ${urls.length} URLs in sitemap`);

        const urlsToTest = limit === -1 ? urls : urls.slice(0, limit);
        const totalTests = urlsToTest.length;
        debug(`Testing ${totalTests} URLs${limit === -1 ? ' (all URLs)' : ''}`);

        const baseUrl = new URL(urlsToTest[0]).origin;
        const sitemapUrls = new Set(urls);

        // Ensure results object is properly initialized
        results = {
            pa11y: [],
            lighthouse: [],
            internalLinks: [],
            contentAnalysis: [],
            orphanedUrls: new Set()
        };

        for (let i = 0; i < urlsToTest.length; i++) {
            if (isShuttingDown) break;
            const testUrl = fixUrl(urlsToTest[i]);
            debug(`Testing: ${testUrl} (${i + 1}/${totalTests})`);
            try {
                debug(`Running pa11y for: ${testUrl}`);
                const pa11yResult = await pa11y(testUrl, pa11yOptions);
                results.pa11y.push({ url: testUrl, issues: pa11yResult.issues });
                debug(`pa11y completed for: ${testUrl}`);

                debug(`Running Lighthouse for: ${testUrl}`);
                const lighthouseResult = await runLighthouse(testUrl, lighthouseOptions);
                if (lighthouseResult && lighthouseResult.categories && lighthouseResult.categories.seo) {
                    results.lighthouse.push({ url: testUrl, seo: lighthouseResult.categories.seo });
                } else {
                    results.lighthouse.push({ url: testUrl, error: 'Lighthouse failed or returned unexpected results' });
                }
                debug(`Lighthouse completed for: ${testUrl}`);

                debug(`Getting internal links for: ${testUrl}`);
                const internalLinks = await getInternalLinks(testUrl, baseUrl);
                results.internalLinks.push({ url: testUrl, links: internalLinks });
                debug(`Internal links retrieved for: ${testUrl}`);

                debug(`Analyzing content for: ${testUrl}`);
                const contentAnalysis = await analyzeContent(testUrl);
                if (contentAnalysis) {
                    results.contentAnalysis.push({ url: testUrl, ...contentAnalysis });
                } else {
                    results.contentAnalysis.push({ url: testUrl, error: 'Content analysis failed' });
                }
                debug(`Content analysis completed for: ${testUrl}`);

                internalLinks.forEach(link => {
                    if (!sitemapUrls.has(link) && !link.endsWith('.pdf')) {
                        results.orphanedUrls.add(link);
                    }
                });

                debug(`Completed testing: ${testUrl}`);
            } catch (error) {
                console.error(`Error testing ${testUrl}:`, error.message);
                ['pa11y', 'lighthouse', 'internalLinks', 'contentAnalysis'].forEach(report => {
                    results[report].push({ url: testUrl, error: error.message });
                });
            }
            await new Promise(resolve => setTimeout(resolve, 2000));  // Wait 2 seconds between requests
        }

        await saveResults(results, outputDir);
        return results;
    } catch (error) {
        console.error('Error in runTestsOnSitemap:', error.message);
        console.error('Error details:', error.stack);
        // Attempt to save partial results if an error occurs
        try {
            await saveResults(results, outputDir);
            debug('Partial results saved due to error');
        } catch (saveError) {
            console.error('Error saving partial results:', saveError.message);
        }
    }
}
function formatCsv(data, headers) {
    return stringify([headers, ...data.map(row => headers.map(header => row[header] || ''))]);
}

async function saveResults(results, outputDir) {
    debug(`Saving results to: ${outputDir}`);
    try {
        // Pa11y results
        const pa11yCsv = formatCsv(results.pa11y.flatMap(result => 
            result.issues ? result.issues.map(issue => ({
                url: result.url,
                type: issue.type,
                code: issue.code,
                message: issue.message,
                context: issue.context,
                selector: issue.selector
            })) : [{ url: result.url, error: result.error }]
        ), ['url', 'type', 'code', 'message', 'context', 'selector', 'error']);
        await fs.writeFile(path.join(outputDir, 'pa11y_results.csv'), pa11yCsv);
        debug('Pa11y results saved');

        // Lighthouse results
        const lighthouseCsv = formatCsv(results.lighthouse.map(result => ({
            url: result.url,
            score: result.seo ? result.seo.score : '',
            error: result.error || ''
        })), ['url', 'score', 'error']);
        await fs.writeFile(path.join(outputDir, 'lighthouse_results.csv'), lighthouseCsv);
        debug('Lighthouse results saved');

        // Internal links results
        const internalLinksCsv = formatCsv(results.internalLinks.flatMap(result => 
            result.links ? result.links.map(link => ({ source: result.url, target: link })) 
                         : [{ source: result.url, error: result.error }]
        ), ['source', 'target', 'error']);
        await fs.writeFile(path.join(outputDir, 'internal_links.csv'), internalLinksCsv);
        debug('Internal links results saved');

        // Content analysis results
        const contentAnalysisCsv = formatCsv(results.contentAnalysis.map(result => ({
            url: result.url,
            title: result.title || '',
            metaDescription: result.metaDescription || '',
            h1: result.h1 || '',
            wordCount: result.wordCount || '',
            h1Count: result.headings?.h1 || '',
            h2Count: result.headings?.h2 || '',
            h3Count: result.headings?.h3 || '',
            h4Count: result.headings?.h4 || '',
            h5Count: result.headings?.h5 || '',
            h6Count: result.headings?.h6 || '',
            keywords: result.keywords ? result.keywords.join(', ') : '',
            error: result.error || ''
        })), ['url', 'title', 'metaDescription', 'h1', 'wordCount', 'h1Count', 'h2Count', 'h3Count', 'h4Count', 'h5Count', 'h6Count', 'keywords', 'error']);
        await fs.writeFile(path.join(outputDir, 'content_analysis.csv'), contentAnalysisCsv);
        debug('Content analysis results saved');

        // Orphaned URLs
        if (results.orphanedUrls && results.orphanedUrls instanceof Set && results.orphanedUrls.size > 0) {
            const orphanedUrlsCsv = formatCsv([...results.orphanedUrls].map(url => ({ url })), ['url']);
            await fs.writeFile(path.join(outputDir, 'orphaned_urls.csv'), orphanedUrlsCsv);
            debug('Orphaned URLs saved');
        } else {
            debug('No orphaned URLs to save');
        }

        debug(`All results saved to ${outputDir}`);
    } catch (error) {
        console.error(`Error writing results to ${outputDir}:`, error);
        console.error('Error details:', error.stack);
    }
}
function setupShutdownHandler(outputDir) {
    process.on('SIGINT', async () => {
        console.log('\nGraceful shutdown initiated...');
        isShuttingDown = true;

        // Wait a moment to allow the current operation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Saving partial results...');
        await saveResults(results, outputDir);

        console.log('Shutdown complete. Exiting...');
        process.exit(0);
    });
}

// Set up command-line interface
program
    .version('1.0.0')
    .description('Run pa11y accessibility, Lighthouse SEO tests, internal link checks, and content analysis on all URLs in a sitemap')
    .requiredOption('-s, --sitemap <url>', 'URL of the sitemap to process')
    .option('-o, --output <directory>', 'Output directory for results', 'results')
    .option('-l, --limit <number>', 'Limit the number of URLs to test. Use -1 to test all URLs.', parseInt, -1)
    .parse(process.argv);

const options = program.opts();

// Set up the shutdown handler
setupShutdownHandler(options.output);

// Run the main function
debug('Starting main function');
runTestsOnSitemap(options.sitemap, options.output, options.limit)
    .then(() => {
        debug('Script completed successfully');
    })
    .catch((error) => {
        console.error('Script failed with error:', error);
    });