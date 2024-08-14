/* eslint-disable no-await-in-loop */
/* eslint-disable import/extensions */
/* eslint-disable max-len */
// pa11yRunner.js

import pa11y from 'pa11y';
import fs from 'fs/promises';
import path from 'path';
import { pa11yOptions } from '../config/options.mjs';

const { MAX_RETRIES, RETRY_DELAY } = pa11yOptions;

/**
 * Runs a Pa11y test with retry mechanism.
 * @param {string} testUrl - The URL to test.
 * @param {Object} options - Pa11y options.
 * @param {Object} logger - The logger object.
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

  return null; // Or throw new Error('All retries failed'); depending on your preference
}

/**
 * Runs a Pa11y test for a single URL.
 * @param {string} testUrl - The URL to test.
 * @param {string} html - The HTML content of the page.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
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
 * @param {Object} logger - The logger object.
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
 * @param {Object} logger - The logger object.
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

/**
 * Generates an accessibility report in HTML format.
 * @param {Object} results - The results object containing Pa11y test results.
 * @param {string} outputDir - The directory to save the report.
 * @param {Object} logger - The logger object.
 * @returns {Promise<string>} The path to the generated report.
 * @throws {Error} If there's an error generating the report.
 */
export async function generateAccessibilityReport(results, outputDir) {
  global.auditcore.logger.info('Generating accessibility report');

  const reportPath = path.join(outputDir, 'accessibility-report.html');

  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Accessibility Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #2c3e50; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        .error { color: #e74c3c; }
        .warning { color: #f39c12; }
        .notice { color: #3498db; }
      </style>
    </head>
    <body>
      <h1>Accessibility Report</h1>
      <p>Total URLs scanned: ${results.pa11y.length}</p>
      <p>URLs with issues: ${results.pa11y.filter((result) => result.issues && result.issues.length > 0).length}</p>
      <p>Total issues found: ${results.pa11y.reduce((sum, result) => sum + (result.issues ? result.issues.length : 0), 0)}</p>
      
      <h2>Issues by URL</h2>
  `;

  results.pa11y.forEach((result) => {
    htmlContent += `
      <h3>${result.url}</h3>
    `;

    if (result.error) {
      htmlContent += `<p class="error">Error: ${result.error}</p>`;
    } else if (result.issues && result.issues.length > 0) {
      htmlContent += `
        <table>
          <tr>
            <th>Type</th>
            <th>Code</th>
            <th>Message</th>
            <th>Context</th>
            <th>Selector</th>
          </tr>
      `;

      result.issues.forEach((issue) => {
        htmlContent += `
          <tr class="${issue.type.toLowerCase()}">
            <td>${issue.type}</td>
            <td>${issue.code}</td>
            <td>${issue.message}</td>
            <td>${issue.context}</td>
            <td>${issue.selector}</td>
          </tr>
        `;
      });

      htmlContent += '</table>';
    } else {
      htmlContent += '<p>No issues found.</p>';
    }
  });

  htmlContent += `
    </body>
    </html>
  `;

  try {
    await fs.writeFile(reportPath, htmlContent);
    global.auditcore.logger.info(`Accessibility report generated: ${reportPath}`);
    return reportPath;
  } catch (error) {
    global.auditcore.logger.error('Error generating accessibility report:', error);
    throw error;
  }
}
