/* eslint-disable no-param-reassign */
// pageAnalyzer.js

import * as cheerio from 'cheerio';
import {
  runPa11yWithRetry,
} from './pa11yRunner.js';
import {
  getInternalLinksWithRetry,
  createContentAnalysis,
  calculateDuration,
  createAnalysisResult,
} from './pageAnalyzerHelpers.js';
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
  updateContentMetrics,
} from './metricsUpdater.js';
import {
  updateLLMMetrics,
} from './llmMetrics.js';

async function processUrl(url, html, jsErrors, baseUrl, results, headers, pageData, config, cachedPa11yResult = null) {
  if (!url) {
    global.auditcore.logger.error('Attempting to process undefined URL');
    return { error: 'Undefined URL' };
  }

  global.auditcore.logger.info(`Processing URL: ${url}`);

  try {
    const analysisResult = await analyzePageContent({
      testUrl: url,
      html,
      jsErrors,
      baseUrl,
      results,
      headers,
      pageData,
      config,
      cachedPa11yResult,
    });

    global.auditcore.logger.info(`Analysis completed for ${url}`);
    return analysisResult;
  } catch (error) {
    global.auditcore.logger.error(`Error processing ${url}:`, error);
    return { url, error: error.message };
  }
}

function extractImageInfo($) {
  const images = $('img').map((_, el) => {
    const $el = $(el);
    return {
      src: $el.attr('src'),
      alt: $el.attr('alt') || '',
      width: $el.attr('width'),
      height: $el.attr('height'),
    };
  }).get();

  return images;
}

function validateInput(testUrl, html, baseUrl) {
  if (typeof testUrl !== 'string' || !testUrl) {
    throw new Error('Invalid testUrl');
  }
  if (typeof html !== 'string' || !html) {
    throw new Error('Invalid html');
  }

  try {
    // Try to create URL objects to validate URLs
    const testUrlObj = new URL(testUrl);
    // If baseUrl is not provided, use the testUrl's origin as base
    if (!baseUrl) {
      baseUrl = testUrlObj.origin;
    }
    const baseUrlObj = new URL(baseUrl);

    return {
      testUrl: testUrlObj.href,
      baseUrl: baseUrlObj.href,
    };
  } catch (error) {
    throw new Error(`Invalid URL format: ${error.message}`);
  }
}

async function analyzePageContent({
  testUrl,
  html,
  jsErrors,
  baseUrl,
  results,
  headers,
  pageData,
  config = {},
  cachedPa11yResult = null,
}) {
  const startTime = process.hrtime();
  global.auditcore.logger.info(`[START] Analyzing content for ${testUrl}`);

  try {
    if (!testUrl) {
      throw new Error('testUrl is undefined or empty');
    }

    // Validate and normalize URLs first
    const { testUrl: validTestUrl, baseUrl: validBaseUrl } = validateInput(testUrl, html, baseUrl);

    const $ = cheerio.load(html);
    global.auditcore.logger.debug(`Cheerio loaded for ${validTestUrl}`);

    // Extract header information
    for (let i = 1; i <= 6; i++) {
      pageData[`h${i}Count`] = $(`h${i}`).length;
    }

    // Extract image information
    const images = extractImageInfo($);
    pageData.images = images;
    pageData.imagesCount = images.length;
    pageData.imagesWithoutAlt = images.filter((img) => !img.alt).length;

    global.auditcore.logger.debug(`Found ${images.length} images for ${validTestUrl}`);
    global.auditcore.logger.debug(`Images without alt text: ${pageData.imagesWithoutAlt}`);

    let pa11yResult;
    if (cachedPa11yResult) {
      global.auditcore.logger.info(`Using cached Pa11y results for ${validTestUrl}`);
      pa11yResult = cachedPa11yResult;
    } else {
      pa11yResult = await runPa11yAnalysis(validTestUrl, html, config);
    }
    if (!results.pa11y) results.pa11y = [];
    results.pa11y.push(pa11yResult);

    if (pa11yResult.issues && pa11yResult.issues.length > 0) {
      global.auditcore.logger.info(`Found ${pa11yResult.issues.length} Pa11y issues for ${validTestUrl}`);
    } else {
      global.auditcore.logger.info(`No Pa11y issues found for ${validTestUrl}`);
    }

    const internalLinks = await getInternalLinksWithRetry(html, validTestUrl, validBaseUrl, config);
    if (!results.internalLinks) results.internalLinks = [];
    results.internalLinks.push({
      url: validTestUrl,
      links: internalLinks,
    });

    await runMetricsAnalysis($, validTestUrl, validBaseUrl, headers, results);

    updateResults(results, validTestUrl, pa11yResult, internalLinks);

    const contentAnalysis = createContentAnalysis(validTestUrl, pageData, jsErrors, internalLinks, pa11yResult);
    updateContentAnalysis(contentAnalysis, results);

    const duration = calculateDuration(startTime);
    global.auditcore.logger.info(`[END] Content analysis completed for ${validTestUrl} in ${duration.toFixed(3)} seconds`);

    return createAnalysisResult(validTestUrl, duration, contentAnalysis, pa11yResult, internalLinks);
  } catch (error) {
    global.auditcore.logger.error(`[ERROR] Error in analyzePageContent for ${testUrl}:`, error);
    return { url: testUrl, error: error.message };
  }
}

