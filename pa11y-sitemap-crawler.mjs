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
   // debug(`[DEBUG] ${new Date().toISOString()}: ${message}`);
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
        
        const basicInfo = extractBasicInfo($);
        const headingAnalysis = analyzeHeadings($);
        const imageAnalysis = analyzeImages($, pageUrl);
        const keywordAnalysis = analyzeKeywords($);
        const resourceAnalysis = analyzeResources($);
        const schemaAnalysis = analyzeSchema($, pageUrl);
        const metaTagAnalysis = analyzeMetaTags($);
        const structuredDataAnalysis = analyzeStructuredData($, pageUrl);
        const formAnalysis = analyzeForms($);
        const tableAnalysis = analyzeTables($);

        debug(`Content analysis completed for: ${pageUrl}`);
        return {
            url: pageUrl,
            ...basicInfo,
            ...headingAnalysis,
            ...imageAnalysis,
            ...keywordAnalysis,
            ...resourceAnalysis,
            ...schemaAnalysis,
            ...metaTagAnalysis,
            ...structuredDataAnalysis,
            forms: formAnalysis,
            tables: tableAnalysis,
            jsErrors: jsErrors.length > 0 ? jsErrors : undefined
        };
    } catch (error) {
        console.error(`Error analyzing content of ${pageUrl}:`, error.message);
        return null;
    }
}

function extractBasicInfo($) {
    return {
        title: $('title').text(),
        metaDescription: $('meta[name="description"]').attr('content'),
        h1: $('h1').first().text(),
        wordCount: $('body').text().trim().split(/\s+/).length,
        pageSize: Buffer.byteLength($.html(), 'utf8'),
        hasResponsiveMetaTag: $('meta[name="viewport"]').length > 0,
        htmlLang: $('html').attr('lang'),
        canonicalUrl: $('link[rel="canonical"]').attr('href')
    };
}

function analyzeHeadings($) {
    const headings = {};
    const headingErrors = [];
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(h => {
        headings[h] = $(h).length;
    });

    if (headings.h1 === 0) {
        headingErrors.push("No H1 element found on the page.");
    }

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

    return { headings, headingErrors: headingErrors.length > 0 ? headingErrors : undefined };
}

function analyzeImages($, pageUrl) {
    const images = [];
    const imagesWithoutAlt = [];
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
    return { images, imagesWithoutAlt };
}

function analyzeKeywords($) {
    const words = $('body').text().toLowerCase().match(/\b\w+\b/g) || [];
    const wordFrequency = {};
    words.forEach(word => {
        if (word.length > 3) {
            wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
    });
    const keywords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);
    return { keywords };
}

function analyzeResources($) {
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

    return { resources };
}

function analyzeSchema($, pageUrl) {
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
    return { schemaTypes: Array.from(schemaTypes) };
}

function analyzeMetaTags($) {
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

    return { openGraphTags, twitterTags };
}

function analyzeStructuredData($, pageUrl) {
    const structuredData = [];
    $('script[type="application/ld+json"]').each((i, elem) => {
        try {
            const data = JSON.parse($(elem).html());
            structuredData.push(data);
        } catch (error) {
            console.error(`Error parsing structured data on ${pageUrl}:`, error.message);
        }
    });
    return { structuredData };
}

function analyzeForms($) {
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
    return forms;
}

function analyzeTables($) {
    const tables = [];
    $('table').each((i, elem) => {
        tables.push({
            hasCaptions: $(elem).find('caption').length > 0,
            hasHeaders: $(elem).find('th').length > 0
        });
    });
    return tables;
}
function formatCsv(data, headers) {
    return stringify([headers, ...data.map(row => headers.map(header => row[header] || ''))]);
}
// Update URL metrics
function updateUrlMetrics(testUrl, baseUrl, html, statusCode, results) {
    results.urlMetrics.total++;
    if (testUrl.startsWith(baseUrl)) {
        results.urlMetrics.internal++;
        // Check if URL is indexable (this is a simplified check)
        if (!html.includes('noindex') && statusCode === 200) {
            results.urlMetrics.internalIndexable++;
        } else {
            results.urlMetrics.internalNonIndexable++;
        }
    } else {
        results.urlMetrics.external++;
    }

    // Check for non-ASCII characters, uppercase, underscores, spaces, and length
    if (/[^\x00-\x7F]/.test(testUrl)) results.urlMetrics.nonAscii++;
    if (/[A-Z]/.test(testUrl)) results.urlMetrics.uppercase++;
    if (testUrl.includes('_')) results.urlMetrics.underscores++;
    if (testUrl.includes(' ')) results.urlMetrics.containsSpace++;
    if (testUrl.length > 115) results.urlMetrics.overLength++;
}

