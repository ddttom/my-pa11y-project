/* eslint-disable no-plusplus */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */

// urlProcessor.js

import { getOrRenderData } from './caching.js';
import { processUrl } from './pageAnalyzer.js';
import { updateUrlMetrics, updateResponseCodeMetrics } from './metricsUpdater.js';
import { analyzePerformance } from './performanceAnalyzer.js';
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
          await this.processSuccessfulResponse(testUrl, html, jsErrors, headers, pageData, lastmod);
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
  async processSuccessfulResponse(testUrl, html, jsErrors, headers, pageData, lastmod) {
    global.auditcore.logger.info(`Processing successful response for ${testUrl}`);
    try {
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
      );

      if (result.pa11ySuccess) {
        global.auditcore.logger.info(`Pa11y analysis successful for ${result.url}`);
      }

      global.auditcore.logger.debug(`Analyzing performance for ${testUrl}`);
      const performanceMetrics = await analyzePerformance(testUrl, global.auditcore.logger);
      this.results.performanceAnalysis.push({ url: testUrl, lastmod, ...performanceMetrics });

      global.auditcore.logger.debug(`Calculating SEO score for ${testUrl}`);
      const seoScore = calculateSeoScore({ ...pageData, testUrl, jsErrors, performanceMetrics });
      this.results.seoScores.push({ url: testUrl, lastmod, ...seoScore });

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
   * Processes an array of URLs one by one.
   * @param {Array} urls - The URLs to process.
   * @returns {Promise<Object>} The results of processing all URLs.
   */
  async processUrls(urls) {
    const totalTests = urls.length;

    for (let i = 0; i < totalTests; i++) {
      const { url, lastmod } = urls[i];
      console.info(`Starting processing of URL ${i + 1} of ${totalTests}: ${url}`);
      await this.processUrl(url, lastmod, i, totalTests);
    }

    return this.results;
  }
}

export default UrlProcessor;
