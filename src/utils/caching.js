/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/extensions */
// caching.js

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import axios from 'axios';
import cheerio from 'cheerio';
import { calculateSeoScore } from './seoScoring.js';
import { debug } from './debug.js';

const CACHE_DIR = path.join(process.cwd(), '.cache');

const allOptions = [
  {
    name: 'Sitemap URL',
    description: 'URL of the sitemap to process',
    flag: '-s, --sitemap <url>',
    required: true,
  },
  {
    name: 'Output Directory',
    description: 'Output directory for results',
    flag: '-o, --output <directory>',
    required: true,
  },
  {
    name: 'Limit',
    description: 'Limit the number of URLs to test. Use -1 to test all URLs.',
    flag: '-l, --limit <number>',
    default: '-1',
  },
  {
    name: 'No Puppeteer',
    description: 'Bypass Puppeteer execution and use cached HTML',
    flag: '--no-puppeteer',
  },
  {
    name: 'Cache Only',
    description: 'Use only cached data, do not fetch new data',
    flag: '--cache-only',
  },
  {
    name: 'No Cache',
    description: 'Disable caching, always fetch fresh data',
    flag: '--no-cache',
  },
  {
    name: 'Force Delete Cache',
    description: 'Force delete existing cache before starting',
    flag: '--force-delete-cache',
  },
  {
    name: 'Debug Mode',
    description: 'Enable debug mode for verbose logging',
    flag: '--debug',
  },
];

function generateCacheKey(url) {
  const key = crypto.createHash('md5').update(url).digest('hex');
  debug(`Generated cache key for ${url}: ${key}`);
  return key;
}

