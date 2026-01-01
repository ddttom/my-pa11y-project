/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
/* eslint-disable no-use-before-define */
// seoScoring.js

/**
 * Weights for different SEO factors.
 * @type {Object.<string, number>}
 */
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

/**
 * Calculates the SEO score for a given page.
 * @param {Object} pageData - The data for the page being scored.
 * @returns {Object} The SEO score and details.
 */
export function calculateSeoScore(pageData) {
  if (!pageData) {
    global.auditcore.logger.warn('pageData is undefined or null in calculateSeoScore');
    return { score: 0, details: {} };
  }
  global.auditcore.logger.info(`Calculating SEO score for ${pageData.testUrl}`);
  const {
    title, metaDescription, testUrl, h1, wordCount, internalLinks,
    images, performanceMetrics, hasResponsiveMetaTag, structuredData,
    openGraphTags, twitterTags,
  } = pageData;
  let totalScore = 0;
  let maxPossibleScore = 0;
  const details = {};
  try {
    // Ensure internalLinks is an array and get its length, or default to 0
    const internalLinksCount = Array.isArray(internalLinks) ? internalLinks.length : 0;

    // Ensure openGraphTags is an object
    const openGraphTagsObj = typeof openGraphTags === 'object' && openGraphTags !== null ? openGraphTags : {};

    const scoringFunctions = [
      { name: 'titleOptimization', func: scoreTitleOptimization, param: title },
      { name: 'metaDescriptionOptimization', func: scoreMetaDescription, param: metaDescription },
      { name: 'urlStructure', func: scoreUrlStructure, param: testUrl },
      { name: 'h1Optimization', func: scoreH1Optimization, param: h1 },
      { name: 'contentLength', func: scoreContentLength, param: wordCount },
      { name: 'contentQuality', func: scoreContentQuality, param: pageData },
      { name: 'internalLinking', func: scoreInternalLinking, param: internalLinksCount },
      { name: 'imageOptimization', func: scoreImageOptimization, param: images },
      { name: 'pageSpeed', func: scorePageSpeed, param: performanceMetrics },
      { name: 'mobileOptimization', func: scoreMobileOptimization, param: hasResponsiveMetaTag },
      { name: 'securityFactors', func: scoreSecurityFactors, param: testUrl },
      { name: 'structuredData', func: scoreStructuredData, param: structuredData },
      { name: 'socialMediaTags', func: scoreSocialMediaTags, param: { openGraphTags: openGraphTagsObj, twitterTags } },
    ];
    scoringFunctions.forEach(({ name, func, param }) => {
      try {
        details[name] = func(param);
        totalScore += details[name] * SEO_WEIGHTS[name];
        maxPossibleScore += SEO_WEIGHTS[name];
      } catch (error) {
        global.auditcore.logger.error(`Error in ${name} scoring: ${error.message}`);
        details[name] = 0;
        maxPossibleScore += SEO_WEIGHTS[name];
      }
    });
    const finalScore = (totalScore / maxPossibleScore) * 100;
    global.auditcore.logger.info(`SEO score calculated for ${testUrl}: ${finalScore.toFixed(2)}`);
    return {
      score: Math.round(finalScore),
      details,
    };
  } catch (error) {
    global.auditcore.logger.error(`Error calculating SEO score for ${testUrl}:`, error);
    return { score: 0, details: {}, error: error.message };
  }
}
/**
 * Validates the input for scoring functions.
 * @param {*} value - The value to validate.
 * @param {string} name - The name of the value for error reporting.
 * @param {string} type - The expected type of the value.
 * @throws {Error} If the input is invalid.
 */
function validateInput(value, name, type) {
  if (value === undefined || value === null) {
    throw new Error(`${name} is required`);
  }

  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        throw new Error(`${name} must be a string`);
      }
      break;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new Error(`${name} must be a valid number`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error(`${name} must be a boolean`);
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        throw new Error(`${name} must be an array`);
      }
      break;
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`${name} must be an object`);
      }
      break;
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}

/**
 * Scores the title optimization.
 * @param {string} title - The page title.
 * @returns {number} The title optimization score.
 */
