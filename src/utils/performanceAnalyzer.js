/**
 * Performance analysis utilities using Puppeteer
 * 
 * This module provides web performance analysis capabilities including:
 * - Core Web Vitals collection
 * - Navigation timing metrics
 * - Resource usage metrics
 * - Retry mechanism for flaky tests
 * - Detailed performance metrics reporting
 */

/* eslint-disable no-await-in-loop */

import puppeteer from 'puppeteer';
import { globalOptions, performanceOptions } from '../config/options.js';

const { MAX_RETRIES, INITIAL_BACKOFF } = globalOptions;

/**
 * Helper function to pause execution
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Resolves after specified time
 */
function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

/**
 * Attempts to analyze page performance with error handling
 * 
 * @param {string} url - URL to analyze
 * @returns {Promise<Object>} Performance metrics containing:
 *   - loadTime: Full page load time
 *   - firstPaint: First paint time
 *   - firstContentfulPaint: First contentful paint time
 *   - largestContentfulPaint: Largest contentful paint time
 *   - timeToInteractive: Time to interactive
 *   - speedIndex: Speed Index
 *   - totalBlockingTime: Total Blocking Time
 *   - cumulativeLayoutShift: Cumulative Layout Shift
 *   - resourceCount: Number of resources loaded
 *   - totalResourceSize: Total size of resources in KB
 * @throws {Error} If analysis fails
 */
async function attemptAnalysis(url) {
  let browser;
  try {
    global.auditcore.logger.debug('Launching browser');
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    global.auditcore.logger.debug('Browser launched successfully');

    global.auditcore.logger.debug(`Navigating to ${url}`);
    await page.goto(url, {
      waitUntil: performanceOptions.waitUntil,
      timeout: performanceOptions.timeout,
    });
    global.auditcore.logger.debug('Page loaded successfully');

    global.auditcore.logger.debug('Collecting performance metrics');
    const performanceMetrics = await page.evaluate(() => {
      const navigationTiming = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      const tti = performance.getEntriesByType('measure').find((entry) => entry.name === 'TTI');
      const lcp = performance.getEntriesByType('largest-contentful-paint').pop();
      const longTasks = performance.getEntriesByType('longtask');
      const resources = performance.getEntriesByType('resource');
      
      // Calculate resource metrics
      const resourceCount = resources.length;
      const totalResourceSize = resources.reduce((total, resource) => {
        return total + (resource.transferSize || 0);
      }, 0) / 1024; // Convert to KB

      return {
        loadTime: navigationTiming.loadEventEnd || 0,
        firstPaint: paint[0]?.startTime || 0,
        firstContentfulPaint: paint[1]?.startTime || 0,
        largestContentfulPaint: lcp?.startTime || 0,
        timeToInteractive: tti?.duration || 0,
        speedIndex: performance.timing.loadEventEnd - performance.timing.navigationStart,
        totalBlockingTime: longTasks.reduce((total, task) => {
          const blockingTime = task.duration - 50;
          return total + Math.max(0, blockingTime);
        }, 0),
        cumulativeLayoutShift: performance.getEntriesByType('layout-shift')
          .reduce((total, entry) => total + entry.value, 0),
        resourceCount,
        totalResourceSize: Math.round(totalResourceSize * 100) / 100 // Round to 2 decimal places
      };
    });

    global.auditcore.logger.debug(`Performance metrics collected for ${url}: ${JSON.stringify(performanceMetrics)}`);
    return performanceMetrics;
  } finally {
    if (browser) {
      global.auditcore.logger.debug('Closing browser');
      await browser.close();
      global.auditcore.logger.debug('Browser closed successfully');
    }
  }
}

/**
 * Analyzes web page performance with retry mechanism
 * 
 * Implements exponential backoff retry strategy with:
 * - Configurable max retries (MAX_RETRIES)
 * - Configurable initial backoff (INITIAL_BACKOFF)
 * - Detailed error logging
 * 
 * @param {string} url - URL to analyze
 * @returns {Promise<Object>} Performance metrics containing:
 *   - loadTime: Full page load time
 *   - firstPaint: First paint time
 *   - firstContentfulPaint: First contentful paint time
 *   - largestContentfulPaint: Largest contentful paint time
 *   - timeToInteractive: Time to interactive
 *   - speedIndex: Speed Index
 *   - totalBlockingTime: Total Blocking Time
 *   - cumulativeLayoutShift: Cumulative Layout Shift
 *   - resourceCount: Number of resources loaded
 *   - totalResourceSize: Total size of resources in KB
 * @throws {Error} If URL is invalid
 */
async function analyzePerformance(url) {
  if (typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error('Invalid URL provided');
  }

  global.auditcore.logger.info(`Starting performance analysis for ${url}`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await attemptAnalysis(url);
      global.auditcore.logger.info(`Performance analysis completed for ${url}`);
      return result;
    } catch (error) {
      global.auditcore.logger.warn(`Attempt ${attempt} failed for ${url}: ${error.message}`);
      global.auditcore.logger.debug('Error stack:', error.stack);

      if (attempt === MAX_RETRIES) {
        global.auditcore.logger.error(`All ${MAX_RETRIES} attempts failed for ${url}`);
        return {
          loadTime: 0,
          firstPaint: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          timeToInteractive: 0,
          speedIndex: 0,
          totalBlockingTime: 0,
          cumulativeLayoutShift: 0,
          resourceCount: 0,
          totalResourceSize: 0
        };
      }

      const backoffTime = INITIAL_BACKOFF * 2 ** (attempt - 1);
      global.auditcore.logger.debug(`Retrying in ${backoffTime}ms`);
      await sleep(backoffTime);
    }
  }

  return {
    loadTime: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    timeToInteractive: 0,
    speedIndex: 0,
    totalBlockingTime: 0,
    cumulativeLayoutShift: 0,
    resourceCount: 0,
    totalResourceSize: 0
  };
}

export default analyzePerformance;
