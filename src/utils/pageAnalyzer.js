// pageAnalyzer.js

import cheerio from 'cheerio';
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
    
    // Add this line to update content metrics
    await updateContentMetrics($, results, testUrl);

    const metricsToCheck = ['titleMetrics', 'metaDescriptionMetrics', 'h1Metrics', 'h2Metrics', 'imageMetrics', 'linkMetrics', 'securityMetrics', 'hreflangMetrics', 'canonicalMetrics', 'contentMetrics'];
    metricsToCheck.forEach(metric => {
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
    global.auditcore.logger.debug(`Pa11y options: ${JSON.stringify(pa11yOptions)}`);

    const result = await runPa11yWithRetry(testUrl, pa11yOptions);
    if (!result) {
      throw new Error('Pa11y result is null or undefined');
    }
    global.auditcore.logger.debug(`Pa11y result: ${JSON.stringify(result)}`);
    global.auditcore.logger.info(`[END] runPa11yAnalysis completed successfully for ${testUrl}`);
    return result;
  } catch (error) {
    global.auditcore.logger.error(`[ERROR] Error in runPa11yAnalysis for ${testUrl}:`, error);
    global.auditcore.logger.error(`Error stack: ${error.stack}`);
    return { url: testUrl, error: error.message, stack: error.stack };
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
}) {
  const startTime = process.hrtime();
  global.auditcore.logger.info(`[START] Analyzing content for ${testUrl}`);

  try {
    if (!testUrl) {
      throw new Error('testUrl is undefined or empty');
    }
    validateInput(testUrl, html, baseUrl);

    const $ = memoizedCheerioLoad(html);
    global.auditcore.logger.debug(`Cheerio loaded for ${testUrl}`);

    const pa11yResult = await runPa11yAnalysis(testUrl, html, config);
    if (!results.pa11y) results.pa11y = [];
    results.pa11y.push(pa11yResult);

    const internalLinks = await getInternalLinksWithRetry(html, testUrl, baseUrl, config);
    if (!results.internalLinks) results.internalLinks = [];
    results.internalLinks.push({ url: testUrl, links: internalLinks });

    await runMetricsAnalysis($, testUrl, baseUrl, headers, results);

    updateResults(results, testUrl, pa11yResult, internalLinks);

    const contentAnalysis = createContentAnalysis(testUrl, pageData, jsErrors, internalLinks, pa11yResult);
    updateContentAnalysis(contentAnalysis, results);

    const duration = calculateDuration(startTime);
    global.auditcore.logger.info(`[END] Content analysis completed for ${testUrl} in ${duration.toFixed(3)} seconds`);

    return createAnalysisResult(testUrl, duration, contentAnalysis, pa11yResult, internalLinks);
  } catch (error) {
    global.auditcore.logger.error(`[ERROR] Error in analyzePageContent for ${testUrl || 'unknown URL'}:`, error);
    return { url: testUrl || 'unknown URL', error: error.message };
  }
}

async function processUrl(url, html, jsErrors, baseUrl, results, headers, pageData, config) {
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
      config
    });
    
    global.auditcore.logger.info(`Analysis completed for ${url}`);
    return analysisResult;
  } catch (error) {
    global.auditcore.logger.error(`Error processing ${url}:`, error);
    return { url, error: error.message };
  }
}

export {
  analyzePageContent,
  runMetricsAnalysis,
  runPa11yAnalysis,
  updateResults,
  processUrl
};