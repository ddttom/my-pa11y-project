import { calculateLinkDepth } from './formatUtils.js';

/**
 * Analyze link quality
 */
export function analyzeLinkQuality(link) {
  const analysis = {
    qualityScore: 100,
    recommendations: [],
    linkDepth: calculateLinkDepth(link?.url)
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
