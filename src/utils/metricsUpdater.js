// metricsUpdater.js

import { estimatePixelWidth } from './metricsCommon.js';


export function updateContentAnalysis(contentAnalysis, results) {
  if (!results.contentAnalysis) {
    results.contentAnalysis = [];
  }

  try {
    results.contentAnalysis.push(contentAnalysis);
    const wordCount = contentAnalysis.wordCount || 0;
    if (wordCount < 300) {
      results.contentMetrics = results.contentMetrics || {};
      results.contentMetrics.lowContent = (results.contentMetrics.lowContent || 0) + 1;
    }
    global.auditcore.logger.debug(`Updated content analysis for ${contentAnalysis.url}`);
  } catch (error) {
    global.auditcore.logger.error(`Error updating content analysis for ${contentAnalysis.url}:`, error);
  }
}
export function updateTitleMetrics($, results, url) {
  const title = $('title').text().trim();
  results.titleMetrics = results.titleMetrics || {};
  results.titleMetrics[url] = {
    length: title.length,
    tooLong: title.length > 60 ? 1 : 0,
    tooShort: title.length < 30 ? 1 : 0,
    pixelWidth: estimatePixelWidth(title)
  };
}

export function updateMetaDescriptionMetrics($, results, url) {
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  results.metaDescriptionMetrics = results.metaDescriptionMetrics || {};
  results.metaDescriptionMetrics[url] = {
    length: metaDescription.length,
    tooLong: metaDescription.length > 155 ? 1 : 0,
    tooShort: metaDescription.length < 70 ? 1 : 0,
    pixelWidth: estimatePixelWidth(metaDescription)
  };
}

export function updateHeadingMetrics($, results, url) {
  const h1 = $('h1').first().text().trim();
  const h2Count = $('h2').length;
  
  results.h1Metrics = results.h1Metrics || {};
  results.h1Metrics[url] = {
    length: h1.length,
    missing: h1.length === 0 ? 1 : 0,
    tooLong: h1.length > 70 ? 1 : 0,
    multiple: $('h1').length > 1 ? 1 : 0
  };

  results.h2Metrics = results.h2Metrics || {};
  results.h2Metrics[url] = {
    count: h2Count,
    missing: h2Count === 0 ? 1 : 0,
    tooMany: h2Count > 15 ? 1 : 0 // Arbitrary threshold, adjust as needed
  };
}

export function updateImageMetrics($, results, url) {
  const images = $('img');
  const imagesWithAlt = images.filter((i, el) => $(el).attr('alt')?.trim().length > 0);
  
  results.imageMetrics = results.imageMetrics || {};
  results.imageMetrics[url] = {
    total: images.length,
    missingAlt: images.length - imagesWithAlt.length,
    altTooLong: imagesWithAlt.filter((i, el) => $(el).attr('alt').length > 100).length
  };
}

export function updateLinkMetrics($, baseUrl, results, url) {
  const internalLinks = $(`a[href^="/"], a[href^="${baseUrl}"]`);
  const externalLinks = $('a').not(internalLinks);
  
  results.linkMetrics = results.linkMetrics || {};
  results.linkMetrics[url] = {
    internalCount: internalLinks.length,
    externalCount: externalLinks.length,
    noFollowCount: $('a[rel*="nofollow"]').length,
    emptyLinkText: $('a').filter((i, el) => $(el).text().trim().length === 0).length
  };
}

export function updateSecurityMetrics(url, headers, results) {
  results.securityMetrics = results.securityMetrics || {};
  results.securityMetrics[url] = {
    https: url.startsWith('https') ? 1 : 0,
    hasHsts: headers['strict-transport-security'] ? 1 : 0,
    hasCsp: headers['content-security-policy'] ? 1 : 0,
    hasXFrameOptions: headers['x-frame-options'] ? 1 : 0,
    hasXContentTypeOptions: headers['x-content-type-options'] ? 1 : 0
  };
}

export function updateHreflangMetrics($, results, url) {
  const hreflangTags = $('link[rel="alternate"][hreflang]');
  
  results.hreflangMetrics = results.hreflangMetrics || {};
  results.hreflangMetrics[url] = {
    count: hreflangTags.length,
    hasXDefault: hreflangTags.filter((i, el) => $(el).attr('hreflang') === 'x-default').length > 0 ? 1 : 0
  };
}

