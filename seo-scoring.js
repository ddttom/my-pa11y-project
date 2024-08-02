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
    mobileOptimization: 8,
    securityFactors: 7,
    structuredData: 6,
    socialMediaTags: 5
  };
  
  /**
   * Calculate the SEO score for a given page
   * @param {Object} pageData - The data extracted from the page
   * @returns {Object} The SEO score and detailed breakdown
   */
  export function calculateSeoScore(pageData) {
    let totalScore = 0;
    let maxPossibleScore = 0;
  
    // Title optimization
    const titleLength = pageData.title ? pageData.title.length : 0;
    const titleScore = scoreRange(titleLength, 30, 60);
    totalScore += titleScore * SEO_WEIGHTS.titleOptimization;
    maxPossibleScore += SEO_WEIGHTS.titleOptimization;
  
    // Meta description optimization
    const metaDescLength = pageData.metaDescription ? pageData.metaDescription.length : 0;
    const metaDescScore = scoreRange(metaDescLength, 70, 155);
    totalScore += metaDescScore * SEO_WEIGHTS.metaDescriptionOptimization;
    maxPossibleScore += SEO_WEIGHTS.metaDescriptionOptimization;
  
    // URL structure
    const urlScore = pageData.url.includes('_') ? 0 : 1;
    totalScore += urlScore * SEO_WEIGHTS.urlStructure;
    maxPossibleScore += SEO_WEIGHTS.urlStructure;
  
    // H1 optimization
    const h1Count = pageData.headings ? pageData.headings.h1 : 0;
    const h1Score = h1Count === 1 ? 1 : 0;
    totalScore += h1Score * SEO_WEIGHTS.h1Optimization;
    maxPossibleScore += SEO_WEIGHTS.h1Optimization;
  
    // Content length
    const wordCount = pageData.wordCount || 0;
    const contentScore = scoreRange(wordCount, 300, 1500);
    totalScore += contentScore * SEO_WEIGHTS.contentLength;
    maxPossibleScore += SEO_WEIGHTS.contentLength;
  
    // Internal linking
    const internalLinksCount = pageData.internalLinks ? pageData.internalLinks.length : 0;
    const internalLinkScore = scoreRange(internalLinksCount, 2, 20);
    totalScore += internalLinkScore * SEO_WEIGHTS.internalLinking;
    maxPossibleScore += SEO_WEIGHTS.internalLinking;
  
    // Image optimization
    const imagesWithAlt = pageData.images ? pageData.images.filter(img => img.alt).length : 0;
    const totalImages = pageData.images ? pageData.images.length : 0;
    const imageScore = totalImages > 0 ? imagesWithAlt / totalImages : 0;
    totalScore += imageScore * SEO_WEIGHTS.imageOptimization;
    maxPossibleScore += SEO_WEIGHTS.imageOptimization;
  
    // Page speed
    let pageSpeedScore = 0;
    if (pageData.performanceMetrics && pageData.performanceMetrics.loadTime) {
      pageSpeedScore = scoreRange(pageData.performanceMetrics.loadTime, 5000, 1000, true);
    }
    totalScore += pageSpeedScore * SEO_WEIGHTS.pageSpeed;
    maxPossibleScore += SEO_WEIGHTS.pageSpeed;
  
    // Mobile optimization
    const mobileScore = pageData.hasResponsiveMetaTag ? 1 : 0;
    totalScore += mobileScore * SEO_WEIGHTS.mobileOptimization;
    maxPossibleScore += SEO_WEIGHTS.mobileOptimization;
  
    // Security factors
    const securityScore = pageData.url.startsWith('https') ? 1 : 0;
    totalScore += securityScore * SEO_WEIGHTS.securityFactors;
    maxPossibleScore += SEO_WEIGHTS.securityFactors;
  
    // Structured data
    const structuredDataScore = pageData.structuredData && pageData.structuredData.length > 0 ? 1 : 0;
    totalScore += structuredDataScore * SEO_WEIGHTS.structuredData;
    maxPossibleScore += SEO_WEIGHTS.structuredData;
  
    // Social media tags
    const hasOpenGraph = pageData.openGraphTags && Object.keys(pageData.openGraphTags).length > 0;
    const hasTwitterCard = pageData.twitterTags && Object.keys(pageData.twitterTags).length > 0;
    const socialScore = (hasOpenGraph || hasTwitterCard) ? 1 : 0;
    totalScore += socialScore * SEO_WEIGHTS.socialMediaTags;
    maxPossibleScore += SEO_WEIGHTS.socialMediaTags;
  
    // Calculate final score as a percentage
    const finalScore = (totalScore / maxPossibleScore) * 100;
  
    return {
      score: Math.round(finalScore),
      maxScore: 100,
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
        socialMediaTags: socialScore
      }
    };
  }
  
  // Helper functions for individual scoring components
  
  function scoreTitleOptimization(title) {
    if (!title) return 0;
    const length = title.length;
    return scoreRange(length, 30, 60);
  }
  
  function scoreMetaDescription(metaDescription) {
    if (!metaDescription) return 0;
    const length = metaDescription.length;
    return scoreRange(length, 70, 155);
  }
  
  function scoreUrlStructure(url) {
    return url.includes('_') ? 0 : 1;
  }
  
  function scoreH1Optimization(h1) {
    return h1 ? 1 : 0;
  }
  
  function scoreContentLength(wordCount) {
    return scoreRange(wordCount, 300, 1500);
  }
  
  function scoreInternalLinking(internalLinksCount) {
    return scoreRange(internalLinksCount, 2, 20);
  }
  
  function scoreImageOptimization(images) {
    if (!images || images.length === 0) return 0;
    const imagesWithAlt = images.filter(img => img.alt).length;
    return imagesWithAlt / images.length;
  }
  
  function scoreMobileOptimization(hasResponsiveMetaTag) {
    return hasResponsiveMetaTag ? 1 : 0;
  }
  
  function scoreSecurityFactors(url) {
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
  function scoreRange(value, min, max, inverse = false) {
    if (inverse) {
      return value <= min ? 1 : value >= max ? 0 : (max - value) / (max - min);
    } else {
      return value >= max ? 1 : value <= min ? 0 : (value - min) / (max - min);
    }
  }