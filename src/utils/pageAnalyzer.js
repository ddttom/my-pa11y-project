/* eslint-disable import/prefer-default-export */
/* eslint-disable import/extensions */
// pageAnalyzer.js

import cheerio from 'cheerio';
import { runPa11yTest } from './pa11yRunner.js';
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

async function runMetricsAnalysis($, testUrl, baseUrl, headers, results) {
  const metricsPromises = [
    updateTitleMetrics($, results),
    updateMetaDescriptionMetrics($, results),
    updateHeadingMetrics($, results),
    updateImageMetrics($, results),
    updateLinkMetrics($, baseUrl, results),
    updateSecurityMetrics(testUrl, headers, results),
    updateHreflangMetrics($, results),
    updateCanonicalMetrics($, testUrl, results),
  ];

  await Promise.all(metricsPromises);
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
) {
  const startTime = process.hrtime();
  logger.info(`Analyzing content for ${testUrl}`);

  try {
    validateInput(testUrl, html, baseUrl);

    const analysisConfig = { ...defaultConfig, ...config };
    const $ = memoizedCheerioLoad(html);

    const analysisPromises = [];

    if (analysisConfig.runPa11y) {
      logger.debug('Running Pa11y test');
      analysisPromises.push(runPa11yTest(testUrl, html, results, logger));
    }

    if (analysisConfig.analyzeInternalLinks) {
      logger.debug('Getting internal links');
      analysisPromises.push(
        getInternalLinks(html, testUrl, baseUrl).then((internalLinks) => {
          updateInternalLinks(testUrl, internalLinks, results);
        }),
      );
    }

    if (analysisConfig.analyzeMetrics) {
      logger.debug('Running metrics analysis');
      analysisPromises.push(runMetricsAnalysis($, testUrl, baseUrl, headers, results));
    }

    await Promise.all(analysisPromises);

    const contentAnalysis = {
      url: testUrl,
      ...pageData,
      jsErrors,
    };

    updateContentAnalysis(contentAnalysis, results);

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    logger.info(`Content analysis completed for ${testUrl} in ${duration.toFixed(3)} seconds`);

    return {
      url: testUrl,
      analysisTime: duration,
      contentAnalysis,
    };
  } catch (error) {
    logger.error(`Error analyzing content for ${testUrl}:`, error);
    return {
      url: testUrl,
      error: error.message,
    };
  }
}
