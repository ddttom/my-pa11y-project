/**
 * Analyze heading structure
 */
export function analyzeHeadingStructure(headings) {
  if (!headings || typeof headings !== 'object') {
    global.auditcore.logger.debug('Invalid headings data for analysis');
    return 0;
  }

  let score = 100;

  // Check for H1
  if (!headings.h1Count) {
    score -= 30;
  } else if (headings.h1Count > 1) {
    score -= 15;
  }

  // Check heading hierarchy
  if (headings.h2Count && !headings.h1Count) score -= 20;
  if (headings.h3Count && !headings.h2Count) score -= 15;
  if (headings.h4Count && !headings.h3Count) score -= 10;

  // Check for excessive headings
  if (headings.h2Count > 10) score -= 10;
  if (headings.h3Count > 15) score -= 10;

  return Math.max(0, score);
}

/**
 * Calculate content freshness score
 */
export function calculateFreshnessScore(lastmod) {
  if (!lastmod) return 0;

  const now = new Date();
  const modDate = new Date(lastmod);
  const daysSinceUpdate = (now - modDate) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate <= 7) return 100; // Last week
  if (daysSinceUpdate <= 30) return 90; // Last month
  if (daysSinceUpdate <= 90) return 75; // Last quarter
  if (daysSinceUpdate <= 180) return 60; // Last 6 months
  if (daysSinceUpdate <= 365) return 40; // Last year

  return Math.max(0, 30 - (daysSinceUpdate - 365) / 100);
}

/**
 * Calculate media richness score
 */
export function calculateMediaRichness(content) {
  if (!content) return 0;

  let score = 0;

  // Images
  if (content.images?.length) {
    score += Math.min(30, content.images.length * 5);
  }

  // Videos
  if (content.videos?.length) {
    score += Math.min(40, content.videos.length * 10);
  }

  // Interactive elements
  if (content.interactiveElements?.length) {
    score += Math.min(30, content.interactiveElements.length * 5);
  }

  return Math.min(100, score);
}

/**
 * Extract top keywords from content
 */
export function extractTopKeywords(content) {
  if (!content) return [];

  // Split content into words and filter out common words
  const stopWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have']);
  const words = content.toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  // Count word frequency
  const frequency = {};
  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency and return top 5
  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Analyze content quality
 */
export function analyzeContentQuality(page) {
  if (!page) {
    global.auditcore.logger.warn('No page data provided for content analysis');
    return {
      headingStructureScore: 0,
      freshnessScore: 0,
      uniquenessScore: 0,
      grammarScore: 0,
      mediaRichnessScore: 0,
      topKeywords: [],
      overallScore: 0,
    };
  }

  global.auditcore.logger.debug(`Analyzing content quality for page: ${page.url}`);

  const headingStructureScore = analyzeHeadingStructure({
    h1Count: page.h1Count,
    h2Count: page.h2Count,
    h3Count: page.h3Count,
    h4Count: page.h4Count,
    h5Count: page.h5Count,
    h6Count: page.h6Count,
  });
  const freshnessScore = calculateFreshnessScore(page.lastmod);
  const uniquenessScore = 100; // Would require content comparison
  const grammarScore = 100; // Would require NLP analysis
  const mediaRichnessScore = calculateMediaRichness({
    images: page.images,
    videos: page.videos,
    interactiveElements: page.interactiveElements,
  });

  // Calculate overall score with updated weights
  const weights = {
    headings: 0.3,
    freshness: 0.25,
    uniqueness: 0.15,
    grammar: 0.15,
    media: 0.15,
  };

  const overallScore = (
    headingStructureScore * weights.headings
    + freshnessScore * weights.freshness
    + uniquenessScore * weights.uniqueness
    + grammarScore * weights.grammar
    + mediaRichnessScore * weights.media
  );

  return {
    headingStructureScore,
    freshnessScore,
    uniquenessScore,
    grammarScore,
    mediaRichnessScore,
    topKeywords: extractTopKeywords(page.content),
    overallScore,
  };
}
