// caching.js

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { calculateSeoScore } from './seoScoring.js';
import { isValidUrl } from './urlUtils.js';

const CACHE_DIR = path.join(process.cwd(), '.cache');

function generateCacheKey(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

async function ensureCacheDir(options = {}) {
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

async function getCachedData(url) {
  const cacheKey = generateCacheKey(url);
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  global.auditcore.logger.debug(`Attempting to read cache from: ${cachePath}`);
  try {
    const cachedData = await fs.readFile(cachePath, 'utf8');
    global.auditcore.logger.debug(`Cache hit for ${url}`);
    const parsedData = JSON.parse(cachedData);

    // Ensure cached data has a status code
    if (!parsedData.statusCode) {
      parsedData.statusCode = 200;
    }

    // Validate URLs in cached data
    if (parsedData.pageData && parsedData.pageData.testUrl) {
      if (!isValidUrl(parsedData.pageData.testUrl)) {
        global.auditcore.logger.warn(`Invalid URL in cached data: ${parsedData.pageData.testUrl}`);
        return null;
      }
    }

    return parsedData;
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

    // Improved link detection
    const links = $('a[href]');
    const internalLinks = links.filter((i, el) => {
      const href = $(el).attr('href');
      return (
        href.startsWith('/') // Relative paths
        || href.startsWith('./') // Relative paths
        || href.startsWith('../') // Relative paths
        || href.startsWith('#') // Anchors
        || href.startsWith(window.location.origin) // Same domain
        || href.startsWith(window.location.hostname) // Same domain without protocol
      );
    }).length;

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
      internalLinks,
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
      testUrl: url,
    };

    const data = {
      html,
      jsErrors: [],
      statusCode: response.status,
      headers: response.headers,
      pageData,
      seoScore: calculateSeoScore({
        ...pageData,
        testUrl: url,
        jsErrors: [],
      }),
      lastCrawled: new Date().toISOString(),
    };

    // Save served HTML to .cache/served
    try {
      const cacheKey = generateCacheKey(url);
      const servedPath = path.join(CACHE_DIR, 'served', `${cacheKey}.html`);
      await fs.writeFile(servedPath, html, 'utf8');
      global.auditcore.logger.debug(`Served HTML saved to: ${servedPath}`);
    } catch (error) {
      global.auditcore.logger.error(`Error saving served HTML for ${url}:`, error);
    }

    global.auditcore.logger.debug(`Successfully fetched, scored, and analyzed ${url} without Puppeteer`);
    return data;
  } catch (error) {
    global.auditcore.logger.error(`Error fetching data without Puppeteer for ${url}:`, error);
    throw error;
  }
}

async function getOrRenderData(url, options = {}) {
  const { noPuppeteer = false, cacheOnly = false, cache = true } = options;
  // If cache is false (from --no-cache), then noCache should be true
  const noCache = options.noCache || !cache;

  global.auditcore.logger.debug(`getOrRenderData called for ${url} with options: ${JSON.stringify(options)}`);

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

async function renderAndCacheData(url) {
  global.auditcore.logger.debug(`Rendering and caching data for ${url}`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Set viewport to iPad dimensions
    await page.setViewport({
      width: 1024,
      height: 768,
      deviceScaleFactor: 2,
    });

    const jsErrors = [];
    const consoleMessages = [];
    page.on('console', (msg) => {
      const timestamp = new Date().toISOString();
      const type = msg.type();
      const text = msg.text();

      // Capture all console messages with timestamp and type
      consoleMessages.push(`[${timestamp}] [${type.toUpperCase()}] ${text}`);

      // Also track errors separately for backward compatibility
      if (type === 'error') {
        jsErrors.push(text);
      }
    });

    let headers = {};
    page.on('response', (response) => {
      if (response.url() === url) {
        headers = response.headers();
      }
    });

    const response = await page.goto(url, { waitUntil: 'networkidle0' });
    const servedHtml = await response.text();
    const html = await page.content();
    const statusCode = response.status();

    const pageData = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]');
      const internalLinks = Array.from(links).filter((el) => {
        const href = el.getAttribute('href');
        return (
          href.startsWith('/') // Relative paths
          || href.startsWith('./') // Relative paths
          || href.startsWith('../') // Relative paths
          || href.startsWith('#') // Anchors
          || href.startsWith(window.location.origin) // Same domain
          || href.startsWith(window.location.hostname) // Same domain without protocol
        );
      }).length;

      // All resources extraction (internal + external)

      // Helper function to determine if URL is valid resource
      const isValidResourceUrl = (resourceUrl) => {
        // eslint-disable-next-line no-script-url
        if (!resourceUrl || resourceUrl.startsWith('#') || resourceUrl.startsWith('javascript:') || resourceUrl.startsWith('data:')) {
          return false;
        }
        return true;
      };

      // Helper to get absolute URL
      const getAbsoluteUrl = (relativeUrl) => {
        try {
          return new URL(relativeUrl, window.location.href).href;
        } catch (e) {
          return null;
        }
      };

      const allResources = [];

      // 1. JavaScript files (<script src="">)
      document.querySelectorAll('script[src]').forEach((el) => {
        const src = el.getAttribute('src');
        if (isValidResourceUrl(src)) {
          allResources.push({
            url: getAbsoluteUrl(src),
            type: 'javascript',
          });
        }
      });

      // 2. CSS files (<link rel="stylesheet">)
      document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
        const href = el.getAttribute('href');
        if (isValidResourceUrl(href)) {
          allResources.push({
            url: getAbsoluteUrl(href),
            type: 'css',
          });
        }
      });

      // 3. Images - all formats
      // <img> tags
      document.querySelectorAll('img[src]').forEach((el) => {
        const src = el.getAttribute('src');
        if (isValidResourceUrl(src)) {
          allResources.push({
            url: getAbsoluteUrl(src),
            type: 'image',
          });
        }
      });

      // <picture><source> tags
      document.querySelectorAll('picture source[srcset]').forEach((el) => {
        const srcset = el.getAttribute('srcset');
        if (srcset) {
          // Parse srcset which can be: "url1 1x, url2 2x" or "url1 100w, url2 200w"
          srcset.split(',').forEach((entry) => {
            const resourceUrl = entry.trim().split(/\s+/)[0];
            if (isValidResourceUrl(resourceUrl)) {
              allResources.push({
                url: getAbsoluteUrl(resourceUrl),
                type: 'image',
              });
            }
          });
        }
      });

      // SVG images in <object> and <embed>
      document.querySelectorAll('object[data], embed[src]').forEach((el) => {
        const src = el.getAttribute('data') || el.getAttribute('src');
        if (src && isValidResourceUrl(src)) {
          const absUrl = getAbsoluteUrl(src);
          if (absUrl && (absUrl.endsWith('.svg') || el.type === 'image/svg+xml')) {
            allResources.push({
              url: absUrl,
              type: 'image',
            });
          }
        }
      });

      // 4. Fonts (from CSS)
      try {
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            Array.from(sheet.cssRules || []).forEach((rule) => {
              if (rule.cssText && rule.cssText.includes('@font-face')) {
                const urlMatches = rule.cssText.match(/url\(['"]?([^'"()]+)['"]?\)/g);
                if (urlMatches) {
                  urlMatches.forEach((match) => {
                    const resourceUrl = match.replace(/url\(['"]?|['"]?\)/g, '');
                    if (isValidResourceUrl(resourceUrl)) {
                      allResources.push({
                        url: getAbsoluteUrl(resourceUrl),
                        type: 'font',
                      });
                    }
                  });
                }
              }
            });
          } catch (e) {
            // CORS-blocked stylesheets will throw - skip them
          }
        });
      } catch (e) {
        // Stylesheet access error
      }

      // 5. Videos
      document.querySelectorAll('video source[src], video[src]').forEach((el) => {
        const src = el.getAttribute('src');
        if (isValidResourceUrl(src)) {
          allResources.push({
            url: getAbsoluteUrl(src),
            type: 'video',
          });
        }
      });

      // <video><source srcset>
      document.querySelectorAll('video source[srcset]').forEach((el) => {
        const srcset = el.getAttribute('srcset');
        if (srcset) {
          srcset.split(',').forEach((entry) => {
            const resourceUrl = entry.trim().split(/\s+/)[0];
            if (isValidResourceUrl(resourceUrl)) {
              allResources.push({
                url: getAbsoluteUrl(resourceUrl),
                type: 'video',
              });
            }
          });
        }
      });

      // 6. Iframes
      document.querySelectorAll('iframe[src]').forEach((el) => {
        const src = el.getAttribute('src');
        if (isValidResourceUrl(src)) {
          allResources.push({
            url: getAbsoluteUrl(src),
            type: 'iframe',
          });
        }
      });

      // 7. Audio
      document.querySelectorAll('audio source[src], audio[src]').forEach((el) => {
        const src = el.getAttribute('src');
        if (isValidResourceUrl(src)) {
          allResources.push({
            url: getAbsoluteUrl(src),
            type: 'audio',
          });
        }
      });

      // 8. Background images from inline styles
      document.querySelectorAll('[style*="background"]').forEach((el) => {
        const style = el.getAttribute('style');
        const urlMatches = style.match(/url\(['"]?([^'"()]+)['"]?\)/g);
        if (urlMatches) {
          urlMatches.forEach((match) => {
            const resourceUrl = match.replace(/url\(['"]?|['"]?\)/g, '');
            if (isValidResourceUrl(resourceUrl)) {
              allResources.push({
                url: getAbsoluteUrl(resourceUrl),
                type: 'image',
              });
            }
          });
        }
      });

      // 9. Preload/Prefetch resources
      document.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="dns-prefetch"], link[rel="preconnect"]').forEach((el) => {
        const href = el.getAttribute('href');
        if (href && isValidResourceUrl(href)) {
          const asType = el.getAttribute('as') || 'other';
          let type = 'other';
          if (asType === 'script') type = 'javascript';
          else if (asType === 'style') type = 'css';
          else if (asType === 'image') type = 'image';
          else if (asType === 'font') type = 'font';
          else if (asType === 'video') type = 'video';
          else if (asType === 'audio') type = 'audio';

          allResources.push({
            url: getAbsoluteUrl(href),
            type,
          });
        }
      });

      // LLM Readability Metrics
      const llmReadability = {
        // Structural elements
        semanticElements: {
          article: document.querySelectorAll('article').length,
          section: document.querySelectorAll('section').length,
          nav: document.querySelectorAll('nav').length,
          header: document.querySelectorAll('header').length,
          footer: document.querySelectorAll('footer').length,
          aside: document.querySelectorAll('aside').length,
          main: document.querySelectorAll('main').length,
        },

        // Heading structure
        headings: {
          h1: document.querySelectorAll('h1').length,
          h2: document.querySelectorAll('h2').length,
          h3: document.querySelectorAll('h3').length,
          h4: document.querySelectorAll('h4').length,
          h5: document.querySelectorAll('h5').length,
          h6: document.querySelectorAll('h6').length,
        },

        // Content structure
        paragraphs: document.querySelectorAll('p').length,
        lists: {
          ul: document.querySelectorAll('ul').length,
          ol: document.querySelectorAll('ol').length,
          total: document.querySelectorAll('ul, ol').length,
        },
        tables: document.querySelectorAll('table').length,

        // Code and pre-formatted content
        codeBlocks: document.querySelectorAll('pre, code').length,

        // Metadata
        hasJsonLd: document.querySelectorAll('script[type="application/ld+json"]').length > 0,
        jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,

        // Schema.org microdata
        hasMicrodata: document.querySelectorAll('[itemscope]').length > 0,
        microdataCount: document.querySelectorAll('[itemscope]').length,

        // OpenGraph
        ogTags: {
          title: document.querySelector('meta[property="og:title"]')?.content || '',
          description: document.querySelector('meta[property="og:description"]')?.content || '',
          image: document.querySelector('meta[property="og:image"]')?.content || '',
          url: document.querySelector('meta[property="og:url"]')?.content || '',
          type: document.querySelector('meta[property="og:type"]')?.content || '',
        },

        // Text content analysis
        bodyText: document.body?.innerText || '',
        bodyTextLength: (document.body?.innerText || '').length,

        // Hidden content detection
        hiddenElements: document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], [hidden]').length,

        // Main content detection
        hasMainElement: document.querySelector('main') !== null,
        hasArticleElement: document.querySelector('article') !== null,

        // Content extractability indicators
        totalElements: document.querySelectorAll('*').length,
        textNodes: Array.from(document.body?.childNodes || []).filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0).length,
      };

      return {
        title: document.title,
        metaDescription: document.querySelector('meta[name="description"]')?.content || '',
        h1: document.querySelector('h1')?.textContent || '',
        wordCount: document.body.innerText.trim().split(/\s+/).length,
        hasResponsiveMetaTag: !!document.querySelector('meta[name="viewport"]'),
        images: Array.from(document.images).map((img) => ({
          src: img.src,
          alt: img.alt || '',
        })),
        internalLinks,
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
        allResources,
        llmReadability,
      };
    });

    const performanceMetrics = await page.evaluate(() => {
      const navigationTiming = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigationTiming.loadEventEnd - navigationTiming.startTime,
        domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.startTime,
        firstPaint: performance.getEntriesByType('paint').find((entry) => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint').find((entry) => entry.name === 'first-contentful-paint')?.startTime,
      };
    });

    // Take screenshot of the viewport
    const screenshotDir = path.join(process.cwd(), 'ss');
    try {
      await fs.access(screenshotDir);
      global.auditcore.logger.debug(`Screenshot directory already exists: ${screenshotDir}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(screenshotDir, { recursive: true });
        global.auditcore.logger.debug(`Created screenshot directory: ${screenshotDir}`);
      } else {
        global.auditcore.logger.error(`Error checking/creating screenshot directory: ${error.message}`);
        throw error;
      }
    }

    const screenshotFilename = `${url.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ipad.png`;
    await page.screenshot({ path: `./ss/${screenshotFilename}`, fullPage: false });

    await browser.close();

    const data = {
      html,
      jsErrors,
      statusCode,
      headers,
      pageData: {
        ...pageData,
        testUrl: url,
      },
      performanceMetrics,
      seoScore: calculateSeoScore({
        ...pageData,
        testUrl: url,
        jsErrors,
        performanceMetrics,
      }),
      lastCrawled: new Date().toISOString(),
      screenshot: screenshotFilename,
    };

    // Save rendered HTML to .cache/rendered
    try {
      const cacheKey = generateCacheKey(url);
      const renderedPath = path.join(CACHE_DIR, 'rendered', `${cacheKey}.html`);
      await fs.writeFile(renderedPath, html, 'utf8');
      global.auditcore.logger.debug(`Rendered HTML saved to: ${renderedPath}`);
    } catch (error) {
      global.auditcore.logger.error(`Error saving rendered HTML for ${url}:`, error);
    }

    // Save served HTML to .cache/served
    try {
      const cacheKey = generateCacheKey(url);
      const servedPath = path.join(CACHE_DIR, 'served', `${cacheKey}.html`);
      await fs.writeFile(servedPath, servedHtml, 'utf8');
      global.auditcore.logger.debug(`Served HTML saved to: ${servedPath}`);
    } catch (error) {
      global.auditcore.logger.error(`Error saving served HTML for ${url}:`, error);
    }

    // Save console log output to .cache/rendered (same name as HTML with .log suffix)
    try {
      const cacheKey = generateCacheKey(url);
      const consoleLogPath = path.join(CACHE_DIR, 'rendered', `${cacheKey}.log`);
      const logContent = consoleMessages.length > 0
        ? consoleMessages.join('\n')
        : '// No console output captured';
      await fs.writeFile(consoleLogPath, logContent, 'utf8');
      global.auditcore.logger.debug(`Console log saved to: ${consoleLogPath} (${consoleMessages.length} messages)`);
    } catch (error) {
      global.auditcore.logger.error(`Error saving console log for ${url}:`, error);
    }

    global.auditcore.logger.debug(`Successfully rendered, scored, and analyzed ${url}`);
    return data;
  } catch (error) {
    global.auditcore.logger.error(`Error rendering data for ${url}:`, error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

function analyzeContentFreshness(data) {
  // Ensure data has the expected structure
  if (!data || typeof data !== 'object') {
    return {
      lastModifiedDate: 'Unknown',
      daysSinceLastModified: null,
      lastCrawledDate: new Date().toISOString(),
      daysSinceLastCrawled: 0,
      freshnessStatus: 'Unknown',
    };
  }

  const now = new Date();

  // Safely get lastModified date
  const lastModified = (data.pageData && data.pageData.lastModified)
    ? new Date(data.pageData.lastModified)
    : null;

  // Safely get lastCrawled date
  const lastCrawled = data.lastCrawled
    ? new Date(data.lastCrawled)
    : new Date();

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

export {
  ensureCacheDir,
  getCachedData,
  setCachedData,
  getOrRenderData,
  renderAndCacheData,
  analyzeContentFreshness,
};
