// pageAnalyzerHelpers.js

import { getInternalLinks } from './linkAnalyzer.js';
import { updateInternalLinks } from './technicalMetrics.js';

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

function createContentAnalysis(testUrl, pageData, jsErrors, internalLinks, pa11yResult) {
  if (!testUrl) {
    global.auditcore.logger.error('TestUrl is undefined in createContentAnalysis');
    return null;
  }
  const analysis = {
    url: testUrl,
    wordCount: pageData.wordCount || 0,
    h1Count: pageData.h1Count || 0,
    h2Count: pageData.h2Count || 0,
    h3Count: pageData.h3Count || 0,
    imagesCount: pageData.images ? pageData.images.length : 0,
    images: pageData.images || [], // Add this line
    imagesWithoutAlt: pageData.imagesWithoutAlt || 0, // Add this line
    internalLinksCount: Array.isArray(internalLinks) ? internalLinks.length : 0,
    externalLinksCount: pageData.externalLinksCount || 0,
    title: pageData.title || '',
    metaDescription: pageData.metaDescription || '',
    h1: pageData.h1 || '',
    hasResponsiveMetaTag: pageData.hasResponsiveMetaTag || false,
    scriptsCount: pageData.scriptsCount || 0,
    stylesheetsCount: pageData.stylesheetsCount || 0,
    htmlLang: pageData.htmlLang || '',
    canonicalUrl: pageData.canonicalUrl || '',
    formsCount: pageData.formsCount || 0,
    tablesCount: pageData.tablesCount || 0,
    pageSize: pageData.pageSize || 0,
    jsErrors: Array.isArray(jsErrors) ? jsErrors.length : 0,
    pa11yIssuesCount: pa11yResult && Array.isArray(pa11yResult.issues) ? pa11yResult.issues.length : 0,
  };
  global.auditcore.logger.debug(`Created content analysis for ${testUrl}`);
  global.auditcore.logger.debug(`Images found: ${analysis.imagesCount}, Images without alt: ${analysis.imagesWithoutAlt}`);
  return analysis;
}
function calculateDuration(startTime) {
  const [seconds, nanoseconds] = process.hrtime(startTime);
  return seconds + nanoseconds / 1e9;
}

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

export {
  retryOperation,
  getInternalLinksWithRetry,
  updateResults,
  createContentAnalysis,
  calculateDuration,
  createAnalysisResult,
};