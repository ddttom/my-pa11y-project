/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable import/extensions */
// src/utils/metricsUpdater.js

import { debug } from './debug.js';

function estimatePixelWidth(text) {
  // This is a rough estimate. Actual pixel width can vary based on font, browser, etc.
  const averageCharWidth = 6; // Assuming an average character width of 6 pixels
  return text.length * averageCharWidth;
}

export function updateUrlMetrics(testUrl, baseUrl, html, statusCode, results) {
  results.urlMetrics.total++;
  if (testUrl.startsWith(baseUrl)) {
    results.urlMetrics.internal++;
    // Check if URL is indexable (this is a simplified check)
    if (!html.includes('noindex') && statusCode === 200) {
      results.urlMetrics.internalIndexable++;
    } else {
      results.urlMetrics.internalNonIndexable++;
    }
  } else {
    results.urlMetrics.external++;
  }

  // Check for non-ASCII characters, uppercase, underscores, spaces, and length
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7F]/.test(testUrl)) results.urlMetrics.nonAscii++;
  if (/[A-Z]/.test(testUrl)) results.urlMetrics.uppercase++;
  if (testUrl.includes('_')) results.urlMetrics.underscores++;
  if (testUrl.includes(' ')) results.urlMetrics.containsSpace++;
  if (testUrl.length > 115) results.urlMetrics.overLength++;

  debug(`Updated URL metrics for ${testUrl}`);
}

export function updateResponseCodeMetrics(statusCode, results) {
  results.responseCodeMetrics[statusCode] = (results.responseCodeMetrics[statusCode] || 0) + 1;
  debug(`Updated response code metrics for status ${statusCode}`);
}

export function updateTitleMetrics($, results) {
  const title = $('title').text();
  if (!title) {
    results.titleMetrics.missing++;
  } else {
    const titleLength = title.length;
    if (titleLength > 60) results.titleMetrics.tooLong++;
    if (titleLength < 30) results.titleMetrics.tooShort++;
    const pixelWidth = estimatePixelWidth(title);
    // eslint-disable-next-line max-len
    results.titleMetrics.pixelWidth[pixelWidth] = (results.titleMetrics.pixelWidth[pixelWidth] || 0) + 1;
  }
  debug('Updated title metrics');
}

export function updateMetaDescriptionMetrics($, results) {
  const metaDescription = $('meta[name="description"]').attr('content');
  if (!metaDescription) {
    results.metaDescriptionMetrics.missing++;
  } else {
    const descLength = metaDescription.length;
    if (descLength > 155) results.metaDescriptionMetrics.tooLong++;
    if (descLength < 70) results.metaDescriptionMetrics.tooShort++;
    const pixelWidth = estimatePixelWidth(metaDescription);
    results.metaDescriptionMetrics.pixelWidth[pixelWidth] = (results.metaDescriptionMetrics.pixelWidth[pixelWidth] || 0) + 1;
  }
  debug('Updated meta description metrics');
}

export function updateHeadingMetrics($, results) {
  const h1s = $('h1');
  if (h1s.length === 0) results.h1Metrics.missing++;
  if (h1s.length > 1) results.h1Metrics.multiple++;
  h1s.each((i, el) => {
    const h1Text = $(el).text();
    if (h1Text.length > 70) results.h1Metrics.tooLong++;
  });

  const h2s = $('h2');
  if (h2s.length === 0) results.h2Metrics.missing++;
  if (h2s.length > 1) results.h2Metrics.multiple++;
  h2s.each((i, el) => {
    const h2Text = $(el).text();
    if (h2Text.length > 70) results.h2Metrics.tooLong++;
  });

  // Check for non-sequential H2
  if (
    $('h1').length
    && $('*').index($('h2').first()) < $('*').index($('h1').first())
  ) {
    results.h2Metrics.nonSequential++;
  }
  debug('Updated heading metrics');
}

export function updateImageMetrics($, results) {
  $('img').each((i, el) => {
    results.imageMetrics.total++;
    const altText = $(el).attr('alt');
    if (!altText) {
      if ($(el).attr('alt') === undefined) {
        results.imageMetrics.missingAltAttribute++;
      } else {
        results.imageMetrics.missingAlt++;
      }
    } else if (altText.length > 100) {
      results.imageMetrics.altTextTooLong++;
    }
  });
  debug('Updated image metrics');
}

export function updateLinkMetrics($, baseUrl, results) {
  const internalLinkElements = $(`a[href^="/"], a[href^="${baseUrl}"]`);
  const externalLinks = $('a').not(internalLinkElements);
  if (internalLinkElements.length === 0) results.linkMetrics.pagesWithoutInternalOutlinks++;
  if (externalLinks.length > 100) results.linkMetrics.pagesWithHighExternalOutlinks++;
  internalLinkElements.each((i, el) => {
    if (!$(el).text().trim()) results.linkMetrics.internalOutlinksWithoutAnchorText++;
    if (
      ['click here', 'read more', 'learn more'].includes(
        $(el).text().toLowerCase().trim(),
      )
    ) {
      results.linkMetrics.nonDescriptiveAnchorText++;
    }
  });
  debug('Updated link metrics');
}

export function updateSecurityMetrics(testUrl, headers, results) {
  if (testUrl.startsWith('http:')) results.securityMetrics.httpUrls++;
  if (!headers['strict-transport-security']) results.securityMetrics.missingHstsHeader++;
  if (!headers['content-security-policy']) results.securityMetrics.missingContentSecurityPolicy++;
  if (!headers['x-frame-options']) results.securityMetrics.missingXFrameOptions++;
  if (!headers['x-content-type-options']) results.securityMetrics.missingXContentTypeOptions++;
  debug('Updated security metrics');
}

export function updateHreflangMetrics($, results) {
  const hreflangTags = $('link[rel="alternate"][hreflang]');
  if (hreflangTags.length > 0) {
    results.hreflangMetrics.pagesWithHreflang++;
    // Additional hreflang checks could be added here
  }
  debug('Updated hreflang metrics');
}

export function updateCanonicalMetrics($, testUrl, results) {
  const canonicalTag = $('link[rel="canonical"]');
  if (canonicalTag.length === 0) {
    results.canonicalMetrics.missing++;
  } else {
    const canonicalUrl = canonicalTag.attr('href');
    if (canonicalUrl === testUrl) {
      results.canonicalMetrics.selfReferencing++;
    } else {
      results.canonicalMetrics.nonSelf++;
    }
  }
  debug('Updated canonical metrics');
}

// Update content analysis
export function updateContentAnalysis(contentAnalysis, results) {
  if (contentAnalysis) {
    results.contentAnalysis.push(contentAnalysis);

    // Update content metrics
    const wordCount = contentAnalysis.wordCount || 0;
    if (wordCount < 300) {
      // This threshold can be adjusted
      results.contentMetrics.lowContent++;
    }
    // Duplicate content check would require more complex analysis
  }
}

// Check for orphaned URLs

// Update internal links
export function updateInternalLinks(testUrl, internalLinks, results) {
  results.internalLinks.push({ url: testUrl, links: internalLinks });
}
