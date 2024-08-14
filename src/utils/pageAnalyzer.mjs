/* eslint-disable import/prefer-default-export */
/* eslint-disable import/extensions */
/* eslint-disable max-len */
// pageAnalyzer.js

import cheerio from 'cheerio';
import {
  runPa11yWithRetry,
} from './pa11yRunner.mjs';
import {
  getInternalLinksWithRetry,
  updateResults,
  createContentAnalysis,
  generateAccessibilityReportIfNeeded,
  calculateDuration,
  createAnalysisResult,
} from './pageAnalyzerHelpers.mjs';
import {
  updateContentAnalysis,
  updateTitleMetrics,
  updateMetaDescriptionMetrics,
  updateHeadingMetrics,
  updateImageMetrics,
  updateLinkMetrics,
  updateSecurityMetrics,
  updateHreflangMetrics,
  updateCanonicalMetrics,
} from './metricsUpdater.mjs';

const defaultConfig = {
  runPa11y: true,
  analyzeInternalLinks: true,
  analyzeMetrics: true,
  generateAccessibilityReport: true,
  pa11yTimeout: 30000,
  pa11yWait: 1000,
  pa11yThreshold: 100, // Maximum number of issues to report
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Validates the input parameters for page analysis.
 * @param {string} testUrl - The URL of the page being tested.
 * @param {string} html - The HTML content of the page.
 * @param {string} baseUrl - The base URL of the website.
 * @throws {Error} If any of the input parameters are invalid.
 */
function validateInput(testUrl, html, baseUrl) {
  if (typeof testUrl !== 'string' || !testUrl) throw new Error('Invalid testUrl');
  if (typeof html !== 'string' || !html) throw new Error('Invalid html');
  if (typeof baseUrl !== 'string' || !baseUrl) throw new Error('Invalid baseUrl');
}

/**
 * Memoizes a function to cache its results.
 * @param {Function} fn - The function to memoize.
 * @returns {Function} The memoized function.
 */
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

const memoizedCheerioLoad = memoize(cheerio.load);

/**
 * Runs metrics analysis on the page content.
 * @param {Object} $ - The Cheerio instance.
 * @param {string} testUrl - The URL of the page being tested.
 * @param {string} baseUrl - The base URL of the website.
 * @param {Object} headers - The HTTP headers of the page response.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
async function runMetricsAnalysis($, testUrl, baseUrl, headers, results) {
  try {
    await updateTitleMetrics($, results);
    await updateMetaDescriptionMetrics($, results);
    await updateHeadingMetrics($, results);
    await updateImageMetrics($, results);
    await updateLinkMetrics($, baseUrl, results);
    await updateSecurityMetrics(testUrl, headers, results);
    await updateHreflangMetrics($, results);
    await updateCanonicalMetrics($, testUrl, results);
    global.auditcore.logger.debug('Metrics analysis completed successfully');
  } catch (error) {
    global.auditcore.logger.error('Error in runMetricsAnalysis:', error);
  }
}

/**
 * Runs Pa11y analysis on the page.
 * @param {string} testUrl - The URL of the page being tested.
 * @param {string} html - The HTML content of the page.
 * @param {Object} config - The configuration options.
 * @param {Object} logger - The logger object.
 * @returns {Promise<Object>} The Pa11y test result.
 */
async function runPa11yAnalysis(testUrl, html, config) {
  try {
    const pa11yOptions = {
      html,
      timeout: config.pa11yTimeout,
      wait: config.pa11yWait,
      threshold: config.pa11yThreshold,
    };
    return await runPa11yWithRetry(testUrl, pa11yOptions);
  } catch (error) {
    global.auditcore.logger.error(`Error in runPa11yAnalysis for ${testUrl}:`, error);
    throw error;
  }
}

/**
 * Analyzes the content of a web page.
 * @param {Object} params - The parameters for page analysis.
 * @param {string} params.testUrl - The URL of the page being tested.
 * @param {string} params.html - The HTML content of the page.
 * @param {Array} params.jsErrors - JavaScript errors encountered during page load.
 * @param {string} params.baseUrl - The base URL of the website.
 * @param {Object} params.results - The results object to update.
 * @param {Object} params.headers - The HTTP headers of the page response.
 * @param {Object} params.pageData - Additional data about the page.
 * @param {Object} params.logger - The logger object.
 * @param {Object} [params.config={}] - Configuration options for the analysis.
 * @param {string} params.outputDir - The directory to output reports.
 * @returns {Promise<Object>} The analysis results.
 */
export async function analyzePageContent({
  testUrl,
  html,
  jsErrors,
  baseUrl,
  results,
  headers,
  pageData,
  logger,
  config = {},
  outputDir,
}) {
  const startTime = process.hrtime();
  global.auditcore.logger.info(`Analyzing content for ${testUrl}`);

  try {
    validateInput(testUrl, html, baseUrl);
    const analysisConfig = { ...defaultConfig, ...config };
    const $ = memoizedCheerioLoad(html);

    const [pa11yResult, internalLinks] = await Promise.all([
      analysisConfig.runPa11y ? runPa11yAnalysis(testUrl, html, analysisConfig) : null,
      analysisConfig.analyzeInternalLinks ? getInternalLinksWithRetry(html, testUrl, baseUrl, analysisConfig) : null,
    ]);

    if (analysisConfig.analyzeMetrics) {
      await runMetricsAnalysis($, testUrl, baseUrl, headers, results);
    }

    updateResults(results, testUrl, pa11yResult, internalLinks);

    const contentAnalysis = createContentAnalysis(testUrl, pageData, jsErrors, internalLinks, pa11yResult);
    updateContentAnalysis(contentAnalysis, results);

    if (analysisConfig.generateAccessibilityReport && results.pa11y.length > 0) {
      await generateAccessibilityReportIfNeeded(results, outputDir);
    }

    const duration = calculateDuration(startTime);
    global.auditcore.logger.info(`Content analysis completed for ${testUrl} in ${duration.toFixed(3)} seconds`);

    return createAnalysisResult(testUrl, duration, contentAnalysis, pa11yResult, internalLinks);
  } catch (error) {
    global.auditcore.logger.error(`Error analyzing content for ${testUrl}:`, error);
    return { url: testUrl, error: error.message };
  }
}
