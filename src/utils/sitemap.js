/**
 * Sitemap processing utilities for extracting and managing URLs
 *
 * This module provides comprehensive sitemap processing capabilities including:
 * - XML sitemap parsing and extraction
 * - HTML link extraction with fallback to Puppeteer
 * - URL validation and processing
 */

/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

// Node.js built-in modules
import { gunzip } from 'zlib';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

// Third-party modules
import { parseStringPromise } from 'xml2js';
import jsdom from 'jsdom';

// Local modules
import { UrlProcessor } from './urlProcessor.js';
import { isValidUrl, isValidXML } from './urlUtils.js';
import { executeNetworkOperation, executePuppeteerOperation } from './networkUtils.js';

const { JSDOM } = jsdom;
const gunzipAsync = promisify(gunzip);

/**
 * Main function for extracting URLs from sitemap or HTML page
 *
 * Handles:
 * - Sitemap XML parsing
 * - HTML link extraction
 * - Gzip content decoding
 * - Puppeteer fallback for blocked requests
 *
 * @param {string} url - URL to process (sitemap or HTML page)
 * @param {number} limit - Maximum number of URLs to return (-1 for all)
 * @returns {Promise<Array>} Array of processed URLs containing:
 *   - url: Full URL
 *   - lastmod: Last modified date
 *   - changefreq: Change frequency
 *   - priority: URL priority
 * @throws {Error} If URL processing fails
 * @example
 * // Returns array of processed URLs
 * const urls = await getUrlsFromSitemap('https://example.com/sitemap.xml');
 */
