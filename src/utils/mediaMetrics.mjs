// mediaMetrics.js

import { safeIncrement } from './metricsCommon';

const ALT_TEXT_MAX_LENGTH = 100;
const MAX_EXTERNAL_LINKS = 100;

/**
 * Updates image metrics based on the page's images.
 * @param {Object} $ - The Cheerio instance.
 * @param {Object} results - The results object to update.
 */
export function updateImageMetrics($, results) {
  try {
    $('img').each((i, el) => {
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
    global.auditcore.logger.debug('Updated image metrics');
  } catch (error) {
    global.auditcore.logger.error('Error updating image metrics:', error);
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
    const internalLinkElements = $(`a[href^="/"], a[href^="${baseUrl}"]`);
    const externalLinks = $('a').not(internalLinkElements);
    if (internalLinkElements.length === 0) safeIncrement(results.linkMetrics, 'pagesWithoutInternalOutlinks');
    if (externalLinks.length > MAX_EXTERNAL_LINKS) safeIncrement(results.linkMetrics, 'pagesWithHighExternalOutlinks');
    internalLinkElements.each((i, el) => {
      if (!$(el).text().trim()) safeIncrement(results.linkMetrics, 'internalOutlinksWithoutAnchorText');
      if (['click here', 'read more', 'learn more'].includes($(el).text().toLowerCase().trim())) {
        safeIncrement(results.linkMetrics, 'nonDescriptiveAnchorText');
      }
    });
    global.auditcore.logger.debug('Updated link metrics');
  } catch (error) {
    global.auditcore.logger.error('Error updating link metrics:', error);
  }
}
