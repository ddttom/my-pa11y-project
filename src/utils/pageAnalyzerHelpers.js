/* eslint-disable no-await-in-loop */

// pageAnalyzerHelpers.js

import { getInternalLinks } from './linkAnalyzer.js';
import { updateInternalLinks } from './technicalMetrics.js';

/**
 * Retries an operation with a specified number of attempts and delay.
 * @param {Function} operation - The operation to retry.
 * @param {number} retryAttempts - The number of retry attempts.
 * @param {number} retryDelay - The delay between retries in milliseconds.
 * @returns {Promise<*>} The result of the operation.
 */
async function retryOperation(operation, retryAttempts, retryDelay) {
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const result = await operation();
      global.auditcore.logger.debug(`Operation succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      if (attempt === retryAttempts) {
        global.auditcore.logger.warn(`Operation failed after ${retryAttempts} attempts: ${error.message}`);
        return Promise.reject(error);
      }
      global.auditcore.logger.warn(`Operation failed, retrying (${attempt}/${retryAttempts}): ${error.message}`);
      await new Promise((resolve) => { setTimeout(resolve, retryDelay); });
    }
  }
  return null;
}

/**
 * Retries getting internal links with a specified number of attempts.
 * @param {string} html - The HTML content of the page.
 * @param {string} testUrl - The URL of the page being tested.
 * @param {string} baseUrl - The base URL of the website.
 * @param {Object} config - Configuration options.
 * @returns {Promise<Array>} The array of internal links.
 */
async function getInternalLinksWithRetry(html, testUrl, baseUrl, config) {
  global.auditcore.logger.debug(`Attempting to get internal links for ${testUrl}`);
  try {
    const links = await retryOperation(
      () => getInternalLinks(html, testUrl, baseUrl),
      config.retryAttempts || 3,
      config.retryDelay || 1000,
    );
    global.auditcore.logger.debug(`Successfully retrieved ${links ? links.length : 0} internal links for ${testUrl}`);
    return links;
  } catch (error) {
    global.auditcore.logger.error(`Failed to get internal links for ${testUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Updates the results object with Pa11y and internal links data.
 * @param {Object} results - The results object to update.
 * @param {string} testUrl - The URL of the page being tested.
 * @param {Object|null} pa11yResult - The Pa11y test result.
 * @param {Array|null} internalLinks - The array of internal links.
 */
function updateResults(results, testUrl, pa11yResult, internalLinks) {
  if (!results) {
    global.auditcore.logger.error('Results object is undefined in updateResults');
    return;
  }

  if (pa11yResult) {
    if (!results.pa11y) results.pa11y = [];
    results.pa11y.push({ url: testUrl, issues: pa11yResult.issues || [] });
    global.auditcore.logger.debug(`Updated Pa11y results for ${testUrl}`);
  }

  if (internalLinks) {
    updateInternalLinks(testUrl, internalLinks, results);
    global.auditcore.logger.debug(`Updated internal links for ${testUrl}`);
  }
}

/**
 * Creates a content analysis object.
 * @param {string} testUrl - The URL of the page being tested.
 * @param {Object} pageData - Additional data about the page.
 * @param {Array} jsErrors - JavaScript errors encountered during page load.
 * @param {Array|null} internalLinks - The array of internal links.
 * @param {Object|null} pa11yResult - The Pa11y test result.
 * @returns {Object} The content analysis object.
 */
function createContentAnalysis(testUrl, pageData, jsErrors, internalLinks, pa11yResult) {
  if (!testUrl) {
    global.auditcore.logger.error('TestUrl is undefined in createContentAnalysis');
    return null;
  }

  const analysis = {
    url: testUrl,
    jsErrors: Array.isArray(jsErrors) ? jsErrors.length : 0,
    internalLinksCount: Array.isArray(internalLinks) ? internalLinks.length : 0,
    pa11yIssuesCount: pa11yResult && Array.isArray(pa11yResult.issues) ? pa11yResult.issues.length : 0,
  };

  if (pageData && typeof pageData === 'object') {
    Object.assign(analysis, pageData);
  } else {
    global.auditcore.logger.warn(`PageData is not an object for ${testUrl}`);
  }

  global.auditcore.logger.debug(`Created content analysis for ${testUrl}`);
  return analysis;
}

/**
 * Calculates the duration of the analysis.
 * @param {[number, number]} startTime - The start time from process.hrtime().
 * @returns {number} The duration in seconds.
 */
function calculateDuration(startTime) {
  const [seconds, nanoseconds] = process.hrtime(startTime);
  return seconds + nanoseconds / 1e9;
}

/**
 * Creates the final analysis result object.
 * @param {string} testUrl - The URL of the page being tested.
 * @param {number} duration - The duration of the analysis in seconds.
 * @param {Object} contentAnalysis - The content analysis object.
 * @param {Object|null} pa11yResult - The Pa11y test result.
 * @param {Array|null} internalLinks - The array of internal links.
 * @returns {Object} The analysis result object.
 */
function createAnalysisResult(testUrl, duration, contentAnalysis, pa11yResult, internalLinks) {
  if (!testUrl) {
    global.auditcore.logger.error('TestUrl is undefined in createAnalysisResult');
    return null;
  }

  const result = {
    url: testUrl,
    analysisTime: duration,
    contentAnalysis: contentAnalysis || null,
    pa11ySuccess: !!pa11yResult,
    internalLinksSuccess: Array.isArray(internalLinks),
    metricsSuccess: true, // You might want to add logic to determine this
  };

  global.auditcore.logger.debug(`Created analysis result for ${testUrl}`);
  return result;
}

// Export all helper functions
export {
  retryOperation,
  getInternalLinksWithRetry,
  updateResults,
  createContentAnalysis,
  calculateDuration,
  createAnalysisResult,
};