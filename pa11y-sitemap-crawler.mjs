#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import xml2js from 'xml2js';
import pa11y from 'pa11y';
import { program } from 'commander';
import cheerio from 'cheerio';
import { URL } from 'url';
import { stringify } from 'csv-stringify/sync';
import pkg from 'puppeteer';
const { launch } = pkg;
import puppeteer from 'puppeteer';

import { ensureCacheDir, getCachedHtml, setCachedHtml } from './caching.js';


let isShuttingDown = false;
let results = {
    pa11y: [],
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
        'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.A.EmptyNoId'
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

const axiosInstance = axios.create({
    headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
});

function fixUrl(url) {
    if (!url) return '';
    return url.replace(/([^:]\/)\/+/g, "$1");
}
async function fetchAndParseSitemap(url) {
    debug(`Fetching content from: ${url}`);
    try {
        const response = await axiosInstance.get(url);
        debug('Content fetched successfully');
        
        // Check if the content is XML or HTML
        if (response.headers['content-type'].includes('text/html')) {
            debug('Found HTML content instead of sitemap');
            return { html: response.data, url };
        } else {
            debug('Parsing sitemap XML');
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(response.data);
            debug('Sitemap parsed successfully');
            return { xml: result };
        }
    } catch (error) {
        console.error(`Error fetching or parsing content from ${url}:`, error.message);
        throw error;
    }
}
async function extractUrls(parsedContent) {
    if (parsedContent.html) {
        debug('Extracting URL from HTML content');
        return [fixUrl(parsedContent.url)];
    } else if (parsedContent.xml) {
        if (parsedContent.xml.sitemapindex) {
            debug('Found a sitemap index. Processing nested sitemaps...');
            const sitemapUrls = parsedContent.xml.sitemapindex.sitemap.map(sitemap => fixUrl(sitemap.loc?.[0] || ''));
            let allUrls = [];
            for (const sitemapUrl of sitemapUrls) {
                if (isShuttingDown) break;
                if (!sitemapUrl) continue;
                debug(`Processing nested sitemap: ${sitemapUrl}`);
                try {
                    const nestedParsedContent = await fetchAndParseSitemap(sitemapUrl);
                    const nestedUrls = await extractUrls(nestedParsedContent);
                    allUrls = allUrls.concat(nestedUrls);
                } catch (error) {
                    console.error(`Error processing nested sitemap ${sitemapUrl}:`, error.message);
                }
            }
            return allUrls;
        } else if (parsedContent.xml.urlset) {
            debug('Extracting URLs from sitemap');
            return parsedContent.xml.urlset.url.map(url => fixUrl(url.loc?.[0] || '')).filter(url => url);
        } else {
            throw new Error('Unknown sitemap format');
        }
    } else {
        throw new Error('Invalid parsed content');
    }
}

async function getInternalLinks(html, pageUrl, baseUrl) {
    const $ = cheerio.load(html);
    const links = new Set();

    $('a').each((i, element) => {
        const href = $(element).attr('href');
        if (href) {
            const absoluteUrl = new URL(href, pageUrl).href;
            if (absoluteUrl.startsWith(baseUrl)) {
                links.add(fixUrl(absoluteUrl));
            }
        }
    });

    return Array.from(links);
}


async function analyzeContent(html, pageUrl, jsErrors = []) {
    debug(`Analyzing content of: ${pageUrl}`);
    try {
        const $ = cheerio.load(html);

        const title = $('title').text();
        const metaDescription = $('meta[name="description"]').attr('content');
        const h1 = $('h1').first().text();
        const wordCount = $('body').text().trim().split(/\s+/).length;

        const headings = {};
        const headingErrors = [];
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(h => {
            headings[h] = $(h).length;
        });

        // Check for zero h1 elements
        if (headings.h1 === 0) {
            headingErrors.push("No H1 element found on the page.");
        }

        // Check for correct heading cadence
        let lastHeadingLevel = 0;
        for (let i = 1; i <= 6; i++) {
            const currentHeading = `h${i}`;
            if (headings[currentHeading] > 0) {
                if (i - lastHeadingLevel > 1) {
                    headingErrors.push(`Incorrect heading structure: ${currentHeading} follows h${lastHeadingLevel}`);
                }
                lastHeadingLevel = i;
            }
        }

        // Image analysis
        const images = [];
        let imagesWithoutAlt = [];
        $('img').each((i, elem) => {
            const src = $(elem).attr('src');
            const alt = $(elem).attr('alt');
            const width = $(elem).attr('width');
            const height = $(elem).attr('height');
            images.push({ src, alt, width, height });
            if (!alt) {
                let location = '';
                const parents = $(elem).parents().map((_, parent) => $(parent).prop('tagName')).get();
                location = parents.reverse().join(' > ') + ' > img';
                imagesWithoutAlt.push({ url: pageUrl, src, location });
            }
        });

        // Simple keyword extraction (top 5 most frequent words)
        const words = $('body').text().toLowerCase().match(/\b\w+\b/g) || [];
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

        // Analyze scripts
        const scripts = [];
        $('script').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src) {
                scripts.push(src);
            }
        });

        // Analyze stylesheets
        const stylesheets = [];
        $('link[rel="stylesheet"]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href) {
                stylesheets.push(href);
            }
        });

        // Check for responsive meta tag
        const hasResponsiveMetaTag = $('meta[name="viewport"]').length > 0;

        // Check for language declaration
        const htmlLang = $('html').attr('lang');

        // Check for canonical URL
        const canonicalUrl = $('link[rel="canonical"]').attr('href');

        // Check for social media meta tags
        const openGraphTags = {};
        $('meta[property^="og:"]').each((i, elem) => {
            const property = $(elem).attr('property');
            const content = $(elem).attr('content');
            openGraphTags[property] = content;
        });

        const twitterTags = {};
        $('meta[name^="twitter:"]').each((i, elem) => {
            const name = $(elem).attr('name');
            const content = $(elem).attr('content');
            twitterTags[name] = content;
        });

        // Check for structured data
        const structuredData = [];
        $('script[type="application/ld+json"]').each((i, elem) => {
            try {
                const data = JSON.parse($(elem).html());
                structuredData.push(data);
            } catch (error) {
                console.error(`Error parsing structured data on ${pageUrl}:`, error.message);
            }
        });

        // Check for forms and their accessibility
        const forms = [];
        $('form').each((i, elem) => {
            const formInputs = $(elem).find('input, select, textarea');
            const formLabels = $(elem).find('label');
            forms.push({
                inputs: formInputs.length,
                labels: formLabels.length,
                hasSubmitButton: $(elem).find('input[type="submit"], button[type="submit"]').length > 0
            });
        });

        // Check for table accessibility
        const tables = [];
        $('table').each((i, elem) => {
            tables.push({
                hasCaptions: $(elem).find('caption').length > 0,
                hasHeaders: $(elem).find('th').length > 0
            });
        });

        debug(`Content analysis completed for: ${pageUrl}`);
        return {
            url: pageUrl,
            title,
            metaDescription,
            h1,
            wordCount,
            headings,
            keywords,
            headingErrors: headingErrors.length > 0 ? headingErrors : undefined,
            images,
            imagesWithoutAlt,
            scripts,
            stylesheets,
            hasResponsiveMetaTag,
            htmlLang,
            canonicalUrl,
            openGraphTags,
            twitterTags,
            structuredData,
            forms,
            tables,
            jsErrors: jsErrors.length > 0 ? jsErrors : undefined
        };
    } catch (error) {
        console.error(`Error analyzing content of ${pageUrl}:`, error.message);
        return null;
    }
}
function formatCsv(data, headers) {
    return stringify([headers, ...data.map(row => headers.map(header => row[header] || ''))]);
}

