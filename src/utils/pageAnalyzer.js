/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/extensions */
// pageAnalyzer.js

import cheerio from 'cheerio';
import {
  runPa11yWithRetry,
  analyzeAccessibilityResults,
  generateAccessibilityReport,
} from './pa11yRunner.js';
import { getInternalLinks } from './linkAnalyzer.js';
import {
  updateContentAnalysis,
  updateInternalLinks,
  updateTitleMetrics,
  updateMetaDescriptionMetrics,
  updateHeadingMetrics,
  updateImageMetrics,
  updateLinkMetrics,
  updateSecurityMetrics,
  updateHreflangMetrics,
  updateCanonicalMetrics,
} from './metricsUpdater.js';

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

function validateInput(testUrl, html, baseUrl) {
  if (typeof testUrl !== 'string' || !testUrl) throw new Error('Invalid testUrl');
  if (typeof html !== 'string' || !html) throw new Error('Invalid html');
  if (typeof baseUrl !== 'string' || !baseUrl) throw new Error('Invalid baseUrl');
}

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

async function runMetricsAnalysis($, testUrl, baseUrl, headers, results, logger) {
  try {
    await updateTitleMetrics($, results, logger);
    await updateMetaDescriptionMetrics($, results, logger);
    await updateHeadingMetrics($, results, logger);
    await updateImageMetrics($, results, logger);
    await updateLinkMetrics($, baseUrl, results, logger);
    await updateSecurityMetrics(testUrl, headers, results, logger);
    await updateHreflangMetrics($, results, logger);
    await updateCanonicalMetrics($, testUrl, results, logger);
    logger.debug('Metrics analysis completed successfully');
  } catch (error) {
    logger.error('Error in runMetricsAnalysis:', error);
  }
}

async function runPa11yAnalysis(testUrl, html, config, logger) {
  try {
    const pa11yOptions = {
      html,
      timeout: config.pa11yTimeout,
      wait: config.pa11yWait,
      threshold: config.pa11yThreshold,
    };
    return await runPa11yWithRetry(testUrl, pa11yOptions, logger, config.retryAttempts, config.retryDelay);
  } catch (error) {
    logger.error(`Error in runPa11yAnalysis for ${testUrl}:`, error);
    throw error;
  }
}

async function retryOperation(operation, retryAttempts, retryDelay, logger) {
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retryAttempts) {
        logger.warn(`Operation failed after ${retryAttempts} attempts: ${error.message}`);
        return null; // eslint-disable-line consistent-return
      }
      logger.warn(`Operation failed, retrying (${attempt}/${retryAttempts}): ${error.message}`);
      await new Promise((resolve) => { setTimeout(resolve, retryDelay); });
    }
  }
}

export async function analyzePageContent(
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
) {
  const startTime = process.hrtime();
  logger.info(`Analyzing content for ${testUrl}`);

  try {
    validateInput(testUrl, html, baseUrl);
    const analysisConfig = { ...defaultConfig, ...config };
    const $ = memoizedCheerioLoad(html);

    let pa11yResult = null;
    let internalLinks = null;

    if (analysisConfig.runPa11y) {
      logger.debug('Running Pa11y test');
      pa11yResult = await runPa11yAnalysis(testUrl, html, analysisConfig, logger);
    }

    if (analysisConfig.analyzeInternalLinks) {
      logger.debug('Getting internal links');
      internalLinks = await retryOperation(
        () => getInternalLinks(html, testUrl, baseUrl),
        analysisConfig.retryAttempts,
        analysisConfig.retryDelay,
        logger,
      );
    }

    if (analysisConfig.analyzeMetrics) {
      logger.debug('Running metrics analysis');
      await runMetricsAnalysis($, testUrl, baseUrl, headers, results, logger);
    }

    if (pa11yResult) {
      results.pa11y.push({ url: testUrl, issues: pa11yResult.issues });
    }

    if (internalLinks) {
      updateInternalLinks(testUrl, internalLinks, results, logger);
    }

    const contentAnalysis = {
      url: testUrl,
      ...pageData,
      jsErrors,
      internalLinksCount: internalLinks ? internalLinks.length : 0,
      pa11yIssuesCount: pa11yResult ? pa11yResult.issues.length : 0,
    };

    updateContentAnalysis(contentAnalysis, results, logger);

    if (analysisConfig.generateAccessibilityReport && results.pa11y.length > 0) {
      const analysisResults = analyzeAccessibilityResults(results, logger);
      const reportPath = await generateAccessibilityReport(results, outputDir, logger);
      logger.info(`Accessibility report generated at: ${reportPath}`);
    }

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    logger.info(`Content analysis completed for ${testUrl} in ${duration.toFixed(3)} seconds`);

    return {
      url: testUrl,
      analysisTime: duration,
      contentAnalysis,
      pa11ySuccess: !!pa11yResult,
      internalLinksSuccess: !!internalLinks,
      metricsSuccess: true,
    };
  } catch (error) {
    logger.error(`Error analyzing content for ${testUrl}:`, error);
    return {
      url: testUrl,
      error: error.message,
    };
  }
}
