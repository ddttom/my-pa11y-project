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
 */

export function updateTitleMetrics($, results) {
  try {
    global.auditcore.logger.debug('Starting updateTitleMetrics');

    if (!$ || typeof $ !== 'function') {
      throw new Error('Invalid Cheerio instance');
    }

    if (!results || typeof results !== 'object') {
      throw new Error('Invalid results object');
    }

    // Initialize titleMetrics object if it doesn't exist
    results.titleMetrics = results.titleMetrics || {};

    const title = $('title').text().trim();
    global.auditcore.logger.debug(`Extracted title: "${title}"`);

    if (!title) {
      global.auditcore.logger.warn('Title is missing');
      results.titleMetrics.missing = 1;
    } else {
      const titleLength = title.length;
      global.auditcore.logger.debug(`Title length: ${titleLength}`);

      results.titleMetrics = {
        length: titleLength,
        tooLong: titleLength > TITLE_MAX_LENGTH ? 1 : 0,
        tooShort: titleLength < TITLE_MIN_LENGTH ? 1 : 0,
        pixelWidth: estimatePixelWidth(title),
      };

      if (titleLength > TITLE_MAX_LENGTH) {
        global.auditcore.logger.warn(`Title is too long: ${titleLength} characters`);
      }
      if (titleLength < TITLE_MIN_LENGTH) {
        global.auditcore.logger.warn(`Title is too short: ${titleLength} characters`);
      }

      global.auditcore.logger.debug(`Estimated title pixel width: ${results.titleMetrics.pixelWidth}`);
    }

    global.auditcore.logger.debug('Title metrics after update:', JSON.stringify(results.titleMetrics));
    global.auditcore.logger.info('Updated title metrics successfully');
  } catch (error) {
    global.auditcore.logger.error('Error updating title metrics:', error);
    results.titleMetrics = results.titleMetrics || {};
    results.titleMetrics.error = error.message;
  }
}

/**
 * Updates meta description metrics based on the page's meta description.
 * @param {Object} $ - The Cheerio instance.
 * @param {Object} results - The results object to update.
 */
export function updateMetaDescriptionMetrics($, results) {
  try {
    global.auditcore.logger.debug('Starting updateMetaDescriptionMetrics');

    if (!$ || typeof $ !== 'function') {
      throw new Error('Invalid Cheerio instance');
    }

    if (!results || !results.metaDescriptionMetrics) {
      throw new Error('Invalid results object');
    }

    const metaDescription = $('meta[name="description"]').attr('content');
    global.auditcore.logger.debug(`Extracted meta description: "${metaDescription}"`);

    if (!metaDescription) {
      global.auditcore.logger.warn('Meta description is missing');
      safeIncrement(results.metaDescriptionMetrics, 'missing');
    } else {
      const descLength = metaDescription.length;
      global.auditcore.logger.debug(`Meta description length: ${descLength}`);

      if (descLength > META_DESC_MAX_LENGTH) {
        global.auditcore.logger.warn(`Meta description is too long: ${descLength} characters`);
        safeIncrement(results.metaDescriptionMetrics, 'tooLong');
      }
      if (descLength < META_DESC_MIN_LENGTH) {
        global.auditcore.logger.warn(`Meta description is too short: ${descLength} characters`);
        safeIncrement(results.metaDescriptionMetrics, 'tooShort');
      }

      const pixelWidth = estimatePixelWidth(metaDescription);
      global.auditcore.logger.debug(`Estimated meta description pixel width: ${pixelWidth}`);
      safeIncrement(results.metaDescriptionMetrics.pixelWidth, pixelWidth);
    }

    global.auditcore.logger.debug('Meta description metrics after update:', JSON.stringify(results.metaDescriptionMetrics));
    global.auditcore.logger.info('Updated meta description metrics successfully');
  } catch (error) {
    global.auditcore.logger.error('Error updating meta description metrics:', error);
    results.metaDescriptionMetrics = results.metaDescriptionMetrics || {};
    results.metaDescriptionMetrics.error = error.message;
  }
}

/**
 * Updates heading metrics based on the page's headings.
 * @param {Object} $ - The Cheerio instance.
 * @param {Object} results - The results object to update.
 */
export function updateHeadingMetrics($, results) {
  try {
    global.auditcore.logger.debug('Starting updateHeadingMetrics');

    if (!$ || typeof $ !== 'function') {
      throw new Error('Invalid Cheerio instance');
    }

    if (!results || !results.h1Metrics || !results.h2Metrics) {
      throw new Error('Invalid results object');
    }

    const h1s = $('h1');
    global.auditcore.logger.debug(`Number of H1 tags: ${h1s.length}`);

    if (h1s.length === 0) {
      global.auditcore.logger.warn('H1 tag is missing');
      safeIncrement(results.h1Metrics, 'missing');
    }
    if (h1s.length > 1) {
      global.auditcore.logger.warn(`Multiple H1 tags found: ${h1s.length}`);
      safeIncrement(results.h1Metrics, 'multiple');
    }

    h1s.each((i, el) => {
      const h1Text = $(el).text();
      global.auditcore.logger.debug(`H1 tag ${i + 1} content: "${h1Text}"`);
      if (h1Text.length > HEADING_MAX_LENGTH) {
        global.auditcore.logger.warn(`H1 tag ${i + 1} is too long: ${h1Text.length} characters`);
        safeIncrement(results.h1Metrics, 'tooLong');
      }
    });

    const h2s = $('h2');
    global.auditcore.logger.debug(`Number of H2 tags: ${h2s.length}`);

    if (h2s.length === 0) {
      global.auditcore.logger.warn('H2 tag is missing');
      safeIncrement(results.h2Metrics, 'missing');
    }
    if (h2s.length > 1) {
      global.auditcore.logger.warn(`Multiple H2 tags found: ${h2s.length}`);
      safeIncrement(results.h2Metrics, 'multiple');
    }

    h2s.each((i, el) => {
      const h2Text = $(el).text();
      global.auditcore.logger.debug(`H2 tag ${i + 1} content: "${h2Text}"`);
      if (h2Text.length > HEADING_MAX_LENGTH) {
        global.auditcore.logger.warn(`H2 tag ${i + 1} is too long: ${h2Text.length} characters`);
        safeIncrement(results.h2Metrics, 'tooLong');
      }
    });

    if ($('h1').length && $('*').index($('h2').first()) < $('*').index($('h1').first())) {
      global.auditcore.logger.warn('H2 tag appears before H1 tag');
      safeIncrement(results.h2Metrics, 'nonSequential');
    }

    global.auditcore.logger.debug('H1 metrics after update:', JSON.stringify(results.h1Metrics));
    global.auditcore.logger.debug('H2 metrics after update:', JSON.stringify(results.h2Metrics));
    global.auditcore.logger.info('Updated heading metrics successfully');
  } catch (error) {
    global.auditcore.logger.error('Error updating heading metrics:', error);
    results.h1Metrics = results.h1Metrics || {};
    results.h2Metrics = results.h2Metrics || {};
    results.h1Metrics.error = error.message;
    results.h2Metrics.error = error.message;
  }
}