// Update response code metrics
function updateResponseCodeMetrics(statusCode, results) {
    results.responseCodeMetrics[statusCode] = (results.responseCodeMetrics[statusCode] || 0) + 1;
}

// Update title metrics
function updateTitleMetrics($, results) {
    const title = $('title').text();
    if (!title) {
        results.titleMetrics.missing++;
    } else {
        const titleLength = title.length;
        if (titleLength > 60) results.titleMetrics.tooLong++;
        if (titleLength < 30) results.titleMetrics.tooShort++;
        const pixelWidth = estimatePixelWidth(title);
        results.titleMetrics.pixelWidth[pixelWidth] = (results.titleMetrics.pixelWidth[pixelWidth] || 0) + 1;
    }
}

// Update meta description metrics
function updateMetaDescriptionMetrics($, results) {
    const metaDescription = $('meta[name="description"]').attr('content');
    if (!metaDescription) {
        results.metaDescriptionMetrics.missing++;
    } else {
        const descLength = metaDescription.length;
        if (descLength > 155) results.metaDescriptionMetrics.tooLong++;
        if (descLength < 70) results.metaDescriptionMetrics.tooShort++;
        const pixelWidth = estimatePixelWidth(metaDescription);
        results.metaDescriptionMetrics.pixelWidth[pixelWidth] = (results.metaDescriptionMetrics.pixelWidth[pixelWidth] || 0) + 1;
    }
}

// Update heading metrics
function updateHeadingMetrics($, results) {
    const h1s = $('h1');
    if (h1s.length === 0) results.h1Metrics.missing++;
    if (h1s.length > 1) results.h1Metrics.multiple++;
    h1s.each((i, el) => {
        const h1Text = $(el).text();
        if (h1Text.length > 70) results.h1Metrics.tooLong++;
    });

    const h2s = $('h2');
    if (h2s.length === 0) results.h2Metrics.missing++;
    if (h2s.length > 1) results.h2Metrics.multiple++;
    h2s.each((i, el) => {
        const h2Text = $(el).text();
        if (h2Text.length > 70) results.h2Metrics.tooLong++;
    });

    // Check for non-sequential H2
    if ($('h1').length && $('*').index($('h2').first()) < $('*').index($('h1').first())) {
        results.h2Metrics.nonSequential++;
    }
}

// Update image metrics
function updateImageMetrics($, results) {
    $('img').each((i, el) => {
        results.imageMetrics.total++;
        const altText = $(el).attr('alt');
        if (!altText) {
            if ($(el).attr('alt') === undefined) {
                results.imageMetrics.missingAltAttribute++;
            } else {
                results.imageMetrics.missingAlt++;
            }
        } else if (altText.length > 100) {
            results.imageMetrics.altTextTooLong++;
        }
    });
}

// Update link metrics
function updateLinkMetrics($, baseUrl, results) {
    const internalLinkElements = $('a[href^="/"], a[href^="' + baseUrl + '"]');
    const externalLinks = $('a').not(internalLinkElements);
    if (internalLinkElements.length === 0) results.linkMetrics.pagesWithoutInternalOutlinks++;
    if (externalLinks.length > 100) results.linkMetrics.pagesWithHighExternalOutlinks++;
    internalLinkElements.each((i, el) => {
        if (!$(el).text().trim()) results.linkMetrics.internalOutlinksWithoutAnchorText++;
        if (['click here', 'read more', 'learn more'].includes($(el).text().toLowerCase().trim())) {
            results.linkMetrics.nonDescriptiveAnchorText++;
        }
    });
}

// Update security metrics
function updateSecurityMetrics(testUrl, headers, results) {
    if (testUrl.startsWith('http:')) results.securityMetrics.httpUrls++;
    if (!headers['strict-transport-security']) results.securityMetrics.missingHstsHeader++;
    if (!headers['content-security-policy']) results.securityMetrics.missingContentSecurityPolicy++;
    if (!headers['x-frame-options']) results.securityMetrics.missingXFrameOptions++;
    if (!headers['x-content-type-options']) results.securityMetrics.missingXContentTypeOptions++;
}

