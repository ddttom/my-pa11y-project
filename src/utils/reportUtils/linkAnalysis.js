import { calculateLinkDepth } from './formatUtils.js';

/**
 * Analyze link quality
 */
export function analyzeLinkQuality(link) {
  const analysis = {
    qualityScore: 100,
    recommendations: [],
    linkDepth: calculateLinkDepth(link?.url),
    contentType: determineContentType(link),
  };

  if (!link?.text || link.text.toLowerCase().includes('click here')) {
    analysis.qualityScore -= 20;
  }

  if (link?.status >= 400) {
    analysis.qualityScore -= 50;
  }

  if (link?.redirects?.length > 1) {
    analysis.qualityScore -= 10 * link.redirects.length;
  }

  return analysis;
}

/**
 * Determine content type based on URL and response
 */
function determineContentType(link) {
  if (!link?.url) return 'link unknown';

  // If content type is explicitly provided, use that
  if (link.contentType) {
    return link.contentType;
  }

  // For successful responses (200) without extension, assume HTML
  if (link.status === 200 && !link.url.match(/\.[a-zA-Z0-9]+$/)) {
    return 'text/html';
  }

  // Try to determine from URL extension
  try {
    const url = new URL(link.url);
    const path = url.pathname.toLowerCase();
    const extension = path.split('.').pop();

    const knownTypes = {
      html: 'text/html',
      htm: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      xml: 'application/xml',
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };

    return knownTypes[extension] || 'text/html';
  } catch {
    return 'text/html';
  }
}

/**
 * Get link type based on URLs
 */
export function getLinkType(targetUrl, sourceUrl) {
  try {
    const targetDomain = new URL(targetUrl).hostname;
    const sourceDomain = new URL(sourceUrl).hostname;
    if (targetDomain === sourceDomain) {
      return targetUrl.includes('#') ? 'Internal Anchor' : 'Internal Page';
    }
    return 'External';
  } catch {
    return 'Invalid URL';
  }
}

/**
 * Check if link is in navigation
 */
export function isInNavigation(link) {
  if (!link?.context) return false;
  const context = link.context.toLowerCase();
  return context.includes('nav') || context.includes('header');
}
