/* eslint-disable no-plusplus */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/extensions */
// urlProcessor.js

import PriorityQueue from 'priorityqueuejs';
import { getOrRenderData } from './caching.js';
import { analyzePageContent } from './pageAnalyzer.js';
import { updateUrlMetrics, updateResponseCodeMetrics } from './metricsUpdater.js';
import { analyzePerformance } from './performanceAnalyzer.js';
import { calculateSeoScore } from './seoScoring.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

class UrlProcessor {
  constructor(options, logger) {
    this.options = options;
    this.logger = logger;
    this.results = {
      performanceAnalysis: [],
      seoScores: [],
    };
    this.priorityQueue = new PriorityQueue((a, b) => b.priority - a.priority);
  }

  async processUrl(testUrl, lastmod, index, totalTests, priority = 0) {
    this.logger.info(`Processing URL ${index + 1} of ${totalTests}: ${testUrl}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await getOrRenderData(testUrl, this.options, this.logger);

        if (data.error) {
          throw new Error(data.error);
        }

        const {
          html, jsErrors, statusCode, headers, pageData,
        } = data;

        this.logger.debug(`Retrieved data for ${testUrl}. Status code: ${statusCode}`);

        updateUrlMetrics(testUrl, this.options.baseUrl, html, statusCode, this.results, this.logger);
        updateResponseCodeMetrics(statusCode, this.results, this.logger);

        if (statusCode === 200) {
          await this.processSuccessfulResponse(testUrl, html, jsErrors, headers, pageData, lastmod);
        } else {
          this.logger.warn(`Skipping content analysis for ${testUrl} due to non-200 status code`);
        }

        return; // Successfully processed, exit the retry loop
      } catch (error) {
        this.logger.error(`Error processing ${testUrl} (Attempt ${attempt}/${MAX_RETRIES}):`, error);

        if (attempt === MAX_RETRIES) {
          this.handleProcessingFailure(testUrl, error);
        } else {
          this.logger.info(`Retrying ${testUrl} in ${RETRY_DELAY / 1000} seconds...`);
          await new Promise((resolve) => { setTimeout(resolve, RETRY_DELAY); });
        }
      }
    }
  }

  async processSuccessfulResponse(testUrl, html, jsErrors, headers, pageData, lastmod) {
    // eslint-disable-next-line max-len
    await analyzePageContent(testUrl, html, jsErrors, this.options.baseUrl, this.results, headers, pageData, this.logger);

    this.logger.debug(`Analyzing performance for ${testUrl}`);
    const performanceMetrics = await analyzePerformance(testUrl, this.logger);
    this.results.performanceAnalysis.push({ url: testUrl, lastmod, ...performanceMetrics });

    this.logger.debug(`Calculating SEO score for ${testUrl}`);
    const seoScore = calculateSeoScore({ ...pageData, performanceMetrics }, this.logger);
    this.results.seoScores.push({ url: testUrl, lastmod, ...seoScore });

    this.logger.info(`Successfully processed ${testUrl}`);
  }

  handleProcessingFailure(testUrl, error) {
    this.logger.error(`Failed to process ${testUrl} after ${MAX_RETRIES} attempts. Last error:`, error);
    this.results.failedUrls = this.results.failedUrls || [];
    this.results.failedUrls.push({ url: testUrl, error: error.message });
  }

  async processBatch(urls, startIndex, batchSize, totalTests) {
    const endIndex = Math.min(startIndex + batchSize, urls.length);
    const batchPromises = [];

    for (let i = startIndex; i < endIndex; i++) {
      const { url, lastmod, priority } = urls[i];
      this.priorityQueue.enq({
        url, lastmod, index: i, totalTests, priority,
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

    this.logger.info(`Completed processing batch ${startIndex + 1} to ${endIndex}`);
  }

  getPriority(url, pageRank, internalLinksCount) {
    // Simple priority calculation, can be expanded based on more factors
    let priority = pageRank || 0;
    if (url === this.options.baseUrl) priority += 10; // Prioritize homepage
    if (internalLinksCount > 10) priority += 5;
    else if (internalLinksCount > 5) priority += 2;
    return priority;
  }

  async processUrls(urls) {
    const totalTests = urls.length;
    const batchSize = this.options.batchSize || 10;

    for (let i = 0; i < totalTests; i += batchSize) {
      await this.processBatch(urls, i, batchSize, totalTests);
    }

    return this.results;
  }
}

export default UrlProcessor;
