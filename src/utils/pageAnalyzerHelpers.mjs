/* eslint-disable no-await-in-loop */
/* eslint-disable import/extensions */

// pageAnalyzerHelpers.js

import { getInternalLinks } from './linkAnalyzer.mjs';
import { analyzeAccessibilityResults, generateAccessibilityReport } from './pa11yRunner.mjs';
import { updateInternalLinks } from './metricsUpdater.mjs';

/**
 * Retries an operation with a specified number of attempts and delay.
 * @param {Function} operation - The operation to retry.
 * @param {number} retryAttempts - The number of retry attempts.
 * @param {number} retryDelay - The delay between retries in milliseconds.
 * @param {Object} logger - The logger object.
 * @returns {Promise<*>} The result of the operation.
 */
async function retryOperation(operation, retryAttempts, retryDelay, logger) {
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retryAttempts) {
        logger.warn(`Operation failed after ${retryAttempts} attempts: ${error.message}`);
        return Promise.reject(error);
      }
      logger.warn(`Operation failed, retrying (${attempt}/${retryAttempts}): ${error.message}`);
      await new Promise((resolve) => { setTimeout(resolve, retryDelay); });
    }
  }
  // Add a return statement here
  return null;
}

/**
 * Retries getting internal links with a specified number of attempts.
 * @param {string} html - The HTML content of the page.
 * @param {string} testUrl - The URL of the page being tested.
 * @param {string} baseUrl - The base URL of the website.
 * @param {Object} config - Configuration options.
 * @param {Object} logger - The logger object.
 * @returns {Promise<Array>} The array of internal links.
 */
async function getInternalLinksWithRetry(html, testUrl, baseUrl, config, logger) {
  return retryOperation(
    () => getInternalLinks(html, testUrl, baseUrl),
    config.retryAttempts,
    config.retryDelay,
    logger,
  );
}

/**
 * Updates the results object with Pa11y and internal links data.
 * @param {Object} results - The results object to update.
 * @param {string} testUrl - The URL of the page being tested.
 * @param {Object|null} pa11yResult - The Pa11y test result.
 * @param {Array|null} internalLinks - The array of internal links.
 */
function updateResults(results, testUrl, pa11yResult, internalLinks) {
  if (pa11yResult) {
    results.pa11y.push({ url: testUrl, issues: pa11yResult.issues });
  }
  if (internalLinks) {
    updateInternalLinks(testUrl, internalLinks, results);
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
  return {
    url: testUrl,
    ...pageData,
    jsErrors,
    internalLinksCount: internalLinks ? internalLinks.length : 0,
    pa11yIssuesCount: pa11yResult ? pa11yResult.issues.length : 0,
  };
}

/**
 * Generates an accessibility report if needed.
 * @param {Object} results - The results object containing Pa11y data.
 * @param {string} outputDir - The directory to output the report.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
async function generateAccessibilityReportIfNeeded(results, outputDir, logger) {
  // eslint-disable-next-line no-unused-vars
  const analysisResults = analyzeAccessibilityResults(results, logger);
  const reportPath = await generateAccessibilityReport(results, outputDir, logger);
  logger.info(`Accessibility report generated at: ${reportPath}`);
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
  return {
    url: testUrl,
    analysisTime: duration,
    contentAnalysis,
    pa11ySuccess: !!pa11yResult,
    internalLinksSuccess: !!internalLinks,
    metricsSuccess: true,
  };
}

// Export all helper functions
export {
  retryOperation,
  getInternalLinksWithRetry,
  updateResults,
  createContentAnalysis,
  generateAccessibilityReportIfNeeded,
  calculateDuration,
  createAnalysisResult,
};
