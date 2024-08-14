/* eslint-disable import/extensions */
// metricsUpdater.js

import { updateUrlMetrics, updateResponseCodeMetrics } from './urlMetrics.mjs';
import { updateTitleMetrics, updateMetaDescriptionMetrics, updateHeadingMetrics } from './contentMetrics.mjs';
import { updateImageMetrics, updateLinkMetrics } from './mediaMetrics.mjs';
import {
  updateSecurityMetrics,
  updateHreflangMetrics,
  updateCanonicalMetrics,
  updateContentAnalysis,
  updateInternalLinks,
} from './technicalMetrics.mjs';

/**
 * Updates all metrics for a given page.
 * @param {Object} pageData - The page data object containing all necessary information.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateAllMetrics(pageData, results) {
  if (!pageData || !results || !logger) {
    throw new Error('Invalid parameters for updateAllMetrics');
  }

  try {
    const {
      url, baseUrl, html, statusCode, $, headers, contentAnalysis, internalLinks,
    } = pageData;

    updateUrlMetrics(url, baseUrl, html, statusCode, results);
    updateResponseCodeMetrics(statusCode, results);
    updateTitleMetrics($, results);
    updateMetaDescriptionMetrics($, results);
    updateHeadingMetrics($, results);
    updateImageMetrics($, results);
    updateLinkMetrics($, baseUrl, results);
    updateSecurityMetrics(url, headers, results);
    updateHreflangMetrics($, results);
    updateCanonicalMetrics($, url, results);
    updateContentAnalysis(contentAnalysis, results);
    updateInternalLinks(url, internalLinks, results);

    global.auditcore.logger.info(`Updated all metrics for ${url}`);
  } catch (error) {
    global.auditcore.logger.error(`Error updating all metrics for ${pageData.url}:`, error);
  }
}

// Re-export all individual update functions for flexibility
export {
  updateUrlMetrics,
  updateResponseCodeMetrics,
  updateTitleMetrics,
  updateMetaDescriptionMetrics,
  updateHeadingMetrics,
  updateImageMetrics,
  updateLinkMetrics,
  updateSecurityMetrics,
  updateHreflangMetrics,
  updateCanonicalMetrics,
  updateContentAnalysis,
  updateInternalLinks,
};