function scoreTitleOptimization(title) {
  try {
    validateInput(title, 'title', 'string');
    const score = scoreRange(title.length, 30, 60);
    global.auditcore.logger.debug(`Title optimization score: ${score.toFixed(2)}. Title length: ${title.length}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreTitleOptimization');
  }
}

/**
 * Scores the meta description.
 * @param {string} metaDescription - The meta description.
 * @returns {number} The meta description score.
 */
function scoreMetaDescription(metaDescription) {
  try {
    validateInput(metaDescription, 'metaDescription', 'string');
    const score = scoreRange(metaDescription.length, 70, 155);
    global.auditcore.logger.debug(`Meta description score: ${score.toFixed(2)}. Length: ${metaDescription.length}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreMetaDescription');
  }
}

/**
 * Scores the URL structure.
 * @param {string} url - The URL to score.
 * @returns {number} The URL structure score.
 */
function scoreUrlStructure(url) {
  try {
    validateInput(url, 'url', 'string');
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
    global.auditcore.logger.debug(`URL structure score: ${score.toFixed(2)}. Issues: ${issues.join(', ') || 'None'}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreUrlStructure');
  }
}

/**
 * Scores the H1 optimization.
 * @param {string} h1 - The H1 heading.
 * @returns {number} The H1 optimization score.
 */
function scoreH1Optimization(h1) {
  try {
    validateInput(h1, 'h1', 'string');
    const score = h1.length > 0 && h1.length <= 70 ? 1 : 0.5;
    global.auditcore.logger.debug(`H1 optimization score: ${score.toFixed(2)}. H1 length: ${h1.length}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreH1Optimization');
  }
}

/**
 * Scores the content length.
 * @param {number} wordCount - The word count of the content.
 * @returns {number} The content length score.
 */
function scoreContentLength(wordCount) {
  try {
    validateInput(wordCount, 'wordCount', 'number');
    const score = scoreRange(wordCount, 300, 1500);
    global.auditcore.logger.debug(`Content length score: ${score.toFixed(2)}. Word count: ${wordCount}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreContentLength');
  }
}

/**
 * Scores the content quality.
 * @param {Object} pageData - The page data.
 * @returns {number} The content quality score.
 */
function scoreContentQuality(pageData) {
  try {
    validateInput(pageData, 'pageData', 'object');
    let score = 0;
    const issues = [];

    const keyword = extractMainKeyword(pageData.title, pageData.metaDescription, pageData.h1);
    if (keyword) {
      if (pageData.title && pageData.title.toLowerCase().includes(keyword)) score += 0.2;
      if (pageData.metaDescription && pageData.metaDescription.toLowerCase().includes(keyword)) score += 0.2;
      if (pageData.h1 && pageData.h1.toLowerCase().includes(keyword)) score += 0.2;
    } else {
      issues.push('No clear main keyword identified');
    }

    if (pageData.h2Count > 0) score += 0.1;
    if (pageData.h3Count > 0) score += 0.1;
    if (pageData.images && pageData.images.length > 0) score += 0.1;
    if (pageData.externalLinks && pageData.externalLinks.length > 0) score += 0.1;

    if (pageData.wordCount < 300) {
      score -= 0.2;
      issues.push('Low word count');
    }

    score = Math.min(1, Math.max(0, score));
    global.auditcore.logger.debug(`Content quality score: ${score.toFixed(2)}. Issues: ${issues.join(', ') || 'None'}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreContentQuality');
  }
}

/**
 * Extracts the main keyword from title, meta description, and H1.
 * @param {string} title - The page title.
 * @param {string} metaDescription - The meta description.
 * @param {string} h1 - The H1 heading.
 * @returns {string|null} The main keyword or null if not found.
 */
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

/**
 * Scores the internal linking.
 * @param {number} internalLinksCount - The number of internal links.
 * @returns {number} The internal linking score.
 */
function scoreInternalLinking(internalLinksCount) {
  try {
    validateInput(internalLinksCount, 'internalLinksCount', 'number');
    const score = scoreRange(internalLinksCount, 2, 20);
    global.auditcore.logger.debug(`Internal linking score: ${score.toFixed(2)}. Internal links count: ${internalLinksCount}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreInternalLinking');
  }
}

/**
 * Scores the image optimization.
 * @param {Array} images - The images on the page.
 * @returns {number} The image optimization score.
 */
function scoreImageOptimization(images) {
  try {
    validateInput(images, 'images', 'array');
    if (images.length === 0) {
      global.auditcore.logger.debug('Image optimization score: 0. No images found.');
      return 0;
    }
    const imagesWithAlt = images.filter((img) => img.alt).length;
    const score = imagesWithAlt / images.length;
    global.auditcore.logger.debug(`Image optimization score: ${score.toFixed(2)}. Images with alt text: ${imagesWithAlt}/${images.length}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreImageOptimization');
  }
}

/**
 * Scores the page speed.
 * @param {Object} performanceMetrics - The performance metrics of the page.
 * @returns {number} The page speed score.
 */
function scorePageSpeed(performanceMetrics) {
  try {
    validateInput(performanceMetrics, 'performanceMetrics', 'object');
    if (typeof performanceMetrics.loadTime !== 'number') {
      throw new Error('performanceMetrics.loadTime must be a number');
    }
    const score = scoreRange(performanceMetrics.loadTime, 5000, 1000, true);
    global.auditcore.logger.debug(`Page speed score: ${score.toFixed(2)}. Load time: ${performanceMetrics.loadTime}ms`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scorePageSpeed');
  }
}

/**
 * Scores the mobile optimization.
 * @param {boolean} hasResponsiveMetaTag - Whether the page has a responsive meta tag.
 * @returns {number} The mobile optimization score.
 */
function scoreMobileOptimization(hasResponsiveMetaTag) {
  try {
    validateInput(hasResponsiveMetaTag, 'hasResponsiveMetaTag', 'boolean');
    const score = hasResponsiveMetaTag ? 1 : 0;
    global.auditcore.logger.debug(`Mobile optimization score: ${score.toFixed(2)}. Has responsive meta tag: ${hasResponsiveMetaTag}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreMobileOptimization');
  }
}

/**
 * Scores the security factors.
 * @param {string} url - The URL of the page.
 * @returns {number} The security factors score.
 */
function scoreSecurityFactors(url) {
  try {
    validateInput(url, 'url', 'string');
    const score = url.startsWith('https') ? 1 : 0;
    global.auditcore.logger.debug(`Security factors score: ${score.toFixed(2)}. Uses HTTPS: ${score === 1}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreSecurityFactors');
  }
}

/**
 * Scores the structured data.
 * @param {Array} structuredData - The structured data on the page.
 * @returns {number} The structured data score.
 */
function scoreStructuredData(structuredData) {
  try {
    validateInput(structuredData, 'structuredData', 'array');
    const score = structuredData.length > 0 ? 1 : 0;
    global.auditcore.logger.debug(`Structured data score: ${score.toFixed(2)}. Has structured data: ${score === 1}`);
    return score;
  } catch (error) {
    return handleScoringError(error, 'scoreStructuredData');
  }
}

/**
 * Scores the social media tags.
 * @param {Object} param0 - Object containing openGraphTags and twitterTags.
 * @param {Object} param0.openGraphTags - The Open Graph tags.
 * @param {Object} param0.twitterTags - The Twitter Card tags.
 * @returns {number} The social media tags score.
 */
function scoreSocialMediaTags({ openGraphTags, twitterTags }) {
  try {
    const effectiveOpenGraphTags = (typeof openGraphTags === 'object' && openGraphTags !== null) ? openGraphTags : {};
    const effectiveTwitterTags = (typeof twitterTags === 'object' && twitterTags !== null) ? twitterTags : {};

    const hasOpenGraph = Object.keys(effectiveOpenGraphTags).length > 0;
    const hasTwitterCard = Object.keys(effectiveTwitterTags).length > 0;
    const score = (hasOpenGraph || hasTwitterCard) ? 1 : 0;
    global.auditcore.logger.debug(`Social media tags score: ${score.toFixed(2)}. Has Open Graph: ${hasOpenGraph}, Has Twitter Card: ${hasTwitterCard}`);
    return score;
  } catch (error) {
    global.auditcore.logger.error(`Error in scoreSocialMediaTags: ${error.message}`);
    return 0;
  }
}

/**
 * Scores a value within a range.
 * @param {number} value - The value to score.
 * @param {number} min - The minimum value of the range.
 * @param {number} max - The maximum value of the range.
 * @param {boolean} [inverse=false] - Whether to invert the score.
 * @returns {number} The calculated score.
 */
function scoreRange(value, min, max, inverse = false) {
  if (inverse) {
    return value <= min ? 1 : value >= max ? 0 : (max - value) / (max - min);
  }
  return value >= max ? 1 : value <= min ? 0 : (value - min) / (max - min);
}

/**
 * Handles errors in scoring functions.
 * @param {Error} error - The error that occurred.
 * @param {string} functionName - The name of the function where the error occurred.
 * @returns {number} A default score of 0.
 */
function handleScoringError(error, functionName) {
  global.auditcore.logger.error(`Error in ${functionName}: ${error.message}`);
  return 0;
}

// Export all scoring functions for use in tests or other modules
export {
  scoreTitleOptimization,
  scoreMetaDescription,
  scoreUrlStructure,
  scoreH1Optimization,
  scoreContentLength,
  scoreContentQuality,
  scoreInternalLinking,
  scoreImageOptimization,
  scorePageSpeed,
  scoreMobileOptimization,
  scoreSecurityFactors,
  scoreStructuredData,
  scoreSocialMediaTags,
};
