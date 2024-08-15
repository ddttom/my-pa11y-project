/* eslint-disable no-plusplus */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/extensions */
// urlProcessor.js

import PriorityQueue from 'priorityqueuejs';
import { getOrRenderData } from './caching';
import { analyzePageContent } from './pageAnalyzer';
import { updateUrlMetrics, updateResponseCodeMetrics } from './metricsUpdater';
import { analyzePerformance } from './performanceAnalyzer';
import { calculateSeoScore } from './seoScoring';

const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  concurrency: 5,
  batchSize: 10,
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
   * @param {Object} logger - Logger instance.
   */
  constructor(options) {
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.results = {
      performanceAnalysis: [],
      seoScores: [],
      pa11y: [],
      failedUrls: [],
    };
    this.priorityQueue = new PriorityQueue((a, b) => b.priority - a.priority);
  }

  /**
   * Processes a single URL.
   * @param {string} testUrl - The URL to process.
   * @param {string} lastmod - The last modification date of the URL.
   * @param {number} index - The index of the URL in the batch.
   * @param {number} totalTests - The total number of URLs to process.
   * @param {number} [priority=0] - The priority of the URL.
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async processUrl(testUrl, lastmod, index, totalTests, priority = 0) {
    this.global.auditcore.logger.info(`Processing URL ${index + 1} of ${totalTests}: ${testUrl}`);

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const data = await getOrRenderData(testUrl, this.options, this.logger);

        if (data.error) {
          throw new Error(data.error);
        }

        const {
          html, jsErrors, statusCode, headers, pageData,
        } = data;

        this.global.auditcore.logger.debug(`Retrieved data for ${testUrl}. Status code: ${statusCode}`);

        updateUrlMetrics(testUrl, this.options.baseUrl, html, statusCode, this.results, this.logger);
        updateResponseCodeMetrics(statusCode, this.results, this.logger);

        if (statusCode === 200) {
          await this.processSuccessfulResponse(testUrl, html, jsErrors, headers, pageData, lastmod);
        } else {
          this.global.auditcore.logger.warn(`Skipping content analysis for ${testUrl} due to non-200 status code`);
        }

        return; // Successfully processed, exit the retry loop
      } catch (error) {
        this.global.auditcore.logger.error(`Error processing ${testUrl} (Attempt ${attempt}/${this.options.maxRetries}):`, error);

        if (attempt === this.options.maxRetries) {
          this.handleProcessingFailure(testUrl, error);
        } else {
          this.global.auditcore.logger.info(`Retrying ${testUrl} in ${this.options.retryDelay / 1000} seconds...`);
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
  async processSuccessfulResponse(testUrl, html, jsErrors, headers, pageData, lastmod) {
    try {
      const result = await analyzePageContent(
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
      );

      if (result.pa11ySuccess) {
        this.global.auditcore.logger.info(`Pa11y analysis successful for ${result.url}`);
      }

      this.global.auditcore.logger.debug(`Analyzing performance for ${testUrl}`);
      const performanceMetrics = await analyzePerformance(testUrl, this.logger);
      this.results.performanceAnalysis.push({ url: testUrl, lastmod, ...performanceMetrics });

      this.global.auditcore.logger.debug(`Calculating SEO score for ${testUrl}`);
      const seoScore = calculateSeoScore({ ...pageData, performanceMetrics }, this.logger);
      this.results.seoScores.push({ url: testUrl, lastmod, ...seoScore });

      this.global.auditcore.logger.info(`Successfully processed ${testUrl}`);
    } catch (error) {
      this.global.auditcore.logger.error(`Error in processSuccessfulResponse for ${testUrl}:`, error);
      this.handleProcessingFailure(testUrl, error);
    }
  }

  /**
   * Handles a processing failure for a URL.
   * @param {string} testUrl - The URL that failed processing.
   * @param {Error} error - The error that occurred.
   */
  handleProcessingFailure(testUrl, error) {
    this.global.auditcore.logger.error(`Failed to process ${testUrl} after ${this.options.maxRetries} attempts. Last error:`, error);
    this.results.failedUrls.push({ url: testUrl, error: error.message });
  }

  /**
   * Processes a batch of URLs.
   * @param {Array} urls - The URLs to process.
   * @param {number} startIndex - The starting index of the batch.
   * @param {number} batchSize - The size of the batch.
   * @returns {Promise<void>}
   */
  async processBatch(urls, startIndex, batchSize) {
    const endIndex = Math.min(startIndex + batchSize, urls.length);
    const batchPromises = [];

    for (let i = startIndex; i < endIndex; i++) {
      const { url, lastmod, priority } = urls[i];
      this.priorityQueue.enq({
        url, lastmod, index: i, totalTests: urls.length, priority,
      });
    }

    while (!this.priorityQueue.isEmpty()) {
      const {
        url, lastmod, index, totalTests, priority,
      } = this.priorityQueue.deq();
      batchPromises.push(this.processUrl(url, lastmod, index, totalTests, priority));

      if (batchPromises.length >= this.options.concurrency) {
        await Promise.all(batchPromises);
        batchPromises.length = 0;
      }
    }

    if (batchPromises.length > 0) {
      await Promise.all(batchPromises);
    }

    this.global.auditcore.logger.info(`Completed processing batch ${startIndex + 1} to ${endIndex}`);
  }

  /**
   * Calculates the priority of a URL.
   * @param {string} url - The URL to calculate priority for.
   * @param {number} pageRank - The page rank of the URL.
   * @param {number} internalLinksCount - The number of internal links to the URL.
   * @returns {number} The calculated priority.
   */
  getPriority(url, pageRank, internalLinksCount) {
    let priority = pageRank || 0;
    if (url === this.options.baseUrl) priority += 10; // Prioritize homepage
    if (internalLinksCount > 10) priority += 5;
    else if (internalLinksCount > 5) priority += 2;
    return priority;
  }

  /**
   * Processes an array of URLs.
   * @param {Array} urls - The URLs to process.
   * @returns {Promise<Object>} The results of processing all URLs.
   */
  async processUrls(urls) {
    const totalTests = urls.length;
    const batchSize = this.options.batchSize || 10;

    for (let i = 0; i < totalTests; i += batchSize) {
      await this.processBatch(urls, i, batchSize);
    }

    return this.results;
  }
}

export default UrlProcessor;