export async function getUrlsFromSitemap(url, limit = -1) {
  try {
    global.auditcore.logger.info(`Fetching URL: ${url}`);

    // First check if URL is a sitemap
    const isSitemap = url.toLowerCase().endsWith('sitemap.xml');

    let content;
    try {
      const response = await executeNetworkOperation(
        async () => {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
            },
          });

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          const buffer = await res.arrayBuffer();
          return {
            data: Buffer.from(buffer),
            headers: Object.fromEntries(res.headers.entries()),
          };
        },
        'URL fetch',
      );

      const contentType = response.headers['content-type'];
      content = response.data;

      if (contentType?.includes('gzip')) {
        global.auditcore.logger.debug('Processing gzipped content');
        content = await gunzipAsync(content);
      }

      content = content.toString('utf-8');
    } catch (error) {
      if (error.message.includes('403') && !isSitemap) {
        global.auditcore.logger.info('403 Forbidden - Falling back to Puppeteer');
        return await processWithPuppeteer(url, limit);
      }
      throw error;
    }

    global.auditcore.logger.debug(`Content length: ${content.length}`);

    let urls = [];
    if (isSitemap && isValidXML(content)) {
      global.auditcore.logger.info('Processing as XML sitemap');
      const parsed = await parseStringPromise(content);
      urls = await processSitemapContent(parsed, limit);
    } else {
      global.auditcore.logger.info('Processing as HTML page');
      urls = await processHtmlContent(content, url, limit);

      if (urls.length === 0) {
        global.auditcore.logger.info('No URLs found with JSDOM, falling back to Puppeteer');
        urls = await processWithPuppeteer(url, limit);
      }
    }

    // Automatically add llms.txt if not present
    try {
      const inputUrlObj = new URL(url);
      const llmsTxtUrl = `${inputUrlObj.origin}/llms.txt`;
      const exists = urls.some((u) => u.url === llmsTxtUrl);
      if (!exists) {
        global.auditcore.logger.info(`Automatically adding ${llmsTxtUrl} to processing list`);
        urls.push({
          url: llmsTxtUrl,
          lastmod: new Date().toISOString(),
          changefreq: 'daily',
          priority: 0.8,
        });
      }
    } catch (error) {
      global.auditcore.logger.debug(`Could not add llms.txt: ${error.message}`);
    }

    // Filter and validate URLs
    const validUrls = urls.filter((urlObj) => isValidUrl(urlObj.url, url));
    global.auditcore.logger.info(`Found ${validUrls.length} valid URLs out of ${urls.length} total URLs`);

    return validUrls;
  } catch (error) {
    global.auditcore.logger.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

/**
 * Fallback to Puppeteer for blocked requests
 *
 * Implements advanced Puppeteer-based URL extraction with:
 * - Request interception and filtering
 * - Network activity monitoring
 * - Shadow DOM support
 * - Screenshot capture for debugging
 *
 * @param {string} baseUrl - URL to process
 * @param {number} limit - Maximum number of URLs to return
 * @returns {Promise<Array>} Array of processed URLs
 * @throws {Error} If Puppeteer processing fails
 */
async function processWithPuppeteer(baseUrl, limit) {
  return executePuppeteerOperation(async (page) => {
    global.auditcore.logger.info(`Processing ${baseUrl} with Puppeteer`);

    try {
      // Create results directory if it doesn't exist
      await fs.mkdir(global.auditcore.options.output, { recursive: true });

      // Set up request interception to wait for all resources
      await page.setRequestInterception(true);
      const pendingRequests = new Set();
      const finishedRequests = new Set();

      const requestHandler = (request) => {
        // Skip font requests to prevent hanging
        if (request.resourceType() === 'font') {
          global.auditcore.logger.debug(`Skipping font request: ${request.url()}`);
          request.abort();
          return;
        }

        pendingRequests.add(request);
        request.continue();
      };

      const requestFinishedHandler = (request) => {
        pendingRequests.delete(request);
        finishedRequests.add(request);
      };

      const requestFailedHandler = (request) => {
        pendingRequests.delete(request);
        finishedRequests.add(request);
      };

      page.on('request', requestHandler);
      page.on('requestfinished', requestFinishedHandler);
      page.on('requestfailed', requestFailedHandler);

      // Navigate to the page and wait for network activity
      await page.goto(baseUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Take a screenshot for debugging
      const screenshotPath = path.join(global.auditcore.options.output, 'screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      global.auditcore.logger.info(`Saved screenshot to: ${screenshotPath}`);

      // Wait for additional network activity with timeout
      const maxWaitTime = 10000; // 10 seconds
      const startTime = Date.now();
      while (pendingRequests.size > 0 && Date.now() - startTime < maxWaitTime) {
        await new Promise((resolve) => { setTimeout(resolve, 1000); });
        global.auditcore.logger.debug(`Waiting for ${pendingRequests.size} pending requests...`);

        // Log details of pending requests
        if (pendingRequests.size > 0) {
          const pendingUrls = Array.from(pendingRequests).map((req) => req.url());
          global.auditcore.logger.debug(`Pending requests: ${pendingUrls.join(', ')}`);
        }
      }

      // If there are still pending requests, abort them
      if (pendingRequests.size > 0) {
        global.auditcore.logger.warn(`Aborting ${pendingRequests.size} pending requests after timeout`);
        for (const request of pendingRequests) {
          try {
            request.abort('timedout');
          } catch (error) {
            global.auditcore.logger.debug(`Error aborting request: ${error.message}`);
          }
        }
      }

      // Clean up request listeners
      page.off('request', requestHandler);
      page.off('requestfinished', requestFinishedHandler);
      page.off('requestfailed', requestFailedHandler);

      // Debug page state
      const pageState = await page.evaluate(() => ({
        documentReadyState: document.readyState,
        bodyExists: !!document.body,
        bodyContentLength: document.body?.innerHTML?.length || 0,
        headContentLength: document.head?.innerHTML?.length || 0,
        windowLocation: window.location.href,
        windowInnerWidth: window.innerWidth,
        windowInnerHeight: window.innerHeight,
        scriptsCount: document.scripts.length,
        stylesheetsCount: document.styleSheets.length,
        iframesCount: document.querySelectorAll('iframe').length,
      }));
      global.auditcore.logger.debug('Page state:', pageState);

      // Get the rendered HTML content using multiple methods
      let content = '';
      try {
        // Try getting outer HTML first
        content = await page.evaluate(() => document.documentElement.outerHTML);
        if (!content || content.length < 100) {
          // Fallback to inner HTML if outer HTML is empty
          content = await page.evaluate(() => document.documentElement.innerHTML);
        }
        if (!content || content.length < 100) {
          // Final fallback to body content
          content = await page.evaluate(() => document.body.innerHTML);
        }
      } catch (error) {
        global.auditcore.logger.error('Error extracting HTML content:', error);
      }

      global.auditcore.logger.debug('Rendered HTML content:', `${content.substring(0, 1000)}...`);

      // Extract links using Puppeteer's DOM access - only <a> tags with href
      const links = await page.evaluate((bUrl, lim) => {
        const results = [];
        const baseUrlObj = new URL(bUrl);

        // Function to recursively extract links from shadow DOM
        function extractFromShadow(root) {
          // Extract only <a> tags with href
          const elements = root.querySelectorAll('a[href]');
          elements.forEach((el) => {
            try {
              // Stop if we've reached the limit
              if (lim > 0 && results.length >= lim) {
                return;
              }

              const { href } = el;
              // eslint-disable-next-line no-script-url
              if (href && !href.startsWith('javascript:')) {
                const url = new URL(href, bUrl);
                if (url.hostname === baseUrlObj.hostname) {
                  results.push({
                    href: url.href,
                    text: el.textContent?.trim() || el.innerText?.trim() || '',
                  });
                }
              }
            } catch (error) {
              console.warn('Error processing link:', error);
            }
          });

          // Check for shadow roots
          const shadowRoots = root.querySelectorAll('*');
          shadowRoots.forEach((el) => {
            if (el.shadowRoot) {
              extractFromShadow(el.shadowRoot);
            }
          });
        }

        // Start extraction from document body
        extractFromShadow(document.body);

        return results;
      }, baseUrl, limit);

      global.auditcore.logger.debug(`Found ${links.length} links using Puppeteer`);

      // Process the extracted links
      const urls = links.map((link) => ({
        url: link.href,
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: 0.7,
        text: link.text,
      }));

      global.auditcore.logger.info(`Found ${urls.length} internal URLs using Puppeteer`);
      return urls;
    } catch (error) {
      global.auditcore.logger.error('Error in Puppeteer processing:', error);
      throw error;
    }
  }, 'Puppeteer URL processing');
}

/**
 * Process URLs from sitemap content
 *
 * Handles both sitemap indexes and individual sitemaps
 *
 * @param {Object} parsed - Parsed XML content
 * @param {number} limit - Maximum number of URLs to return
 * @returns {Promise<Array>} Array of processed URLs
 */
async function processSitemapContent(parsed, limit) {
  const urls = [];

  global.auditcore.logger.info('Processing sitemap content');

  if (parsed.sitemapindex) {
    global.auditcore.logger.info('Found sitemap index');
    const sitemapUrls = parsed.sitemapindex.sitemap.map((sitemap) => sitemap.loc[0]);
    global.auditcore.logger.debug(`Found ${sitemapUrls.length} sitemaps in index`);

    for (const sitemapUrl of sitemapUrls) {
      global.auditcore.logger.info(`Processing sub-sitemap: ${sitemapUrl}`);
      const subUrls = await getUrlsFromSitemap(sitemapUrl);
      urls.push(...subUrls);
      if (limit > 0 && urls.length >= limit) {
        global.auditcore.logger.info(`Reached URL limit of ${limit}`);
        break;
      }
    }
  } else if (parsed.urlset) {
    global.auditcore.logger.info('Processing single sitemap');
    const extractedUrls = extractUrlsFromUrlset(parsed.urlset);
    global.auditcore.logger.debug(`Extracted ${extractedUrls.length} URLs from sitemap`);
    urls.push(...extractedUrls);
  } else {
    global.auditcore.logger.warn('Invalid sitemap format - no urlset or sitemapindex found');
  }

  global.auditcore.logger.info(`Total URLs found: ${urls.length}`);
  return limit > 0 ? urls.slice(0, limit) : urls;
}

/**
 * Process URLs from HTML content
 *
 * Extracts internal links from HTML content
 *
 * @param {string} content - HTML content to process
 * @param {string} baseUrl - Base URL for relative links
 * @param {number} limit - Maximum number of URLs to return
 * @returns {Promise<Array>} Array of processed URLs
 */
async function processHtmlContent(content, baseUrl, limit) {
  if (!content || !baseUrl) {
    global.auditcore.logger.error('Missing content or baseUrl for HTML processing');
    return [];
  }

  global.auditcore.logger.info(`Processing HTML content from: ${baseUrl}`);

  const dom = new JSDOM(content);
  const { document } = dom.window;
  const urls = [];
  const baseUrlObj = new URL(baseUrl);

  const links = document.querySelectorAll('a[href]');
  global.auditcore.logger.debug(`Found ${links.length} total links`);

  for (const link of links) {
    try {
      // Stop if we've reached the limit
      if (limit > 0 && urls.length >= limit) {
        break;
      }

      const href = link.getAttribute('href');
      global.auditcore.logger.debug(`Checking link href: ${href}`);

      // eslint-disable-next-line no-script-url
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
        global.auditcore.logger.debug(`Skipping invalid href: ${href}`);
        continue;
      }

      const url = new URL(href, baseUrl);
      global.auditcore.logger.debug(`Resolved URL: ${url.href}`);
      global.auditcore.logger.debug(`Comparing hostname: ${url.hostname} vs ${baseUrlObj.hostname}`);

      if (url.hostname === baseUrlObj.hostname) {
        global.auditcore.logger.debug(`Found internal URL: ${url.href}`);
        urls.push({
          url: url.href,
          lastmod: new Date().toISOString(),
          changefreq: 'daily',
          priority: 0.7,
        });
      } else {
        global.auditcore.logger.debug(`Skipping external URL: ${url.href}`);
      }
    } catch (error) {
      global.auditcore.logger.debug(`Error processing link: ${error.message}`);
    }
  }

  global.auditcore.logger.info(`Found ${urls.length} internal URLs`);
  global.auditcore.logger.debug('Internal URLs:', urls.map((u) => u.url).join('\n'));

  return urls;
}

/**
 * Extract URLs from sitemap urlset
 *
 * @param {Object} urlset - Parsed urlset object
 * @returns {Array} Array of extracted URLs containing:
 *   - url: Full URL
 *   - lastmod: Last modified date
 *   - changefreq: Change frequency
 *   - priority: URL priority
 */
function extractUrlsFromUrlset(urlset) {
  if (!urlset?.url) {
    global.auditcore.logger.warn('No URLs found in urlset');
    return [];
  }

  global.auditcore.logger.debug(`Processing ${urlset.url.length} URLs from urlset`);

  const extractedUrls = urlset.url
    .filter((url) => {
      if (!url?.loc?.[0]) return false;

      // Parse URL and check for language variants
      const urlObj = new URL(url.loc[0]);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const hasLanguageVariant = pathParts.length > 0 && pathParts[0].length === 2;
      const isAllowedVariant = ['en', 'us'].includes(pathParts[0]);

      // Skip if URL has a language variant and --include-all-languages is not set
      if (hasLanguageVariant && !isAllowedVariant && !global.auditcore.options.includeAllLanguages) {
        global.auditcore.logger.debug(`Skipping URL with language variant: ${url.loc[0]}`);
        return false;
      }

      return true;
    })
    .map((url) => ({
      url: url.loc[0],
      lastmod: url.lastmod?.[0] || null,
      changefreq: url.changefreq?.[0] || null,
      priority: url.priority ? parseFloat(url.priority[0]) : null,
    }));

  global.auditcore.logger.debug(`Successfully extracted ${extractedUrls.length} valid URLs`);
  return extractedUrls;
}

/**
 * Process sitemap URLs with the URL processor
 *
 * @param {Array} urls - URLs to process
 * @param {boolean} recursive - Whether to recursively process discovered URLs
 * @returns {Promise<Array>} Processed URLs
 */
export async function processSitemapUrls(urls, recursive = false) {
  const processor = new UrlProcessor(global.auditcore.options);
  return processor.processUrls(urls, recursive);
}
