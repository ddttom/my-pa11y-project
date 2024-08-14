/* eslint-disable import/extensions */
// technicalMetrics.js

import { safeIncrement } from './metricsCommon.mjs';
import { isValidUrl } from './urlUtils.mjs';

/**
 * Updates security metrics based on the page's security features.
 * @param {string} testUrl - The URL being tested.
 * @param {Object} headers - The response headers.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateSecurityMetrics(testUrl, headers, results, logger) {
  if (!isValidUrl(testUrl) || !headers || !results || !logger) {
    throw new Error('Invalid parameters for updateSecurityMetrics');
  }

  try {
    if (testUrl.startsWith('http:')) safeIncrement(results.securityMetrics, 'httpUrls');
    if (!headers['strict-transport-security']) safeIncrement(results.securityMetrics, 'missingHstsHeader');
    if (!headers['content-security-policy']) safeIncrement(results.securityMetrics, 'missingContentSecurityPolicy');
    if (!headers['x-frame-options']) safeIncrement(results.securityMetrics, 'missingXFrameOptions');
    if (!headers['x-content-type-options']) safeIncrement(results.securityMetrics, 'missingXContentTypeOptions');
    logger.debug('Updated security metrics');
  } catch (error) {
    logger.error('Error updating security metrics:', error);
  }
}

/**
 * Updates hreflang metrics based on the page's hreflang tags.
 * @param {Object} $ - The Cheerio instance.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateHreflangMetrics($, results, logger) {
  if (!$ || !results || !logger) {
    throw new Error('Invalid parameters for updateHreflangMetrics');
  }

  try {
    const hreflangTags = $('link[rel="alternate"][hreflang]');
    if (hreflangTags.length > 0) {
      safeIncrement(results.hreflangMetrics, 'pagesWithHreflang');
    }
    logger.debug('Updated hreflang metrics');
  } catch (error) {
    logger.error('Error updating hreflang metrics:', error);
  }
}

/**
 * Updates canonical metrics based on the page's canonical tag.
 * @param {Object} $ - The Cheerio instance.
 * @param {string} testUrl - The URL being tested.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateCanonicalMetrics($, testUrl, results, logger) {
  if (!$ || !isValidUrl(testUrl) || !results || !logger) {
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
    logger.debug('Updated canonical metrics');
  } catch (error) {
    logger.error('Error updating canonical metrics:', error);
  }
}

/**
 * Updates content analysis metrics.
 * @param {Object} contentAnalysis - The content analysis object.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateContentAnalysis(contentAnalysis, results, logger) {
  if (!contentAnalysis || !results || !logger) {
    throw new Error('Invalid parameters for updateContentAnalysis');
  }

  try {
    results.contentAnalysis.push(contentAnalysis);
    const wordCount = contentAnalysis.wordCount || 0;
    if (wordCount < 300) {
      safeIncrement(results.contentMetrics, 'lowContent');
    }
    logger.debug('Updated content analysis');
  } catch (error) {
    logger.error('Error updating content analysis:', error);
  }
}

/**
 * Updates internal links metrics.
 * @param {string} testUrl - The URL being tested.
 * @param {Array} internalLinks - The array of internal links.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateInternalLinks(testUrl, internalLinks, results, logger) {
  if (!isValidUrl(testUrl) || !Array.isArray(internalLinks) || !results || !logger) {
    throw new Error('Invalid parameters for updateInternalLinks');
  }

  try {
    results.internalLinks.push({ url: testUrl, links: internalLinks });
    logger.debug(`Updated internal links for ${testUrl}`);
  } catch (error) {
    logger.error(`Error updating internal links for ${testUrl}:`, error);
  }
}
