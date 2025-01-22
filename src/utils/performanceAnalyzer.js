/**
 * Performance analysis utilities using Puppeteer
 * 
 * This module provides web performance analysis capabilities including:
 * - Core Web Vitals collection
 * - Navigation timing metrics
 * - Retry mechanism for flaky tests
 * - Detailed performance metrics reporting
 * - URL validation with country code restrictions
 * 
 * The analyzer will skip URLs containing two-character country codes in their path
 * (e.g., /ar/, /ru/) except for /en/. These URLs will return default metrics.
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
 * Validates URL against country code restrictions
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid, false otherwise
 * @description
 * Validates URLs based on the following rules:
 * - URL must be valid and start with http(s)://
 * - URL path must not contain two-character country codes (e.g., /ar/, /ru/)
 * - Exception: URLs containing /en/ are allowed
 * - URLs without country codes are allowed
 */
function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    
    // Check if path contains a two-character country code (except /en/)
    if (pathParts.length > 0) {
      const firstSegment = pathParts[0];
      if (firstSegment.length === 2 && firstSegment !== 'en') {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Sets up performance observers for advanced metrics
 * @returns {Promise<Object>} Object containing performance metrics
 */
async function setupPerformanceObservers(page) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      const metrics = {
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        totalBlockingTime: 0,
        longTasks: [],
        resourceSizes: new Map(),
      };

      // Largest Contentful Paint Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Layout Shift Observer
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            metrics.cumulativeLayoutShift += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Long Tasks Observer
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          metrics.longTasks.push(entry);
          metrics.totalBlockingTime += Math.max(entry.duration - 50, 0);
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });

      // Resource Timing Observer
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.initiatorType !== 'beacon' && entry.transferSize > 0) {
            metrics.resourceSizes.set(entry.name, entry.transferSize);
          }
        }
      });
      resourceObserver.observe({ type: 'resource', buffered: true });

      // Wait for metrics to stabilize
      setTimeout(() => {
        resolve({
          largestContentfulPaint: metrics.largestContentfulPaint,
          cumulativeLayoutShift: metrics.cumulativeLayoutShift,
          totalBlockingTime: metrics.totalBlockingTime,
          totalResourceSize: Array.from(metrics.resourceSizes.values()).reduce((sum, size) => sum + size, 0) / 1024,
          resourceCount: metrics.resourceSizes.size,
        });
      }, 2000);
    });
  });
}

/**
 * Attempts to analyze page performance with error handling
 * 
 * @param {string} url - URL to analyze
 * @returns {Promise<Object>} Performance metrics
 * @description
 * Performs performance analysis on the given URL. Will skip URLs containing
 * two-character country codes (except /en/) and return default metrics.
 */
async function attemptAnalysis(url) {
  let browser;
  let page;
  
  try {
    global.auditcore.logger.debug('Launching browser');
    browser = await puppeteer.launch();
    page = await browser.newPage();
    global.auditcore.logger.debug('Browser launched successfully');

    // Validate page context before proceeding
    if (!page || page.isClosed()) {
      throw new Error('Page context is invalid or closed');
    }

    global.auditcore.logger.debug(`Navigating to ${url}`);
    const navigationPromise = page.goto(url, {
      waitUntil: performanceOptions.waitUntil,
      timeout: performanceOptions.timeout,
    });

    // Wait for navigation to complete
    await navigationPromise;
    global.auditcore.logger.debug('Page loaded successfully');

    // Validate page context after navigation
    if (!page || page.isClosed()) {
      throw new Error('Page context destroyed after navigation');
    }

    // Set up performance observers after navigation
    const observersPromise = setupPerformanceObservers(page);

    // Wait for metrics to stabilize
    await sleep(2000);

    // Validate page context before evaluation
    if (!page || page.isClosed()) {
      throw new Error('Page context destroyed before evaluation');
    }

    // Get navigation timing metrics
    const navigationTiming = await page.evaluate(() => {
      try {
        const timing = performance.getEntriesByType('navigation')[0] || {};
        const paint = performance.getEntriesByType('paint') || [];
        return {
          loadTime: timing.loadEventEnd || 0,
          firstPaint: paint[0]?.startTime || 0,
          firstContentfulPaint: paint[1]?.startTime || 0,
          timeToInteractive: timing.domInteractive - timing.navigationStart || 0,
        };
      } catch (error) {
        console.error('Error getting navigation timing:', error);
        return {
          loadTime: 0,
          firstPaint: 0,
          firstContentfulPaint: 0,
          timeToInteractive: 0,
        };
      }
    });

    // Get advanced metrics from observers
    const observerMetrics = await observersPromise;

    // Validate page context before evaluation
    if (!page || page.isClosed()) {
      throw new Error('Page context destroyed before evaluation');
    }

    // Calculate Speed Index
    const speedIndex = await page.evaluate(() => {
      try {
        const frames = window.performance.getEntriesByType('frame');
        if (frames.length > 0) {
          return frames.reduce((sum, frame) => sum + frame.renderingTime, 0);
        }
        return 0;
      } catch (error) {
        console.error('Error calculating speed index:', error);
        return 0;
      }
    });

    const performanceMetrics = {
      ...navigationTiming,
      ...observerMetrics,
      speedIndex: Math.round(speedIndex),
    };

    global.auditcore.logger.debug(`Performance metrics collected for ${url}: ${JSON.stringify(performanceMetrics)}`);
    return performanceMetrics;
  } catch (error) {
    global.auditcore.logger.error(`Error collecting metrics for ${url}:`, error);
    throw error;
  } finally {
    if (browser) {
      try {
        global.auditcore.logger.debug('Closing browser');
        await browser.close();
        global.auditcore.logger.debug('Browser closed successfully');
      } catch (error) {
        global.auditcore.logger.error('Error closing browser:', error);
      }
    }
  }
}

/**
 * Analyzes web page performance with retry mechanism
 * 
 * @param {string} url - URL to analyze
 * @returns {Promise<Object>} Performance metrics
 * @description
 * Performs performance analysis with retry mechanism. Will skip URLs containing
 * two-character country codes (except /en/) and return default metrics.
 */
async function analyzePerformance(url) {
  if (typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error('Invalid URL provided');
  }

  // Validate URL against country code restrictions
  if (!isValidUrl(url)) {
    global.auditcore.logger.warn(`Skipping analysis for URL with restricted country code: ${url}`);
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