async function runPa11yAnalysis(testUrl, html, config) {
  global.auditcore.logger.info(`[START] runPa11yAnalysis for ${testUrl}`);
  global.auditcore.logger.debug(`Pa11y options: ${JSON.stringify(config)}`);

  try {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid config object provided to runPa11yAnalysis');
    }

    const pa11yOptions = {
      html,
      timeout: config.pa11yTimeout,
      wait: config.pa11yWait,
      threshold: config.pa11yThreshold,
    };

    const result = await runPa11yWithRetry(testUrl, pa11yOptions);
    if (!result) {
      throw new Error('Pa11y result is null or undefined');
    }
    global.auditcore.logger.debug(`Pa11y result: ${JSON.stringify(result)}`);
    global.auditcore.logger.info(`[END] runPa11yAnalysis completed successfully for ${testUrl}`);

    global.auditcore.logger.info(`Pa11y found ${result.issues ? result.issues.length : 0} issues for ${testUrl}`);

    return result;
  } catch (error) {
    global.auditcore.logger.error(`[ERROR] Error in runPa11yAnalysis for ${testUrl}:`, error);
    global.auditcore.logger.error(`Error stack: ${error.stack}`);
    return {
      url: testUrl,
      error: error.message,
      stack: error.stack,
    };
  }
}

async function runMetricsAnalysis($, testUrl, baseUrl, headers, results) {
  global.auditcore.logger.info(`[START] Running metrics analysis for ${testUrl}`);
  try {
    // Initialize all metric objects
    results.urlMetrics = results.urlMetrics || {};
    results.responseCodeMetrics = results.responseCodeMetrics || {};
    results.titleMetrics = results.titleMetrics || {};
    results.metaDescriptionMetrics = results.metaDescriptionMetrics || {};
    results.h1Metrics = results.h1Metrics || {};
    results.h2Metrics = results.h2Metrics || {};
    results.imageMetrics = results.imageMetrics || {};
    results.linkMetrics = results.linkMetrics || {};
    results.securityMetrics = results.securityMetrics || {};
    results.hreflangMetrics = results.hreflangMetrics || {};
    results.canonicalMetrics = results.canonicalMetrics || {};
    results.contentMetrics = results.contentMetrics || {};

    // Initialize metric objects for this specific URL
    results.urlMetrics[testUrl] = results.urlMetrics[testUrl] || {};
    results.responseCodeMetrics[testUrl] = results.responseCodeMetrics[testUrl] || {};
    results.titleMetrics[testUrl] = results.titleMetrics[testUrl] || {};
    results.metaDescriptionMetrics[testUrl] = results.metaDescriptionMetrics[testUrl] || {};
    results.h1Metrics[testUrl] = results.h1Metrics[testUrl] || {};
    results.h2Metrics[testUrl] = results.h2Metrics[testUrl] || {};
    results.imageMetrics[testUrl] = results.imageMetrics[testUrl] || {};
    results.linkMetrics[testUrl] = results.linkMetrics[testUrl] || {};
    results.securityMetrics[testUrl] = results.securityMetrics[testUrl] || {};
    results.hreflangMetrics[testUrl] = results.hreflangMetrics[testUrl] || {};
    results.canonicalMetrics[testUrl] = results.canonicalMetrics[testUrl] || {};
    results.contentMetrics[testUrl] = results.contentMetrics[testUrl] || {};

    await updateTitleMetrics($, results, testUrl);
    await updateMetaDescriptionMetrics($, results, testUrl);
    await updateHeadingMetrics($, results, testUrl);
    await updateImageMetrics($, results, testUrl);
    await updateLinkMetrics($, baseUrl, results, testUrl);
    await updateSecurityMetrics(testUrl, headers, results);
    await updateHreflangMetrics($, results, testUrl);
    await updateCanonicalMetrics($, testUrl, results);
    await updateContentMetrics($, results, testUrl);
    await updateLLMMetrics($, results, testUrl);

    const metricsToCheck = ['titleMetrics', 'metaDescriptionMetrics', 'h1Metrics', 'h2Metrics', 'imageMetrics', 'linkMetrics', 'securityMetrics', 'hreflangMetrics', 'canonicalMetrics', 'contentMetrics'];
    metricsToCheck.forEach((metric) => {
      if (!results[metric][testUrl] || Object.keys(results[metric][testUrl]).length === 0) {
        global.auditcore.logger.warn(`${metric} not populated for ${testUrl}`);
      } else {
        global.auditcore.logger.debug(`${metric} updated: ${JSON.stringify(results[metric][testUrl])}`);
      }
    });

    global.auditcore.logger.info(`[END] Metrics analysis completed successfully for ${testUrl}`);
  } catch (error) {
    global.auditcore.logger.error(`[ERROR] Error in runMetricsAnalysis for ${testUrl}:`, error);
    global.auditcore.logger.debug(`Error stack: ${error.stack}`);
  }
}

function updateResults(results, testUrl, pa11yResult, internalLinks) {
  global.auditcore.logger.info(`[START] Updating results for ${testUrl}`);

  results.urlMetrics = results.urlMetrics || {};
  results.urlMetrics[testUrl] = results.urlMetrics[testUrl] || {};
  results.urlMetrics[testUrl].internalLinks = internalLinks ? internalLinks.length : 0;

  results.responseCodeMetrics = results.responseCodeMetrics || {};
  results.responseCodeMetrics[testUrl] = results.responseCodeMetrics[testUrl] || {};
  results.responseCodeMetrics[testUrl].statusCode = pa11yResult ? 200 : null;

  results.contentMetrics = results.contentMetrics || {};
  results.contentMetrics[testUrl] = results.contentMetrics[testUrl] || {};

  global.auditcore.logger.info(`[END] Results updated for ${testUrl}`);
}

export {
  processUrl,
  analyzePageContent,
  runMetricsAnalysis,
  runPa11yAnalysis,
  updateResults,
};