async function runTestsOnSitemap(sitemapUrl, outputDir, limit = -1) {
    debug(`Starting process for sitemap or page: ${sitemapUrl}`);
    debug(`Results will be saved to: ${outputDir}`);

    try {
        await fs.mkdir(outputDir, { recursive: true });
        await ensureCacheDir();
        debug(`Output and cache directories created`);

        const parsedContent = await fetchAndParseSitemap(sitemapUrl);
        debug('Content fetched and parsed successfully');

        const urls = await extractUrls(parsedContent);
        debug(`Found ${urls.length} URL(s) to process`);

        if (urls.length === 0) {
            console.error('No valid URLs found to process');
            return;
        }

        const urlsToTest = limit === -1 ? urls : urls.slice(0, limit);
        const totalTests = urlsToTest.length;
        debug(`Testing ${totalTests} URL(s)${limit === -1 ? ' (all URLs)' : ''}`);

        const baseUrl = new URL(urlsToTest[0]).origin;
        const sitemapUrls = new Set(urls.map(url => url.split('#')[0])); // Strip fragment identifiers

        let results = {
            pa11y: [],
            internalLinks: [],
            contentAnalysis: [],
            orphanedUrls: new Set()
        };

        for (let i = 0; i < urlsToTest.length; i++) {
            if (isShuttingDown) break;
            const testUrl = fixUrl(urlsToTest[i]);
            console.log(`Processing ${i + 1} of ${totalTests}: ${testUrl}`);
            debug(`Testing: ${testUrl} (${i + 1}/${totalTests})`);
            
            try {
                let html = await getCachedHtml(testUrl);
                if (!html) {
                    debug(`Fetching fresh HTML for: ${testUrl}`);
                    console.info(`Fetching fresh HTML for: ${testUrl}`);
                    const response = await axios.get(testUrl);
                    html = response.data;
                    await setCachedHtml(testUrl, html);
                } else {
                    debug(`Using cached HTML for: ${testUrl}`);
                    console.info(`Using cached HTML for: ${testUrl}`);
                }

                // Collect JavaScript errors
                const jsErrors = await collectJsErrors(testUrl);

                // Run pa11y test
                const pa11yResult = await pa11y(testUrl, { ...pa11yOptions, html });
                results.pa11y.push({ url: testUrl, issues: pa11yResult.issues });

                // Get internal links
                const internalLinks = await getInternalLinks(html, testUrl, baseUrl);
                results.internalLinks.push({ url: testUrl, links: internalLinks });

                // Analyze content
                const contentAnalysis = await analyzeContent(html, testUrl, jsErrors);
                if (contentAnalysis) {
                    results.contentAnalysis.push(contentAnalysis);
                    
                    // Log heading errors
                    if (contentAnalysis.headingErrors && contentAnalysis.headingErrors.length > 0) {
                        console.warn(`Heading structure issues found for ${testUrl}`);
                        contentAnalysis.headingErrors.forEach(error => console.warn(`- ${error}`));
                    }
                    
                    // Log JavaScript errors
                    if (contentAnalysis.jsErrors && contentAnalysis.jsErrors.length > 0) {
                        console.warn(`JavaScript errors found for ${testUrl}`);
                        contentAnalysis.jsErrors.forEach(error => console.warn(`- ${error}`));
                    }
                    
                    // Log images without alt text
                    if (contentAnalysis.imagesWithoutAlt > 0) {
                        console.warn(`Found ${contentAnalysis.imagesWithoutAlt} image(s) without alt text on ${testUrl}`);
                    }
                } else {
                    results.contentAnalysis.push({ url: testUrl, error: 'Content analysis failed' });
                }

                // Check for orphaned URLs
                if (!parsedContent.html) {
                    internalLinks.forEach(link => {
                        const strippedLink = link.split('#')[0];
                        if (!sitemapUrls.has(strippedLink) && !strippedLink.endsWith('.pdf')) {
                            results.orphanedUrls.add(strippedLink);
                        }
                    });
                }

                debug(`Completed testing: ${testUrl}`);
            } catch (error) {
                console.error(`Error testing ${testUrl}:`, error.message);
                console.error('Error details:', error.stack);
                ['pa11y', 'internalLinks', 'contentAnalysis'].forEach(report => {
                    results[report].push({ url: testUrl, error: error.message });
                });
            }
        }

        // If we're processing a single HTML page, we don't need to check for orphaned URLs
        if (parsedContent.html) {
            results.orphanedUrls = new Set();
        }

        // Analyze common pa11y issues after processing all URLs
        const commonPa11yIssues = analyzeCommonPa11yIssues(results.pa11y);
        await saveCommonPa11yIssues(commonPa11yIssues, outputDir);
        
        // Filter out repeated issues from main pa11y results
        results.pa11y = filterRepeatedPa11yIssues(results.pa11y, commonPa11yIssues);

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
async function saveResults(results, outputDir) {
    debug(`Saving results to: ${outputDir}`);
    try {
        // Pa11y results
        await saveRawPa11yResult(results, outputDir);

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

        // Internal links results
        const internalLinksCsv = formatCsv(results.internalLinks.flatMap(result => 
            result.links ? result.links.map(link => ({ source: result.url, target: link })) 
                         : [{ source: result.url, error: result.error }]
        ), ['source', 'target', 'error']);
        await fs.writeFile(path.join(outputDir, 'internal_links.csv'), internalLinksCsv);
        debug('Internal links results saved');

        // Images without alt text results
        const imagesWithoutAltCsv = formatCsv(
        results.contentAnalysis.flatMap(result => result.imagesWithoutAlt || []),
        ['url', 'src', 'location']);
        await fs.writeFile(path.join(outputDir, 'images_without_alt.csv'), imagesWithoutAltCsv);
        debug('Images without alt analysis results saved');

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
            headingErrors: result.headingErrors ? result.headingErrors.join('; ') : '',
            imageCount: result.images ? result.images.length : '',
            imagesWithoutAlt: result.images ? result.images.filter(img => !img.alt).length : '',
            jsErrors: result.jsErrors ? result.jsErrors.join('; ') : '',
            error: result.error || ''
        })), ['url', 'title', 'metaDescription', 'h1', 'wordCount', 'h1Count', 'h2Count', 'h3Count', 'h4Count', 'h5Count', 'h6Count', 'keywords', 'headingErrors', 'imageCount', 'imagesWithoutAlt', 'jsErrors', 'error']);
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
async function collectJsErrors(url) {
    let browser;
    try {
        browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        const jsErrors = [];
        page.on('pageerror', error => {
            const formattedErrorMessage = error.message.replace(/\n/g, '\\n');
            if (!formattedErrorMessage.includes('Refused to connect to') || 
                !formattedErrorMessage.includes('https://rum.hlx.page/.rum/')) {
                jsErrors.push(formattedErrorMessage);
            }
        });

        await page.goto(url, { waitUntil: 'networkidle0' });
        
        return jsErrors;
    } catch (error) {
        console.error(`Error collecting JS errors for ${url}:`, error.message);
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
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
async function saveRawPa11yResult(results, outputDir) {
    try {
        const filename = 'pa11y_raw_results.json';
        const filePath = path.join(outputDir, filename);
        const pa11yResults = results.pa11y.map(result => ({
            url: result.url,
            issues: result.issues
        }));
        await fs.writeFile(filePath, JSON.stringify(pa11yResults, null, 2));
        debug(`Raw pa11y results saved to ${filePath}`);
    } catch (error) {
        console.error('Error saving raw pa11y results:', error.message);
    }
}


  function analyzeCommonPa11yIssues(pa11yResults) {
    const issueCounts = {};
    for (const result of pa11yResults) {
      if (result.issues) {
        for (const issue of result.issues) {
          const issueKey = `${issue.code}-${issue.message}`;
          issueCounts[issueKey] = (issueCounts[issueKey] || 0) + 1;
        }
      }
    }
  
    const commonIssues = Object.entries(issueCounts)
      .filter(([key, count]) => count > 1) // Consider an issue common if it appears more than once
      .map(([key, count]) => ({ code: key.split('-')[0], message: key.split('-')[1], count }));
  
    return commonIssues;
  }
  
  async function saveCommonPa11yIssues(commonIssues, outputDir) {
    if (commonIssues.length > 0) {
      const csvData = formatCsv(commonIssues, ['code', 'message', 'count']);
      await fs.writeFile(path.join(outputDir, 'common_pa11y_issues.csv'), csvData);
      debug('Common Pa11y issues saved');
    } else {
      debug('No common Pa11y issues found');
    }
  }
  
  function filterRepeatedPa11yIssues(pa11yResults, commonIssues) {
    const commonIssueKeys = new Set(commonIssues.map(issue => `${issue.code}-${issue.message}`));
    return pa11yResults.map(result => {
      if (result.issues) {
        result.issues = result.issues.filter(issue => !commonIssueKeys.has(`${issue.code}-${issue.message}`));
      }
      return result;
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