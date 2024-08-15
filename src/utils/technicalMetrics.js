// technicalMetrics.js

import { safeIncrement } from './metricsCommon.js';
import { isValidUrl } from './urlUtils.js';

/**
 * Updates security metrics based on the page's security features.
 * @param {string} testUrl - The URL being tested.
 * @param {Object} headers - The response headers.
 * @param {Object} results - The results object to update.

 */
export function updateSecurityMetrics(testUrl, headers, results) {
  if (!isValidUrl(testUrl) || !headers || !results) {
    throw new Error('Invalid parameters for updateSecurityMetrics');
  }

  try {
    if (testUrl.startsWith('http:')) safeIncrement(results.securityMetrics, 'httpUrls');
    if (!headers['strict-transport-security']) safeIncrement(results.securityMetrics, 'missingHstsHeader');
    if (!headers['content-security-policy']) safeIncrement(results.securityMetrics, 'missingContentSecurityPolicy');
    if (!headers['x-frame-options']) safeIncrement(results.securityMetrics, 'missingXFrameOptions');
    if (!headers['x-content-type-options']) safeIncrement(results.securityMetrics, 'missingXContentTypeOptions');
    global.auditcore.logger.debug('Updated security metrics');
  } catch (error) {
    global.auditcore.logger.error('Error updating security metrics:', error);
  }
}

/**
 * Updates hreflang metrics based on the page's hreflang tags.
 * @param {Object} $ - The Cheerio instance.
 * @param {Object} results - The results object to update.
 */
export function updateHreflangMetrics($, results) {
  try {
    const hreflangTags = $('link[rel="alternate"][hreflang]');
    if (hreflangTags.length > 0) {
      safeIncrement(results.hreflangMetrics, 'pagesWithHreflang');
    }
    global.auditcore.logger.debug('Updated hreflang metrics');
  } catch (error) {
    global.auditcore.logger.error('Error updating hreflang metrics:', error);
  }
}

/**
 * Updates canonical metrics based on the page's canonical tag.
 * @param {Object} $ - The Cheerio instance.
 * @param {string} testUrl - The URL being tested.
 * @param {Object} results - The results object to update.
 */
export function updateCanonicalMetrics($, testUrl, results) {
  if (!$ || !isValidUrl(testUrl) || !results) {
    throw new Error('Invalid parameters for updateCanonicalMetrics');
  }

  try {
    const canonicalTag = $('link[rel="canonical"]');
    if (canonicalTag.length === 0) {
      safeIncrement(results.canonicalMetrics, 'missing');
    } else {
      const canonicalUrl = canonicalTag.attr('href');
      if (canonicalUrl === testUrl) {
        safeIncrement(results.canonicalMetrics, 'selfReferencing');
      } else {
        safeIncrement(results.canonicalMetrics, 'nonSelf');
      }
    }
    global.auditcore.logger.debug('Updated canonical metrics');
  } catch (error) {
    global.auditcore.logger.error('Error updating canonical metrics:', error);
  }
}

/**
 * Updates content analysis metrics.
 * @param {Object} contentAnalysis - The content analysis object.
 * @param {Object} results - The results object to update.
 */
export function updateContentAnalysis(contentAnalysis, results) {
  if (!results.contentAnalysis) {
    results.contentAnalysis = [];
  }

  try {
    results.contentAnalysis.push(contentAnalysis);
    const wordCount = contentAnalysis.wordCount || 0;
    if (wordCount < 300) {
      safeIncrement(results.contentMetrics, 'lowContent');
    }
    global.auditcore.logger.debug('Updated content analysis');
  } catch (error) {
    global.auditcore.logger.error('Error updating content analysis:', error);
  }
}

/**
 * Updates internal links metrics.
 * @param {string} testUrl - The URL being tested.
 * @param {Array} internalLinks - The array of internal links.
 * @param {Object} results - The results object to update.
 */
export function updateInternalLinks(testUrl, internalLinks, results) {
  if (!isValidUrl(testUrl) || !Array.isArray(internalLinks) || !results) {
    throw new Error('Invalid parameters for updateInternalLinks');
  }

  try {
    results.internalLinks.push({ url: testUrl, links: internalLinks });
    global.auditcore.logger.debug(`Updated internal links for ${testUrl}`);
  } catch (error) {
    global.auditcore.logger.error(`Error updating internal links for ${testUrl}:`, error);
  }
}