// Update hreflang metrics
function updateHreflangMetrics($, results) {
    const hreflangTags = $('link[rel="alternate"][hreflang]');
    if (hreflangTags.length > 0) {
        results.hreflangMetrics.pagesWithHreflang++;
        // Additional hreflang checks could be added here
    }
}

// Update canonical metrics
function updateCanonicalMetrics($, testUrl, results) {
    const canonicalTag = $('link[rel="canonical"]');
    if (canonicalTag.length === 0) {
        results.canonicalMetrics.missing++;
    } else {
        const canonicalUrl = canonicalTag.attr('href');
        if (canonicalUrl === testUrl) {
            results.canonicalMetrics.selfReferencing++;
        } else {
            results.canonicalMetrics.nonSelf++;
        }
    }
}

// Update internal links
function updateInternalLinks(testUrl, internalLinks, results) {
    results.internalLinks.push({ url: testUrl, links: internalLinks });
}

// Update content analysis
function updateContentAnalysis(contentAnalysis, results) {
    if (contentAnalysis) {
        results.contentAnalysis.push(contentAnalysis);
        
        // Update content metrics
        const wordCount = contentAnalysis.wordCount || 0;
        if (wordCount < 300) {  // This threshold can be adjusted
            results.contentMetrics.lowContent++;
        }
        // Duplicate content check would require more complex analysis
    }
}

// Check for orphaned URLs
function checkOrphanedUrls(internalLinks, sitemapUrls, results) {
    internalLinks.forEach(link => {
        const strippedLink = link.split('#')[0];  // Remove fragment identifier
        if (!sitemapUrls.has(strippedLink) && !strippedLink.endsWith('.pdf')) {
            results.orphanedUrls.add(strippedLink);
        }
    });
}

// Handle URL processing error
function handleUrlProcessingError(testUrl, error, results) {
    console.error(`Error processing ${testUrl}:`, error.message);
    console.error('Error stack:', error.stack);
    ['pa11y', 'internalLinks', 'contentAnalysis'].forEach(report => {
        results[report].push({ url: testUrl, error: error.message });
    });
}

// Run pa11y test
async function runPa11yTest(testUrl, html, results) {
    try {
        const pa11yResult = await pa11y(testUrl, { ...pa11yOptions, html });
        results.pa11y.push({ url: testUrl, issues: pa11yResult.issues });
    } catch (error) {
        console.error(`Error running pa11y test for ${testUrl}:`, error.message);
        results.pa11y.push({ url: testUrl, error: error.message });
    }
}


async function runTestsOnSitemap(sitemapUrl, outputDir, limit = -1) {
    debug(`Starting process for sitemap or page: ${sitemapUrl}`);
    debug(`Results will be saved to: ${outputDir}`);

    try {
        await validateAndPrepare(sitemapUrl, outputDir);
        const urls = await getUrlsFromSitemap(sitemapUrl, limit);
        const results = await processUrls(urls, sitemapUrl);
        await postProcessResults(results, outputDir);
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
    console.info(`Found ${urls.length} URL(s) to process`);

    if (urls.length === 0) {
        throw new Error('No valid URLs found to process');
    }

    return limit === -1 ? urls : urls.slice(0, limit);
}

async function processUrls(urls, sitemapUrl) {
    const totalTests = urls.length;
    console.info(`Testing ${totalTests} URL(s)${totalTests === urls.length ? ' (all URLs)' : ''}`);

    const baseUrl = new URL(urls[0]).origin;
    const sitemapUrls = new Set(urls.map(url => url.split('#')[0])); // Strip fragment identifiers

    let results = initializeResults();

    for (let i = 0; i < urls.length; i++) {
        if (isShuttingDown) break;
        const testUrl = fixUrl(urls[i]);
        console.info(`Processing ${i + 1} of ${totalTests}: ${testUrl}`);
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
            await analyzePageContent(testUrl, html, jsErrors, baseUrl, sitemapUrls, results, headers);
        }

        debug(`Completed testing: ${testUrl}`);
    } catch (error) {
        handleUrlProcessingError(testUrl, error, results);
    }
}

