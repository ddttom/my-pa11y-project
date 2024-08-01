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

import { ensureCacheDir, getOrRenderData } from './caching.js';


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
        // Schema.org Usage
        const schemaTypes = new Set();
        $('script[type="application/ld+json"]').each((i, elem) => {
            try {
                const data = JSON.parse($(elem).html());
                if (data['@type']) {
                    schemaTypes.add(data['@type']);
                }
            } catch (error) {
                console.error(`Error parsing structured data on ${pageUrl}:`, error.message);
            }
        });

        // Page Size
        const pageSize = Buffer.byteLength(html, 'utf8');

        // Resource Usage
        const resources = {
            scripts: [],
            stylesheets: [],
            images: []
        };

        $('script').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src) {
                resources.scripts.push(src);
            }
        });

        $('link[rel="stylesheet"]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href) {
                resources.stylesheets.push(href);
            }
        });

        $('img').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src) {
                resources.images.push(src);
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
            schemaTypes: Array.from(schemaTypes),
            pageSize,
            resources,
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
        await validateAndPrepare(sitemapUrl, outputDir);
        const urls = await getUrlsFromSitemap(sitemapUrl, limit);
        const results = await processUrls(urls, sitemapUrl);
        await postProcessResults(results);
        await saveResults(results, outputDir, sitemapUrl);
        return results;
    } catch (error) {
        handleError(error, outputDir);
    }
}

async function validateAndPrepare(sitemapUrl, outputDir) {
    validateUrl(sitemapUrl);
    await createDirectories(outputDir);
}

function validateUrl(url) {
    try {
        new URL(url);
    } catch (error) {
        throw new Error(`Invalid sitemap URL: ${url}`);
    }
}

async function createDirectories(outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
    await ensureCacheDir();
    debug(`Output and cache directories created`);
}

async function getUrlsFromSitemap(sitemapUrl, limit) {
    const parsedContent = await fetchAndParseSitemap(sitemapUrl);
    const urls = await extractUrls(parsedContent);
    debug(`Found ${urls.length} URL(s) to process`);

    if (urls.length === 0) {
        throw new Error('No valid URLs found to process');
    }

    return limit === -1 ? urls : urls.slice(0, limit);
}

async function processUrls(urls, sitemapUrl) {
    const totalTests = urls.length;
    debug(`Testing ${totalTests} URL(s)${totalTests === urls.length ? ' (all URLs)' : ''}`);

    const baseUrl = new URL(urls[0]).origin;
    const sitemapUrls = new Set(urls.map(url => url.split('#')[0])); // Strip fragment identifiers

    let results = initializeResults();

    for (let i = 0; i < urls.length; i++) {
        if (isShuttingDown) break;
        const testUrl = fixUrl(urls[i]);
        console.log(`Processing ${i + 1} of ${totalTests}: ${testUrl}`);
        await processUrl(testUrl, i, totalTests, baseUrl, sitemapUrls, results);
    }

    return results;
}

async function processUrl(testUrl, index, totalTests, baseUrl, sitemapUrls, results) {
    debug(`Testing: ${testUrl} (${index + 1}/${totalTests})`);
    
    try {
        let { html, jsErrors, statusCode, headers } = await getOrRenderData(testUrl);
        updateUrlMetrics(testUrl, baseUrl, html, statusCode, results);
        updateResponseCodeMetrics(statusCode, results);

        if (statusCode === 200) {
            await analyzePageContent(testUrl, html, jsErrors, baseUrl, sitemapUrls, results);
        }

        debug(`Completed testing: ${testUrl}`);
    } catch (error) {
        handleUrlProcessingError(testUrl, error, results);
    }
}

async function analyzePageContent(testUrl, html, jsErrors, baseUrl, sitemapUrls, results) {
    const $ = cheerio.load(html);
    
    updateTitleMetrics($, results);
    updateMetaDescriptionMetrics($, results);
    updateHeadingMetrics($, results);
    updateImageMetrics($, results);
    updateLinkMetrics($, baseUrl, results);
    updateSecurityMetrics(testUrl, headers, results);
    updateHreflangMetrics($, results);
    updateCanonicalMetrics($, testUrl, results);

    await runPa11yTest(testUrl, html, results);
    const internalLinks = await getInternalLinks(html, testUrl, baseUrl);
    updateInternalLinks(testUrl, internalLinks, results);
    const contentAnalysis = await analyzeContent(html, testUrl, jsErrors);
    updateContentAnalysis(contentAnalysis, results);

    checkOrphanedUrls(internalLinks, sitemapUrls, results);
}

