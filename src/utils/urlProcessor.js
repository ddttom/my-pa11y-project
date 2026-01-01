/* eslint-disable no-plusplus */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */

// urlProcessor.js

import { getOrRenderData, setCachedData } from './caching.js';
import { processUrl } from './pageAnalyzer.js';
import { updateUrlMetrics, updateResponseCodeMetrics } from './metricsUpdater.js';
import analyzePerformance from './performanceAnalyzer.js';
import { calculateSeoScore } from './seoScoring.js';
import { writeToInvalidUrlFile } from './urlUtils.js';

const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  runPa11y: true,
  pa11yTimeout: 60000,
  pa11yThreshold: 200,
  generateAccessibilityReport: true,
};

/**
 * Class for processing URLs and performing SEO analysis.
 */
export class UrlProcessor {
  /**
   * Creates a new UrlProcessor instance.
   * @param {Object} options - Configuration options.
   */
  constructor(options) {
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.results = {
      performanceAnalysis: [],
      seoScores: [],
      pa11y: [],
      failedUrls: [],
    };
  }

  /**
   * Processes a single URL.
   * @param {string} testUrl - The URL to process.
   * @param {string} lastmod - The last modification date of the URL.
   * @param {number} index - The index of the URL in the batch.
   * @param {number} totalTests - The total number of URLs to process.
   * @returns {Promise<void>}
   */
  async processUrl(testUrl, lastmod, index, totalTests) {
    // Log the initial state and input parameters
    global.auditcore.logger.info(`Initiating processing for URL at index ${index + 1} of ${totalTests}: ${testUrl}`);
    global.auditcore.logger.debug(`Last modified date: ${lastmod}, Configuration: ${JSON.stringify(this.options)}`);

    // Early validation check
    if (!testUrl) {
      global.auditcore.logger.error(`Undefined or invalid URL provided at index ${index + 1}`);
      this.results.failedUrls.push({ url: 'undefined', error: 'Invalid or undefined URL' });
      return;
    }

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        global.auditcore.logger.debug(`Attempt ${attempt} to process ${testUrl}`);
        const data = await getOrRenderData(testUrl, this.options, global.auditcore.logger);

        if (data.error) {
          throw new Error(data.error);
        }

        const {
          html, jsErrors, statusCode, headers, pageData,
        } = data;

        global.auditcore.logger.debug(`Data retrieved for ${testUrl}. Status code: ${statusCode}`);
        updateUrlMetrics(testUrl, this.options.baseUrl, html, statusCode, this.results, global.auditcore.logger);
        updateResponseCodeMetrics(statusCode, this.results, global.auditcore.logger);

        if (statusCode === 200) {
          global.auditcore.logger.info(`Successfully received 200 status for ${testUrl}`);
          await this.processSuccessfulResponse(testUrl, html, jsErrors, headers, pageData, lastmod, data);
        } else {
          const invalidUrl = {
            url: testUrl,
            reason: `Non-200 status code (${statusCode})`,
          };
          writeToInvalidUrlFile(invalidUrl);
          global.auditcore.logger.warn(`Non-200 status code (${statusCode}) for ${testUrl}, skipping content analysis`);
        }

        return; // Successfully processed, exit the retry loop
      } catch (error) {
        global.auditcore.logger.error(`Error processing ${testUrl} (Attempt ${attempt}/${this.options.maxRetries}): ${error.message}`);

        if (attempt === this.options.maxRetries) {
          this.handleProcessingFailure(testUrl, error);
        } else {
          global.auditcore.logger.info(`Retrying ${testUrl} in ${this.options.retryDelay / 1000} seconds...`);
          await new Promise((resolve) => { setTimeout(resolve, this.options.retryDelay); });
        }
      }
    }
  }

  /**
   * Processes a successful response.
   * @param {string} testUrl - The URL being processed.
   * @param {string} html - The HTML content of the page.
   * @param {Array} jsErrors - JavaScript errors encountered during rendering.
   * @param {Object} headers - HTTP headers of the response.
   * @param {Object} pageData - Additional data about the page.
   * @param {string} lastmod - The last modification date of the URL.
   * @returns {Promise<void>}
   */
  async processSuccessfulResponse(testUrl, html, jsErrors, headers, pageData, lastmod, cachedData = null) {
    global.auditcore.logger.info(`Processing successful response for ${testUrl}`);
    try {
      const cachedPa11y = cachedData ? cachedData.pa11y : null;
      const result = await processUrl(
        testUrl,
        html,
        jsErrors,
        this.options.baseUrl,
        this.results,
        headers,
        pageData,
        {
          runPa11y: this.options.runPa11y,
          pa11yTimeout: this.options.pa11yTimeout,
          pa11yThreshold: this.options.pa11yThreshold,
          generateAccessibilityReport: this.options.generateAccessibilityReport,
          retryAttempts: this.options.maxRetries,
          retryDelay: this.options.retryDelay,
        },
        cachedPa11y,
      );

      if (result.pa11ySuccess) {
        global.auditcore.logger.info(`Pa11y analysis successful for ${result.url}`);
      }

      let performanceMetrics;
      if (cachedData && cachedData.performanceMetrics && Object.keys(cachedData.performanceMetrics).length > 0) {
        global.auditcore.logger.info(`Using cached performance metrics for ${testUrl}`);
        performanceMetrics = cachedData.performanceMetrics;
      } else {
        global.auditcore.logger.debug(`Analyzing performance for ${testUrl}`);
        performanceMetrics = await analyzePerformance(testUrl, global.auditcore.logger);
      }
      this.results.performanceAnalysis.push({ url: testUrl, lastmod, ...performanceMetrics });

      global.auditcore.logger.debug(`Calculating SEO score for ${testUrl}`);
      const seoScore = calculateSeoScore({
        ...pageData, testUrl, jsErrors, performanceMetrics,
      });
      this.results.seoScores.push({ url: testUrl, lastmod, ...seoScore });

      // Update cache with all results
      if (cachedData) {
        const newCacheData = {
          ...cachedData,
          pa11y: result.pa11y,
          performanceMetrics,
          seoScore,
        };
        await setCachedData(testUrl, newCacheData);
        global.auditcore.logger.debug(`Updated cache with full analysis results for ${testUrl}`);
      }

      global.auditcore.logger.info(`Successfully processed ${testUrl}`);
    } catch (error) {
      global.auditcore.logger.error(`Error in processSuccessfulResponse for ${testUrl}: ${error.message}`);
      this.handleProcessingFailure(testUrl, error);
    }
  }

  /**
   * Handles a processing failure for a URL.
   * @param {string} testUrl - The URL that failed processing.
   * @param {Error} error - The error that occurred.
   */
  handleProcessingFailure(testUrl, error) {
    const invalidUrl = {
      url: testUrl,
      reason: error.message,
    };
    writeToInvalidUrlFile(invalidUrl);
    global.auditcore.logger.error(`Failed to process ${testUrl} after ${this.options.maxRetries} attempts. Last error: ${error.message}`);
    this.results.failedUrls.push({ url: testUrl || 'undefined', error: error.message });
  }

  /**
   * Extracts newly discovered URLs from a processed page's internal links.
   * @param {string} currentUrl - The URL that was just processed.
   * @param {string} baseUrl - The base URL (origin) to compare against.
   * @param {Set} processedUrls - Set of URLs that have been or will be processed.
   * @returns {Array} Array of new URL objects to add to the queue.
   */
  extractDiscoveredUrls(currentUrl, baseUrl, processedUrls) {
    // Find the internal links entry for the current URL
    const pageLinks = this.results.internalLinks?.find((item) => item.url === currentUrl);

    if (!pageLinks || !pageLinks.links) {
      return [];
    }

    const newUrls = [];

    for (const link of pageLinks.links) {
      const linkUrl = link.url;

      // Verify same domain and normalize URL
      try {
        const linkUrlObj = new URL(linkUrl);
        const baseUrlObj = new URL(baseUrl);

        // Skip if different origin
        if (linkUrlObj.origin !== baseUrlObj.origin) {
          continue;
        }

        // Normalize URL: remove hash fragment and query parameters
        linkUrlObj.hash = '';
        linkUrlObj.search = '';
        const normalizedUrl = linkUrlObj.href;

        // Skip if already processed or queued (check normalized URL)
        if (processedUrls.has(normalizedUrl)) {
          continue;
        }

        // Skip if normalized URL is the same as the current page
        // (e.g., https://example.com/page linking to https://example.com/page#section)
        if (normalizedUrl === currentUrl) {
          continue;
        }

        newUrls.push({
          url: normalizedUrl,
          lastmod: new Date().toISOString(),
          changefreq: 'daily',
          priority: 0.5,
        });
      } catch (error) {
        global.auditcore.logger.debug(`Invalid URL found: ${linkUrl}`);
      }
    }

    return newUrls;
  }

  /**
   * Processes an array of URLs sequentially (original behavior).
   * @param {Array} urls - The URLs to process.
   * @returns {Promise<Object>} The results of processing all URLs.
   */
  async processUrlsSequentially(urls) {
    if (!Array.isArray(urls) || urls.length === 0) {
      global.auditcore.logger.warn('No URLs to process');
      return [];
    }

    global.auditcore.logger.info(`Processing ${urls.length} URLs sequentially`);
    const totalTests = urls.length;

    for (let i = 0; i < totalTests; i++) {
      const { url, lastmod } = urls[i];
      console.info(`Starting processing of URL ${i + 1} of ${totalTests}: ${url}`);
      await this.processUrl(url, lastmod, i, totalTests);
    }

    return this.results;
  }

  /**
   * Processes an array of URLs concurrently with configurable concurrency.
   * @param {Array} urls - The URLs to process.
   * @param {number} concurrency - Maximum number of concurrent operations (default: 3).
   * @returns {Promise<Object>} The results of processing all URLs.
   */
  async processUrlsConcurrently(urls, concurrency = 3) {
    if (!Array.isArray(urls) || urls.length === 0) {
      global.auditcore.logger.warn('No URLs to process');
      return [];
    }

    global.auditcore.logger.info(`Processing ${urls.length} URLs with concurrency ${concurrency}`);
    const totalTests = urls.length;
    const progressTracker = { completed: 0 }; // Use object to avoid no-loop-func issue

    // Process URLs in batches based on concurrency
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const startIndex = i;

      const batchPromises = batch.map(async ({ url, lastmod }, batchIndex) => {
        const globalIndex = startIndex + batchIndex;
        try {
          console.info(`Starting processing of URL ${globalIndex + 1} of ${totalTests}: ${url}`);
          await this.processUrl(url, lastmod, globalIndex, totalTests);
          progressTracker.completed++;
          global.auditcore.logger.info(`Progress: ${progressTracker.completed}/${totalTests} URLs completed`);
        } catch (error) {
          global.auditcore.logger.error(`Error processing URL ${url}:`, error);
          progressTracker.completed++;
        }
      });

      // Wait for current batch to complete before starting next batch
      await Promise.allSettled(batchPromises);
    }

    return this.results;
  }

  /**
   * Processes an array of URLs with optional recursive crawling.
   * @param {Array} urls - The initial URLs to process.
   * @param {boolean} recursive - Whether to recursively process discovered URLs.
   * @returns {Promise<Object>} The results of processing all URLs.
   */
  async processUrls(urls, recursive = false) {
    if (!recursive) {
      // Use concurrent processing for better performance
      const concurrency = this.options.urlConcurrency || 3;
      return this.processUrlsConcurrently(urls, concurrency);
    }

    // Recursive mode: queue-based processing
    if (!Array.isArray(urls) || urls.length === 0) {
      global.auditcore.logger.warn('No URLs to process');
      return [];
    }

    global.auditcore.logger.info(`Starting recursive crawling with ${urls.length} initial URLs`);

    const urlQueue = [...urls]; // Copy initial URLs
    const processedUrls = new Set(); // Track processed URLs
    const queuedUrls = new Set(urls.map((u) => u.url)); // Track URLs in queue
    const baseUrl = urls[0]?.url ? new URL(urls[0].url).origin : null;

    if (!baseUrl) {
      global.auditcore.logger.error('Could not determine base URL for recursive crawling');
      return this.processUrlsSequentially(urls);
    }

    let index = 0;

    while (urlQueue.length > 0) {
      // Check if we've reached the absolute limit (if set)
      if (this.options.limit > 0 && processedUrls.size >= this.options.limit) {
        global.auditcore.logger.info(`Reached configured limit of ${this.options.limit} URLs. Stopping recursive crawl.`);
        break;
      }

      const urlObj = urlQueue.shift();
      const { url, lastmod } = urlObj;

      // Skip if already processed
      if (processedUrls.has(url)) {
        continue;
      }

      processedUrls.add(url);
      const totalProcessed = processedUrls.size;
      const totalQueued = urlQueue.length;

      console.info(`Processing URL ${totalProcessed} (${totalQueued} in queue): ${url}`);

      // Process this URL
      await this.processUrl(url, lastmod, index, totalProcessed);
      index++;

      // Extract newly discovered URLs from this page's internal links
      const discoveredUrls = this.extractDiscoveredUrls(url, baseUrl, processedUrls);

      // Add discovered URLs to queue, checking for duplicates
      if (discoveredUrls.length > 0) {
        const newUrls = discoveredUrls.filter((u) => !queuedUrls.has(u.url));
        if (newUrls.length > 0) {
          global.auditcore.logger.info(`Found ${newUrls.length} new URLs to process from ${url} (${discoveredUrls.length - newUrls.length} already queued)`);
          newUrls.forEach((u) => queuedUrls.add(u.url));
          urlQueue.push(...newUrls);
        }
      }
    }

    global.auditcore.logger.info(`Recursive crawling complete. Processed ${processedUrls.size} total URLs`);
    return this.results;
  }
}

export default UrlProcessor;
