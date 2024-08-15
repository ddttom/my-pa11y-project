/* eslint-disable no-use-before-define */
// caching.mjs

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { calculateSeoScore } from './seoScoring';

const CACHE_DIR = path.join(process.cwd(), '.cache');

function generateCacheKey(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

export async function ensureCacheDir(options = {}) {
  try {
    if (options.forceDeleteCache) {
      global.auditcore.logger.debug(`Force delete cache option detected. Attempting to delete cache directory: ${CACHE_DIR}`);
      try {
        await fs.rm(CACHE_DIR, { recursive: true, force: true });
        global.auditcore.logger.debug('Cache directory deleted successfully');
      } catch (deleteError) {
        global.auditcore.logger.error(`Error deleting cache directory: ${deleteError.message}`);
        global.auditcore.logger.debug('Delete error stack:', deleteError.stack);
      }
    }

    await fs.mkdir(CACHE_DIR, { recursive: true });
    global.auditcore.logger.debug(`Cache directory ensured: ${CACHE_DIR}`);
  } catch (error) {
    global.auditcore.logger.error('Error managing cache directory:', error.message);
    global.auditcore.logger.debug('Error stack:', error.stack);
    throw error;
  }
}

export async function getCachedData(url) {
  const cacheKey = generateCacheKey(url);
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  global.auditcore.logger.debug(`Attempting to read cache from: ${cachePath}`);
  try {
    const cachedData = await fs.readFile(cachePath, 'utf8');
    global.auditcore.logger.debug(`Cache hit for ${url}`);
    return JSON.parse(cachedData);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      global.auditcore.logger.error(`Error reading cache for ${url}:`, error);
    } else {
      global.auditcore.logger.info(`Cache miss for ${url}`);
    }
    return null;
  }
}

async function setCachedData(url, data) {
  const cacheKey = generateCacheKey(url);
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  global.auditcore.logger.debug(`Attempting to write cache to: ${cachePath}`);
  try {
    const jsonString = JSON.stringify(data, (key, value) => (typeof value === 'string' ? value.normalize('NFC') : value), 2);
    await fs.writeFile(cachePath, jsonString, 'utf8');
    global.auditcore.logger.debug(`Cache written for ${url}`);
  } catch (error) {
    global.auditcore.logger.error(`Error writing cache for ${url}:`, error);
    throw error;
  }
}

export async function getOrRenderData(url, options = {}) {
  const { noPuppeteer = false, cacheOnly = false, noCache = false } = options;
  global.auditcore.logger.debug(`getOrRenderData called for ${url}`);

  if (!noCache) {
    const cachedData = await getCachedData(url);
    if (cachedData) {
      cachedData.contentFreshness = analyzeContentFreshness(cachedData);
      global.auditcore.logger.debug(`Returning cached data for ${url}`);
      return cachedData;
    }
  }

  if (cacheOnly) {
    global.auditcore.logger.warn(`No cached data available for ${url} and cache-only mode is enabled. Skipping this URL.`);
    return { html: null, statusCode: null };
  }

  global.auditcore.logger.debug(`No cache found or cache disabled, ${noPuppeteer ? 'fetching' : 'rendering'} data for ${url}`);
  try {
    const newData = noPuppeteer
      ? await fetchDataWithoutPuppeteer(url)
      : await renderAndCacheData(url);

    newData.contentFreshness = analyzeContentFreshness(newData);

    if (!noCache) {
      await setCachedData(url, newData);
    }

    return newData;
  } catch (error) {
    global.auditcore.logger.error(`Error ${noPuppeteer ? 'fetching' : 'rendering'} data for ${url}:`, error);
    return { html: null, statusCode: null, error: error.message };
  }
}

async function fetchDataWithoutPuppeteer(url) {
  try {
    global.auditcore.logger.debug(`Fetching data without Puppeteer for ${url}`);
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const extractDate = (selector) => {
      const element = $(selector);
      if (element.length) {
        const dateString = element.attr('content') || element.text();
        const parsedDate = new Date(dateString);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
      }
      return null;
    };

    const lastModified = extractDate('meta[property="article:modified_time"]')
      || extractDate('meta[property="og:updated_time"]')
      || extractDate('time[itemprop="dateModified"]')
      || response.headers['last-modified']
      || null;

    const pageData = {
      title: $('title').text(),
      metaDescription: $('meta[name="description"]').attr('content') || '',
      h1: $('h1').first().text(),
      wordCount: $('body').text().trim().split(/\s+/).length,
      hasResponsiveMetaTag: $('meta[name="viewport"]').length > 0,
      images: $('img')
        .map((i, el) => ({
          src: $(el).attr('src'),
          alt: $(el).attr('alt') || '',
        }))
        .get(),
      internalLinks: $(`a[href^="/"], a[href^="${url}"]`).length,
      structuredData: $('script[type="application/ld+json"]')
        .map((i, el) => $(el).html())
        .get(),
      openGraphTags: $('meta[property^="og:"]')
        .map((i, el) => ({
          [$(el).attr('property')]: $(el).attr('content'),
        }))
        .get(),
      twitterTags: $('meta[name^="twitter:"]')
        .map((i, el) => ({
          [$(el).attr('name')]: $(el).attr('content'),
        }))
        .get(),
      h1Count: $('h1').length,
      h2Count: $('h2').length,
      h3Count: $('h3').length,
      h4Count: $('h4').length,
      h5Count: $('h5').length,
      h6Count: $('h6').length,
      scriptsCount: $('script').length,
      stylesheetsCount: $('link[rel="stylesheet"]').length,
      htmlLang: $('html').attr('lang'),
      canonicalUrl: $('link[rel="canonical"]').attr('href'),
      formsCount: $('form').length,
      tablesCount: $('table').length,
      pageSize: html.length,
      lastModified,
    };

    const data = {
      html,
      jsErrors: [], // We can't capture JS errors without Puppeteer
      statusCode: response.status,
      headers: response.headers,
      pageData,
      seoScore: calculateSeoScore({
        ...pageData,
        url,
        jsErrors: [],
      }),
      lastCrawled: new Date().toISOString(),
    };

    global.auditcore.logger.debug(`Successfully fetched, scored, and analyzed ${url} without Puppeteer`);
    return data;
  } catch (error) {
    global.auditcore.logger.error(`Error fetching data without Puppeteer for ${url}:`, error);
    throw error;
  }
}
/**
 * Renders a page using Puppeteer and collects various data.
 * @param {string} url - The URL to render and analyze.
 * @returns {Promise<Object>} The rendered and analyzed data.
 */
