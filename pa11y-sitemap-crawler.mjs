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
import { calculateSeoScore } from './seo-scoring.js';
import { saveContentAnalysis } from './content-analysis.js';
import { generateSitemap } from './sitemap-generator.js';
import pa11yOptions  from './pa11y-options.js';

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


const axiosInstance = axios.create({
    headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
});

function fixUrl(url) {
    if (!url) return '';
    return url.replace(/([^:]\/)\/+/g, "$1");
}
async function fetchAndParseSitemap(sitemapPath) {
    debug(`Fetching content from: ${sitemapPath}`);
    try {
        let content;
        if (isUrl(sitemapPath)) {
            const response = await axios.get(sitemapPath);
            content = response.data;
        } else {
            content = await fs.readFile(sitemapPath, 'utf8');
        }
        
        debug('Content fetched successfully');
        
        // Check if the content is XML or HTML
        if (content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html')) {
            debug('Found HTML content instead of sitemap');
            return { html: content, url: sitemapPath };
        } else {
            debug('Parsing sitemap XML');
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(content);
            debug('Sitemap parsed successfully');
            return { xml: result };
        }
    } catch (error) {
        console.error(`Error fetching or parsing content from ${sitemapPath}:`, error.message);
        throw error;
    }
}

function isUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
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

async function analyzePerformance(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'networkidle0'});

    const performanceMetrics = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0].startTime,
        firstContentfulPaint: performance.getEntriesByType('paint')[1].startTime
      };
    });

    await browser.close();
    return performanceMetrics;
  }


  async function analyzeContent(html, pageUrl, jsErrors = []) {
    debug(`Analyzing content of: ${pageUrl}`);
    try {
        const $ = cheerio.load(html);
        
        const basicInfo = extractBasicInfo($);
        const { headings, headingErrors } = analyzeHeadings($);
        const imageAnalysis = analyzeImages($, pageUrl);
        const keywordAnalysis = analyzeKeywords($);
        const resourceAnalysis = analyzeResources($);
        const schemaAnalysis = analyzeSchema($, pageUrl);
        const metaTagAnalysis = analyzeMetaTags($);
        const structuredDataAnalysis = analyzeStructuredData($, pageUrl);
        const formAnalysis = analyzeForms($);
        const tableAnalysis = analyzeTables($);

        const result = {
            url: pageUrl,
            ...basicInfo,
            ...headings,
            headingErrors,
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

        // console.log('Content analysis result:', JSON.stringify(result, null, 2));
        debug(`Content analysis completed for: ${pageUrl}`);
        return result;
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
    const headings = {
        h1: 0,
        h2: 0,
        h3: 0,
        h4: 0,
        h5: 0,
        h6: 0
    };
    const headingErrors = [];

    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(h => {
        headings[h] = $(h).length;
    });

    if (headings.h1 === 0) {
        headingErrors.push("No H1 element found on the page.");
    } else if (headings.h1 > 1) {
        headingErrors.push(`Multiple H1 elements found: ${headings.h1}`);
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

    // console.log('Heading analysis result:', { headings, headingErrors });
    return { headings, headingErrors };
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

  
async function saveImagesWithoutAlt(contentAnalysis, outputDir) {
    let imagesWithoutAlt = [];
    
    if (Array.isArray(contentAnalysis)) {
        imagesWithoutAlt = contentAnalysis.flatMap(page => page.imagesWithoutAlt || []);
    } else if (contentAnalysis && typeof contentAnalysis === 'object') {
        // If contentAnalysis is an object, try to extract imagesWithoutAlt directly
        imagesWithoutAlt = contentAnalysis.imagesWithoutAlt || [];
    } else {
        console.warn('contentAnalysis is neither an array nor an object. No images without alt text will be saved.');
    }
    
    if (imagesWithoutAlt.length > 0) {
        const headers = ['url', 'src', 'location'];
        const imagesWithoutAltCsv = formatCsv(imagesWithoutAlt, headers);
        
        try {
            await fs.writeFile(path.join(outputDir, 'images_without_alt.csv'), imagesWithoutAltCsv, 'utf8');
            console.log('Images without alt text saved');
        } catch (error) {
            console.error('Error saving images without alt text:', error);
        }
    } else {
        console.log('No images without alt text found');
    }
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
    let results = initializeResults();
    debug(`Starting process for sitemap or page: ${sitemapUrl}`);
    debug(`Results will be saved to: ${outputDir}`);

    try {
        await validateAndPrepare(sitemapUrl, outputDir);
        const urls = await getUrlsFromSitemap(sitemapUrl, limit);

        // Extract the hostname and protocol from the sitemapUrl
        const parsedUrl = new URL(isUrl(sitemapUrl) ? sitemapUrl : `file://${path.resolve(sitemapUrl)}`);
        const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

        results = await processUrls(urls, baseUrl, results);
        await postProcessResults(results, outputDir);
        await saveResults(results, outputDir, sitemapUrl);
        await generateSitemap(results, outputDir, baseUrl);
        return results;
    } catch (error) {
        handleError(error, outputDir, results);
    }
}


async function validateAndPrepare(sitemapUrl, outputDir) {
    await validateUrl(sitemapUrl);
    await createDirectories(outputDir);
}

async function createDirectories(outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
    await ensureCacheDir();
    debug(`Output and cache directories created`);
}
async function validateUrl(url) {
    console.log(`Validating URL: ${url}`);
    if (!isUrl(url)) {
        const absolutePath = path.resolve(process.cwd(), url);
        console.log(`Resolved absolute path: ${absolutePath}`);
        try {
            const stats = await fs.stat(absolutePath);
            if (stats.isFile()) {
                console.log(`File found at: ${absolutePath}`);
                return absolutePath;
            } else {
                throw new Error('Path exists but is not a file');
            }
        } catch (error) {
            console.error(`Error accessing file: ${error.message}`);
            throw new Error(`Invalid sitemap URL or file path: ${url}. Error: ${error.message}`);
        }
    }
    return url;
} 
async function getUrlsFromSitemap(sitemapUrl, limit) {
    const parsedContent = await fetchAndParseSitemap(sitemapUrl);
    const urls = await extractUrls(parsedContent);
    console.info(`Found ${urls.length} URL(s)`);

    if (urls.length === 0) {
        throw new Error('No valid URLs found to process');
    }

    return limit === -1 ? urls : urls.slice(0, limit);
}

async function processUrls(urls, sitemapUrl) {
    const totalTests = urls.length;
    console.info(`Testing ${totalTests} URL(s)${totalTests === urls.length ? '' : ''}`);

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
        let { html, jsErrors, statusCode, headers, pageData } = await getOrRenderData(testUrl);
        updateUrlMetrics(testUrl, baseUrl, html, statusCode, results);
        updateResponseCodeMetrics(statusCode, results);

        if (statusCode === 200) {
            const $ = cheerio.load(html);
            const internalLinks = await getInternalLinks(html, testUrl, baseUrl);
            
             // Merge pageData with additional data
             const enhancedPageData = {
                ...pageData,
                url: testUrl,
                internalLinks: internalLinks,
                hasResponsiveMetaTag: $('meta[name="viewport"]').length > 0,
                openGraphTags: $('meta[property^="og:"]').length > 0,
                twitterTags: $('meta[name^="twitter:"]').length > 0
            };

            await analyzePageContent(testUrl, html, jsErrors, baseUrl, sitemapUrls, results, headers, enhancedPageData);
            
            const performanceMetrics = await analyzePerformance(testUrl);
            results.performanceAnalysis.push({ url: testUrl, ...performanceMetrics });

            const seoScore = calculateSeoScore({
                ...enhancedPageData,
                performanceMetrics: performanceMetrics
            });
            
            results.seoScores.push({
                url: testUrl,
                score: seoScore.score, // Make sure this is included
                details: seoScore.details
            });
        }
        debug(`Completed testing: ${testUrl}`);
    } catch (error) {
        handleUrlProcessingError(testUrl, error, results);
    }
}

async function analyzePageContent(testUrl, html, jsErrors, baseUrl, sitemapUrls, results, headers, pageData) {
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
    
    // Use the cached pageData instead of re-analyzing
    const contentAnalysis = {
        url: testUrl,
        ...pageData,
        jsErrors: jsErrors
    };
    
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
    const saveOperations = [
        { name: 'Pa11y results', func: savePa11yResults },
        { name: 'Internal links', func: saveInternalLinks },
        { name: 'Images without alt', func: saveImagesWithoutAlt },
        { name: 'Content analysis', func: saveContentAnalysis },
        { name: 'Orphaned URLs', func: saveOrphanedUrls },
        { name: 'SEO report', func: saveSeoReport },
        { name: 'SEO scores', func: saveSeoScores },
        { name: 'Performance analysis', func: savePerformanceAnalysis },
        { name: 'SEO scores summary', func: saveSeoScoresSummary }
    ];

    for (const operation of saveOperations) {
        try {
            if (operation.name === 'Orphaned URLs') {
                await operation.func(results.contentAnalysis, outputDir);
            } else if (operation.name === 'SEO report') {
                await operation.func(results, outputDir, sitemapUrl);
            } else {
                await operation.func(results, outputDir);
            }
            debug(`${operation.name} saved successfully`);
        } catch (error) {
            console.error(`Error saving ${operation.name}:`, error.message);
        }
    }

    debug(`All results saved to ${outputDir}`);
}

async function saveSeoScores(results, outputDir) {
    const seoScoresFormatted = results.seoScores.map(score => {
        const roundedScore = {};
        for (const [key, value] of Object.entries(score)) {
            if (key === 'url') {
                roundedScore[key] = value;
            } else if (key === 'details') {
                roundedScore[key] = {};
                for (const [detailKey, detailValue] of Object.entries(value)) {
                    roundedScore[key][detailKey] = typeof detailValue === 'number' 
                        ? Number(detailValue.toFixed(2)) 
                        : detailValue;
                }
            } else {
                roundedScore[key] = typeof value === 'number' 
                    ? Number(value.toFixed(2)) 
                    : value;
            }
        }
        return {
            url: roundedScore.url,
            score: roundedScore.score,
            'details.titleOptimization': roundedScore.details.titleOptimization,
            'details.metaDescriptionOptimization': roundedScore.details.metaDescriptionOptimization,
            'details.urlStructure': roundedScore.details.urlStructure,
            'details.h1Optimization': roundedScore.details.h1Optimization,
            'details.contentLength': roundedScore.details.contentLength,
            'details.internalLinking': roundedScore.details.internalLinking,
            'details.imageOptimization': roundedScore.details.imageOptimization,
            'details.pageSpeed': roundedScore.details.pageSpeed,
            'details.mobileOptimization': roundedScore.details.mobileOptimization,
            'details.securityFactors': roundedScore.details.securityFactors,
            'details.structuredData': roundedScore.details.structuredData,
            'details.socialMediaTags': roundedScore.details.socialMediaTags
        };
    });

    const seoScoresCsv = formatCsv(seoScoresFormatted, 
        ['url', 'score', 'details.titleOptimization', 'details.metaDescriptionOptimization',
         'details.urlStructure', 'details.h1Optimization', 'details.contentLength', 'details.internalLinking',
         'details.imageOptimization', 'details.pageSpeed', 'details.mobileOptimization', 'details.securityFactors',
         'details.structuredData', 'details.socialMediaTags']);
    await fs.writeFile(path.join(outputDir, 'seo_scores.csv'), seoScoresCsv);
    debug('SEO scores saved');
}

async function saveSeoScoresSummary(results, outputDir) {
    // Check if seoScores exist and have data
    if (!results.seoScores || results.seoScores.length === 0) {
        console.warn('No SEO scores available to summarize.');
        return; // Exit the function early if there are no scores
    }

    const getScoreComment = (score) => {
        if (score >= 80) return 'Good';
        if (score >= 60) return 'Medium';
        return 'Needs Improvement';
    };

    const sumScores = results.seoScores.reduce((sum, score) => {
        sum.totalScore += score.score || 0;
        if (score.details) {
            for (const [key, value] of Object.entries(score.details)) {
                sum.details[key] = (sum.details[key] || 0) + (value || 0);
            }
        }
        return sum;
    }, { totalScore: 0, details: {} });

    const urlCount = results.seoScores.length;
    const averageScores = {
        overallScore: sumScores.totalScore / urlCount,
        details: {}
    };

    for (const [key, value] of Object.entries(sumScores.details)) {
        averageScores.details[key] = value / urlCount;
    }

    const summaryData = [
        ['Metric', 'Average Score', 'Comment'],
        ['Overall SEO Score', averageScores.overallScore.toFixed(2), getScoreComment(averageScores.overallScore)]
    ];

    // Add detailed scores only if they exist
    const detailKeys = [
        'titleOptimization', 'metaDescriptionOptimization', 'urlStructure', 'h1Optimization',
        'contentLength', 'internalLinking', 'imageOptimization', 'pageSpeed', 'mobileOptimization',
        'securityFactors', 'structuredData', 'socialMediaTags'
    ];

    for (const key of detailKeys) {
        if (averageScores.details[key] !== undefined) {
            const score = averageScores.details[key];
            summaryData.push([
                key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), // Convert camelCase to Title Case
                score.toFixed(2),
                getScoreComment(score)
            ]);
        }
    }

    const seoScoresSummaryCsv = formatCsv(summaryData);
    await fs.writeFile(path.join(outputDir, 'seo_scores_summary.csv'), seoScoresSummaryCsv);
    debug('SEO scores summary saved');
}

async function savePerformanceAnalysis(results, outputDir) {
    const roundedPerformanceAnalysis = results.performanceAnalysis.map(entry => {
        const loadTime = Number(entry.loadTime.toFixed(2));
        const domContentLoaded = Number(entry.domContentLoaded.toFixed(2));
        const firstPaint = Number(entry.firstPaint.toFixed(2));
        const firstContentfulPaint = Number(entry.firstContentfulPaint.toFixed(2));

        // Function to determine performance comment
        const getPerformanceComment = (metric, thresholds) => {
            if (metric <= thresholds.good) return 'Good';
            if (metric <= thresholds.medium) return 'Medium';
            return 'Improvement required';
        };

        // Thresholds for each metric (in milliseconds)
        const thresholds = {
            loadTime: { good: 2000, medium: 3000 },
            domContentLoaded: { good: 1000, medium: 2000 },
            firstPaint: { good: 1000, medium: 2000 },
            firstContentfulPaint: { good: 1500, medium: 2500 }
        };

        // Generate comments
        const loadTimeComment = getPerformanceComment(loadTime, thresholds.loadTime);
        const domContentLoadedComment = getPerformanceComment(domContentLoaded, thresholds.domContentLoaded);
        const firstPaintComment = getPerformanceComment(firstPaint, thresholds.firstPaint);
        const firstContentfulPaintComment = getPerformanceComment(firstContentfulPaint, thresholds.firstContentfulPaint);

        return {
            url: entry.url,
            loadTime,
            loadTimeComment,
            domContentLoaded,
            domContentLoadedComment,
            firstPaint,
            firstPaintComment,
            firstContentfulPaint,
            firstContentfulPaintComment
        };
    });

    const performanceAnalysisCsv = formatCsv(roundedPerformanceAnalysis, 
        ['url', 'loadTime', 'loadTimeComment', 'domContentLoaded', 'domContentLoadedComment', 
         'firstPaint', 'firstPaintComment', 'firstContentfulPaint', 'firstContentfulPaintComment']);
    await fs.writeFile(path.join(outputDir, 'performance_analysis.csv'), performanceAnalysisCsv);
    debug('Performance analysis saved with comments');
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
    await fs.writeFile(path.join(outputDir, 'seo_report.csv'), report);
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
        },
        seoScores: [],
        performanceAnalysis: []
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
        ...generateJavaScriptErrorsAnalysis(results),
        ...generateSeoScoreAnalysis(results),
        ...generatePerformanceAnalysis(results)
    ];

    // Round all numeric values in the report to 2 decimal places
    const roundedReportData = reportData.map(row => 
        row.map(cell => 
            typeof cell === 'number' ? Number(cell.toFixed(2)) : cell
        )
    );

    return stringify(roundedReportData)

}
function generateSeoScoreAnalysis(results) {
    const averageScore = results.seoScores.reduce((sum, score) => sum + score.score, 0) / results.seoScores.length;
    return [
        ['SEO Scores'],
        generateMetricRow('Average SEO Score', averageScore.toFixed(2)),
        generateMetricRow('URLs Analyzed', results.seoScores.length),
        []
    ];
}

