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
    pixelWidth: estimatePixelWidth(title),
  };
}

export function updateMetaDescriptionMetrics($, results, url) {
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  results.metaDescriptionMetrics = results.metaDescriptionMetrics || {};
  results.metaDescriptionMetrics[url] = {
    length: metaDescription.length,
    tooLong: metaDescription.length > 155 ? 1 : 0,
    tooShort: metaDescription.length < 70 ? 1 : 0,
    pixelWidth: estimatePixelWidth(metaDescription),
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
    multiple: $('h1').length > 1 ? 1 : 0,
  };

  results.h2Metrics = results.h2Metrics || {};
  results.h2Metrics[url] = {
    count: h2Count,
    missing: h2Count === 0 ? 1 : 0,
    tooMany: h2Count > 15 ? 1 : 0, // Arbitrary threshold, adjust as needed
  };
}

export function updateImageMetrics($, results, url) {
  const images = $('img');
  const imagesWithAlt = images.filter((i, el) => $(el).attr('alt')?.trim().length > 0);

  results.imageMetrics = results.imageMetrics || {};
  results.imageMetrics[url] = {
    total: images.length,
    missingAlt: images.length - imagesWithAlt.length,
    altTooLong: imagesWithAlt.filter((i, el) => $(el).attr('alt').length > 100).length,
  };

  global.auditcore.logger.debug(`Image metrics for ${url}: ${JSON.stringify(results.imageMetrics[url])}`);
}

export function updateLinkMetrics($, baseUrl, results, url) {
  const internalLinks = $(`a[href^="/"], a[href^="${baseUrl}"]`);
  const externalLinks = $('a').not(internalLinks);

  results.linkMetrics = results.linkMetrics || {};
  results.linkMetrics[url] = {
    internalCount: internalLinks.length,
    externalCount: externalLinks.length,
    noFollowCount: $('a[rel*="nofollow"]').length,
    emptyLinkText: $('a').filter((i, el) => $(el).text().trim().length === 0).length,
  };
}

export function updateSecurityMetrics(url, headers, results) {
  results.securityMetrics = results.securityMetrics || {};
  results.securityMetrics[url] = {
    https: url.startsWith('https') ? 1 : 0,
    hasHsts: headers['strict-transport-security'] ? 1 : 0,
    hasCsp: headers['content-security-policy'] ? 1 : 0,
    hasXFrameOptions: headers['x-frame-options'] ? 1 : 0,
    hasXContentTypeOptions: headers['x-content-type-options'] ? 1 : 0,
  };
}

export function updateHreflangMetrics($, results, url) {
  const hreflangTags = $('link[rel="alternate"][hreflang]');

  results.hreflangMetrics = results.hreflangMetrics || {};
  results.hreflangMetrics[url] = {
    count: hreflangTags.length,
    hasXDefault: hreflangTags.filter((i, el) => $(el).attr('hreflang') === 'x-default').length > 0 ? 1 : 0,
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
      hasLongParagraphs: $('p').toArray().some((p) => $(p).text().split(/\s+/).length > 300),
    };

    global.auditcore.logger.debug(`Content metrics updated for ${testUrl}: ${JSON.stringify(results.contentMetrics[testUrl])}`);
  } catch (error) {
    global.auditcore.logger.error(`[ERROR] Error updating content metrics for ${testUrl}:`, error);
    global.auditcore.logger.debug(`Error stack: ${error.stack}`);
  }

  global.auditcore.logger.debug(`[END] Updating content metrics for ${testUrl}`);
}

export function updateSpecificUrlMetrics($, results, testUrl) {
  const targetSubstring = 'main--allaboutv2--ddttom.hlx.live';
  const matches = [];

  // Helper to check and add matches
  const checkAttribute = (element, attributeName, tagName) => {
    const value = $(element).attr(attributeName);
    if (value && value.includes(targetSubstring)) {
      matches.push({
        pageUrl: testUrl,
        foundUrl: value,
        elementType: tagName,
        attribute: attributeName,
      });
    }
  };

  // Check <a> tags (href)
  $('a').each((i, el) => checkAttribute(el, 'href', 'a'));

  // Check <link> tags (href)
  $('link').each((i, el) => checkAttribute(el, 'href', 'link'));

  // Check tags with src attribute
  const srcTags = ['script', 'img', 'iframe', 'source', 'track', 'video', 'audio', 'embed', 'input'];
  srcTags.forEach((tag) => {
    $(tag).each((i, el) => checkAttribute(el, 'src', tag));
  });

  if (matches.length > 0) {
    results.specificUrlMetrics = results.specificUrlMetrics || [];
    results.specificUrlMetrics.push(...matches);
    global.auditcore.logger.info(`Found ${matches.length} occurrences of ${targetSubstring} on ${testUrl}`);
  }
}

