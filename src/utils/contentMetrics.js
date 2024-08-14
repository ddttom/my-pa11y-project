/* eslint-disable import/extensions */
// contentMetrics.js

import { safeIncrement, estimatePixelWidth } from './metricsCommon.js';

const TITLE_MIN_LENGTH = 30;
const TITLE_MAX_LENGTH = 60;
const META_DESC_MIN_LENGTH = 70;
const META_DESC_MAX_LENGTH = 155;
const HEADING_MAX_LENGTH = 70;

/**
 * Updates title metrics based on the page's title.
 * @param {Object} $ - The Cheerio instance.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateTitleMetrics($, results, logger) {
  if (!$ || !results || !logger) {
    throw new Error('Invalid parameters for updateTitleMetrics');
  }

  try {
    const title = $('title').text().trim();
    if (!title) {
      safeIncrement(results.titleMetrics, 'missing');
    } else {
      const titleLength = title.length;
      if (titleLength > TITLE_MAX_LENGTH) safeIncrement(results.titleMetrics, 'tooLong');
      if (titleLength < TITLE_MIN_LENGTH) safeIncrement(results.titleMetrics, 'tooShort');
      const pixelWidth = estimatePixelWidth(title);
      safeIncrement(results.titleMetrics.pixelWidth, pixelWidth);
    }
    logger.debug('Updated title metrics');
  } catch (error) {
    logger.error('Error updating title metrics:', error);
  }
}

/**
 * Updates meta description metrics based on the page's meta description.
 * @param {Object} $ - The Cheerio instance.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateMetaDescriptionMetrics($, results, logger) {
  if (!$ || !results || !logger) {
    throw new Error('Invalid parameters for updateMetaDescriptionMetrics');
  }

  try {
    const metaDescription = $('meta[name="description"]').attr('content');
    if (!metaDescription) {
      safeIncrement(results.metaDescriptionMetrics, 'missing');
    } else {
      const descLength = metaDescription.length;
      if (descLength > META_DESC_MAX_LENGTH) safeIncrement(results.metaDescriptionMetrics, 'tooLong');
      if (descLength < META_DESC_MIN_LENGTH) safeIncrement(results.metaDescriptionMetrics, 'tooShort');
      const pixelWidth = estimatePixelWidth(metaDescription);
      safeIncrement(results.metaDescriptionMetrics.pixelWidth, pixelWidth);
    }
    logger.debug('Updated meta description metrics');
  } catch (error) {
    logger.error('Error updating meta description metrics:', error);
  }
}

/**
 * Updates heading metrics based on the page's headings.
 * @param {Object} $ - The Cheerio instance.
 * @param {Object} results - The results object to update.
 * @param {Object} logger - The logger object.
 */
export function updateHeadingMetrics($, results, logger) {
  if (!$ || !results || !logger) {
    throw new Error('Invalid parameters for updateHeadingMetrics');
  }

  try {
    const h1s = $('h1');
    if (h1s.length === 0) safeIncrement(results.h1Metrics, 'missing');
    if (h1s.length > 1) safeIncrement(results.h1Metrics, 'multiple');
    h1s.each((i, el) => {
      if ($(el).text().length > HEADING_MAX_LENGTH) safeIncrement(results.h1Metrics, 'tooLong');
    });

    const h2s = $('h2');
    if (h2s.length === 0) safeIncrement(results.h2Metrics, 'missing');
    if (h2s.length > 1) safeIncrement(results.h2Metrics, 'multiple');
    h2s.each((i, el) => {
      if ($(el).text().length > HEADING_MAX_LENGTH) safeIncrement(results.h2Metrics, 'tooLong');
    });

    if ($('h1').length && $('*').index($('h2').first()) < $('*').index($('h1').first())) {
      safeIncrement(results.h2Metrics, 'nonSequential');
    }
    logger.debug('Updated heading metrics');
  } catch (error) {
    logger.error('Error updating heading metrics:', error);
  }
}
