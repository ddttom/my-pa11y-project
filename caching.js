import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import { calculateSeoScore } from './seo-scoring.js'; // Assume we've moved the SEO scoring to a separate file

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
        
        // Extract necessary data for SEO score calculation
        const pageData = await page.evaluate(() => {
            return {
                title: document.title,
                metaDescription: document.querySelector('meta[name="description"]')?.content,
                h1: document.querySelector('h1')?.textContent,
                wordCount: document.body.innerText.trim().split(/\s+/).length,
                hasResponsiveMetaTag: !!document.querySelector('meta[name="viewport"]'),
                images: Array.from(document.images).map(img => ({
                    src: img.src,
                    alt: img.alt
                })),
                internalLinks: Array.from(document.links).filter(link => link.hostname === window.location.hostname).length,
                structuredData: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(script => script.textContent),
                openGraphTags: Object.fromEntries(
                    Array.from(document.querySelectorAll('meta[property^="og:"]')).map(tag => [tag.getAttribute('property'), tag.content])
                ),
                twitterTags: Object.fromEntries(
                    Array.from(document.querySelectorAll('meta[name^="twitter:"]')).map(tag => [tag.getAttribute('name'), tag.content])
                )
            };
        });

        // Calculate SEO score
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
            seoScore: seoScore
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
        await fs.writeFile(cachePath, JSON.stringify(data));
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
        debug(`Returning cached data for ${url}`);
        return cachedData;
    }
    debug(`No cache found, rendering data for ${url}`);
    return await renderAndCacheData(url);
}

export { ensureCacheDir, getOrRenderData };