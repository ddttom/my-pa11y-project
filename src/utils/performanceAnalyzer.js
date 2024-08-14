/* eslint-disable import/prefer-default-export */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/extensions */
// performanceAnalyzer.js

// performanceAnalyzer.js

import puppeteer from 'puppeteer';
import { globalOptions, performanceOptions } from '../config/options.js';

const { MAX_RETRIES, INITIAL_BACKOFF } = globalOptions;

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

async function attemptAnalysis(url, logger) {
  let browser;
  try {
    logger.debug('Launching browser');
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    logger.debug('Browser launched successfully');

    logger.debug(`Navigating to ${url}`);
    await page.goto(url, {
      waitUntil: performanceOptions.waitUntil,
      timeout: performanceOptions.timeout,
    });
    logger.debug('Page loaded successfully');

    logger.debug('Collecting performance metrics');
    const performanceMetrics = await page.evaluate(() => {
      const { timing } = performance;
      const paint = performance.getEntriesByType('paint');
      const tti = performance.getEntriesByType('measure').find((entry) => entry.name === 'TTI');
      const lcp = performance.getEntriesByType('largest-contentful-paint').pop();

      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: paint[0] ? paint[0].startTime : null,
        firstContentfulPaint: paint[1] ? paint[1].startTime : null,
        timeToInteractive: tti ? tti.duration : null,
        largestContentfulPaint: lcp ? lcp.startTime : null,
      };
    });

    logger.debug(`Performance metrics collected for ${url}: ${JSON.stringify(performanceMetrics)}`);
    return performanceMetrics;
  } finally {
    if (browser) {
      logger.debug('Closing browser');
      await browser.close();
      logger.debug('Browser closed successfully');
    }
  }
}

/**
 * Analyzes the performance of a web page.
 * @param {string} url - The URL of the page to analyze.
 * @param {Object} logger - The logger object.
 * @returns {Promise<Object>} The performance metrics.
 */
export async function analyzePerformance(url, logger) {
  if (typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error('Invalid URL provided');
  }

  logger.info(`Starting performance analysis for ${url}`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await attemptAnalysis(url, logger);
      logger.info(`Performance analysis completed for ${url}`);
      return result;
    } catch (error) {
      logger.warn(`Attempt ${attempt} failed for ${url}: ${error.message}`);
      logger.debug('Error stack:', error.stack);

      if (attempt === MAX_RETRIES) {
        logger.error(`All ${MAX_RETRIES} attempts failed for ${url}`);
        return {
          loadTime: null,
          domContentLoaded: null,
          firstPaint: null,
          firstContentfulPaint: null,
          timeToInteractive: null,
          largestContentfulPaint: null,
        };
      }

      const backoffTime = INITIAL_BACKOFF * 2 ** (attempt - 1);
      logger.debug(`Retrying in ${backoffTime}ms`);
      await sleep(backoffTime);
    }
  }

  return {
    loadTime: null,
    domContentLoaded: null,
    firstPaint: null,
    firstContentfulPaint: null,
    timeToInteractive: null,
    largestContentfulPaint: null,
  };
}
