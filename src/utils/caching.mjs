/* eslint-disable no-lonely-if */
/* eslint-disable import/extensions */
// caching.js

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import cheerio from 'cheerio';
import { calculateSeoScore } from './seoScoring.mjs';

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

async function renderAndCacheData(url) {
  // Implementation of renderAndCacheData function
  // This function would use Puppeteer to render the page and collect data
  // It's not included here as it wasn't part of the original snippet
  global.auditcore.logger.warn('renderAndCacheData function is not implemented');
  throw new Error('renderAndCacheData function is not implemented');
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

export function displayCachingOptions(currentOptions) {
  global.auditcore.logger.info('Available Caching Options:');
  global.auditcore.logger.info('---------------------------');
  [
    { name: 'No Puppeteer', flag: '--no-puppeteer', description: 'Bypass Puppeteer execution and use cached HTML' },
    { name: 'Cache Only', flag: '--cache-only', description: 'Use only cached data, do not fetch new data' },
    { name: 'No Cache', flag: '--no-cache', description: 'Disable caching, always fetch fresh data' },
    { name: 'Force Delete Cache', flag: '--force-delete-cache', description: 'Force delete existing cache before starting' },
  ].forEach((option) => {
    global.auditcore.logger.info(`${option.name}:`);
    global.auditcore.logger.info(`  Flag: ${option.flag}`);
    global.auditcore.logger.info(`  Description: ${option.description}`);
    global.auditcore.logger.info(`  Current Setting: ${currentOptions[option.flag.replace('--', '')] ? 'Enabled' : 'Disabled'}`);
    global.auditcore.logger.info('');
  });
}