async function postProcessResults(results) {
    const commonPa11yIssues = analyzeCommonPa11yIssues(results.pa11y);
    await saveCommonPa11yIssues(commonPa11yIssues, outputDir);
    results.pa11y = filterRepeatedPa11yIssues(results.pa11y, commonPa11yIssues);
}

function handleError(error, outputDir) {
    console.error('Error in runTestsOnSitemap:', error.message);
    console.error('Error stack:', error.stack);
    try {
        saveResults(results, outputDir);
        debug('Partial results saved due to error');
    } catch (saveError) {
        console.error('Error saving partial results:', saveError.message);
    }
}
async function saveResults(results, outputDir, sitemapUrl) {
    debug(`Saving results to: ${outputDir}`);
    try {
        await savePa11yResults(results, outputDir);
        await saveInternalLinks(results, outputDir);
        await saveImagesWithoutAlt(results, outputDir);
        await saveContentAnalysis(results, outputDir);
        await saveOrphanedUrls(results, outputDir);
        await saveSeoReport(results, outputDir, sitemapUrl);
        debug(`All results saved to ${outputDir}`);
    } catch (error) {
        console.error(`Error writing results to ${outputDir}:`, error);
        console.error('Error details:', error.stack);
    }
}

async function savePa11yResults(results, outputDir) {
    await saveRawPa11yResult(results, outputDir);
    const pa11yCsv = formatCsv(flattenPa11yResults(results.pa11y), 
        ['url', 'type', 'code', 'message', 'context', 'selector', 'error']);
    await fs.writeFile(path.join(outputDir, 'pa11y_results.csv'), pa11yCsv);
    debug('Pa11y results saved');
}

function flattenPa11yResults(pa11yResults) {
    return pa11yResults.flatMap(result => 
        result.issues ? result.issues.map(issue => ({
            url: result.url,
            type: issue.type,
            code: issue.code,
            message: issue.message,
            context: issue.context,
            selector: issue.selector
        })) : [{ url: result.url, error: result.error }]
    );
}

async function saveInternalLinks(results, outputDir) {
    const internalLinksCsv = formatCsv(flattenInternalLinks(results.internalLinks), 
        ['source', 'target', 'error']);
    await fs.writeFile(path.join(outputDir, 'internal_links.csv'), internalLinksCsv);
    debug('Internal links results saved');
}

function flattenInternalLinks(internalLinks) {
    return internalLinks.flatMap(result => 
        result.links ? result.links.map(link => ({ source: result.url, target: link })) 
                     : [{ source: result.url, error: result.error }]
    );
}

async function saveImagesWithoutAlt(results, outputDir) {
    const imagesWithoutAltCsv = formatCsv(
        results.contentAnalysis.flatMap(result => result.imagesWithoutAlt || []),
        ['url', 'src', 'location']);
    await fs.writeFile(path.join(outputDir, 'images_without_alt.csv'), imagesWithoutAltCsv);
    debug('Images without alt analysis results saved');
}

async function saveContentAnalysis(results, outputDir) {
    const contentAnalysisCsv = formatCsv(results.contentAnalysis.map(formatContentAnalysisResult), 
        ['url', 'title', 'metaDescription', 'h1', 'wordCount', 'h1Count', 'h2Count', 'h3Count', 
         'h4Count', 'h5Count', 'h6Count', 'keywords', 'headingErrors', 'imageCount', 
         'imagesWithoutAlt', 'jsErrors', 'schemaTypes', 'pageSize', 'scriptsCount', 
         'stylesheetsCount', 'imagesCount', 'totalResourceCount', 'error']);
    await fs.writeFile(path.join(outputDir, 'content_analysis.csv'), contentAnalysisCsv);
    debug('Content analysis results saved');
}

