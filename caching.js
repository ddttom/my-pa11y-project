import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import { calculateSeoScore } from './seo-scoring.js';

const CACHE_DIR = path.join(process.cwd(), '.cache');

function debug(message) 
{
   //  console.log(`[DEBUG] ${message}`);
}

function generateCacheKey(url) {
    const key = crypto.createHash('md5').update(url).digest('hex');
    debug(`Generated cache key for ${url}: ${key}`);
    return key;
}

async function ensureCacheDir() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        debug(`Cache directory ensured: ${CACHE_DIR}`);
    } catch (error) {
        console.error('Error creating cache directory:', error);
        throw error;
    }
}

async function getCachedData(url) {
    const cacheKey = generateCacheKey(url);
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    debug(`Attempting to read cache from: ${cachePath}`);
    try {
        const cachedData = await fs.readFile(cachePath, 'utf8');
        console.info(`Cache hit for ${url}`);
        return JSON.parse(cachedData);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Error reading cache for ${url}:`, error);
        } else {
            console.info(`Cache miss for ${url}`);
        }
        return null;
    }
}

async function renderAndCacheData(url) {
    let browser;
    try {
        debug(`Starting to render ${url}`);
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: null,
        });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        await page.setViewport({ width: 1280, height: 800 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
        });
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'language', {
                get: function() {
                    return 'en-US';
                }
            });
            Object.defineProperty(navigator, 'languages', {
                get: function() {
                    return ['en-US', 'en'];
                }
            });
        });
        
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
        
        debug(`Navigating to ${url}`);
        const response = await page.goto(url, { waitUntil: 'networkidle0' });
        debug(`Waited for network idle on ${url}`);
        
        const statusCode = response.status();
        const headers = response.headers();
        debug(`Received status code ${statusCode} for ${url}`);
        
        debug(`Waiting for 3 seconds to allow for JS execution on ${url}`);
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
        debug(`3 second wait completed for ${url}`);
        
        const renderedHtml = await page.content();
        debug(`Content extracted for ${url}`);
        
        const pageData = await page.evaluate(() => {
            const decodeHtmlEntities = (text) => {
                const doc = new DOMParser().parseFromString(text, 'text/html');
                return doc.documentElement.textContent;
            };

            // Function to extract date from meta tags or parse date strings
            const extractDate = (selector) => {
                const element = document.querySelector(selector);
                if (element) {
                    const dateString = element.getAttribute('content') || element.textContent;
                    const parsedDate = new Date(dateString);
                    return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
                }
                return null;
            };

            // Try to find last modified date
            const lastModified = extractDate('meta[property="article:modified_time"]') ||
                                 extractDate('meta[property="og:updated_time"]') ||
                                 extractDate('time[itemprop="dateModified"]') ||
                                 document.lastModified;

            return {
                title: decodeHtmlEntities(document.title),
                metaDescription: decodeHtmlEntities(document.querySelector('meta[name="description"]')?.content || ''),
                h1: decodeHtmlEntities(Array.from(document.querySelectorAll('h1')).map(h1 => h1.textContent.trim()).join('; ')),
                wordCount: document.body.innerText.trim().split(/\s+/).length,
                hasResponsiveMetaTag: !!document.querySelector('meta[name="viewport"]'),
                images: Array.from(document.images).map(img => ({
                    src: img.src,
                    alt: decodeHtmlEntities(img.alt)
                })),
                internalLinks: Array.from(document.links).filter(link => link.hostname === window.location.hostname).length,
                structuredData: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(script => script.textContent),
                openGraphTags: Object.fromEntries(
                    Array.from(document.querySelectorAll('meta[property^="og:"]')).map(tag => [tag.getAttribute('property'), decodeHtmlEntities(tag.content)])
                ),
                twitterTags: Object.fromEntries(
                    Array.from(document.querySelectorAll('meta[name^="twitter:"]')).map(tag => [tag.getAttribute('name'), decodeHtmlEntities(tag.content)])
                ),
                h1Count: document.querySelectorAll('h1').length,
                h2Count: document.querySelectorAll('h2').length,
                h3Count: document.querySelectorAll('h3').length,
                h4Count: document.querySelectorAll('h4').length,
                h5Count: document.querySelectorAll('h5').length,
                h6Count: document.querySelectorAll('h6').length,
                scriptsCount: document.querySelectorAll('script').length,
                stylesheetsCount: document.querySelectorAll('link[rel="stylesheet"]').length,
                htmlLang: document.documentElement.lang,
                canonicalUrl: document.querySelector('link[rel="canonical"]')?.href,
                formsCount: document.querySelectorAll('form').length,
                tablesCount: document.querySelectorAll('table').length,
                pageSize: document.documentElement.outerHTML.length,
                lastModified: lastModified
            };
        });

        const seoScore = calculateSeoScore({
            ...pageData,
            url: url,
            jsErrors: jsErrors
        });
        
        const data = {
            html: renderedHtml,
            jsErrors: jsErrors,
            statusCode: statusCode,
            headers: headers,
            pageData: pageData,
            seoScore: seoScore,
            lastCrawled: new Date().toISOString()
        };
        
        await setCachedData(url, data);
        
        debug(`Successfully rendered, scored, and cached ${url}`);
        return data;
    } catch (error) {
        console.error(`Error rendering and caching ${url}:`, error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            debug(`Browser closed for ${url}`);
        }
    }
}

async function setCachedData(url, data) {
    const cacheKey = generateCacheKey(url);
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    debug(`Attempting to write cache to: ${cachePath}`);
    try {
        const jsonString = JSON.stringify(data, (key, value) => {
            if (typeof value === 'string') {
                return value.normalize('NFC');
            }
            return value;
        }, 2);
        await fs.writeFile(cachePath, jsonString, 'utf8');
        debug(`Cache written for ${url}`);
    } catch (error) {
        console.error(`Error writing cache for ${url}:`, error);
        throw error;
    }
}

async function getOrRenderData(url) {
    debug(`getOrRenderData called for ${url}`);
    let cachedData = await getCachedData(url);
    if (cachedData) {
        cachedData.contentFreshness = analyzeContentFreshness(cachedData);
        debug(`Returning cached data for ${url}`);
        return cachedData;
    }
    debug(`No cache found, rendering data for ${url}`);
    const newData = await renderAndCacheData(url);
    newData.contentFreshness = analyzeContentFreshness(newData);
    return newData;
}

function analyzeContentFreshness(data) {
    const now = new Date();
    const lastModified = data.pageData.lastModified ? new Date(data.pageData.lastModified) : null;
    const lastCrawled = new Date(data.lastCrawled);

    let freshness = {
        lastModifiedDate: lastModified ? lastModified.toISOString() : 'Unknown',
        daysSinceLastModified: lastModified ? Math.floor((now - lastModified) / (1000 * 60 * 60 * 24)) : null,
        lastCrawledDate: lastCrawled.toISOString(),
        daysSinceLastCrawled: Math.floor((now - lastCrawled) / (1000 * 60 * 60 * 24)),
        freshnessStatus: 'Unknown'
    };

    if (freshness.daysSinceLastModified !== null) {
        if (freshness.daysSinceLastModified <= 7) {
            freshness.freshnessStatus = 'Very Fresh';
        } else if (freshness.daysSinceLastModified <= 30) {
            freshness.freshnessStatus = 'Fresh';
        } else if (freshness.daysSinceLastModified <= 90) {
            freshness.freshnessStatus = 'Moderately Fresh';
        } else {
            freshness.freshnessStatus = 'Stale';
        }
    } else {
        // If we can't determine the last modified date, use the last crawled date
        if (freshness.daysSinceLastCrawled <= 7) {
            freshness.freshnessStatus = 'Potentially Fresh';
        } else if (freshness.daysSinceLastCrawled <= 30) {
            freshness.freshnessStatus = 'Potentially Moderately Fresh';
        } else {
            freshness.freshnessStatus = 'Potentially Stale';
        }
    }

    return freshness;
}

export { ensureCacheDir, getOrRenderData };