async function analyzePageContent(testUrl, html, jsErrors, baseUrl, sitemapUrls, results, headers) {
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

async function postProcessResults(results, outputDir) {
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
    console.info(`Saving results to: ${outputDir}`);
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
        debug('\nGraceful shutdown initiated...');
        isShuttingDown = true;

        // Wait a moment to allow the current operation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        debug('Saving partial results...');
        await saveResults(results, outputDir);

        console.info('Shutdown complete. Exiting...');
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



function initializeResults() {
    return {
        pa11y: [],
        internalLinks: [],
        contentAnalysis: [],
        orphanedUrls: new Set(),
        urlMetrics: {
            total: 0,
            internal: 0,
            external: 0,
            internalIndexable: 0,
            internalNonIndexable: 0,
            nonAscii: 0,
            uppercase: 0,
            underscores: 0,
            containsSpace: 0,
            overLength: 0
        },
        responseCodeMetrics: {},
        titleMetrics: {
            missing: 0,
            duplicate: 0,
            tooLong: 0,
            tooShort: 0,
            pixelWidth: {}
        },
        metaDescriptionMetrics: {
            missing: 0,
            duplicate: 0,
            tooLong: 0,
            tooShort: 0,
            pixelWidth: {}
        },
        h1Metrics: {
            missing: 0,
            duplicate: 0,
            tooLong: 0,
            multiple: 0
        },
        h2Metrics: {
            missing: 0,
            duplicate: 0,
            tooLong: 0,
            multiple: 0,
            nonSequential: 0
        },
        imageMetrics: {
            total: 0,
            missingAlt: 0,
            missingAltAttribute: 0,
            altTextTooLong: 0
        },
        linkMetrics: {
            pagesWithoutInternalOutlinks: 0,
            pagesWithHighExternalOutlinks: 0,
            internalOutlinksWithoutAnchorText: 0,
            nonDescriptiveAnchorText: 0
        },
        securityMetrics: {
            httpUrls: 0,
            missingHstsHeader: 0,
            missingContentSecurityPolicy: 0,
            missingXFrameOptions: 0,
            missingXContentTypeOptions: 0
        },
        hreflangMetrics: {
            pagesWithHreflang: 0,
            missingReturnLinks: 0,
            incorrectLanguageCodes: 0
        },
        canonicalMetrics: {
            missing: 0,
            selfReferencing: 0,
            nonSelf: 0
        },
        contentMetrics: {
            lowContent: 0,
            duplicate: 0
        }
    };
}

function generateReport(results, sitemapUrl) {
    const responseCategories = categorizeResponseCodes(results.responseCodeMetrics);
    const reportData = [
        ...generateHeader(),
        ...generateSummary(results, responseCategories),
        ...generateUrlAnalysis(results),
        ...generatePageTitleAnalysis(results),
        ...generateMetaDescriptionAnalysis(results),
        ...generateHeadingAnalysis(results),
        ...generateImageAnalysis(results),
        ...generateLinkAnalysis(results),
        ...generateSecurityAnalysis(results),
        ...generateHreflangAnalysis(results),
        ...generateCanonicalAnalysis(results),
        ...generateContentAnalysis(results),
        ...generateOrphanedUrlsAnalysis(results),
        ...generatePa11yAnalysis(results),
        ...generateJavaScriptErrorsAnalysis(results)
    ];

    return stringify(reportData);
}


function generatePageTitleAnalysis(results) {
    return [
        ['Page Titles'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Missing', safeCount(results.titleMetrics, 'missing'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Duplicate', safeCount(results.titleMetrics, 'duplicate'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Over 60 Characters', safeCount(results.titleMetrics, 'tooLong'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Below 30 Characters', safeCount(results.titleMetrics, 'tooShort'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Over 561 Pixels', safeCount(results.titleMetrics.pixelWidth, '561'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Below 200 Pixels', safeCount(results.titleMetrics.pixelWidth, '200'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        []
    ];
}

function categorizeResponseCodes(responseCodeMetrics) {
    const categories = {
        '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, 'other': 0
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

function generateHeader() {
    return [
        ['Date', new Date().toLocaleDateString()],
        ['Time', new Date().toLocaleTimeString()],
        [] // Empty row for spacing
    ];
}

function generateSummary(results, responseCategories) {
    return [
        ['Summary', 'URLs', '% of Total', 'Total URLs', 'Total URLs Description'],
        ...generateSummaryRows(results, responseCategories),
        [] // Empty row for spacing
    ];
}

function generateSummaryRows(results, responseCategories) {
    return [
        generateMetricRow('Total URLs Encountered', results.urlMetrics.total, results.urlMetrics.total, 'URLs Encountered'),
        generateMetricRow('Total Internal URLs', results.urlMetrics.internal, results.urlMetrics.total, 'URLs Encountered'),
        generateMetricRow('Total External URLs', results.urlMetrics.external, results.urlMetrics.total, 'URLs Encountered'),
        generateMetricRow('Total Internal Indexable URLs', results.urlMetrics.internalIndexable, results.urlMetrics.total, 'URLs Encountered'),
        generateMetricRow('Total Internal Non-Indexable URLs', results.urlMetrics.internalNonIndexable, results.urlMetrics.total, 'URLs Encountered'),
        [],
        ['Response Codes'],
        generateMetricRow('All', results.urlMetrics.total, results.urlMetrics.total, 'All Internal & External Crawled URLs'),
        generateMetricRow('Success (2xx)', responseCategories['2xx'], results.urlMetrics.total, 'All Internal & External Crawled URLs'),
        generateMetricRow('Redirection (3xx)', responseCategories['3xx'], results.urlMetrics.total, 'All Internal & External Crawled URLs'),
        generateMetricRow('Client Error (4xx)', responseCategories['4xx'], results.urlMetrics.total, 'All Internal & External Crawled URLs'),
        generateMetricRow('Server Error (5xx)', responseCategories['5xx'], results.urlMetrics.total, 'All Internal & External Crawled URLs'),
        generateMetricRow('Other', responseCategories['other'], results.urlMetrics.total, 'All Internal & External Crawled URLs')
    ];
}

function generateMetricRow(label, count, total, description) {
    const percentage = safePercentage(count, total);
    return [label, count, `${percentage}%`, total, description];
}

function generateUrlAnalysis(results) {
    return [
        ['URL'],
        generateMetricRow('All', results.urlMetrics.internal, results.urlMetrics.internal, 'Internal URLs'),
        generateMetricRow('Non ASCII Characters', results.urlMetrics.nonAscii, results.urlMetrics.internal, 'Internal URLs'),
        generateMetricRow('Underscores', results.urlMetrics.underscores, results.urlMetrics.internal, 'Internal URLs'),
        generateMetricRow('Uppercase', results.urlMetrics.uppercase, results.urlMetrics.internal, 'Internal URLs'),
        generateMetricRow('Contains Space', results.urlMetrics.containsSpace, results.urlMetrics.internal, 'Internal URLs'),
        generateMetricRow('Over 115 Characters', results.urlMetrics.overLength, results.urlMetrics.internal, 'Internal URLs'),
        [] // Empty row for spacing
    ];
}
function generateMetaDescriptionAnalysis(results) {
    return [
        ['Meta Description'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Missing', safeCount(results.metaDescriptionMetrics, 'missing'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Duplicate', safeCount(results.metaDescriptionMetrics, 'duplicate'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Over 155 Characters', safeCount(results.metaDescriptionMetrics, 'tooLong'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Below 70 Characters', safeCount(results.metaDescriptionMetrics, 'tooShort'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Over 985 Pixels', safeCount(results.metaDescriptionMetrics.pixelWidth, '985'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Below 400 Pixels', safeCount(results.metaDescriptionMetrics.pixelWidth, '400'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        []
    ];
}

function generateHeadingAnalysis(results) {
    return [
        ['H1'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Missing', safeCount(results.h1Metrics, 'missing'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Duplicate', safeCount(results.h1Metrics, 'duplicate'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Over 70 Characters', safeCount(results.h1Metrics, 'tooLong'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Multiple', safeCount(results.h1Metrics, 'multiple'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        [],
        ['H2'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Missing', safeCount(results.h2Metrics, 'missing'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Duplicate', safeCount(results.h2Metrics, 'duplicate'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Over 70 Characters', safeCount(results.h2Metrics, 'tooLong'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Multiple', safeCount(results.h2Metrics, 'multiple'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Non-Sequential', safeCount(results.h2Metrics, 'nonSequential'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        []
    ];
}

function generateImageAnalysis(results) {
    return [
        ['Images'],
        generateMetricRow('All', safeCount(results.imageMetrics, 'total'), safeCount(results.imageMetrics, 'total'), 'Images'),
        generateMetricRow('Missing Alt Text', safeCount(results.imageMetrics, 'missingAlt'), safeCount(results.imageMetrics, 'total'), 'Images'),
        generateMetricRow('Missing Alt Attribute', safeCount(results.imageMetrics, 'missingAltAttribute'), safeCount(results.imageMetrics, 'total'), 'Images'),
        generateMetricRow('Alt Text Over 100 Characters', safeCount(results.imageMetrics, 'altTextTooLong'), safeCount(results.imageMetrics, 'total'), 'Images'),
        []
    ];
}

function generateLinkAnalysis(results) {
    return [
        ['Links'],
        generateMetricRow('Pages Without Internal Outlinks', safeCount(results.linkMetrics, 'pagesWithoutInternalOutlinks'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Pages With High External Outlinks', safeCount(results.linkMetrics, 'pagesWithHighExternalOutlinks'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Internal Outlinks With No Anchor Text', safeCount(results.linkMetrics, 'internalOutlinksWithoutAnchorText'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Non-Descriptive Anchor Text In Internal Outlinks', safeCount(results.linkMetrics, 'nonDescriptiveAnchorText'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        []
    ];
}

function generateSecurityAnalysis(results) {
    return [
        ['Security'],
        generateMetricRow('HTTP URLs', safeCount(results.securityMetrics, 'httpUrls'), safeCount(results.urlMetrics, 'total'), 'All URLs'),
        generateMetricRow('Missing HSTS Header', safeCount(results.securityMetrics, 'missingHstsHeader'), safeCount(results.urlMetrics, 'total'), 'All URLs'),
        generateMetricRow('Missing Content-Security-Policy Header', safeCount(results.securityMetrics, 'missingContentSecurityPolicy'), safeCount(results.urlMetrics, 'total'), 'All URLs'),
        generateMetricRow('Missing X-Frame-Options Header', safeCount(results.securityMetrics, 'missingXFrameOptions'), safeCount(results.urlMetrics, 'total'), 'All URLs'),
        generateMetricRow('Missing X-Content-Type-Options Header', safeCount(results.securityMetrics, 'missingXContentTypeOptions'), safeCount(results.urlMetrics, 'total'), 'All URLs'),
        []
    ];
}

function generateHreflangAnalysis(results) {
    return [
        ['Hreflang'],
        generateMetricRow('Contains hreflang', safeCount(results.hreflangMetrics, 'pagesWithHreflang'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Missing Return Links', safeCount(results.hreflangMetrics, 'missingReturnLinks'), safeCount(results.hreflangMetrics, 'pagesWithHreflang'), 'Pages with hreflang'),
        generateMetricRow('Incorrect Language & Region Codes', safeCount(results.hreflangMetrics, 'incorrectLanguageCodes'), safeCount(results.hreflangMetrics, 'pagesWithHreflang'), 'Pages with hreflang'),
        []
    ];
}

function generateCanonicalAnalysis(results) {
    return [
        ['Canonicals'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Contains Canonical', safeCount(results.canonicalMetrics, 'selfReferencing') + safeCount(results.canonicalMetrics, 'nonSelf'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Self Referencing', safeCount(results.canonicalMetrics, 'selfReferencing'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Canonicalised', safeCount(results.canonicalMetrics, 'nonSelf'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Missing', safeCount(results.canonicalMetrics, 'missing'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        []
    ];
}

function generateContentAnalysis(results) {
    return [
        ['Content'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Low Content Pages', safeCount(results.contentMetrics, 'lowContent'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        generateMetricRow('Near Duplicates', safeCount(results.contentMetrics, 'duplicate'), safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        []
    ];
}

function generateOrphanedUrlsAnalysis(results) {
    return [
        ['Orphaned URLs'],
        generateMetricRow('Orphaned URLs', results.orphanedUrls ? results.orphanedUrls.size : 0, safeCount(results.urlMetrics, 'internal'), 'Internal URLs'),
        []
    ];
}

function generatePa11yAnalysis(results) {
    const totalIssues = (results.pa11y || []).reduce((total, result) => total + (result.issues ? result.issues.length : 0), 0);
    return [
        ['Pa11y Accessibility Issues'],
        ['Total Issues', totalIssues],
        []
    ];
}

function generateJavaScriptErrorsAnalysis(results) {
    const pagesWithJsErrors = (results.contentAnalysis || []).filter(page => page && page.jsErrors && page.jsErrors.length > 0).length;
    return [
        ['JavaScript Errors'],
        generateMetricRow('Pages with JavaScript Errors', pagesWithJsErrors, safeCount(results.urlMetrics, 'internal'), 'Internal HTML pages'),
        []
    ];
}

function safeCount(obj, prop) {
    return obj && obj[prop] ? obj[prop] : 0;
}

function safePercentage(count, total) {
    return total ? ((count / total) * 100).toFixed(2) : '0.00';
}
// Set up command-line interface
program
    .requiredOption('-s, --sitemap <url>', 'URL of the sitemap to process')
    .requiredOption('-o, --output <directory>', 'Output directory for results')
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