/**
 * Aggregates external resources across all pages
 * @param {Object} pageData - Page data containing externalResources array
 * @param {Object} results - Results object to store aggregated metrics
 * @param {string} testUrl - Current page URL being processed
 */
export function updateExternalResourcesMetrics(pageData, results, testUrl) {
  global.auditcore.logger.debug(`[START] Updating external resources metrics for ${testUrl}`);

  try {
    // Initialize the aggregation object if it doesn't exist
    if (!results.externalResourcesAggregation) {
      results.externalResourcesAggregation = {};
    }

    // Get external resources from pageData
    const externalResources = pageData.allResources || pageData.externalResources || [];

    if (externalResources.length === 0) {
      global.auditcore.logger.debug(`No external resources found on ${testUrl}`);
      return;
    }

    // Aggregate resources
    externalResources.forEach((resource) => {
      const { url, type } = resource;

      if (!url) return;

      // Initialize entry for this resource URL if it doesn't exist
      if (!results.externalResourcesAggregation[url]) {
        results.externalResourcesAggregation[url] = {
          url,
          type,
          count: 0,
          pages: [],
        };
      }

      // Increment count
      results.externalResourcesAggregation[url].count += 1;

      // Track which pages use this resource (for debugging/analysis)
      if (!results.externalResourcesAggregation[url].pages.includes(testUrl)) {
        results.externalResourcesAggregation[url].pages.push(testUrl);
      }
    });

    global.auditcore.logger.info(`Aggregated ${externalResources.length} external resources from ${testUrl}`);
  } catch (error) {
    global.auditcore.logger.error(`[ERROR] Error updating external resources metrics for ${testUrl}:`, error);
  }

  global.auditcore.logger.debug(`[END] Updating external resources metrics for ${testUrl}`);
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
    overLength: 0,
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

/**
 * Update LLM readability metrics aggregation
 * @param {Object} pageData - Page data from rendering phase
 * @param {Object} results - Results object to update
 * @param {string} testUrl - URL being processed
 */
export function updateLlmReadabilityMetrics(pageData, results, testUrl) {
  if (!results.llmReadabilityAggregation) {
    results.llmReadabilityAggregation = {};
  }

  const llm = pageData.llmReadability || {};

  // Calculate structural clarity score (0-100)
  const structuralScore = calculateStructuralScore(llm);

  // Calculate content organization score (0-100)
  const organizationScore = calculateOrganizationScore(llm);

  // Calculate metadata quality score (0-100)
  const metadataScore = calculateMetadataScore(llm, pageData);

  // Calculate text extractability score (0-100)
  const extractabilityScore = calculateExtractabilityScore(llm, pageData);

  // Calculate overall LLM readability score (weighted average)
  const overallScore = Math.round(
    (structuralScore * 0.25)
    + (organizationScore * 0.25)
    + (metadataScore * 0.25)
    + (extractabilityScore * 0.25),
  );

  results.llmReadabilityAggregation[testUrl] = {
    url: testUrl,
    overallScore,
    structuralScore,
    organizationScore,
    metadataScore,
    extractabilityScore,

    // Detailed metrics
    semanticHtmlUsage: calculateSemanticHtmlUsage(llm),
    headingHierarchyQuality: calculateHeadingHierarchyQuality(llm),
    hasMainContent: llm.hasMainElement || llm.hasArticleElement,
    hasStructuredData: llm.hasJsonLd || llm.hasMicrodata,
    textToMarkupRatio: calculateTextToMarkupRatio(pageData, llm),
    hiddenContentRatio: calculateHiddenContentRatio(llm),

    // Counts
    paragraphCount: llm.paragraphs || 0,
    listCount: llm.lists?.total || 0,
    tableCount: llm.tables || 0,
    codeBlockCount: llm.codeBlocks || 0,
    totalElements: llm.totalElements || 0,
  };
}

// Helper functions for LLM readability scoring

function calculateStructuralScore(llm) {
  let score = 0;
  const semantic = llm.semanticElements || {};
  const headings = llm.headings || {};

  // Semantic HTML elements (40 points)
  if (semantic.main > 0) score += 10;
  if (semantic.article > 0) score += 10;
  if (semantic.section > 0) score += 5;
  if (semantic.header > 0) score += 5;
  if (semantic.footer > 0) score += 5;
  if (semantic.nav > 0) score += 5;

  // Proper heading hierarchy (40 points)
  if (headings.h1 === 1) score += 20; // Single h1
  if (headings.h2 > 0) score += 10; // Has h2s
  if (headings.h3 > 0) score += 5; // Has h3s
  if (headings.h4 > 0 || headings.h5 > 0 || headings.h6 > 0) score += 5;

  // Lists and tables (20 points)
  if ((llm.lists?.total || 0) > 0) score += 10;
  if (llm.tables > 0) score += 10;

  return Math.min(score, 100);
}

function calculateOrganizationScore(llm) {
  let score = 50; // Base score

  // Paragraph usage (25 points)
  const paragraphs = llm.paragraphs || 0;
  if (paragraphs > 0 && paragraphs < 100) score += 25;
  else if (paragraphs >= 100) score += 15; // Too many might be disorganized
  else score += 5; // Very few paragraphs

  // Content length (25 points)
  const textLength = llm.bodyTextLength || 0;
  if (textLength > 100 && textLength < 50000) score += 25;
  else if (textLength >= 50000) score += 15;
  else score += 5;

  return Math.min(score, 100);
}

function calculateMetadataScore(llm, pageData) {
  let score = 0;

  // Structured data (40 points)
  if (llm.hasJsonLd) score += 20;
  if (llm.hasMicrodata) score += 20;

  // OpenGraph tags (40 points)
  const og = llm.ogTags || {};
  if (og.title) score += 10;
  if (og.description) score += 10;
  if (og.image) score += 10;
  if (og.type) score += 10;

  // Meta description (20 points)
  if (pageData.metaDescription && pageData.metaDescription.length > 50) {
    score += 20;
  } else if (pageData.metaDescription) {
    score += 10;
  }

  return Math.min(score, 100);
}

function calculateExtractabilityScore(llm, pageData) {
  let score = 50; // Base score

  // Text to markup ratio (30 points)
  const ratio = parseFloat(calculateTextToMarkupRatio(pageData, llm));
  if (ratio > 10) score += 30;
  else if (ratio > 5) score += 20;
  else if (ratio > 2) score += 10;

  // Hidden content (20 points - penalize if too much)
  const hiddenRatio = parseFloat(calculateHiddenContentRatio(llm));
  if (hiddenRatio < 5) score += 20;
  else if (hiddenRatio < 10) score += 10;
  else if (hiddenRatio < 20) score += 5;

  return Math.min(score, 100);
}

function calculateSemanticHtmlUsage(llm) {
  const semantic = llm.semanticElements || {};
  const total = semantic.article + semantic.section + semantic.nav
                + semantic.header + semantic.footer + semantic.main + semantic.aside;
  if (total >= 5) return 'Excellent';
  if (total >= 3) return 'Good';
  if (total >= 1) return 'Fair';
  return 'Poor';
}

function calculateHeadingHierarchyQuality(llm) {
  const headings = llm.headings || {};
  if (headings.h1 === 1 && headings.h2 > 0) return 'Excellent';
  if (headings.h1 === 1) return 'Good';
  if (headings.h1 > 1) return 'Multiple H1s';
  if (headings.h1 === 0) return 'No H1';
  return 'Poor';
}

function calculateTextToMarkupRatio(pageData, llm) {
  const textLength = llm.bodyTextLength || 0;
  const pageSize = pageData.pageSize || 1;
  return ((textLength / pageSize) * 100).toFixed(2);
}

function calculateHiddenContentRatio(llm) {
  const hidden = llm.hiddenElements || 0;
  const total = llm.totalElements || 1;
  return ((hidden / total) * 100).toFixed(2);
}

/**
 * Update HTTP status code metrics for non-200 responses
 * Tracks all pages that don't return 200 OK status
 * @param {Object} pageData - Page data from rendering phase
 * @param {Object} results - Results object to update
 * @param {string} testUrl - URL being tested
 */
export function updateHttpStatusMetrics(pageData, results, testUrl) {
  if (!results.httpStatusAggregation) {
    results.httpStatusAggregation = {};
  }

  const statusCode = pageData.statusCode || 200;

  // Only track non-200 status codes
  if (statusCode !== 200) {
    results.httpStatusAggregation[testUrl] = {
      url: testUrl,
      statusCode,
      statusText: getStatusText(statusCode),
      timestamp: new Date().toISOString(),
    };

    global.auditcore.logger.debug(`Non-200 status code detected: ${testUrl} returned ${statusCode}`);
  }
}

/**
 * Get human-readable status text for HTTP status codes
 * @param {number} code - HTTP status code
 * @returns {string} Status text description
 */
function getStatusText(code) {
  const statusTexts = {
    // 3xx Redirects
    301: 'Moved Permanently',
    302: 'Found (Temporary Redirect)',
    303: 'See Other',
    304: 'Not Modified',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    // 4xx Client Errors
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    410: 'Gone',
    429: 'Too Many Requests',
    // 5xx Server Errors
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  return statusTexts[code] || `HTTP ${code}`;
}
