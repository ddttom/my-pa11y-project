/* eslint-disable no-console */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
/* eslint-disable no-use-before-define */
// seo-scoring.js

// Define weights for different SEO factors
const SEO_WEIGHTS = {
  titleOptimization: 10,
  metaDescriptionOptimization: 8,
  urlStructure: 7,
  h1Optimization: 6,
  contentLength: 8,
  internalLinking: 7,
  imageOptimization: 6,
  pageSpeed: 9,
  mobileOptimization: 8,
  securityFactors: 7,
  structuredData: 6,
  socialMediaTags: 5,
};

/**
 * Calculate the SEO score for a given page
 * @param {Object} pageData - The data extracted from the page
 * @returns {Object} The SEO score and detailed breakdown
 */
export function calculateSeoScore(pageData) {
  if (!pageData) {
    console.warn('pageData is undefined or null in calculateSeoScore');
    return { score: 0, details: {} };
  }

  let totalScore = 0;
  let maxPossibleScore = 0;

  // Title optimization
  const titleScore = scoreTitleOptimization(pageData.title);
  totalScore += titleScore * SEO_WEIGHTS.titleOptimization;
  maxPossibleScore += SEO_WEIGHTS.titleOptimization;

  // Meta description optimization
  const metaDescScore = scoreMetaDescription(pageData.metaDescription);
  totalScore += metaDescScore * SEO_WEIGHTS.metaDescriptionOptimization;
  maxPossibleScore += SEO_WEIGHTS.metaDescriptionOptimization;

  // URL structure
  const urlScore = scoreUrlStructure(pageData.url);
  totalScore += urlScore * SEO_WEIGHTS.urlStructure;
  maxPossibleScore += SEO_WEIGHTS.urlStructure;

  // H1 optimization
  const h1Score = scoreH1Optimization(pageData.h1);
  totalScore += h1Score * SEO_WEIGHTS.h1Optimization;
  maxPossibleScore += SEO_WEIGHTS.h1Optimization;

  // Content length
  const contentScore = scoreContentLength(pageData.wordCount);
  totalScore += contentScore * SEO_WEIGHTS.contentLength;
  maxPossibleScore += SEO_WEIGHTS.contentLength;

  // Internal linking
  const internalLinkScore = scoreInternalLinking(pageData.internalLinks ? pageData.internalLinks.length : 0);
  totalScore += internalLinkScore * SEO_WEIGHTS.internalLinking;
  maxPossibleScore += SEO_WEIGHTS.internalLinking;

  // Image optimization
  const imageScore = scoreImageOptimization(pageData.images);
  totalScore += imageScore * SEO_WEIGHTS.imageOptimization;
  maxPossibleScore += SEO_WEIGHTS.imageOptimization;

  // Page speed
  const pageSpeedScore = pageData.performanceMetrics ? scoreRange(pageData.performanceMetrics.loadTime, 5000, 1000, true) : 0;
  totalScore += pageSpeedScore * SEO_WEIGHTS.pageSpeed;
  maxPossibleScore += SEO_WEIGHTS.pageSpeed;

  // Mobile optimization
  const mobileScore = scoreMobileOptimization(pageData.hasResponsiveMetaTag);
  totalScore += mobileScore * SEO_WEIGHTS.mobileOptimization;
  maxPossibleScore += SEO_WEIGHTS.mobileOptimization;

  // Security factors
  const securityScore = scoreSecurityFactors(pageData.url);
  totalScore += securityScore * SEO_WEIGHTS.securityFactors;
  maxPossibleScore += SEO_WEIGHTS.securityFactors;

  // Structured data
  const structuredDataScore = scoreStructuredData(pageData.structuredData);
  totalScore += structuredDataScore * SEO_WEIGHTS.structuredData;
  maxPossibleScore += SEO_WEIGHTS.structuredData;

  // Social media tags
  const socialScore = scoreSocialMediaTags(pageData.openGraphTags, pageData.twitterTags);
  totalScore += socialScore * SEO_WEIGHTS.socialMediaTags;
  maxPossibleScore += SEO_WEIGHTS.socialMediaTags;

  // Calculate final score as a percentage
  const finalScore = (totalScore / maxPossibleScore) * 100;

  return {
    score: Math.round(finalScore),
    details: {
      titleOptimization: titleScore,
      metaDescriptionOptimization: metaDescScore,
      urlStructure: urlScore,
      h1Optimization: h1Score,
      contentLength: contentScore,
      internalLinking: internalLinkScore,
      imageOptimization: imageScore,
      pageSpeed: pageSpeedScore,
      mobileOptimization: mobileScore,
      securityFactors: securityScore,
      structuredData: structuredDataScore,
      socialMediaTags: socialScore,
    },
  };
}

// Helper functions for individual scoring components

function scoreTitleOptimization(title) {
  if (!title) return 0;
  return scoreRange(title.length, 30, 60);
}

function scoreMetaDescription(metaDescription) {
  if (!metaDescription) return 0;
  return scoreRange(metaDescription.length, 70, 155);
}

function scoreUrlStructure(url) {
  if (!url) return 0;
  let score = 1;
  if (url.includes('_')) score -= 0.2;
  if (url.toLowerCase() !== url) score -= 0.2;
  if (/\d/.test(url)) score -= 0.1;
  const segments = url.split('/');
  if (segments.some((segment) => segment.length > 20)) score -= 0.2;
  return Math.max(0, score);
}

function scoreH1Optimization(h1) {
  if (!h1) return 0;
  return h1.length > 0 && h1.length <= 70 ? 1 : 0.5;
}

function scoreContentLength(wordCount) {
  if (!wordCount) return 0;
  return scoreRange(wordCount, 300, 1500);
}

function scoreInternalLinking(internalLinksCount) {
  return scoreRange(internalLinksCount, 2, 20);
}

function scoreImageOptimization(images) {
  if (!images || images.length === 0) return 0;
  const imagesWithAlt = images.filter((img) => img.alt).length;
  return imagesWithAlt / images.length;
}

function scoreMobileOptimization(hasResponsiveMetaTag) {
  return hasResponsiveMetaTag ? 1 : 0;
}

function scoreSecurityFactors(url) {
  if (!url) return 0;
  return url.startsWith('https') ? 1 : 0;
}

function scoreStructuredData(structuredData) {
  return structuredData && structuredData.length > 0 ? 1 : 0;
}

function scoreSocialMediaTags(openGraphTags, twitterTags) {
  const hasOpenGraph = openGraphTags && Object.keys(openGraphTags).length > 0;
  const hasTwitterCard = twitterTags && Object.keys(twitterTags).length > 0;
  return (hasOpenGraph || hasTwitterCard) ? 1 : 0;
}

// Helper function to score a value within a range
export function scoreRange(value, min, max, inverse = false) {
  if (inverse) {
    return value <= min ? 1 : value >= max ? 0 : (max - value) / (max - min);
  }
  return value >= max ? 1 : value <= min ? 0 : (value - min) / (max - min);
}
