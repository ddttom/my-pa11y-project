/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
// pa11yRunner.js

import pa11y from 'pa11y';
import { pa11yOptions } from '../config/options';

const { MAX_RETRIES, RETRY_DELAY } = pa11yOptions;

/**
 * Runs a Pa11y test with retry mechanism.
 * @param {string} testUrl - The URL to test.
 * @param {Object} options - Pa11y options.
 * @returns {Promise<Object>} The Pa11y test result.
 * @throws {Error} If all retry attempts fail.
 */
export async function runPa11yWithRetry(testUrl, options) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      global.auditcore.logger.debug(`Pa11y test attempt ${attempt} for ${testUrl}`);
      const result = await pa11y(testUrl, options);
      global.auditcore.logger.debug(`Pa11y test successful for ${testUrl} on attempt ${attempt}`);
      return result;
    } catch (error) {
      global.auditcore.logger.warn(`Pa11y test failed for ${testUrl} on attempt ${attempt}:`, error);
      if (attempt === MAX_RETRIES) {
        global.auditcore.logger.error(`Pa11y test failed for ${testUrl} after ${MAX_RETRIES} attempts.`);
        throw error;
      }
      await new Promise((resolve) => { setTimeout(resolve, RETRY_DELAY); });
    }
  }

  return null;
}

/**
 * Runs a Pa11y test for a single URL.
 * @param {string} testUrl - The URL to test.
 * @param {string} html - The HTML content of the page.
 * @param {Object} results - The results object to update.
 * @returns {Promise<Object>} The Pa11y test result.
 * @throws {Error} If the Pa11y test fails.
 */
export async function runPa11yTest(testUrl, html, results) {
  global.auditcore.logger.info(`Running Pa11y accessibility test for ${testUrl}`);

  try {
    const options = {
      ...pa11yOptions,
      html,
    };

    global.auditcore.logger.debug('Pa11y options:', JSON.stringify(options, null, 2));

    const pa11yResult = await runPa11yWithRetry(testUrl, options);

    global.auditcore.logger.debug(`Pa11y test completed for ${testUrl}`);
    global.auditcore.logger.debug(`Number of issues found: ${pa11yResult.issues.length}`);

    results.pa11y.push({ url: testUrl, issues: pa11yResult.issues });

    // Log summary of issues
    const issueTypes = pa11yResult.issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});

    global.auditcore.logger.info('Pa11y test summary:');
    Object.entries(issueTypes).forEach(([type, count]) => {
      global.auditcore.logger.info(`  ${type}: ${count}`);
    });

    return pa11yResult;
  } catch (error) {
    global.auditcore.logger.error(`Error running Pa11y test for ${testUrl}:`, error);
    results.pa11y.push({ url: testUrl, error: error.message });
    throw error;
  }
}

/**
 * Runs Pa11y tests for a batch of URLs.
 * @param {string[]} urls - The URLs to test.
 * @param {Object} results - The results object to update.
 * @param {number} [concurrency=5] - The number of concurrent tests to run.
 * @returns {Promise<Object[]>} The Pa11y test results.
 */
export async function runPa11yTestBatch(urls, results, concurrency = 5) {
  global.auditcore.logger.info(`Running Pa11y tests for ${urls.length} URLs with concurrency of ${concurrency}`);

  const batchResults = await Promise.all(
    urls.map(async (url) => {
      try {
        const pa11yResult = await runPa11yWithRetry(url, pa11yOptions);
        global.auditcore.logger.debug(`Pa11y test completed for ${url}`);
        return { url, issues: pa11yResult.issues };
      } catch (error) {
        global.auditcore.logger.error(`Error running Pa11y test for ${url}:`, error);
        return { url, error: error.message };
      }
    }),
  );

  results.pa11y.push(...batchResults);

  global.auditcore.logger.info('Pa11y batch tests completed');

  // Log summary of all issues
  const totalIssues = batchResults.reduce((sum, result) => sum + (result.issues ? result.issues.length : 0), 0);
  global.auditcore.logger.info(`Total issues found across all URLs: ${totalIssues}`);

  return batchResults;
}

/**
 * Analyzes accessibility results.
 * @param {Object} results - The results object containing Pa11y test results.
 * @returns {Object} Analysis of accessibility results.
 */
export function analyzeAccessibilityResults(results) {
  global.auditcore.logger.info('Analyzing accessibility results');

  const totalIssues = results.pa11y.reduce((sum, result) => sum + (result.issues ? result.issues.length : 0), 0);
  const urlsWithIssues = results.pa11y.filter((result) => result.issues && result.issues.length > 0).length;

  global.auditcore.logger.info(`Total accessibility issues: ${totalIssues}`);
  global.auditcore.logger.info(`URLs with issues: ${urlsWithIssues} out of ${results.pa11y.length}`);

  // Analyze common issues
  const issueFrequency = {};
  results.pa11y.forEach((result) => {
    if (result.issues) {
      result.issues.forEach((issue) => {
        issueFrequency[issue.code] = (issueFrequency[issue.code] || 0) + 1;
      });
    }
  });

  global.auditcore.logger.info('Most common accessibility issues:');
  Object.entries(issueFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([code, count]) => {
      global.auditcore.logger.info(`  ${code}: ${count} occurrences`);
    });

  return {
    totalIssues,
    urlsWithIssues,
    issueFrequency,
  };
}
