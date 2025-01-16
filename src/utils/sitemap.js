/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
/* eslint-disable max-len */
// sitemap.js

import { gunzip } from "zlib";
import axios from "axios";
import { parseString } from "xml2js";
import { promisify } from "util";
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import { UrlProcessor } from "./urlProcessor.js";
import { isValidUrl } from './urlUtils.js';
import { getCachedData, setCachedData } from './caching.js';

const parseXml = promisify(parseString);
const gunzipAsync = promisify(gunzip);

/**
 * Checks if a URL contains a nonce parameter
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL contains 'nonce='
 */
function containsNonce(url) {
  return url.includes('nonce=');
}

/**
 * Normalizes a URL by removing query parameters and fragments
 * @param {string} url - The URL to normalize
 * @returns {string} The normalized URL
 */
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove query string and hash
    urlObj.search = '';
    urlObj.hash = '';
    return urlObj.toString();
  } catch (error) {
    return url;
  }
}

/**
 * Checks if a URL belongs to the root domain or its subdomains
 * @param {string} url - The URL to check
 * @param {string} rootDomain - The root domain (e.g., 'icann.org')
 * @returns {boolean} True if the URL belongs to the root domain or its subdomains
 */
function isSameRootDomain(url, rootDomain) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const domain = rootDomain.toLowerCase();

    // Check if hostname ends with root domain
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      global.auditcore.logger.debug(`URL ${url} matches root domain ${rootDomain}`);
      return true;
    }
    
    global.auditcore.logger.debug(`URL ${url} does not match root domain ${rootDomain}`);
    return false;
  } catch (error) {
    global.auditcore.logger.debug(`Error checking domain for URL ${url}: ${error.message}`);
    return false;
  }
}

/**
 * Checks if a URL is a page link (not CSS, JS, image, etc.)
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL appears to be a page link
 */
function isPageLink(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    
    // Common non-page extensions to exclude
    const nonPageExtensions = [
      '.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.svg', 
      '.woff', '.woff2', '.ttf', '.eot', '.ico', '.webp', '.mp4',
      '.pdf', '.zip', '.gz', '.xml', '.json', '.mp3', '.wav',
      '.avi', '.mov', '.wmv', '.flv', '.swf'
    ];
    
    // Paths that typically aren't pages
    const nonPagePaths = [
      '/cdn-cgi/',
      '/assets/',
      '/images/',
      '/img/',
      '/css/',
      '/js/',
      '/fonts/',
      '/static/',
      '/media/',
      '/download/',
      '/uploads/',
      '/resources/'
    ];

    // Check for non-page paths
    if (nonPagePaths.some(p => path.includes(p))) {
      global.auditcore.logger.debug(`URL ${url} contains non-page path`);
      return false;
    }

    // Check for non-page extensions
    if (nonPageExtensions.some(ext => path.endsWith(ext))) {
      global.auditcore.logger.debug(`URL ${url} has non-page extension`);
      return false;
    }

    // Check for query parameters that typically indicate non-page content
    const nonPageParams = ['download', 'attachment', 'file', 'image'];
    const hasNonPageParams = nonPageParams.some(param => urlObj.searchParams.has(param));
    if (hasNonPageParams) {
      global.auditcore.logger.debug(`URL ${url} has non-page query parameters`);
      return false;
    }

    // Accept URLs that:
    // 1. Have no extension
    // 2. End with .html, .htm, .php, .asp, .aspx, .jsp
    // 3. End with trailing slash
    const pageExtensions = ['.html', '.htm', '.php', '.asp', '.aspx', '.jsp'];
    const hasPageExtension = pageExtensions.some(ext => path.endsWith(ext));
    const hasNoExtension = !path.split('/').pop().includes('.');
    const hasTrailingSlash = path.endsWith('/');

    const isPage = hasPageExtension || hasNoExtension || hasTrailingSlash;
    global.auditcore.logger.debug(`URL ${url} is${isPage ? '' : ' not'} a page link`);
    return isPage;

  } catch (error) {
    global.auditcore.logger.debug(`Error checking if URL ${url} is a page: ${error.message}`);
    return false;
  }
}

/**
 * Gets HTML content for a URL, using cache if available
 * @param {string} url - The URL to fetch
 * @param {Object} log - Logger instance
 * @returns {Promise<string>} The HTML content
 */