function formatContentAnalysisResult(result) {
    return {
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
        jsErrors: result.jsErrors ? result.jsErrors.join('\n') : '',
        schemaTypes: result.schemaTypes ? result.schemaTypes.join(', ') : '',
        pageSize: result.pageSize || '',
        scriptsCount: result.resources ? result.resources.scripts.length : '',
        stylesheetsCount: result.resources ? result.resources.stylesheets.length : '',
        imagesCount: result.resources ? result.resources.images.length : '',
        totalResourceCount: result.resources ? 
            result.resources.scripts.length + 
            result.resources.stylesheets.length + 
            result.resources.images.length : '',
        error: result.error || ''
    };
}

async function saveOrphanedUrls(results, outputDir) {
    if (results.orphanedUrls && results.orphanedUrls instanceof Set && results.orphanedUrls.size > 0) {
        const orphanedUrlsCsv = formatCsv([...results.orphanedUrls].map(url => ({ url })), ['url']);
        await fs.writeFile(path.join(outputDir, 'orphaned_urls.csv'), orphanedUrlsCsv);
        debug('Orphaned URLs saved');
    } else {
        debug('No orphaned URLs to save');
    }
}

async function saveSeoReport(results, outputDir, sitemapUrl) {
    const report = generateReport(results, sitemapUrl);
    await fs.writeFile(path.join(outputDir, 'seo_report.txt'), report);
    debug('SEO report saved');
}
async function collectJsErrors(url) {
    let browser;
    try {
        browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        const jsErrors = [];
        page.on('pageerror', error => {
            const errorDetails = {
                message: error.message,
                stack: error.stack,
                type: error.name
            };
            jsErrors.push(JSON.stringify(errorDetails));
        });

        page.on('console', msg => {
            if (msg.type() === 'error') {
                const errorDetails = {
                    message: msg.text(),
                    type: 'ConsoleError',
                    location: msg.location()
                };
                jsErrors.push(JSON.stringify(errorDetails));
            }
        });

        await page.goto(url, { waitUntil: 'networkidle0' });
        
        // Wait for an additional 3 seconds to catch any delayed errors
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
        
        return jsErrors;
    } catch (error) {
        console.error(`Error collecting JS errors for ${url}:`, error.message);
        return [`Error collecting JS errors: ${error.message}`];
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

  function estimatePixelWidth(text) {
    // This is a rough estimate. Actual pixel width can vary based on font, browser, etc.
    const averageCharWidth = 6; // Assuming an average character width of 6 pixels
    return text.length * averageCharWidth;
}

function generateReport(results, sitemapUrl) {
    function categorizeResponseCodes(responseCodeMetrics) {
        const categories = {
            '2xx': 0,
            '3xx': 0,
            '4xx': 0,
            '5xx': 0,
            'other': 0
        };
        
        for (const [code, count] of Object.entries(responseCodeMetrics || {})) {
            const codeNum = parseInt(code);
            if (codeNum >= 200 && codeNum < 300) categories['2xx'] += count;
            else if (codeNum >= 300 && codeNum < 400) categories['3xx'] += count;
            else if (codeNum >= 400 && codeNum < 500) categories['4xx'] += count;
            else if (codeNum >= 500 && codeNum < 600) categories['5xx'] += count;
            else categories['other'] += count;
        }
        
        return categories;
    }

    const responseCategories = categorizeResponseCodes(results.responseCodeMetrics);

    // Helper function to safely get a count or return 0
    const safeCount = (obj, prop) => obj && obj[prop] ? obj[prop] : 0;

    // Helper function to safely calculate percentage
    const safePercentage = (count, total) => total ? ((count / total) * 100).toFixed(2) : '0.00';

    const report = `
Date\t${new Date().toLocaleDateString()}
Time\t${new Date().toLocaleTimeString()}

Summary\tURLs\t% of Total\tTotal URLs\tTotal URLs Description
Total URLs Encountered\t${safeCount(results.urlMetrics, 'total')}\t100.00%\t${safeCount(results.urlMetrics, 'total')}\tURLs Encountered
Total Internal URLs\t${safeCount(results.urlMetrics, 'internal')}\t${safePercentage(safeCount(results.urlMetrics, 'internal'), safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tURLs Encountered
Total External URLs\t${safeCount(results.urlMetrics, 'external')}\t${safePercentage(safeCount(results.urlMetrics, 'external'), safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tURLs Encountered
Total Internal Indexable URLs\t${safeCount(results.urlMetrics, 'internalIndexable')}\t${safePercentage(safeCount(results.urlMetrics, 'internalIndexable'), safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tURLs Encountered
Total Internal Non-Indexable URLs\t${safeCount(results.urlMetrics, 'internalNonIndexable')}\t${safePercentage(safeCount(results.urlMetrics, 'internalNonIndexable'), safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tURLs Encountered

Response Codes
All\t${safeCount(results.urlMetrics, 'total')}\t100.00%\t${safeCount(results.urlMetrics, 'total')}\tAll Internal & External Crawled URLs
Success (2xx)\t${responseCategories['2xx']}\t${safePercentage(responseCategories['2xx'], safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tAll Internal & External Crawled URLs
Redirection (3xx)\t${responseCategories['3xx']}\t${safePercentage(responseCategories['3xx'], safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tAll Internal & External Crawled URLs
Client Error (4xx)\t${responseCategories['4xx']}\t${safePercentage(responseCategories['4xx'], safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tAll Internal & External Crawled URLs
Server Error (5xx)\t${responseCategories['5xx']}\t${safePercentage(responseCategories['5xx'], safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tAll Internal & External Crawled URLs
Other\t${responseCategories['other']}\t${safePercentage(responseCategories['other'], safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tAll Internal & External Crawled URLs

URL
All\t${safeCount(results.urlMetrics, 'internal')}\t100.00%\t${safeCount(results.urlMetrics, 'internal')}\tInternal URLs
Non ASCII Characters\t${safeCount(results.urlMetrics, 'nonAscii')}\t${safePercentage(safeCount(results.urlMetrics, 'nonAscii'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal URLs
Underscores\t${safeCount(results.urlMetrics, 'underscores')}\t${safePercentage(safeCount(results.urlMetrics, 'underscores'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal URLs
Uppercase\t${safeCount(results.urlMetrics, 'uppercase')}\t${safePercentage(safeCount(results.urlMetrics, 'uppercase'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal URLs
Contains Space\t${safeCount(results.urlMetrics, 'containsSpace')}\t${safePercentage(safeCount(results.urlMetrics, 'containsSpace'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal URLs
Over 115 Characters\t${safeCount(results.urlMetrics, 'overLength')}\t${safePercentage(safeCount(results.urlMetrics, 'overLength'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal URLs

Page Titles
All\t${safeCount(results.urlMetrics, 'internal')}\t100.00%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Missing\t${safeCount(results.titleMetrics, 'missing')}\t${safePercentage(safeCount(results.titleMetrics, 'missing'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Duplicate\t${safeCount(results.titleMetrics, 'duplicate')}\t${safePercentage(safeCount(results.titleMetrics, 'duplicate'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Over 60 Characters\t${safeCount(results.titleMetrics, 'tooLong')}\t${safePercentage(safeCount(results.titleMetrics, 'tooLong'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Below 30 Characters\t${safeCount(results.titleMetrics, 'tooShort')}\t${safePercentage(safeCount(results.titleMetrics, 'tooShort'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Over 561 Pixels\t${safeCount(results.titleMetrics.pixelWidth, '561')}\t${safePercentage(safeCount(results.titleMetrics.pixelWidth, '561'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Below 200 Pixels\t${safeCount(results.titleMetrics.pixelWidth, '200')}\t${safePercentage(safeCount(results.titleMetrics.pixelWidth, '200'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages

Meta Description
All\t${safeCount(results.urlMetrics, 'internal')}\t100.00%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Missing\t${safeCount(results.metaDescriptionMetrics, 'missing')}\t${safePercentage(safeCount(results.metaDescriptionMetrics, 'missing'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Duplicate\t${safeCount(results.metaDescriptionMetrics, 'duplicate')}\t${safePercentage(safeCount(results.metaDescriptionMetrics, 'duplicate'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Over 155 Characters\t${safeCount(results.metaDescriptionMetrics, 'tooLong')}\t${safePercentage(safeCount(results.metaDescriptionMetrics, 'tooLong'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Below 70 Characters\t${safeCount(results.metaDescriptionMetrics, 'tooShort')}\t${safePercentage(safeCount(results.metaDescriptionMetrics, 'tooShort'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Over 985 Pixels\t${safeCount(results.metaDescriptionMetrics.pixelWidth, '985')}\t${safePercentage(safeCount(results.metaDescriptionMetrics.pixelWidth, '985'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Below 400 Pixels\t${safeCount(results.metaDescriptionMetrics.pixelWidth, '400')}\t${safePercentage(safeCount(results.metaDescriptionMetrics.pixelWidth, '400'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages

H1
All\t${safeCount(results.urlMetrics, 'internal')}\t100.00%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Missing\t${safeCount(results.h1Metrics, 'missing')}\t${safePercentage(safeCount(results.h1Metrics, 'missing'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Duplicate\t${safeCount(results.h1Metrics, 'duplicate')}\t${safePercentage(safeCount(results.h1Metrics, 'duplicate'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Over 70 Characters\t${safeCount(results.h1Metrics, 'tooLong')}\t${safePercentage(safeCount(results.h1Metrics, 'tooLong'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Multiple\t${safeCount(results.h1Metrics, 'multiple')}\t${safePercentage(safeCount(results.h1Metrics, 'multiple'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages

H2
All\t${safeCount(results.urlMetrics, 'internal')}\t100.00%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Missing\t${safeCount(results.h2Metrics, 'missing')}\t${safePercentage(safeCount(results.h2Metrics, 'missing'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Duplicate\t${safeCount(results.h2Metrics, 'duplicate')}\t${safePercentage(safeCount(results.h2Metrics, 'duplicate'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Over 70 Characters\t${safeCount(results.h2Metrics, 'tooLong')}\t${safePercentage(safeCount(results.h2Metrics, 'tooLong'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Multiple\t${safeCount(results.h2Metrics, 'multiple')}\t${safePercentage(safeCount(results.h2Metrics, 'multiple'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Non-Sequential\t${safeCount(results.h2Metrics, 'nonSequential')}\t${safePercentage(safeCount(results.h2Metrics, 'nonSequential'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages

Images
All\t${safeCount(results.imageMetrics, 'total')}\t100.00%\t${safeCount(results.imageMetrics, 'total')}\tImages
Missing Alt Text\t${safeCount(results.imageMetrics, 'missingAlt')}\t${safePercentage(safeCount(results.imageMetrics, 'missingAlt'), safeCount(results.imageMetrics, 'total'))}%\t${safeCount(results.imageMetrics, 'total')}\tImages
Missing Alt Attribute\t${safeCount(results.imageMetrics, 'missingAltAttribute')}\t${safePercentage(safeCount(results.imageMetrics, 'missingAltAttribute'), safeCount(results.imageMetrics, 'total'))}%\t${safeCount(results.imageMetrics, 'total')}\tImages
Alt Text Over 100 Characters\t${safeCount(results.imageMetrics, 'altTextTooLong')}\t${safePercentage(safeCount(results.imageMetrics, 'altTextTooLong'), safeCount(results.imageMetrics, 'total'))}%\t${safeCount(results.imageMetrics, 'total')}\tImages

Links
Pages Without Internal Outlinks\t${safeCount(results.linkMetrics, 'pagesWithoutInternalOutlinks')}\t${safePercentage(safeCount(results.linkMetrics, 'pagesWithoutInternalOutlinks'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Pages With High External Outlinks\t${safeCount(results.linkMetrics, 'pagesWithHighExternalOutlinks')}\t${safePercentage(safeCount(results.linkMetrics, 'pagesWithHighExternalOutlinks'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Internal Outlinks With No Anchor Text\t${safeCount(results.linkMetrics, 'internalOutlinksWithoutAnchorText')}\t${safePercentage(safeCount(results.linkMetrics, 'internalOutlinksWithoutAnchorText'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Non-Descriptive Anchor Text In Internal Outlinks\t${safeCount(results.linkMetrics, 'nonDescriptiveAnchorText')}\t${safePercentage(safeCount(results.linkMetrics, 'nonDescriptiveAnchorText'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages

Security
HTTP URLs\t${safeCount(results.securityMetrics, 'httpUrls')}\t${safePercentage(safeCount(results.securityMetrics, 'httpUrls'), safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tAll URLs
Missing HSTS Header\t${safeCount(results.securityMetrics, 'missingHstsHeader')}\t${safePercentage(safeCount(results.securityMetrics, 'missingHstsHeader'), safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tAll URLs
Missing Content-Security-Policy Header\t${safeCount(results.securityMetrics, 'missingContentSecurityPolicy')}\t${safePercentage(safeCount(results.securityMetrics, 'missingContentSecurityPolicy'), safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tAll URLs
Missing X-Frame-Options Header\t${safeCount(results.securityMetrics, 'missingXFrameOptions')}\t${safePercentage(safeCount(results.securityMetrics, 'missingXFrameOptions'), safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tAll URLs
Missing X-Content-Type-Options Header\t${safeCount(results.securityMetrics, 'missingXContentTypeOptions')}\t${safePercentage(safeCount(results.securityMetrics, 'missingXContentTypeOptions'), safeCount(results.urlMetrics, 'total'))}%\t${safeCount(results.urlMetrics, 'total')}\tAll URLs

Hreflang
Contains hreflang\t${safeCount(results.hreflangMetrics, 'pagesWithHreflang')}\t${safePercentage(safeCount(results.hreflangMetrics, 'pagesWithHreflang'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Missing Return Links\t${safeCount(results.hreflangMetrics, 'missingReturnLinks')}\t${safePercentage(safeCount(results.hreflangMetrics, 'missingReturnLinks'), safeCount(results.hreflangMetrics, 'pagesWithHreflang'))}%\t${safeCount(results.hreflangMetrics, 'pagesWithHreflang')}\tPages with hreflang
Incorrect Language & Region Codes\t${safeCount(results.hreflangMetrics, 'incorrectLanguageCodes')}\t${safePercentage(safeCount(results.hreflangMetrics, 'incorrectLanguageCodes'), safeCount(results.hreflangMetrics, 'pagesWithHreflang'))}%\t${safeCount(results.hreflangMetrics, 'pagesWithHreflang')}\tPages with hreflang

Canonicals
All\t${safeCount(results.urlMetrics, 'internal')}\t100.00%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Contains Canonical\t${safeCount(results.canonicalMetrics, 'selfReferencing') + safeCount(results.canonicalMetrics, 'nonSelf')}\t${safePercentage(safeCount(results.canonicalMetrics, 'selfReferencing') + safeCount(results.canonicalMetrics, 'nonSelf'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Self Referencing\t${safeCount(results.canonicalMetrics, 'selfReferencing')}\t${safePercentage(safeCount(results.canonicalMetrics, 'selfReferencing'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Canonicalised\t${safeCount(results.canonicalMetrics, 'nonSelf')}\t${safePercentage(safeCount(results.canonicalMetrics, 'nonSelf'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Missing\t${safeCount(results.canonicalMetrics, 'missing')}\t${safePercentage(safeCount(results.canonicalMetrics, 'missing'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages

Content
All\t${safeCount(results.urlMetrics, 'internal')}\t100.00%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Low Content Pages\t${safeCount(results.contentMetrics, 'lowContent')}\t${safePercentage(safeCount(results.contentMetrics, 'lowContent'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
Near Duplicates\t${safeCount(results.contentMetrics, 'duplicate')}\t${safePercentage(safeCount(results.contentMetrics, 'duplicate'), safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages

Orphaned URLs\t${results.orphanedUrls ? results.orphanedUrls.size : 0}\t${safePercentage(results.orphanedUrls ? results.orphanedUrls.size : 0, safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal URLs

Pa11y Accessibility Issues
Total Issues\t${(results.pa11y || []).reduce((total, result) => total + (result.issues ? result.issues.length : 0), 0)}

JavaScript Errors
Pages with JavaScript Errors\t${(results.contentAnalysis || []).filter(page => page && page.jsErrors && page.jsErrors.length > 0).length}\t${safePercentage((results.contentAnalysis || []).filter(page => page && page.jsErrors && page.jsErrors.length > 0).length, safeCount(results.urlMetrics, 'internal'))}%\t${safeCount(results.urlMetrics, 'internal')}\tInternal HTML pages
    `;

    return report;
}
// Set up command-line interface
program
    .requiredOption('-s, --sitemap <url>', 'URL of the sitemap to process')
    .requiredOption('-o, --output <directory>', 'Output directory for results')
    .option('-l, --limit <number>', 'Limit the number of URLs to test. Use -1 to test all URLs.', parseInt, -1)
    .parse(process.argv);

const options = program.opts();

runTestsOnSitemap(options.sitemap, options.output, options.limit)
    .then(() => {
        console.log('Crawl completed successfully');
    })
    .catch((error) => {
        console.error('Crawl failed:', error);
    });
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