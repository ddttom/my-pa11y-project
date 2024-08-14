/* eslint-disable max-len */
/* eslint-disable no-use-before-define */
/* eslint-disable no-nested-ternary */
/* eslint-disable import/extensions */
// seoScoring.js

const SEO_WEIGHTS = {
  titleOptimization: 10,
  metaDescriptionOptimization: 8,
  urlStructure: 7,
  h1Optimization: 6,
  contentLength: 8,
  contentQuality: 9,
  internalLinking: 7,
  imageOptimization: 6,
  pageSpeed: 9,
  mobileOptimization: 8,
  securityFactors: 7,
  structuredData: 6,
  socialMediaTags: 5,
};

export function calculateSeoScore(pageData, logger) {
  if (!pageData) {
    logger.warn('pageData is undefined or null in calculateSeoScore');
    return { score: 0, details: {} };
  }

  logger.info(`Calculating SEO score for ${pageData.url}`);

  let totalScore = 0;
  let maxPossibleScore = 0;
  const details = {};

  try {
    // Title optimization
    details.titleOptimization = scoreTitleOptimization(pageData.title, logger);
    totalScore += details.titleOptimization * SEO_WEIGHTS.titleOptimization;
    maxPossibleScore += SEO_WEIGHTS.titleOptimization;

    // Meta description optimization
    details.metaDescriptionOptimization = scoreMetaDescription(pageData.metaDescription, logger);
    totalScore += details.metaDescriptionOptimization * SEO_WEIGHTS.metaDescriptionOptimization;
    maxPossibleScore += SEO_WEIGHTS.metaDescriptionOptimization;

    // URL structure
    details.urlStructure = scoreUrlStructure(pageData.url, logger);
    totalScore += details.urlStructure * SEO_WEIGHTS.urlStructure;
    maxPossibleScore += SEO_WEIGHTS.urlStructure;

    // H1 optimization
    details.h1Optimization = scoreH1Optimization(pageData.h1, logger);
    totalScore += details.h1Optimization * SEO_WEIGHTS.h1Optimization;
    maxPossibleScore += SEO_WEIGHTS.h1Optimization;

    // Content length and quality
    details.contentLength = scoreContentLength(pageData.wordCount, logger);
    totalScore += details.contentLength * SEO_WEIGHTS.contentLength;
    maxPossibleScore += SEO_WEIGHTS.contentLength;

    details.contentQuality = scoreContentQuality(pageData, logger);
    totalScore += details.contentQuality * SEO_WEIGHTS.contentQuality;
    maxPossibleScore += SEO_WEIGHTS.contentQuality;

    // Internal linking
    details.internalLinking = scoreInternalLinking(pageData.internalLinks ? pageData.internalLinks.length : 0, logger);
    totalScore += details.internalLinking * SEO_WEIGHTS.internalLinking;
    maxPossibleScore += SEO_WEIGHTS.internalLinking;

    // Image optimization
    details.imageOptimization = scoreImageOptimization(pageData.images, logger);
    totalScore += details.imageOptimization * SEO_WEIGHTS.imageOptimization;
    maxPossibleScore += SEO_WEIGHTS.imageOptimization;

    // Page speed
    details.pageSpeed = pageData.performanceMetrics ? scoreRange(pageData.performanceMetrics.loadTime, 5000, 1000, true) : 0;
    totalScore += details.pageSpeed * SEO_WEIGHTS.pageSpeed;
    maxPossibleScore += SEO_WEIGHTS.pageSpeed;
    logger.debug(`Page speed score: ${details.pageSpeed.toFixed(2)}`);

    // Mobile optimization
    details.mobileOptimization = scoreMobileOptimization(pageData.hasResponsiveMetaTag, logger);
    totalScore += details.mobileOptimization * SEO_WEIGHTS.mobileOptimization;
    maxPossibleScore += SEO_WEIGHTS.mobileOptimization;

    // Security factors
    details.securityFactors = scoreSecurityFactors(pageData.url, logger);
    totalScore += details.securityFactors * SEO_WEIGHTS.securityFactors;
    maxPossibleScore += SEO_WEIGHTS.securityFactors;

    // Structured data
    details.structuredData = scoreStructuredData(pageData.structuredData, logger);
    totalScore += details.structuredData * SEO_WEIGHTS.structuredData;
    maxPossibleScore += SEO_WEIGHTS.structuredData;

    // Social media tags
    details.socialMediaTags = scoreSocialMediaTags(pageData.openGraphTags, pageData.twitterTags, logger);
    totalScore += details.socialMediaTags * SEO_WEIGHTS.socialMediaTags;
    maxPossibleScore += SEO_WEIGHTS.socialMediaTags;

    // Calculate final score as a percentage
    const finalScore = (totalScore / maxPossibleScore) * 100;

    logger.info(`SEO score calculated for ${pageData.url}: ${finalScore.toFixed(2)}`);
    return {
      score: Math.round(finalScore),
      details,
    };
  } catch (error) {
    logger.error(`Error calculating SEO score for ${pageData.url}:`, error);
    return { score: 0, details: {}, error: error.message };
  }
}

function scoreTitleOptimization(title, logger) {
  const score = title ? scoreRange(title.length, 30, 60) : 0;
  logger.debug(`Title optimization score: ${score.toFixed(2)}. Title length: ${title ? title.length : 'N/A'}`);
  return score;
}

function scoreMetaDescription(metaDescription, logger) {
  const score = metaDescription ? scoreRange(metaDescription.length, 70, 155) : 0;
  logger.debug(`Meta description score: ${score.toFixed(2)}. Length: ${metaDescription ? metaDescription.length : 'N/A'}`);
  return score;
}