async function getHtmlContent(url, log) {
  // Try to get from cache first
  const cachedContent = await getCachedData(url);
  if (cachedContent) {
    log.debug(`Using cached HTML content for ${url}`);
    return cachedContent;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport to ensure consistent rendering
    await page.setViewport({
      width: 1280,
      height: 800
    });

    // Set a reasonable timeout
    await page.setDefaultNavigationTimeout(30000);
    
    log.debug(`Fetching HTML for ${url}`);

    // Navigate to the page and wait for it to load
    const response = await page.goto(url, { 
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000
    });

    const status = response.status();
    const statusText = response.statusText();
    const headers = response.headers();

    if (status !== 200) {
      const errorInfo = {
        url,
        source: url,
        statusCode: status,
        reason: `HTTP ${status} - ${statusText}`,
        details: {
          headers,
          redirectChain: response.request().redirectChain().map(r => r.url()),
          timestamp: new Date().toISOString()
        }
      };
      log.error(`HTTP error for ${url}:`, errorInfo);
      throw errorInfo;
    }

    // Wait for body and potential dynamic content
    await Promise.race([
      page.waitForSelector('body'),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);

    // Get the HTML content
    const html = await page.evaluate(() => {
      return document.documentElement.outerHTML;
    });
    
    if (!html || html.length === 0) {
      throw new Error('Retrieved empty HTML content');
    }

    // Cache the HTML content
    await setCachedData(url, html);
    log.debug(`Cached HTML content for ${url}`);

    return html;
  } catch (error) {
    // Format error for invalid_urls.json
    const errorInfo = {
      url,
      source: url,
      statusCode: error.statusCode || null,
      reason: error.reason || (
        error.name === 'TimeoutError' ? 'Request timed out' :
        error.message.includes('net::') ? `Network error: ${error.message}` :
        `Failed to load: ${error.message}`
      ),
      details: {
        errorType: error.name,
        errorMessage: error.message,
        ...(error.details || {}),
        timestamp: new Date().toISOString()
      }
    };
    
    log.error(`Error fetching HTML for ${url}:`, errorInfo);
    throw errorInfo;
  } finally {
    await browser.close();
  }
}

/**
 * Recursively processes pages to extract links
 * @param {string} url - The URL to process
 * @param {Set} visitedUrls - Set of already visited URLs
 * @param {Set} allUniqueUrls - Set of all unique URLs found so far
 * @param {number} limit - Maximum URLs to add to sitemap
 * @param {string} rootDomain - The root domain
 * @param {Object} log - Logger instance
 * @returns {Promise<Object>} Object containing valid and invalid URLs
 */
async function processPageRecursive(url, visitedUrls, allUniqueUrls, limit, rootDomain, log) {
  const normalizedUrl = normalizeUrl(url);
  if (visitedUrls.has(normalizedUrl)) {
    return { validUrls: [], invalidUrls: [] };
  }

  visitedUrls.add(normalizedUrl);
  const validUrls = [];
  const invalidUrls = [];
  const seenInvalidUrls = new Set();  // Track unique invalid URLs for this page

  try {
    log.info(`Scanning page: ${normalizedUrl}`);
    log.info(`Current progress: ${allUniqueUrls.size} unique URLs found${limit !== -1 ? ` (limit: ${limit})` : ''}`);
    
    try {
      const html = await getHtmlContent(url, log);

      if (!html || typeof html !== 'string') {
        log.error(`Invalid HTML content received for ${url}`);
        return { validUrls: [], invalidUrls: [] };
      }

      const links = await extractLinksFromHtml(html, url);
      log.info(`Found ${links.length} links on ${normalizedUrl}`);
      
      let newValidUrls = 0;
      let newInvalidUrls = 0;
      const newInvalidUrlsList = [];  // Store details of new invalid URLs

      // Process found links
      for (const link of links) {
        try {
          const normalizedLink = normalizeUrl(link);
          
          if (containsNonce(link)) {
            continue;
          }

          // Skip if we've already found this invalid URL
          if (seenInvalidUrls.has(normalizedLink)) {
            continue;
          }

          const isRoot = isSameRootDomain(link, rootDomain);
          const isPage = isPageLink(link);
          const isVisited = visitedUrls.has(normalizedLink);
          const isValid = isValidUrl(link);
          
          if (!isRoot || !isPage || isVisited || !isValid) {
            const reason = !isRoot ? "Not in root domain" :
                          !isPage ? "Not a page link" :
                          isVisited ? "Already visited" :
                          "Invalid URL format";

            newInvalidUrls++;
            seenInvalidUrls.add(normalizedLink);
            
            const invalidUrl = {
              url: normalizedLink,
              source: url,
              reason,
              timestamp: new Date().toISOString()
            };
            
            invalidUrls.push(invalidUrl);
            newInvalidUrlsList.push(invalidUrl);
            continue;
          }

          // Check limit before adding
          if (limit !== -1 && allUniqueUrls.size >= limit) {
            log.info(`Reached limit of ${limit} unique URLs`);
            break;
          }

          // Add to global unique set and valid URLs
          if (!allUniqueUrls.has(normalizedLink)) {
            allUniqueUrls.add(normalizedLink);
            validUrls.push({
              url: normalizedLink,
              lastmod: null,
              changefreq: null,
              priority: null
            });
            newValidUrls++;
          }

          // Recursively process new URL
          const nestedUrls = await processPageRecursive(
            normalizedLink,
            visitedUrls,
            allUniqueUrls,
            limit,
            rootDomain,
            log
          );
          validUrls.push(...nestedUrls.validUrls);
          invalidUrls.push(...nestedUrls.invalidUrls);

        } catch (error) {
          log.error(`Error processing link ${link}:`, error);
        }
      }

      // Summary for this page
      log.info(`Page scan summary for ${normalizedUrl}:`);
      log.info(`├─ Total links found: ${links.length}`);
      log.info(`├─ New valid URLs: ${newValidUrls}`);
      log.info(`├─ Invalid URLs: ${newInvalidUrls}`);
      log.info(`└─ Total unique URLs found so far: ${allUniqueUrls.size}${limit !== -1 ? ` / ${limit}` : ''}`);

      // Log new invalid URLs if any were found
      if (newInvalidUrlsList.length > 0) {
        log.info('New invalid URLs found:');
        newInvalidUrlsList.forEach(invalid => {
          log.info(`├─ ${invalid.url}`);
          log.info(`│  ├─ Source: ${invalid.source}`);
          log.info(`│  └─ Reason: ${invalid.reason}`);
        });
      }

      return { validUrls, invalidUrls };
    } catch (fetchError) {
      log.error(`Failed to fetch ${url}: ${fetchError.reason || fetchError.message}`);
      invalidUrls.push({
        url: fetchError.url || url,
        source: url,
        reason: fetchError.reason || `Failed to fetch: ${fetchError.message}`,
        statusCode: fetchError.statusCode,
        error: fetchError.error,
        timestamp: fetchError.timestamp || new Date().toISOString()
      });
      return { validUrls: [], invalidUrls };
    }
  } catch (error) {
    log.error(`Error processing page ${normalizedUrl}: ${error.message}`);
    return {
      validUrls: [],
      invalidUrls: [{
        url: normalizedUrl,
        source: url,
        reason: `Processing error: ${error.message}`,
        error,
        timestamp: new Date().toISOString()
      }]
    };
  }
}

/**
 * Extracts links from HTML content with improved link detection
 * @param {string} html - The HTML content
 * @param {string} baseUrl - The base URL for resolving relative links
 * @returns {Promise<Array<string>>} Array of absolute URLs
 */
async function extractLinksFromHtml(html, baseUrl) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (['image', 'stylesheet', 'font', 'script'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set content with base URL
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Set base URL for relative links
    await page.evaluate((base) => {
      const baseTag = document.createElement('base');
      baseTag.href = base;
      document.head.prepend(baseTag);
    }, baseUrl);

    // Extract links with detailed debugging
    const result = await page.evaluate(() => {
      const debug = [];
      const links = new Set();
      
      // Get all anchor elements
      const anchors = document.querySelectorAll('a[href]');
      debug.push(`Found ${anchors.length} anchor elements`);
      
      // Process each anchor
      anchors.forEach((anchor, index) => {
        try {
          const href = anchor.href;
          const text = anchor.textContent.trim();
          
          debug.push(`[${index}] Processing: href="${href}", text="${text}"`);
          
          if (!href || href === '#' || href === '/') {
            debug.push(`[${index}] Skipping: invalid href`);
            return;
          }

          if (href.startsWith('javascript:') || 
              href.startsWith('mailto:') || 
              href.startsWith('tel:') ||
              href.startsWith('data:')) {
            debug.push(`[${index}] Skipping: protocol not supported`);
            return;
          }

          // Add to Set to remove duplicates
          links.add(href);
          debug.push(`[${index}] Added URL: ${href}`);
        } catch (error) {
          debug.push(`[${index}] Error: ${error.message}`);
        }
      });

      return {
        links: Array.from(links),
        debug
      };
    });

    // Log debug information
    result.debug.forEach(msg => {
      global.auditcore.logger.debug(`Link extraction: ${msg}`);
    });
    
    global.auditcore.logger.info(`Extracted ${result.links.length} unique links from the page`);
    
    return result.links;
  } catch (error) {
    global.auditcore.logger.error('Error in extractLinksFromHtml:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Processes an HTML sitemap using Puppeteer
 * @param {string} sitemapUrl - The URL of the HTML sitemap
 * @param {number} limit - Maximum URLs to add to sitemap
 * @returns {Promise<Object>} Object containing valid and invalid URLs
 */
async function processHtmlSitemap(sitemapUrl, limit) {
  const log = global.auditcore?.logger || console;
  const visitedUrls = new Set();
  const allUniqueUrls = new Set();  // Track all unique URLs across all pages
  const rootDomain = new URL(sitemapUrl).hostname;

  try {
    const { validUrls, invalidUrls } = await processPageRecursive(
      sitemapUrl,
      visitedUrls,
      allUniqueUrls,
      limit,
      rootDomain,
      log
    );

    return {
      validUrls,
      invalidUrls
    };
  } catch (error) {
    log.error(`Error processing HTML sitemap: ${error.message}`);
    throw error;
  }
}

/**
 * Fetches URLs from a sitemap (XML or HTML)
 * @param {string} sitemapUrl - The URL of the sitemap
 * @param {number} limit - The maximum number of URLs to fetch (-1 for no limit)
 * @returns {Promise<Object>} An object containing arrays of valid and invalid URLs
 * @throws {Error} If there's an error fetching or parsing the sitemap
 */
async function getUrlsFromSitemap(sitemapUrl, limit) {
  const log = global.auditcore?.logger || console;
  log.info(`Fetching sitemap from ${sitemapUrl}`);

  // Handle HTML sitemaps
  if (sitemapUrl.endsWith('.html')) {
    return processHtmlSitemap(sitemapUrl, limit);
  }

  try {
    const response = await axios.get(sitemapUrl, {
      responseType: "arraybuffer",
    });
    let sitemapContent = response.data;

    // Check if the content is gzipped
    if (
      response.headers["content-encoding"] === "gzip" ||
      sitemapUrl.endsWith(".gz")
    ) {
      sitemapContent = await gunzipAsync(sitemapContent);
    }

    const sitemapString = sitemapContent.toString("utf-8");
    const result = await parseXml(sitemapString);

    let urls = [];
    let validUrls = [];
    let invalidUrls = [];
    const uniqueUrls = new Set(); // Track unique URLs

    if (result.sitemapindex) {
      // This is a sitemap index, we need to fetch each sitemap
      log.info("Sitemap index detected. Fetching individual sitemaps...");
      const sitemapUrls = result.sitemapindex.sitemap.map(
        (sitemap) => sitemap.loc[0]
      );
      for (const url of sitemapUrls) {
        const sitemapUrlsResult = await getUrlsFromSitemap(url, -1);
        // Add only unique URLs while respecting the limit
        for (const validUrl of sitemapUrlsResult.validUrls) {
          if (limit !== -1 && uniqueUrls.size >= limit) break;
          uniqueUrls.add(validUrl.url);
        }
        invalidUrls = invalidUrls.concat(sitemapUrlsResult.invalidUrls);
        if (limit !== -1 && uniqueUrls.size >= limit) break;
      }
      // Convert unique URLs to array format
      validUrls = Array.from(uniqueUrls).map(url => ({
        url,
        lastmod: null,
        changefreq: null,
        priority: null
      }));
    } else if (result.urlset) {
      // This is a regular sitemap
      urls = result.urlset.url.map((url) => ({
        url: url.loc[0],
        lastmod: url.lastmod ? url.lastmod[0] : null,
        changefreq: url.changefreq ? url.changefreq[0] : null,
        priority: url.priority ? parseFloat(url.priority[0]) : null,
      }));

      // Validate URLs and ensure uniqueness
      urls.forEach((url) => {
        const normalizedUrl = url.url.replace(/([^:]\/)\/+/g, "$1");
        if (isValidUrl(normalizedUrl)) {
          if (!uniqueUrls.has(normalizedUrl) && (limit === -1 || uniqueUrls.size < limit)) {
            uniqueUrls.add(normalizedUrl);
            validUrls.push({ ...url, url: normalizedUrl });
          }
        } else {
          invalidUrls.push({
            url: url.url,
            source: sitemapUrl,
            reason: "Invalid URL format",
            timestamp: new Date().toISOString()
          });
        }
      });
    } else {
      throw new Error("Invalid sitemap format");
    }

    log.info(
      `Extracted ${validUrls.length} unique valid URLs and ${invalidUrls.length} invalid URLs from sitemap`
    );
    log.debug(`Valid URLs: ${JSON.stringify(validUrls)}`);
    log.debug(`Invalid URLs: ${JSON.stringify(invalidUrls)}`);

    return { validUrls, invalidUrls };
  } catch (error) {
    log.error(`Error fetching sitemap: ${error.message}`);
    log.debug(`Error stack: ${error.stack}`);
    throw error;
  }
}

/**
 * Processes URLs extracted from a sitemap.
 * @param {Array} urls - The URLs to process.
 * @param {Object} options - The options for URL processing.
 * @returns {Promise<Object>} The results of URL processing.
 * @throws {Error} If there's an error during URL processing.
 */
async function processSitemapUrls(urls, options) {
  const log = global.auditcore?.logger || console;
  log.info(`Processing ${urls.length} URL(s)`);

  const processorOptions = {
    ...options,
    baseUrl: options.baseUrl || (urls[0] && new URL(urls[0].url).origin),
    outputDir: options.outputDir || "./output",
    concurrency: options.concurrency || 5,
    batchSize: options.batchSize || 10,
  };

  const urlProcessor = new UrlProcessor(processorOptions);

  try {
    const results = await urlProcessor.processUrls(urls);
    
    // Initialize URL metrics if they don't exist
    results.urlMetrics = results.urlMetrics || {
      total: 0,
      internal: 0,
      external: 0,
      internalIndexable: 0,
      internalNonIndexable: 0,
    };

    // Update total URLs processed
    results.urlMetrics.total = urls.length;

    log.info(`Completed processing ${urls.length} URLs`);

    return results;
  } catch (error) {
    log.error(`Error during URL processing: ${error.message}`);
    log.debug(`Error stack: ${error.stack}`);
    throw error;
  }
}

/**
 * Generates XML content from URLs with debug information
 * @param {Array<{url: string, lastmod?: string, changefreq?: string, priority?: number}>} urls - Array of URL objects
 * @returns {string} XML content with debug comments
 * @example
 * const urls = [{ url: 'https://example.com', lastmod: '2024-01-15' }];
 * const xml = generateVirtualSitemap(urls);
 */
function generateVirtualSitemap(urls) {
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>'];
  xml.push('<!-- Virtual sitemap generated for debugging -->');
  xml.push(`<!-- Total URLs: ${urls.length} -->`);
  xml.push(`<!-- Generation time: ${new Date().toISOString()} -->`);
  xml.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  
  urls.forEach((url, index) => {
    xml.push(`  <!-- URL ${index + 1} -->`);
    xml.push('  <url>');
    xml.push(`    <loc>${url.url}</loc>`);
    if (url.lastmod) xml.push(`    <lastmod>${url.lastmod}</lastmod>`);
    if (url.changefreq) xml.push(`    <changefreq>${url.changefreq}</changefreq>`);
    if (url.priority) xml.push(`    <priority>${url.priority}</priority>`);
    xml.push('  </url>');
  });
  
  xml.push('</urlset>');
  return xml.join('\n');
}

/**
 * Saves virtual sitemap to file with error handling
 * @param {string} content - XML content
 * @param {string} path - Output path
 * @returns {Promise<void>}
 * @throws {Error} If there's an error writing the file
 * @example
 * await saveVirtualSitemap(xmlContent, './results/debug_sitemap.xml');
 */
async function saveVirtualSitemap(content, path) {
  try {
    await fs.writeFile(path, content, 'utf8');
    global.auditcore.logger.debug(`Virtual sitemap saved successfully to: ${path}`);
    global.auditcore.logger.debug(`Sitemap size: ${content.length} bytes`);
  } catch (error) {
    global.auditcore.logger.error(`Error saving virtual sitemap to ${path}:`, error);
    global.auditcore.logger.debug('Error stack:', error.stack);
    throw error;
  }
}

export {
  getUrlsFromSitemap,
  processSitemapUrls,
  generateVirtualSitemap,
  saveVirtualSitemap
};