function generatePerformanceAnalysis(results) {
    const averageLoadTime = results.performanceAnalysis.reduce((sum, perf) => sum + perf.loadTime, 0) / results.performanceAnalysis.length;
    return [
        ['Performance Analysis'],
        generateMetricRow('Average Load Time (ms)', averageLoadTime.toFixed(2)),
        generateMetricRow('URLs Analyzed', results.performanceAnalysis.length),
        []
    ];
}

function generatePageTitleAnalysis(results) {
    return [
        ['Page Titles'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal')),
        generateMetricRow('Missing', safeCount(results.titleMetrics, 'missing')),
        generateMetricRow('Duplicate', safeCount(results.titleMetrics, 'duplicate')),
        generateMetricRow('Over 60 Characters', safeCount(results.titleMetrics, 'tooLong')),
        generateMetricRow('Below 30 Characters', safeCount(results.titleMetrics, 'tooShort')),
        generateMetricRow('Over 561 Pixels', safeCount(results.titleMetrics.pixelWidth, '561')),
        generateMetricRow('Below 200 Pixels', safeCount(results.titleMetrics.pixelWidth, '200')),
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
        ['Summary', 'URLs'],
        ...generateSummaryRows(results, responseCategories),
        [] // Empty row for spacing
    ];
}

function generateSummaryRows(results, responseCategories) {
    return [
        generateMetricRow('Total URLs Encountered', results.urlMetrics.total),
        generateMetricRow('Total Internal URLs', results.urlMetrics.internal),
        generateMetricRow('Total External URLs', results.urlMetrics.external),
        generateMetricRow('Total Internal Indexable URLs', results.urlMetrics.internalIndexable),
        generateMetricRow('Total Internal Non-Indexable URLs', results.urlMetrics.internalNonIndexable),
        [],
        ['Response Codes'],
        generateMetricRow('All', results.urlMetrics.total),
        generateMetricRow('Success (2xx)', responseCategories['2xx']),
        generateMetricRow('Redirection (3xx)', responseCategories['3xx']),
        generateMetricRow('Client Error (4xx)', responseCategories['4xx']),
        generateMetricRow('Server Error (5xx)', responseCategories['5xx']),
        generateMetricRow('Other', responseCategories['other'])
    ];
}

function generateMetricRow(label, count) {
    return [label, count];
}


function generateUrlAnalysis(results) {
    return [
        ['URL'],
        generateMetricRow('All', results.urlMetrics.internal),
        generateMetricRow('Non ASCII Characters', results.urlMetrics.nonAscii),
        generateMetricRow('Underscores', results.urlMetrics.underscores),
        generateMetricRow('Uppercase', results.urlMetrics.uppercase),
        generateMetricRow('Contains Space', results.urlMetrics.containsSpace),
        generateMetricRow('Over 115 Characters', results.urlMetrics.overLength),
        []
    ];
}

function generateMetaDescriptionAnalysis(results) {
    return [
        ['Meta Description'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal')),
        generateMetricRow('Missing', safeCount(results.metaDescriptionMetrics, 'missing')),
        generateMetricRow('Duplicate', safeCount(results.metaDescriptionMetrics, 'duplicate')),
        generateMetricRow('Over 155 Characters', safeCount(results.metaDescriptionMetrics, 'tooLong')),
        generateMetricRow('Below 70 Characters', safeCount(results.metaDescriptionMetrics, 'tooShort')),
        generateMetricRow('Over 985 Pixels', safeCount(results.metaDescriptionMetrics.pixelWidth, '985')),
        generateMetricRow('Below 400 Pixels', safeCount(results.metaDescriptionMetrics.pixelWidth, '400')),
        []
    ];
}

function generateHeadingAnalysis(results) {
    return [
        ['H1'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal')),
        generateMetricRow('Missing', safeCount(results.h1Metrics, 'missing')),
        generateMetricRow('Duplicate', safeCount(results.h1Metrics, 'duplicate')),
        generateMetricRow('Over 70 Characters', safeCount(results.h1Metrics, 'tooLong')),
        generateMetricRow('Multiple', safeCount(results.h1Metrics, 'multiple')),
        [],
        ['H2'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal')),
        generateMetricRow('Missing', safeCount(results.h2Metrics, 'missing')),
        generateMetricRow('Duplicate', safeCount(results.h2Metrics, 'duplicate')),
        generateMetricRow('Over 70 Characters', safeCount(results.h2Metrics, 'tooLong')),
        generateMetricRow('Multiple', safeCount(results.h2Metrics, 'multiple')),
        generateMetricRow('Non-Sequential', safeCount(results.h2Metrics, 'nonSequential')),
        []
    ];
}

function generateImageAnalysis(results) {
    return [
        ['Images'],
        generateMetricRow('All', safeCount(results.imageMetrics, 'total')),
        generateMetricRow('Missing Alt Text', safeCount(results.imageMetrics, 'missingAlt')),
        generateMetricRow('Missing Alt Attribute', safeCount(results.imageMetrics, 'missingAltAttribute')),
        generateMetricRow('Alt Text Over 100 Characters', safeCount(results.imageMetrics, 'altTextTooLong')),
        []
    ];
}
function generateLinkAnalysis(results) {
    return [
        ['Links'],
        generateMetricRow('Pages Without Internal Outlinks', safeCount(results.linkMetrics, 'pagesWithoutInternalOutlinks')),
        generateMetricRow('Pages With High External Outlinks', safeCount(results.linkMetrics, 'pagesWithHighExternalOutlinks')),
        generateMetricRow('Internal Outlinks With No Anchor Text', safeCount(results.linkMetrics, 'internalOutlinksWithoutAnchorText')),
        generateMetricRow('Non-Descriptive Anchor Text In Internal Outlinks', safeCount(results.linkMetrics, 'nonDescriptiveAnchorText')),
        []
    ];
}

function generateSecurityAnalysis(results) {
    return [
        ['Security'],
        generateMetricRow('HTTP URLs', safeCount(results.securityMetrics, 'httpUrls')),
        generateMetricRow('Missing HSTS Header', safeCount(results.securityMetrics, 'missingHstsHeader')),
        generateMetricRow('Missing Content-Security-Policy Header', safeCount(results.securityMetrics, 'missingContentSecurityPolicy')),
        generateMetricRow('Missing X-Frame-Options Header', safeCount(results.securityMetrics, 'missingXFrameOptions')),
        generateMetricRow('Missing X-Content-Type-Options Header', safeCount(results.securityMetrics, 'missingXContentTypeOptions')),
        []
    ];
}

function generateHreflangAnalysis(results) {
    return [
        ['Hreflang'],
        generateMetricRow('Contains hreflang', safeCount(results.hreflangMetrics, 'pagesWithHreflang')),
        generateMetricRow('Missing Return Links', safeCount(results.hreflangMetrics, 'missingReturnLinks')),
        generateMetricRow('Incorrect Language & Region Codes', safeCount(results.hreflangMetrics, 'incorrectLanguageCodes')),
        []
    ];
}

function generateCanonicalAnalysis(results) {
    return [
        ['Canonicals'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal')),
        generateMetricRow('Contains Canonical', safeCount(results.canonicalMetrics, 'selfReferencing') + safeCount(results.canonicalMetrics, 'nonSelf')),
        generateMetricRow('Self Referencing', safeCount(results.canonicalMetrics, 'selfReferencing')),
        generateMetricRow('Canonicalised', safeCount(results.canonicalMetrics, 'nonSelf')),
        generateMetricRow('Missing', safeCount(results.canonicalMetrics, 'missing')),
        []
    ];
}

function generateContentAnalysis(results) {
    return [
        ['Content'],
        generateMetricRow('All', safeCount(results.urlMetrics, 'internal')),
        generateMetricRow('Low Content Pages', safeCount(results.contentMetrics, 'lowContent')),
        generateMetricRow('Near Duplicates', safeCount(results.contentMetrics, 'duplicate')),
        []
    ];
}

function generateOrphanedUrlsAnalysis(results) {
    return [
        ['Orphaned URLs'],
        generateMetricRow('Orphaned URLs', results.orphanedUrls ? results.orphanedUrls.size : 0),
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
        generateMetricRow('Pages with JavaScript Errors', pagesWithJsErrors),
        []
    ];
}

// Make sure to keep your safeCount function if it's still needed:
function safeCount(obj, prop) {
    return obj && obj[prop] ? obj[prop] : 0;
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