async function ensureCacheDir(options = {}) {
  try {
    if (options.forceDeleteCache) {
      debug(
        `Force delete cache option detected. Attempting to delete cache directory: ${CACHE_DIR}`,
      );
      try {
        await fs.rm(CACHE_DIR, { recursive: true, force: true });
        debug('Cache directory deleted successfully');
      } catch (deleteError) {
        console.error(`Error deleting cache directory: ${deleteError.message}`);
        if (options.debug) {
          console.error('Delete error stack:', deleteError.stack);
        }
      }
    }

    await fs.mkdir(CACHE_DIR, { recursive: true });
    debug(`Cache directory ensured: ${CACHE_DIR}`);
  } catch (error) {
    console.error('Error managing cache directory:', error.message);
    if (options.debug) {
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

async function getCachedData(url) {
  const cacheKey = generateCacheKey(url);
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  debug(`Attempting to read cache from: ${cachePath}`);
  try {
    const cachedData = await fs.readFile(cachePath, 'utf8');
    debug(`Cache hit for ${url}`);
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

async function logErrorToCsv(url, error, outputDir) {
  const errorData = [
    {
      url,
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    },
  ];

  const headers = ['url', 'errorType', 'errorMessage', 'errorStack'];
  const errorCsv = formatCsv(errorData, headers);

  const errorLogPath = path.join(outputDir, 'error_log.csv');
  try {
    // Check if file exists, if not, write headers
    if (!fs.existsSync(errorLogPath)) {
      await fs.writeFile(errorLogPath, formatCsv([], headers), 'utf8');
    }
    // Append error data
    await fs.appendFile(errorLogPath, errorCsv, 'utf8');
    debug(`Error logged for ${url}`);
  } catch (logError) {
    console.error(`Failed to log error for ${url}:`, logError);
  }
}

async function renderAndCacheData(url, outputDir) {
  let browser;
  try {
    debug(`Starting to render ${url}`);
    browser = await launchBrowserWithRetry();
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'language', {
        get() {
          return 'en-US';
        },
      });
      Object.defineProperty(navigator, 'languages', {
        get() {
          return ['en-US', 'en'];
        },
      });
    });

    const jsErrors = [];
    page.on('pageerror', (error) => {
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        type: error.name,
      };
      jsErrors.push(JSON.stringify(errorDetails));
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const errorDetails = {
          message: msg.text(),
          type: 'ConsoleError',
          location: msg.location(),
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
    await page.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 3000)),
    );
    debug(`3 second wait completed for ${url}`);

    const renderedHtml = await page.content();
    debug(`Content extracted for ${url}`);

    const pageData = await page.evaluate(() => {
      const decodeHtmlEntities = (text) => {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        return doc.documentElement.textContent;
      };

      const extractDate = (selector) => {
        const element = document.querySelector(selector);
        if (element) {
          const dateString = element.getAttribute('content') || element.textContent;
          const parsedDate = new Date(dateString);
          return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
        }
        return null;
      };

      const lastModified = extractDate('meta[property="article:modified_time"]')
        || extractDate('meta[property="og:updated_time"]')
        || extractDate('time[itemprop="dateModified"]')
        || document.lastModified;

      const images = Array.from(document.images).map((img) => {
        let location = '';
        let element = img;
        while (element && element !== document.body) {
          if (element.id) {
            location = `#${element.id} > ${location}`;
            break;
          } else if (element.className) {
            location = `.${element.className.split(' ')[0]} > ${location}`;
            break;
          }
          element = element.parentElement;
        }
        location = location || 'body > ';
        location += 'img';

        return {
          src: img.src,
          alt: img.alt,
          location: location.trim(),
        };
      });

      return {
        images,
        title: decodeHtmlEntities(document.title),
        metaDescription: decodeHtmlEntities(
          document.querySelector('meta[name="description"]')?.content || '',
        ),
        h1: decodeHtmlEntities(
          Array.from(document.querySelectorAll('h1'))
            .map((h1) => h1.textContent.trim())
            .join('; '),
        ),
        wordCount: document.body.innerText.trim().split(/\s+/).length,
        hasResponsiveMetaTag: !!document.querySelector('meta[name="viewport"]'),
        images: Array.from(document.images).map((img) => ({
          src: img.src,
          alt: decodeHtmlEntities(img.alt),
        })),
        internalLinks: Array.from(document.links).filter(
          (link) => link.hostname === window.location.hostname,
        ).length,
        structuredData: Array.from(
          document.querySelectorAll('script[type="application/ld+json"]'),
        ).map((script) => script.textContent),
        openGraphTags: Object.fromEntries(
          Array.from(document.querySelectorAll('meta[property^="og:"]')).map(
            (tag) => [
              tag.getAttribute('property'),
              decodeHtmlEntities(tag.content),
            ],
          ),
        ),
        twitterTags: Object.fromEntries(
          Array.from(document.querySelectorAll('meta[name^="twitter:"]')).map(
            (tag) => [tag.getAttribute('name'), decodeHtmlEntities(tag.content)],
          ),
        ),
        h1Count: document.querySelectorAll('h1').length,
        h2Count: document.querySelectorAll('h2').length,
        h3Count: document.querySelectorAll('h3').length,
        h4Count: document.querySelectorAll('h4').length,
        h5Count: document.querySelectorAll('h5').length,
        h6Count: document.querySelectorAll('h6').length,
        scriptsCount: document.querySelectorAll('script').length,
        stylesheetsCount: document.querySelectorAll('link[rel="stylesheet"]')
          .length,
        htmlLang: document.documentElement.lang,
        canonicalUrl: document.querySelector('link[rel="canonical"]')?.href,
        formsCount: document.querySelectorAll('form').length,
        tablesCount: document.querySelectorAll('table').length,
        pageSize: document.documentElement.outerHTML.length,
        lastModified,
      };
    });

    const seoScore = calculateSeoScore({
      ...pageData,
      url,
      jsErrors,
    });

    const data = {
      html: renderedHtml,
      jsErrors,
      statusCode,
      headers,
      pageData,
      seoScore,
      lastCrawled: new Date().toISOString(),
    };

    await setCachedData(url, data);

    debug(`Successfully rendered, scored, and cached ${url}`);
    return data;
  } catch (error) {
    console.error(`Error rendering and caching ${url}:`, error);
    await logErrorToCsv(url, error, outputDir);
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
    const jsonString = JSON.stringify(
      data,
      (key, value) => {
        if (typeof value === 'string') {
          return value.normalize('NFC');
        }
        return value;
      },
      2,
    );
    await fs.writeFile(cachePath, jsonString, 'utf8');
    debug(`Cache written for ${url}`);
  } catch (error) {
    console.error(`Error writing cache for ${url}:`, error);
    throw error;
  }
}

async function getOrRenderData(url, options = {}) {
  const {
    noPuppeteer = false,
    cacheOnly = false,
    noCache = false,
    outputDir,
  } = options;
  debug(`getOrRenderData called for ${url}`);

  if (!noCache) {
    const cachedData = await getCachedData(url);
    if (cachedData) {
      cachedData.contentFreshness = analyzeContentFreshness(cachedData);
      debug(`Returning cached data for ${url}`);
      return cachedData;
    }
  }

  if (cacheOnly) {
    console.warn(
      `No cached data available for ${url} and cache-only mode is enabled. Skipping this URL.`,
    );
    return { html: null, statusCode: null };
  }

  debug(
    `No cache found or cache disabled, ${noPuppeteer ? 'fetching' : 'rendering'} data for ${url}`,
  );
  let newData;
  try {
    newData = noPuppeteer
      ? await fetchDataWithoutPuppeteer(url)
      : await renderAndCacheData(url, outputDir);
  } catch (error) {
    console.error(
      `Error ${noPuppeteer ? 'fetching' : 'rendering'} data for ${url}:`,
      error,
    );
    await logErrorToCsv(url, error, outputDir);
    return { html: null, statusCode: null, error: error.message };
  }

  newData.contentFreshness = analyzeContentFreshness(newData);

  if (!noCache) {
    await setCachedData(url, newData);
  }

  return newData;
}

async function fetchDataWithoutPuppeteer(url) {
  try {
    debug(`Fetching data without Puppeteer for ${url}`);
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const extractDate = (selector) => {
      const element = $(selector);
      if (element.length) {
        const dateString = element.attr('content') || element.text();
        const parsedDate = new Date(dateString);
        return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
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

    await setCachedData(url, data);
    debug(`Successfully fetched, scored, and cached ${url} without Puppeteer`);
    return data;
  } catch (error) {
    console.error(`Error fetching data without Puppeteer for ${url}:`, error);
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
    // eslint-disable-next-line no-lonely-if
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

function displayCachingOptions(currentOptions) {
  console.log('Available Options:');
  console.log('------------------');
  allOptions.forEach((option, index) => {
    const isActive = option.flag.startsWith('--')
      ? currentOptions[option.flag.replace('--', '').replace('-', '')]
      : currentOptions[
        option.flag.split(',')[1].trim().split(' ')[0].replace('--', '')
      ];

    console.log(
      `${index + 1}. ${option.name}${option.required ? ' (Required)' : ''}`,
    );
    console.log(`   Description: ${option.description}`);
    console.log(`   Flag: ${option.flag}`);
    if (option.default) {
      console.log(`   Default: ${option.default}`);
    }
    if (typeof isActive !== 'undefined') {
      console.log(
        // eslint-disable-next-line no-nested-ternary
        `   Current Setting: ${isActive === true ? 'Enabled' : isActive === false ? 'Disabled' : isActive}`,
      );
    }
    console.log();
  });

  console.log('Current Settings Summary:');
  console.log('-------------------------');
  console.log(`Sitemap URL: ${currentOptions.sitemap}`);
  console.log(`Output Directory: ${currentOptions.output}`);
  console.log(`Limit: ${currentOptions.limit}`);
  console.log(
    `Puppeteer: ${currentOptions.noPuppeteer ? 'Disabled' : 'Enabled'}`,
  );
  console.log(
    `Cache Only: ${currentOptions.cacheOnly ? 'Enabled' : 'Disabled'}`,
  );
  console.log(`Cache: ${currentOptions.noCache ? 'Disabled' : 'Enabled'}`);
  console.log(
    `Force Delete Cache: ${currentOptions.forceDeleteCache ? 'Enabled' : 'Disabled'}`,
  );
  console.log(`Debug Mode: ${currentOptions.debug ? 'Enabled' : 'Disabled'}`);
  console.log();
}