export async function renderAndCacheData(url, logger) {
  logger.debug(`Rendering and caching data for ${url}`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Set up console log capturing
    const jsErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    // Set up response interception for headers
    let headers = {};
    page.on('response', (response) => {
      if (response.url() === url) {
        headers = response.headers();
      }
    });

    const response = await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();
    const statusCode = response.status();

    // Collect page data
    const pageData = await page.evaluate(() => ({
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.content || '',
      h1: document.querySelector('h1')?.textContent || '',
      wordCount: document.body.innerText.trim().split(/\s+/).length,
      hasResponsiveMetaTag: !!document.querySelector('meta[name="viewport"]'),
      images: Array.from(document.images).map((img) => ({
        src: img.src,
        alt: img.alt || '',
      })),
      internalLinks: document.querySelectorAll(`a[href^="/"], a[href^="${window.location.origin}"]`).length,
      structuredData: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((script) => script.textContent),
      openGraphTags: Array.from(document.querySelectorAll('meta[property^="og:"]')).map((tag) => ({
        [tag.getAttribute('property')]: tag.getAttribute('content'),
      })),
      twitterTags: Array.from(document.querySelectorAll('meta[name^="twitter:"]')).map((tag) => ({
        [tag.getAttribute('name')]: tag.getAttribute('content'),
      })),
      h1Count: document.querySelectorAll('h1').length,
      h2Count: document.querySelectorAll('h2').length,
      h3Count: document.querySelectorAll('h3').length,
      h4Count: document.querySelectorAll('h4').length,
      h5Count: document.querySelectorAll('h5').length,
      h6Count: document.querySelectorAll('h6').length,
      scriptsCount: document.scripts.length,
      stylesheetsCount: document.styleSheets.length,
      htmlLang: document.documentElement.lang,
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href,
      formsCount: document.forms.length,
      tablesCount: document.querySelectorAll('table').length,
      pageSize: document.documentElement.outerHTML.length,
    }));

    // Performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigationTiming = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigationTiming.loadEventEnd - navigationTiming.startTime,
        domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.startTime,
        firstPaint: performance.getEntriesByType('paint').find((entry) => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint').find((entry) => entry.name === 'first-contentful-paint')?.startTime,
      };
    });

    await browser.close();

    const data = {
      html,
      jsErrors,
      statusCode,
      headers,
      pageData,
      performanceMetrics,
      seoScore: calculateSeoScore({
        ...pageData,
        url,
        jsErrors,
        performanceMetrics,
      }),
      lastCrawled: new Date().toISOString(),
    };

    logger.debug(`Successfully rendered, scored, and analyzed ${url}`);
    return data;
  } catch (error) {
    logger.error(`Error rendering data for ${url}:`, error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

function analyzeContentFreshness(data) {
  const now = new Date();
  const lastModified = data.pageData.lastModified
    ? new Date(data.pageData.lastModified)
    : null;
  const lastCrawled = new Date(data.lastCrawled);

  const freshness = {
    lastModifiedDate: lastModified ? lastModified.toISOString() : 'Unknown',
    daysSinceLastModified: lastModified
      ? Math.floor((now - lastModified) / (1000 * 60 * 60 * 24))
      : null,
    lastCrawledDate: lastCrawled.toISOString(),
    daysSinceLastCrawled: Math.floor(
      (now - lastCrawled) / (1000 * 60 * 60 * 24),
    ),
    freshnessStatus: 'Unknown',
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
    freshness.freshnessStatus = (() => {
      if (freshness.daysSinceLastCrawled <= 7) {
        return 'Potentially Fresh';
      }
      if (freshness.daysSinceLastCrawled <= 30) {
        return 'Potentially Moderately Fresh';
      }
      return 'Potentially Stale';
    })();
  }

  return freshness;
}
