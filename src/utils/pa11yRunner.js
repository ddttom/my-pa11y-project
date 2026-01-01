/* eslint-disable consistent-return */
/**
 * Accessibility testing utilities using Pa11y
 *
 * This module provides enhanced accessibility testing capabilities using Pa11y,
 * including:
 * - Retry mechanisms for flaky tests
 * - Enhanced result analysis and categorization
 * - Batch processing of URLs
 * - Detailed issue classification and remediation suggestions
 */

/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */

import pa11y from 'pa11y';
import {
  mapIssueToGuideline,
  getGuidelineDescription,
  getRequiredManualChecks,
} from './reportUtils/formatUtils.js';

/**
 * Issue severity levels based on WCAG compliance
 * @type {Object}
 * @property {string} CRITICAL - Critical accessibility issues
 * @property {string} SERIOUS - Serious accessibility issues
 * @property {string} MODERATE - Moderate accessibility issues
 * @property {string} MINOR - Minor accessibility issues
 */
const SEVERITY_LEVELS = {
  CRITICAL: 'Critical',
  SERIOUS: 'Serious',
  MODERATE: 'Moderate',
  MINOR: 'Minor',
};

/**
 * Classifies issue severity based on WCAG level and impact
 *
 * Severity is determined by:
 * - WCAG level (AA, A, etc.)
 * - Issue type (error, warning)
 * - Specific code patterns
 *
 * @param {Object} issue - Pa11y issue object
 * @returns {string} - Severity level (Critical, Serious, Moderate, Minor)
 * @example
 * // Returns 'Critical'
 * classifySeverity({ type: 'error', code: 'WCAG2AA.Principle1.Guideline1_1.1_1_1.H30.2' })
 */
function classifySeverity(issue) {
  if (issue.type === 'error' && issue.code.startsWith('WCAG2AA')) {
    return SEVERITY_LEVELS.CRITICAL;
  }
  if (issue.type === 'error' && issue.code.startsWith('WCAG2A')) {
    return SEVERITY_LEVELS.SERIOUS;
  }
  if (issue.type === 'warning' && issue.code.startsWith('WCAG2')) {
    return SEVERITY_LEVELS.MODERATE;
  }
  return SEVERITY_LEVELS.MINOR;
}

/**
 * Provides remediation suggestions for common accessibility issues
 *
 * Contains predefined suggestions for common WCAG violations,
 * with fallback to generic guidance for unknown issues.
 *
 * @param {Object} issue - Pa11y issue object
 * @returns {string} - Remediation suggestion
 * @example
 * // Returns 'Add descriptive text to links'
 * getRemediationSuggestion({ code: 'WCAG2AA.Principle1.Guideline1_1.1_1_1.H30.2' })
 */
function getRemediationSuggestion(issue) {
  const commonRemediations = {
    WCAG2AA: {
      'Principle1.Guideline1_1.1_1_1.H30.2': 'Add descriptive text to links',
      'Principle1.Guideline1_3.1_3_1.H42.2': 'Use proper heading structure',
      'Principle1.Guideline1_4.1_4_3.G18.Fail': 'Ensure sufficient color contrast',
    },
    WCAG2A: {
      'Principle2.Guideline2_4.2_4_1.H64.1': 'Add iframe title attribute',
      'Principle3.Guideline3_1.3_1_1.H57.2': 'Add lang attribute to html tag',
    },
  };

  const [standard, code] = issue.code.split('.');
  return commonRemediations[standard]?.[code] || 'Review accessibility guidelines for this issue';
}

/**
 * Runs a Pa11y test with retry mechanism and enhanced metrics collection
 *
 * Implements exponential backoff retry strategy with:
 * - Configurable max retries (maxRetries)
 * - Configurable delay between retries (retryDelay)
 * - Enhanced error handling and logging
 *
 * @param {string} testUrl - URL to test
 * @param {Object} options - Pa11y configuration options
 * @returns {Promise<Object>} - Enhanced test results containing:
 *   - issues: Array of accessibility issues
 *   - analysis: Aggregated metrics
 *   - error: Error details if test failed
 * @throws {Error} If all retry attempts fail
 */