export async function updateCanonicalMetrics($, testUrl, results) {
  const canonicalUrl = $('link[rel="canonical"]').attr('href');
  results.canonicalMetrics[testUrl] = results.canonicalMetrics[testUrl] || {};
  results.canonicalMetrics[testUrl].hasCanonical = !!canonicalUrl;
  results.canonicalMetrics[testUrl].isSelfReferential = canonicalUrl === testUrl;
}
export async function updateContentMetrics($, results, testUrl) {
  global.auditcore.logger.debug(`[START] Updating content metrics for ${testUrl}`);
  
  try {
    const content = $('body').text();
    const wordCount = content.trim().split(/\s+/).length;

    results.contentMetrics = results.contentMetrics || {};
    results.contentMetrics[testUrl] = results.contentMetrics[testUrl] || {};
    
    results.contentMetrics[testUrl] = {
      wordCount,
      hasLongParagraphs: $('p').toArray().some(p => $(p).text().split(/\s+/).length > 300),
    };

    global.auditcore.logger.debug(`Content metrics updated for ${testUrl}: ${JSON.stringify(results.contentMetrics[testUrl])}`);
  } catch (error) {
    global.auditcore.logger.error(`[ERROR] Error updating content metrics for ${testUrl}:`, error);
    global.auditcore.logger.debug(`Error stack: ${error.stack}`);
  }

  global.auditcore.logger.debug(`[END] Updating content metrics for ${testUrl}`);
}
export function updateUrlMetrics(url, baseUrl, html, statusCode, results) {
  results.urlMetrics = results.urlMetrics || {
    total: 0,
    internal: 0,
    external: 0,
    internalIndexable: 0,
    internalNonIndexable: 0,
    nonAscii: 0,
    uppercase: 0,
    underscores: 0,
    containsSpace: 0,
    overLength: 0
  };

  results.urlMetrics.total += 1;

  if (url.startsWith(baseUrl)) {
    results.urlMetrics.internal += 1;
    if (!html.includes('noindex') && statusCode === 200) {
      results.urlMetrics.internalIndexable += 1;
    } else {
      results.urlMetrics.internalNonIndexable += 1;
    }
  } else {
    results.urlMetrics.external += 1;
  }

  if (/[^\p{ASCII}]/u.test(url)) {
    results.urlMetrics.nonAscii += 1;
  }

  if (/[A-Z]/.test(url)) {
    results.urlMetrics.uppercase += 1;
  }

  if (url.includes('_')) {
    results.urlMetrics.underscores += 1;
  }

  if (url.includes(' ')) {
    results.urlMetrics.containsSpace += 1;
  }

  if (url.length > 115) {
    results.urlMetrics.overLength += 1;
  }

  results.urlMetrics[url] = results.urlMetrics[url] || {};
  results.urlMetrics[url].internalLinks = (results.urlMetrics[url].internalLinks || 0) + 1;
}

export function updateResponseCodeMetrics(statusCode, results) {
  results.responseCodeMetrics = results.responseCodeMetrics || {};
  results.responseCodeMetrics[statusCode] = (results.responseCodeMetrics[statusCode] || 0) + 1;
}

// Main function to update all metrics
export function updateAllMetrics(pageData, results) {
  const {
    url, baseUrl, html, statusCode, $, headers, content
  } = pageData;

  // Create contentAnalysis object
  const contentAnalysis = {
    url,
    wordCount: content.split(/\s+/).length,
    h1: $('h1').first().text().trim(),
    h2Count: $('h2').length,
    imagesCount: $('img').length,
    internalLinksCount: $(`a[href^="/"], a[href^="${baseUrl}"]`).length,
    externalLinksCount: $('a[href^="http"]').not(`a[href^="${baseUrl}"]`).length,
  };

  updateUrlMetrics(url, baseUrl, html, statusCode, results);
  updateResponseCodeMetrics(statusCode, results);
  updateTitleMetrics($, results, url);
  updateMetaDescriptionMetrics($, results, url);
  updateHeadingMetrics($, results, url);
  updateImageMetrics($, results, url);
  updateLinkMetrics($, baseUrl, results, url);
  updateSecurityMetrics(url, headers, results);
  updateHreflangMetrics($, results, url);
  updateCanonicalMetrics($, results, url);
  updateContentMetrics(content, results, url);
  updateContentAnalysis(contentAnalysis, results);

  global.auditcore.logger.info(`Updated all metrics for ${url}`);
}