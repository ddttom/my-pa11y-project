// mediaMetrics.js
import { safeIncrement } from './metricsCommon.js';

const ALT_TEXT_MAX_LENGTH = 100;
const MAX_EXTERNAL_LINKS = 100;

/**
 * Updates image metrics based on the page's images.
 * @param {Object} $ - The Cheerio instance.
 * @param {Object} results - The results object to update.
 */
export function updateImageMetrics($, results) {
  try {
    global.auditcore.logger.debug('Starting updateImageMetrics');

    if (!$ || typeof $ !== 'function') {
      throw new Error('Invalid Cheerio instance');
    }

    if (!results || typeof results !== 'object') {
      throw new Error('Invalid results object');
    }

    results.imageMetrics = results.imageMetrics || {};

    const images = $('img');
    global.auditcore.logger.debug(`Found ${images.length} images`);

    images.each((i, el) => {
      safeIncrement(results.imageMetrics, 'total');
      const altText = $(el).attr('alt');
      if (!altText) {
        if ($(el).attr('alt') === undefined) {
          safeIncrement(results.imageMetrics, 'missingAltAttribute');
        } else {
          safeIncrement(results.imageMetrics, 'missingAlt');
        }
      } else if (altText.length > ALT_TEXT_MAX_LENGTH) {
        safeIncrement(results.imageMetrics, 'altTextTooLong');
      }
    });

    global.auditcore.logger.debug('Image metrics after update:', JSON.stringify(results.imageMetrics));
    global.auditcore.logger.info('Updated image metrics successfully');
  } catch (error) {
    global.auditcore.logger.error('Error updating image metrics:', error);
    results.imageMetrics = results.imageMetrics || {};
    results.imageMetrics.error = error.message;
  }
}

/**
 * Updates link metrics based on the page's links.
 * @param {Object} $ - The Cheerio instance.
 * @param {string} baseUrl - The base URL of the website.
 * @param {Object} results - The results object to update.
 */
export function updateLinkMetrics($, baseUrl, results) {
  try {
    global.auditcore.logger.debug('Starting updateLinkMetrics');

    if (!$ || typeof $ !== 'function') {
      throw new Error('Invalid Cheerio instance');
    }

    if (!baseUrl || typeof baseUrl !== 'string') {
      throw new Error('Invalid baseUrl');
    }

    if (!results || typeof results !== 'object') {
      throw new Error('Invalid results object');
    }

    results.linkMetrics = results.linkMetrics || {};

    const internalLinkElements = $(`a[href^="/"], a[href^="${baseUrl}"]`);
    const externalLinks = $('a').not(internalLinkElements);

    global.auditcore.logger.debug(`Found ${internalLinkElements.length} internal links and ${externalLinks.length} external links`);

    if (internalLinkElements.length === 0) {
      safeIncrement(results.linkMetrics, 'pagesWithoutInternalOutlinks');
    }

    if (externalLinks.length > MAX_EXTERNAL_LINKS) {
      safeIncrement(results.linkMetrics, 'pagesWithHighExternalOutlinks');
    }

    internalLinkElements.each((i, el) => {
      if (!$(el).text().trim()) {
        safeIncrement(results.linkMetrics, 'internalOutlinksWithoutAnchorText');
      }
      if (['click here', 'read more', 'learn more'].includes($(el).text().toLowerCase().trim())) {
        safeIncrement(results.linkMetrics, 'nonDescriptiveAnchorText');
      }
    });

    global.auditcore.logger.debug('Link metrics after update:', JSON.stringify(results.linkMetrics));
    global.auditcore.logger.info('Updated link metrics successfully');
  } catch (error) {
    global.auditcore.logger.error('Error updating link metrics:', error);
    results.linkMetrics = results.linkMetrics || {};
    results.linkMetrics.error = error.message;
  }
}