export async function runPa11yWithRetry(testUrl, options) {
  const { maxRetries } = global.auditcore.options;
  const { retryDelay } = global.auditcore.options.pa11y;

  global.auditcore.logger.debug(`[START] runPa11yWithRetry for ${testUrl}`);

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      global.auditcore.logger.debug(`Pa11y test attempt ${attempt} for ${testUrl}`);
      const result = await pa11y(testUrl, options);

      // Enhance results with additional metrics
      result.issues = result.issues.map((issue) => {
        const guideline = mapIssueToGuideline(issue);
        return {
          ...issue,
          severity: classifySeverity(issue),
          remediation: getRemediationSuggestion(issue),
          wcagLevel: issue.code.startsWith('WCAG2')
            ? issue.code.split('.')[0].replace('WCAG2', '') : 'Unknown',
          guideline,
          guidelineDescription: guideline ? getGuidelineDescription(guideline) : 'N/A',
          requiresManualCheck: guideline ? getRequiredManualChecks(guideline).length > 0 : false,
        };
      });

      global.auditcore.logger.debug(`Pa11y test successful for ${testUrl} on attempt ${attempt}`);
      return result;
    } catch (error) {
      global.auditcore.logger.warn(`Pa11y test failed for ${testUrl} on attempt ${attempt}:`, error);
      if (attempt === maxRetries) {
        global.auditcore.logger.error(`Pa11y test failed for ${testUrl} after ${maxRetries} attempts.`);
        return {
          error: error.message,
          stack: error.stack,
          issues: [],
        };
      }
      await new Promise((resolve) => { setTimeout(resolve, retryDelay); });
    }
  }
}

/**
 * Runs a Pa11y test for a single URL with enhanced results
 *
 * @param {string} testUrl - URL to test
 * @param {string} html - HTML content to test
 * @param {Object} results - Results object to store findings
 * @returns {Promise<Object>} - Enhanced test results containing:
 *   - url: Tested URL
 *   - issues: Array of accessibility issues
 *   - analysis: Aggregated metrics
 * @throws {Error} If test fails after all retries
 */
export async function runPa11yTest(testUrl, html, results) {
  global.auditcore.logger.info(`[START] Running enhanced Pa11y accessibility test for ${testUrl}`);

  try {
    const options = {
      ...global.auditcore.options.pa11y,
      html,
    };

    const pa11yResult = await runPa11yWithRetry(testUrl, options);

    if (!pa11yResult) {
      throw new Error('Pa11y result is null or undefined');
    }

    // Analyze and categorize issues
    const issueAnalysis = pa11yResult.issues.reduce((acc, issue) => {
      acc.totalIssues++;
      acc.bySeverity[issue.severity] = (acc.bySeverity[issue.severity] || 0) + 1;
      acc.byWCAGLevel[issue.wcagLevel] = (acc.byWCAGLevel[issue.wcagLevel] || 0) + 1;
      if (issue.guideline) {
        acc.byGuideline[issue.guideline] = (acc.byGuideline[issue.guideline] || 0) + 1;
      }
      return acc;
    }, {
      totalIssues: 0,
      bySeverity: {},
      byWCAGLevel: {},
      byGuideline: {},
    });

    // Store enhanced results
    results.pa11y = results.pa11y || [];
    results.pa11y.push({
      url: testUrl,
      issues: pa11yResult.issues,
      analysis: issueAnalysis,
    });

    global.auditcore.logger.info('Enhanced Pa11y test summary:');
    global.auditcore.logger.info(`  Total issues: ${issueAnalysis.totalIssues}`);
    Object.entries(issueAnalysis.bySeverity).forEach(([severity, count]) => {
      global.auditcore.logger.info(`  ${severity}: ${count}`);
    });
    Object.entries(issueAnalysis.byWCAGLevel).forEach(([level, count]) => {
      global.auditcore.logger.info(`  WCAG ${level}: ${count}`);
    });

    global.auditcore.logger.info(`[END] Enhanced Pa11y accessibility test completed for ${testUrl}`);
    return pa11yResult;
  } catch (error) {
    global.auditcore.logger.error(`Error running enhanced Pa11y test for ${testUrl}:`, error);
    results.pa11y = results.pa11y || [];
    results.pa11y.push({ url: testUrl, error: error.message });
    throw error;
  }
}

/**
 * Analyzes accessibility results with enhanced metrics
 *
 * Aggregates results across multiple tests to provide:
 * - Total issue counts
 * - Severity breakdown
 * - WCAG level compliance
 * - Guideline-specific metrics
 *
 * @param {Object} results - Results object containing Pa11y findings
 * @returns {Object} - Aggregated analysis results containing:
 *   - totalIssues: Total number of issues found
 *   - urlsWithIssues: Number of URLs with at least one issue
 *   - bySeverity: Issue counts by severity level
 *   - byWCAGLevel: Issue counts by WCAG level
 *   - byGuideline: Issue counts by WCAG guideline
 */
