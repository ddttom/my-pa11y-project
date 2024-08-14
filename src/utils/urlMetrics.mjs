/* eslint-disable import/extensions */
// urlMetrics.js

import { isValidUrl } from './urlUtils.mjs';
import { safeIncrement } from './metricsCommon.mjs';

const URL_MAX_LENGTH = 115;

/**
 * Updates URL metrics based on the test URL.
 * @param {string} testUrl - The URL being tested.
 * @param {string} baseUrl - The base URL of the website.
 * @param {string} html - The HTML content of the page.
 * @param {number} statusCode - The HTTP status code of the response.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateUrlMetrics(testUrl, baseUrl, html, statusCode, results) {
  if (!isValidUrl(testUrl) || !isValidUrl(baseUrl) || typeof html !== 'string' || !Number.isInteger(statusCode) || !results || !logger) {
    throw new Error('Invalid parameters for updateUrlMetrics');
  }

  try {
    safeIncrement(results.urlMetrics, 'total');
    if (testUrl.startsWith(baseUrl)) {
      safeIncrement(results.urlMetrics, 'internal');
      if (!html.includes('noindex') && statusCode === 200) {
        safeIncrement(results.urlMetrics, 'internalIndexable');
      } else {
        safeIncrement(results.urlMetrics, 'internalNonIndexable');
      }
    } else {
      safeIncrement(results.urlMetrics, 'external');
    }

    // eslint-disable-next-line no-control-regex
    if (/[^\x00-\x7F]/.test(testUrl)) safeIncrement(results.urlMetrics, 'nonAscii');
    if (/[A-Z]/.test(testUrl)) safeIncrement(results.urlMetrics, 'uppercase');
    if (testUrl.includes('_')) safeIncrement(results.urlMetrics, 'underscores');
    if (testUrl.includes(' ')) safeIncrement(results.urlMetrics, 'containsSpace');
    if (testUrl.length > URL_MAX_LENGTH) safeIncrement(results.urlMetrics, 'overLength');

    global.auditcore.logger.debug(`Updated URL metrics for ${testUrl}`);
  } catch (error) {
    global.auditcore.logger.error(`Error updating URL metrics for ${testUrl}:`, error);
  }
}

/**
 * Updates response code metrics based on the HTTP status code.
 * @param {number} statusCode - The HTTP status code.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateResponseCodeMetrics(statusCode, results) {
  if (!Number.isInteger(statusCode) || !results || !logger) {
    throw new Error('Invalid parameters for updateResponseCodeMetrics');
  }

  try {
    safeIncrement(results.responseCodeMetrics, statusCode);
    global.auditcore.logger.debug(`Updated response code metrics for status ${statusCode}`);
  } catch (error) {
    global.auditcore.logger.error(`Error updating response code metrics for status ${statusCode}:`, error);
  }
}