function scoreUrlStructure(url, logger) {
  if (!url) return 0;
  let score = 1;
  const issues = [];

  if (url.includes('_')) {
    score -= 0.2;
    issues.push('Contains underscores');
  }
  if (url.toLowerCase() !== url) {
    score -= 0.2;
    issues.push('Contains uppercase letters');
  }
  if (/\d/.test(url)) {
    score -= 0.1;
    issues.push('Contains numbers');
  }
  const segments = url.split('/');
  if (segments.some((segment) => segment.length > 20)) {
    score -= 0.2;
    issues.push('Contains long segments (>20 characters)');
  }
  if (url.includes('?') || url.includes('&')) {
    score -= 0.2;
    issues.push('Contains query parameters');
  }
  if (segments.length > 4) {
    score -= 0.1;
    issues.push('Deep URL structure (>4 levels)');
  }
  if (!/^[a-z0-9-.]+$/.test(url.replace(/^https?:\/\//, ''))) {
    score -= 0.2;
    issues.push('Contains special characters other than hyphens');
  }
  score = Math.max(0, score);
  logger.debug(`URL structure score: ${score.toFixed(2)}. Issues: ${issues.join(', ') || 'None'}`);
  return score;
}

function scoreH1Optimization(h1, logger) {
  const score = h1 && h1.length > 0 && h1.length <= 70 ? 1 : 0.5;
  logger.debug(`H1 optimization score: ${score.toFixed(2)}. H1 length: ${h1 ? h1.length : 'N/A'}`);
  return score;
}

function scoreContentLength(wordCount, logger) {
  const score = wordCount ? scoreRange(wordCount, 300, 1500) : 0;
  logger.debug(`Content length score: ${score.toFixed(2)}. Word count: ${wordCount || 'N/A'}`);
  return score;
}

function scoreContentQuality(pageData, logger) {
  let score = 0;
  const issues = [];

  // Check for keyword presence in title, meta description, and h1
  const keyword = extractMainKeyword(pageData.title, pageData.metaDescription, pageData.h1);
  if (keyword) {
    if (pageData.title && pageData.title.toLowerCase().includes(keyword)) score += 0.2;
    if (pageData.metaDescription && pageData.metaDescription.toLowerCase().includes(keyword)) score += 0.2;
    if (pageData.h1 && pageData.h1.toLowerCase().includes(keyword)) score += 0.2;
  } else {
    issues.push('No clear main keyword identified');
  }

  // Check for presence of subheadings
  if (pageData.h2Count > 0) score += 0.1;
  if (pageData.h3Count > 0) score += 0.1;

  // Check for presence of images
  if (pageData.images && pageData.images.length > 0) score += 0.1;

  // Check for outbound links
  if (pageData.externalLinks && pageData.externalLinks.length > 0) score += 0.1;

  // Penalize for low word count
  if (pageData.wordCount < 300) {
    score -= 0.2;
    issues.push('Low word count');
  }

  score = Math.min(1, Math.max(0, score));
  logger.debug(`Content quality score: ${score.toFixed(2)}. Issues: ${issues.join(', ') || 'None'}`);
  return score;
}

function extractMainKeyword(title, metaDescription, h1) {
  const allText = `${title} ${metaDescription} ${h1}`.toLowerCase();
  const words = allText.match(/\b\w+\b/g) || [];
  const wordFrequency = {};
  words.forEach((word) => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  const sortedWords = Object.entries(wordFrequency).sort((a, b) => b[1] - a[1]);
  return sortedWords[0] ? sortedWords[0][0] : null;
}

function scoreInternalLinking(internalLinksCount, logger) {
  const score = scoreRange(internalLinksCount, 2, 20);
  logger.debug(`Internal linking score: ${score.toFixed(2)}. Internal links count: ${internalLinksCount}`);
  return score;
}

function scoreImageOptimization(images, logger) {
  if (!images || images.length === 0) {
    logger.debug('Image optimization score: 0. No images found.');
    return 0;
  }
  const imagesWithAlt = images.filter((img) => img.alt).length;
  const score = imagesWithAlt / images.length;
  logger.debug(`Image optimization score: ${score.toFixed(2)}. Images with alt text: ${imagesWithAlt}/${images.length}`);
  return score;
}

function scoreMobileOptimization(hasResponsiveMetaTag, logger) {
  const score = hasResponsiveMetaTag ? 1 : 0;
  logger.debug(`Mobile optimization score: ${score.toFixed(2)}. Has responsive meta tag: ${hasResponsiveMetaTag}`);
  return score;
}

function scoreSecurityFactors(url, logger) {
  const score = url && url.startsWith('https') ? 1 : 0;
  logger.debug(`Security factors score: ${score.toFixed(2)}. Uses HTTPS: ${score === 1}`);
  return score;
}

function scoreStructuredData(structuredData, logger) {
  const score = structuredData && structuredData.length > 0 ? 1 : 0;
  logger.debug(`Structured data score: ${score.toFixed(2)}. Has structured data: ${score === 1}`);
  return score;
}

function scoreSocialMediaTags(openGraphTags, twitterTags, logger) {
  const hasOpenGraph = openGraphTags && Object.keys(openGraphTags).length > 0;
  const hasTwitterCard = twitterTags && Object.keys(twitterTags).length > 0;
  const score = (hasOpenGraph || hasTwitterCard) ? 1 : 0;
  logger.debug(`Social media tags score: ${score.toFixed(2)}. Has Open Graph: ${hasOpenGraph}, Has Twitter Card: ${hasTwitterCard}`);
  return score;
}

export function scoreRange(value, min, max, inverse = false) {
  if (inverse) {
    return value <= min ? 1 : value >= max ? 0 : (max - value) / (max - min);
  }
  return value >= max ? 1 : value <= min ? 0 : (value - min) / (max - min);
}