export function analyzeAccessibilityResults(results) {
  global.auditcore.logger.info('[START] Analyzing enhanced accessibility results');

  if (!results.pa11y || !Array.isArray(results.pa11y)) {
    global.auditcore.logger.error('Invalid pa11y results structure');
    return null;
  }

  const analysis = results.pa11y.reduce((acc, result) => {
    if (result.analysis) {
      acc.totalIssues += result.analysis.totalIssues;
      acc.urlsWithIssues += result.analysis.totalIssues > 0 ? 1 : 0;

      // Aggregate severity counts
      Object.entries(result.analysis.bySeverity).forEach(([severity, count]) => {
        acc.bySeverity[severity] = (acc.bySeverity[severity] || 0) + count;
      });

      // Aggregate WCAG level counts
      Object.entries(result.analysis.byWCAGLevel).forEach(([level, count]) => {
        acc.byWCAGLevel[level] = (acc.byWCAGLevel[level] || 0) + count;
      });

      // Aggregate guideline counts
      Object.entries(result.analysis.byGuideline).forEach(([guideline, count]) => {
        acc.byGuideline[guideline] = (acc.byGuideline[guideline] || 0) + count;
      });
    }
    return acc;
  }, {
    totalIssues: 0,
    urlsWithIssues: 0,
    bySeverity: {},
    byWCAGLevel: {},
    byGuideline: {},
  });

  global.auditcore.logger.info('Enhanced accessibility analysis:');
  global.auditcore.logger.info(`  Total issues: ${analysis.totalIssues}`);
  global.auditcore.logger.info(`  URLs with issues: ${analysis.urlsWithIssues}`);

  global.auditcore.logger.info('  By severity:');
  Object.entries(analysis.bySeverity).forEach(([severity, count]) => {
    global.auditcore.logger.info(`    ${severity}: ${count}`);
  });

  global.auditcore.logger.info('  By WCAG level:');
  Object.entries(analysis.byWCAGLevel).forEach(([level, count]) => {
    global.auditcore.logger.info(`    WCAG ${level}: ${count}`);
  });

  global.auditcore.logger.info('  By guideline:');
  Object.entries(analysis.byGuideline).forEach(([guideline, count]) => {
    global.auditcore.logger.info(`    ${guideline}: ${count}`);
  });

  global.auditcore.logger.info('[END] Enhanced accessibility results analysis completed');
  return analysis;
}

/**
 * Runs Pa11y tests for a batch of URLs with enhanced results
 *
 * Processes URLs in parallel batches with:
 * - Configurable concurrency
 * - Automatic retries
 * - Aggregated reporting
 *
 * @param {Array<string>} urls - URLs to test
 * @param {Object} results - Results object to store findings
 * @param {number} concurrency - Number of concurrent tests (default: 5)
 * @returns {Promise<Object>} - Batch results containing:
 *   - batchResults: Array of individual test results
 *   - overallAnalysis: Aggregated metrics across all tests
 */
export async function runPa11yTestBatch(urls, results, concurrency = 5) {
  global.auditcore.logger.info(`[START] Running enhanced Pa11y tests for ${urls.length} URLs with concurrency ${concurrency}`);
  const pa11yOptions = global.auditcore.options.pa11y;

  // Process URLs in batches based on concurrency
  const batchPromises = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    batchPromises.push(
      Promise.all(
        batch.map(async (url) => {
          try {
            const pa11yResult = await runPa11yWithRetry(url, pa11yOptions);
            return {
              url,
              issues: pa11yResult.issues,
              analysis: pa11yResult.analysis,
            };
          } catch (error) {
            return { url, error: error.message };
          }
        }),
      ),
    );
  }

  const batchResults = (await Promise.all(batchPromises)).flat();
  results.pa11y = results.pa11y || [];
  results.pa11y.push(...batchResults);

  // Perform overall analysis
  const overallAnalysis = analyzeAccessibilityResults(results);

  global.auditcore.logger.info('Enhanced Pa11y batch tests completed');
  global.auditcore.logger.info(`Total issues found: ${overallAnalysis.totalIssues}`);
  global.auditcore.logger.info(`URLs with issues: ${overallAnalysis.urlsWithIssues}`);

  return {
    batchResults,
    overallAnalysis,
  };
}
