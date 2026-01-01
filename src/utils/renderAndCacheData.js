/**
 * Page rendering and caching utilities
 *
 * This module provides comprehensive page rendering and caching capabilities including:
 * - Puppeteer-based page rendering
 * - Cache management with file-based storage
 * - Comprehensive page data collection
 * - Performance metrics capture
 * - SEO scoring integration
 */

import fs from 'fs/promises';
import path from 'path';
import { executeNetworkOperation, executePuppeteerOperation } from './networkUtils.js';
import { calculateSeoScore } from './seoScoring.js';

/**
 * Renders a page using Puppeteer and collects various data with enhanced error handling
 *
 * Implements:
 * - Cache-first strategy with file-based storage
 * - Comprehensive page data collection including:
 *   - HTML content
 *   - JavaScript errors
 *   - Response headers
 *   - SEO metadata
 *   - Performance metrics
 * - Automatic caching of results
 *
 * @param {string} url - The URL to render and analyze
 * @returns {Promise<Object>} The rendered and analyzed data containing:
 *   - html: Full page HTML
 *   - jsErrors: Array of JavaScript errors
 *   - statusCode: HTTP status code
 *   - headers: Response headers
 *   - pageData: Collected page metadata
 *   - performanceMetrics: Page performance metrics
 *   - seoScore: Calculated SEO score
 *   - lastCrawled: Timestamp of last crawl
 * @throws {Error} If rendering fails
 * @example
 * // Returns rendered page data
 * const data = await renderAndCacheData('https://example.com');
 */
async function renderAndCacheData(url) {
  global.auditcore.logger.debug(`Rendering and caching data for ${url}`);

  // Try to read from cache first
  try {
    const cachePath = path.join(global.auditcore.options.cacheDir, `${Buffer.from(url).toString('hex')}.json`);
    const cachedData = await fs.readFile(cachePath, 'utf-8');
    if (cachedData) {
      global.auditcore.logger.debug(`Cache hit for ${url}`);
      return JSON.parse(cachedData);
    }
  } catch (error) {
    global.auditcore.logger.debug(`Cache miss for ${url}: ${error.message}`);
  }

  // If cache miss, render fresh data
  return executeNetworkOperation(async () => {
    try {
      // Use Puppeteer with enhanced configuration
      const result = await executePuppeteerOperation(async (page) => {
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

        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 60000,
        });

        const html = await page.content();
        const statusCode = (await page.evaluate(() => window.performance.getEntriesByType('navigation')[0].responseStatus)) || 200;

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
          const navigationEntry = performance.getEntriesByType('navigation')[0];
          const paintEntries = performance.getEntriesByType('paint');
          return {
            loadTime: navigationEntry.loadEventEnd,
            domContentLoaded: navigationEntry.domContentLoadedEventEnd,
            firstPaint: paintEntries.find((entry) => entry.name === 'first-paint')?.startTime,
            firstContentfulPaint: paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime,
          };
        });

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

        // Save to cache
        try {
          const cachePath = path.join(global.auditcore.options.cacheDir, `${Buffer.from(url).toString('hex')}.json`);
          await fs.writeFile(cachePath, JSON.stringify(data));
          global.auditcore.logger.debug(`Cached data for ${url}`);
        } catch (error) {
          global.auditcore.logger.warn(`Failed to cache data for ${url}: ${error.message}`);
        }

        return data;
      }, 'Page rendering');

      return result;
    } catch (error) {
      global.auditcore.logger.error(`Error rendering data for ${url}:`, error);
      throw error;
    }
  }, 'Page rendering');
}

export { renderAndCacheData };
