/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable import/extensions */
// src/utils/metricsUpdater.js

const AVERAGE_CHAR_WIDTH = 6; // Assuming an average character width of 6 pixels

function estimatePixelWidth(text) {
  return text.length * AVERAGE_CHAR_WIDTH;
}

function safeIncrement(obj, key) {
  obj[key] = (obj[key] || 0) + 1;
}

export function updateUrlMetrics(testUrl, baseUrl, html, statusCode, results, logger) {
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
    if (testUrl.length > 115) safeIncrement(results.urlMetrics, 'overLength');

    logger.debug(`Updated URL metrics for ${testUrl}`);
  } catch (error) {
    logger.error(`Error updating URL metrics for ${testUrl}:`, error);
  }
}

export function updateResponseCodeMetrics(statusCode, results, logger) {
  try {
    safeIncrement(results.responseCodeMetrics, statusCode);
    logger.debug(`Updated response code metrics for status ${statusCode}`);
  } catch (error) {
    logger.error(`Error updating response code metrics for status ${statusCode}:`, error);
  }
}

export function updateTitleMetrics($, results, logger) {
  try {
    const title = $('title').text();
    if (!title) {
      safeIncrement(results.titleMetrics, 'missing');
    } else {
      const titleLength = title.length;
      if (titleLength > 60) safeIncrement(results.titleMetrics, 'tooLong');
      if (titleLength < 30) safeIncrement(results.titleMetrics, 'tooShort');
      const pixelWidth = estimatePixelWidth(title);
      safeIncrement(results.titleMetrics.pixelWidth, pixelWidth);
    }
    logger.debug('Updated title metrics');
  } catch (error) {
    logger.error('Error updating title metrics:', error);
  }
}

export function updateMetaDescriptionMetrics($, results, logger) {
  try {
    const metaDescription = $('meta[name="description"]').attr('content');
    if (!metaDescription) {
      safeIncrement(results.metaDescriptionMetrics, 'missing');
    } else {
      const descLength = metaDescription.length;
      if (descLength > 155) safeIncrement(results.metaDescriptionMetrics, 'tooLong');
      if (descLength < 70) safeIncrement(results.metaDescriptionMetrics, 'tooShort');
      const pixelWidth = estimatePixelWidth(metaDescription);
      safeIncrement(results.metaDescriptionMetrics.pixelWidth, pixelWidth);
    }
    logger.debug('Updated meta description metrics');
  } catch (error) {
    logger.error('Error updating meta description metrics:', error);
  }
}

export function updateHeadingMetrics($, results, logger) {
  try {
    const h1s = $('h1');
    if (h1s.length === 0) safeIncrement(results.h1Metrics, 'missing');
    if (h1s.length > 1) safeIncrement(results.h1Metrics, 'multiple');
    h1s.each((i, el) => {
      if ($(el).text().length > 70) safeIncrement(results.h1Metrics, 'tooLong');
    });

    const h2s = $('h2');
    if (h2s.length === 0) safeIncrement(results.h2Metrics, 'missing');
    if (h2s.length > 1) safeIncrement(results.h2Metrics, 'multiple');
    h2s.each((i, el) => {
      if ($(el).text().length > 70) safeIncrement(results.h2Metrics, 'tooLong');
    });

    if ($('h1').length && $('*').index($('h2').first()) < $('*').index($('h1').first())) {
      safeIncrement(results.h2Metrics, 'nonSequential');
    }
    logger.debug('Updated heading metrics');
  } catch (error) {
    logger.error('Error updating heading metrics:', error);
  }
}

export function updateImageMetrics($, results, logger) {
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
      } else if (altText.length > 100) {
        safeIncrement(results.imageMetrics, 'altTextTooLong');
      }
    });
    logger.debug('Updated image metrics');
  } catch (error) {
    logger.error('Error updating image metrics:', error);
  }
}

export function updateLinkMetrics($, baseUrl, results, logger) {
  try {
    const internalLinkElements = $(`a[href^="/"], a[href^="${baseUrl}"]`);
    const externalLinks = $('a').not(internalLinkElements);
    if (internalLinkElements.length === 0) safeIncrement(results.linkMetrics, 'pagesWithoutInternalOutlinks');
    if (externalLinks.length > 100) safeIncrement(results.linkMetrics, 'pagesWithHighExternalOutlinks');
    internalLinkElements.each((i, el) => {
      if (!$(el).text().trim()) safeIncrement(results.linkMetrics, 'internalOutlinksWithoutAnchorText');
      if (['click here', 'read more', 'learn more'].includes($(el).text().toLowerCase().trim())) {
        safeIncrement(results.linkMetrics, 'nonDescriptiveAnchorText');
      }
    });
    logger.debug('Updated link metrics');
  } catch (error) {
    logger.error('Error updating link metrics:', error);
  }
}

export function updateSecurityMetrics(testUrl, headers, results, logger) {
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

export function updateHreflangMetrics($, results, logger) {
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

export function updateCanonicalMetrics($, testUrl, results, logger) {
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

export function updateContentAnalysis(contentAnalysis, results, logger) {
  try {
    if (contentAnalysis) {
      results.contentAnalysis.push(contentAnalysis);
      const wordCount = contentAnalysis.wordCount || 0;
      if (wordCount < 300) {
        safeIncrement(results.contentMetrics, 'lowContent');
      }
    }
    logger.debug('Updated content analysis');
  } catch (error) {
    logger.error('Error updating content analysis:', error);
  }
}

export function updateInternalLinks(testUrl, internalLinks, results, logger) {
  try {
    results.internalLinks.push({ url: testUrl, links: internalLinks });
    logger.debug(`Updated internal links for ${testUrl}`);
  } catch (error) {
    logger.error(`Error updating internal links for ${testUrl}:`, error);
  }
}
