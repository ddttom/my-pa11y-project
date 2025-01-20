// Complete reports.js implementation
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs/promises';

// Basic utility functions
function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(2) : '0.00';
}
/**
 * Analyze Pa11y accessibility test results
 */
function analyzePa11yResults(page) {
  const analysis = createEmptyAnalysis();
  
  // Exit early if page or issues are missing
  if (!page || !page.issues) {
    global.auditcore.logger.debug('No Pa11y issues found for page');
    return analysis;
  }

  global.auditcore.logger.debug(`Analyzing ${page.issues.length} Pa11y issues`);

  // Ensure issues is an array
  const issues = Array.isArray(page.issues) ? page.issues : [];

  issues.forEach(issue => {
    analysis.totalIssues++;
    
    // Count by severity
    analysis.bySeverity[issue.severity] = (analysis.bySeverity[issue.severity] || 0) + 1;
    
    // Count by WCAG level
    const wcagMatch = issue.code?.match(/WCAG2([A]{1,3})/);
    if (wcagMatch) {
      const level = wcagMatch[1];
      analysis.byLevel[level] = (analysis.byLevel[level] || 0) + 1;
    }

    // Count specific types of issues
    if (issue.code?.includes('ARIA')) {
      analysis.ariaIssues++;
    }
    if (issue.code?.includes('Contrast')) {
      analysis.contrastIssues++;
    }
    if (issue.code?.toLowerCase().includes('keyboard')) {
      analysis.keyboardIssues++;
    }

    // Update score based on severity
    const severityWeights = {
      Critical: 5,
      Serious: 3,
      Moderate: 2,
      Minor: 1
    };
    analysis.score -= (severityWeights[issue.severity] || 1) * 2;
  });

  analysis.score = Math.max(0, analysis.score);
  return analysis;
}

// Helper function to create empty analysis object
function createEmptyAnalysis() {
  return {
    totalIssues: 0,
    bySeverity: {},
    byLevel: {},
    ariaIssues: 0,
    contrastIssues: 0,
    keyboardIssues: 0,
    score: 100
  };
}

function countSyllables(text) {
  return text.toLowerCase()
    .split(/\s+/)
    .reduce((total, word) => {
      return total + (word.match(/[aeiouy]{1,2}/g) || []).length;
    }, 0);
}

function isInNavigation(link) {
  if (!link?.context) return false;
  const context = link.context.toLowerCase();
  return context.includes('nav') || context.includes('header');
}

function getImageFormat(src) {
  if (!src) return 'unknown';
  try {
    const ext = src.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'unknown';
  } catch {
    return 'unknown';
  }
}

// Security analysis helper functions
function calculateHeaderScore(headers) {
  if (!headers) return 0;
  let score = 0;
  
  const securityHeaders = {
    'strict-transport-security': 20,
    'content-security-policy': 20,
    'x-frame-options': 15,
    'x-content-type-options': 15,
    'referrer-policy': 15,
    'permissions-policy': 15
  };

  Object.entries(securityHeaders).forEach(([header, points]) => {
    if (headers[header]) score += points;
  });

  return score;
}

//----------------
// Helper Functions
//----------------

/**
 * Analyze image for optimization
 */
function analyzeImage(image) {
  const analysis = {
    altScore: 0,
    compressionLevel: 'Unknown',
    optimizationScore: 100,
    recommendations: []
  };

  if (!image.alt) {
    analysis.altScore = 0;
    analysis.recommendations.push('Add alt text');
    analysis.optimizationScore -= 30;
  } else {
    analysis.altScore = Math.min(100, image.alt.length * 5);
    if (analysis.altScore < 50) {
      analysis.recommendations.push('Improve alt text description');
    }
  }

  if (image.size > 200000) {
    analysis.compressionLevel = 'Low';
    analysis.recommendations.push('Compress image');
    analysis.optimizationScore -= 20;
  } else if (image.size > 100000) {
    analysis.compressionLevel = 'Medium';
    analysis.recommendations.push('Consider further compression');
    analysis.optimizationScore -= 10;
  } else {
    analysis.compressionLevel = 'High';
  }

  if (!image.width || !image.height) {
    analysis.recommendations.push('Add width and height attributes');
    analysis.optimizationScore -= 15;
  }

  if (!image.srcset && (image.width > 800 || image.height > 800)) {
    analysis.recommendations.push('Implement responsive images with srcset');
    analysis.optimizationScore -= 15;
  }

  if (!image.loading) {
    analysis.recommendations.push('Add lazy loading');
    analysis.optimizationScore -= 10;
  }

  return analysis;
}

/**
 * Analyze link quality
 */
function analyzeLinkQuality(link) {
  const analysis = {
    qualityScore: 100,
    recommendations: []
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
function getLinkType(targetUrl, sourceUrl) {
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
 * Calculate readability score using Flesch Reading Ease
 */
function calculateReadabilityScore(content) {
  if (!content) return 0;
  
  const words = content.split(/\s+/).length;
  const sentences = content.split(/[.!?]+/).length;
  const syllables = countSyllables(content);

  if (sentences === 0) return 0;

  // Flesch Reading Ease score
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate keyword density
 */
function calculateKeywordDensity(content) {
  if (!content) return 0;
  
  const words = content.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  
  if (wordCount === 0) return 0;

  const frequency = words.reduce((acc, word) => {
    if (word.length > 3) { // Skip short words
      acc[word] = (acc[word] || 0) + 1;
    }
    return acc;
  }, {});

  const topKeywords = Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return topKeywords.reduce((sum, [,count]) => sum + (count / wordCount), 0) / 5;
}

/**
 * Analyze heading structure
 */
function analyzeHeadingStructure(headings) {
  if (!headings) return 0;
  
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
function calculateFreshnessScore(lastmod) {
  if (!lastmod) return 0;
  
  const now = new Date();
  const modDate = new Date(lastmod);
  const daysSinceUpdate = (now - modDate) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate <= 7) return 100;   // Last week
  if (daysSinceUpdate <= 30) return 90;   // Last month
  if (daysSinceUpdate <= 90) return 75;   // Last quarter
  if (daysSinceUpdate <= 180) return 60;  // Last 6 months
  if (daysSinceUpdate <= 365) return 40;  // Last year
  
  return Math.max(0, 30 - (daysSinceUpdate - 365) / 100);
}

/**
 * Calculate media richness score
 */
function calculateMediaRichness(content) {
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
function extractTopKeywords(content) {
  if (!content) return [];
  
  // Split content into words and filter out common words
  const stopWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have']);
  const words = content.toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count word frequency
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency and return top 5
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}
/**
 * Calculate link depth
 */
function calculateLinkDepth(url) {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).length;
  } catch {
    return 0;
  }
}

/**
 * Analyze content quality
 */
function analyzeContentQuality(page) {
  if (!page) {
    global.auditcore.logger.warn('No page data provided for content analysis');
    return {
      readabilityScore: 0,
      keywordDensity: 0,
      headingStructureScore: 0,
      freshnessScore: 0,
      uniquenessScore: 0,
      grammarScore: 0,
      mediaRichnessScore: 0,
      topKeywords: [],
      overallScore: 0
    };
  }

  const readabilityScore = calculateReadabilityScore(page.content);
  const keywordDensity = calculateKeywordDensity(page.content);
  const headingStructureScore = analyzeHeadingStructure({
    h1Count: page.h1Count,
    h2Count: page.h2Count,
    h3Count: page.h3Count,
    h4Count: page.h4Count,
    h5Count: page.h5Count,
    h6Count: page.h6Count
  });
  const freshnessScore = calculateFreshnessScore(page.lastmod);
  const uniquenessScore = 100; // Would require content comparison
  const grammarScore = 100;    // Would require NLP analysis
  const mediaRichnessScore = calculateMediaRichness({
    images: page.images,
    videos: page.videos,
    interactiveElements: page.interactiveElements
  });

  // Calculate overall score with weights
  const weights = {
    readability: 0.2,
    keywords: 0.15,
    headings: 0.15,
    freshness: 0.15,
    uniqueness: 0.1,
    grammar: 0.1,
    media: 0.15
  };

  const overallScore = (
    readabilityScore * weights.readability +
    keywordDensity * 100 * weights.keywords +
    headingStructureScore * weights.headings +
    freshnessScore * weights.freshness +
    uniquenessScore * weights.uniqueness +
    grammarScore * weights.grammar +
    mediaRichnessScore * weights.media
  );

  return {
    readabilityScore,
    keywordDensity,
    headingStructureScore,
    freshnessScore,
    uniquenessScore,
    grammarScore,
    mediaRichnessScore,
    topKeywords: extractTopKeywords(page.content),
    overallScore
  };
}
function detectMixedContent(html) {
  if (!html) return 0;

  const mixedContentPatterns = [
    /src=["']http:\/\//g,      // HTTP sources
    /href=["']http:\/\//g,     // HTTP links
    /url\(["']?http:\/\//g,    // HTTP in CSS
    /[@import\s]+["']http:\/\//g // HTTP imports
  ];

  return mixedContentPatterns.reduce((count, pattern) => {
    const matches = html.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function analyzeCookieSecurity(headers) {
  if (!headers || !headers['set-cookie']) return 0;
  
  let score = 100;
  const cookies = Array.isArray(headers['set-cookie']) 
    ? headers['set-cookie'] 
    : [headers['set-cookie']];

  cookies.forEach(cookie => {
    if (!cookie.includes('Secure;')) score -= 20;
    if (!cookie.includes('HttpOnly;')) score -= 20;
    if (!cookie.includes('SameSite=')) score -= 15;
    if (!cookie.includes('Expires=') && !cookie.includes('Max-Age=')) score -= 10;
  });

  return Math.max(0, score);
}

function calculateCspScore(headers) {
  if (!headers?.['content-security-policy']) return 0;
  
  const csp = headers['content-security-policy'];
  let score = 100;

  const essentialDirectives = [
    'default-src',
    'script-src',
    'style-src',
    'img-src',
    'connect-src',
    'form-action',
    'frame-ancestors'
  ];

  essentialDirectives.forEach(directive => {
    if (!csp.includes(directive)) score -= Math.floor(100 / essentialDirectives.length);
  });

  if (csp.includes("'unsafe-inline'")) score -= 20;
  if (csp.includes("'unsafe-eval'")) score -= 20;

  return Math.max(0, score);
}

function calculateXssScore(headers) {
  if (!headers) return 0;
  let score = 100;

  if (!headers['x-xss-protection']) {
    score -= 50;
  } else if (headers['x-xss-protection'] !== '1; mode=block') {
    score -= 25;
  }

  const csp = headers['content-security-policy'];
  if (!csp) {
    score -= 25;
  } else {
    if (!csp.includes('script-src')) score -= 15;
    if (csp.includes("'unsafe-inline'")) score -= 15;
  }

  return Math.max(0, score);
}

function analyzeCertificate(cert) {
  if (!cert) return 'No SSL certificate information';
  
  try {
    const validTo = new Date(cert.validTo);
    const now = new Date();
    const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
    
    let status = 'Valid';
    if (daysUntilExpiry < 0) {
      status = 'Expired';
    } else if (daysUntilExpiry < 30) {
      status = 'Expiring soon';
    }

    return `${status} - Valid until ${validTo.toISOString()}, Issuer: ${cert.issuer}`;
  } catch (error) {
    return 'Error analyzing certificate';
  }
}

function detectVulnerabilities(html) {
  if (!html) return 0;
  
  const vulnerabilityPatterns = [
    /<input[^>]*type=["']password["'][^>]*>/i,  // Unprotected password fields
    /onclick=["'][^"']*["']/g,                  // Inline event handlers
    /javascript:void/g,                         // javascript: URLs
    /eval\s*\(/g,                              // eval() usage
    /document\.write\s*\(/g,                    // document.write
    /<form[^>]*>/i,                            // Forms without CSRF protection
    /<a[^>]*target=["']_blank["'][^>]*>/g,     // Target blank without noopener
    /innerHTML\s*=/g,                          // innerHTML assignments
    /localStorage\./g,                          // LocalStorage usage without checks
    /sessionStorage\./g                         // SessionStorage usage without checks
  ];

  return vulnerabilityPatterns.reduce((count, pattern) => {
    const matches = html.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function analyzeSecurityFeatures(page) {
  if (!page) {
    global.auditcore.logger.warn('No page data provided for security analysis');
    return {
      httpsScore: 0,
      headerScore: 0,
      mixedContentIssues: 0,
      cookieScore: 0,
      cspScore: 0,
      xssScore: 0,
      certificateInfo: 'No data',
      vulnerabilitiesCount: 0,
      overallScore: 0
    };
  }

  const httpsScore = page.url.startsWith('https://') ? 100 : 0;
  const headerScore = calculateHeaderScore(page.headers);
  const mixedContentIssues = detectMixedContent(page.html);
  const cookieScore = analyzeCookieSecurity(page.headers);
  const cspScore = calculateCspScore(page.headers);
  const xssScore = calculateXssScore(page.headers);
  const certificateInfo = analyzeCertificate(page.certificate);
  const vulnerabilitiesCount = detectVulnerabilities(page.html);

  // Calculate overall security score with weights
  const weights = {
    https: 0.3,
    headers: 0.2,
    cookies: 0.15,
    csp: 0.15,
    xss: 0.1,
    vulnerabilities: 0.1
  };

  const overallScore = (
    httpsScore * weights.https +
    headerScore * weights.headers +
    cookieScore * weights.cookies +
    cspScore * weights.csp +
    xssScore * weights.xss +
    Math.max(0, 100 - vulnerabilitiesCount * 10) * weights.vulnerabilities
  );

  return {
    httpsScore,
    headerScore,
    mixedContentIssues,
    cookieScore,
    cspScore,
    xssScore,
    certificateInfo,
    vulnerabilitiesCount,
    overallScore
  };
}

// Content analysis helper functions
// Main report generation functions

/**
 * Main function to generate all reports
 */
async function generateReports(results, urls, outputDir) {
  try {
    if (!results) {
      throw new Error('Invalid results structure');
    }

    global.auditcore.logger.info('Starting report generation');

    await generateSeoReport(results, outputDir);
    await generatePerformanceReport(results, outputDir);
    await generateSeoScores(results, outputDir);
    await generateAccessibilityReport(results, outputDir);
    await generateImageOptimizationReport(results, outputDir);
    await generateLinkAnalysisReport(results, outputDir);
    await generateContentQualityReport(results, outputDir);
    await generateSecurityReport(results, outputDir);

    // Save complete results as JSON
    await fs.writeFile(
      path.join(outputDir, 'results.json'),
      JSON.stringify(results, null, 2)
    );

    global.auditcore.logger.info('All reports generated successfully');
  } catch (error) {
    global.auditcore.logger.error('Error generating reports:', error);
    throw error;
  }
}

/**
 * Generate basic SEO report
 */
async function generateSeoReport(results, outputDir) {
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'seo_report.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'title', title: 'Title' },
      { id: 'description', title: 'Description' },
      { id: 'h1Count', title: 'H1 Count' },
      { id: 'imageCount', title: 'Image Count' },
      { id: 'imagesWithoutAlt', title: 'Images Without Alt' },
      { id: 'internalLinks', title: 'Internal Links' },
      { id: 'externalLinks', title: 'External Links' },
      { id: 'pageSize', title: 'Page Size (bytes)' },
      { id: 'wordCount', title: 'Word Count' },
      { id: 'titleLength', title: 'Title Length' },
      { id: 'descriptionLength', title: 'Description Length' },
      { id: 'hasStructuredData', title: 'Has Structured Data' },
      { id: 'hasSocialTags', title: 'Has Social Tags' },
      { id: 'lastModified', title: 'Last Modified' }
    ]
  });

  const reportData = results.contentAnalysis?.map(page => ({
    url: page.url || '',
    title: page.title || '',
    description: page.metaDescription || '',
    h1Count: Math.round(page.h1Count || 0),
    imageCount: Math.round(page.imagesCount || 0),
    imagesWithoutAlt: Math.round(page.imagesWithoutAlt || 0),
    internalLinks: Math.round(page.internalLinksCount || 0),
    externalLinks: Math.round(page.externalLinksCount || 0),
    pageSize: Math.round(page.pageSize || 0),
    wordCount: Math.round(page.wordCount || 0),
    titleLength: page.title?.length || 0,
    descriptionLength: page.metaDescription?.length || 0,
    hasStructuredData: page.structuredData?.length > 0 ? 'Yes' : 'No',
    hasSocialTags: (page.openGraphTags?.length > 0 || page.twitterTags?.length > 0) ? 'Yes' : 'No',
    lastModified: page.lastmod || 'Unknown'
  })) || [];

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`SEO report generated with ${reportData.length} records`);
}

/**
 * Generate performance analysis report
 */
async function generatePerformanceReport(results, outputDir) {
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'performance_analysis.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'loadTime', title: 'Load Time (ms)' },
      { id: 'firstPaint', title: 'First Paint (ms)' },
      { id: 'firstContentfulPaint', title: 'First Contentful Paint (ms)' },
      { id: 'largestContentfulPaint', title: 'Largest Contentful Paint (ms)' },
      { id: 'timeToInteractive', title: 'Time to Interactive (ms)' },
      { id: 'speedIndex', title: 'Speed Index' },
      { id: 'totalBlockingTime', title: 'Total Blocking Time (ms)' },
      { id: 'cumulativeLayoutShift', title: 'Cumulative Layout Shift' },
      { id: 'resourceCount', title: 'Resource Count' },
      { id: 'resourceSize', title: 'Total Resource Size (KB)' }
    ]
  });

  const reportData = results.performanceAnalysis?.map(page => ({
    url: page.url || '',
    loadTime: Math.round(page.loadTime || 0),
    firstPaint: Math.round(page.firstPaint || 0),
    firstContentfulPaint: Math.round(page.firstContentfulPaint || 0),
    largestContentfulPaint: Math.round(page.largestContentfulPaint || 0),
    timeToInteractive: Math.round(page.timeToInteractive || 0),
    speedIndex: Math.round(page.speedIndex || 0),
    totalBlockingTime: Math.round(page.totalBlockingTime || 0),
    cumulativeLayoutShift: page.cumulativeLayoutShift?.toFixed(3) || 0,
    resourceCount: page.resourceCount || 0,
    resourceSize: Math.round((page.resourceSize || 0) / 1024)
  })) || [];

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`Performance report generated with ${reportData.length} records`);
}

/**
 * Generate SEO scores report
 */
async function generateSeoScores(results, outputDir) {
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'seo_scores.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'overallScore', title: 'Overall Score' },
      { id: 'titleScore', title: 'Title Score' },
      { id: 'metaScore', title: 'Meta Score' },
      { id: 'contentScore', title: 'Content Score' },
      { id: 'technicalScore', title: 'Technical Score' },
      { id: 'linksScore', title: 'Links Score' },
      { id: 'imagesScore', title: 'Images Score' },
      { id: 'mobileScore', title: 'Mobile Score' },
      { id: 'performanceScore', title: 'Performance Score' },
      { id: 'securityScore', title: 'Security Score' }
    ]
  });

  const reportData = results.seoScores?.map(page => ({
    url: page.url || '',
    overallScore: formatScore(page.score),
    titleScore: formatScore(page.details?.titleOptimization),
    metaScore: formatScore(page.details?.metaDescriptionOptimization),
    contentScore: formatScore(page.details?.contentQuality),
    technicalScore: formatScore(page.details?.technicalOptimization),
    linksScore: formatScore(page.details?.internalLinking),
    imagesScore: formatScore(page.details?.imageOptimization),
    mobileScore: formatScore(page.details?.mobileOptimization),
    performanceScore: formatScore(page.details?.performanceScore),
    securityScore: formatScore(page.details?.securityScore)
  })) || [];

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`SEO scores report generated with ${reportData.length} records`);
}
/**
 * Generate accessibility report
 */
async function generateAccessibilityReport(results, outputDir) {
  global.auditcore.logger.debug('Starting accessibility report generation');

  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'accessibility_report.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'totalIssues', title: 'Total Issues' },
      { id: 'criticalIssues', title: 'Critical Issues' },
      { id: 'seriousIssues', title: 'Serious Issues' },
      { id: 'moderateIssues', title: 'Moderate Issues' },
      { id: 'minorIssues', title: 'Minor Issues' },
      { id: 'wcagAIssues', title: 'WCAG A Issues' },
      { id: 'wcagAAIssues', title: 'WCAG AA Issues' },
      { id: 'wcagAAAIssues', title: 'WCAG AAA Issues' },
      { id: 'accessibilityScore', title: 'Accessibility Score' },
      { id: 'ariaLabels', title: 'Missing ARIA Labels' },
      { id: 'contrastRatio', title: 'Contrast Ratio Issues' },
      { id: 'keyboardNav', title: 'Keyboard Navigation Issues' }
    ]
  });

  // Get all URLs from content analysis to ensure we have a complete list
  const allUrls = new Set(results.contentAnalysis?.map(page => page.url) || []);
  
  const reportData = Array.from(allUrls).map(url => {
    const pa11yResult = results.pa11y?.find(p => p.url === url || p.pageUrl === url);
    const analysis = pa11yResult ? analyzePa11yResults(pa11yResult) : createEmptyAnalysis();

    return {
      url: url,
      totalIssues: analysis.totalIssues || 0,
      criticalIssues: analysis.bySeverity.Critical || 0,
      seriousIssues: analysis.bySeverity.Serious || 0,
      moderateIssues: analysis.bySeverity.Moderate || 0,
      minorIssues: analysis.bySeverity.Minor || 0,
      wcagAIssues: analysis.byLevel.A || 0,
      wcagAAIssues: analysis.byLevel.AA || 0,
      wcagAAAIssues: analysis.byLevel.AAA || 0,
      accessibilityScore: analysis.score.toFixed(2),
      ariaLabels: analysis.ariaIssues || 0,
      contrastRatio: analysis.contrastIssues || 0,
      keyboardNav: analysis.keyboardIssues || 0
    };
  });

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`Accessibility report generated with ${reportData.length} records`);
}

/**
 * Generate image optimization report
 */
async function generateImageOptimizationReport(results, outputDir) {
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'image_optimization.csv'),
    header: [
      { id: 'pageUrl', title: 'Page URL' },
      { id: 'imageUrl', title: 'Image URL' },
      { id: 'fileSize', title: 'File Size (KB)' },
      { id: 'dimensions', title: 'Dimensions' },
      { id: 'format', title: 'Format' },
      { id: 'altText', title: 'Alt Text' },
      { id: 'altScore', title: 'Alt Text Quality Score' },
      { id: 'isResponsive', title: 'Is Responsive' },
      { id: 'lazyLoaded', title: 'Lazy Loaded' },
      { id: 'compressionLevel', title: 'Compression Level' },
      { id: 'optimizationScore', title: 'Optimization Score' },
      { id: 'recommendations', title: 'Recommendations' }
    ]
  });

  const reportData = [];
  results.contentAnalysis?.forEach(page => {
    page.images?.forEach(image => {
      const analysis = analyzeImage(image);
      reportData.push({
        pageUrl: page.url,
        imageUrl: image.src,
        fileSize: Math.round((image.size || 0) / 1024),
        dimensions: `${image.width || '?'}x${image.height || '?'}`,
        format: getImageFormat(image.src),
        altText: image.alt || '',
        altScore: analysis.altScore.toFixed(2),
        isResponsive: image.srcset ? 'Yes' : 'No',
        lazyLoaded: image.loading === 'lazy' ? 'Yes' : 'No',
        compressionLevel: analysis.compressionLevel,
        optimizationScore: analysis.optimizationScore.toFixed(2),
        recommendations: analysis.recommendations.join('; ')
      });
    });
  });

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`Image optimization report generated with ${reportData.length} records`);
}
/**
 * Generate link analysis report
 */
async function generateLinkAnalysisReport(results, outputDir) {
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'link_analysis.csv'),
    header: [
      { id: 'sourceUrl', title: 'Source URL' },
      { id: 'targetUrl', title: 'Target URL' },
      { id: 'linkText', title: 'Link Text' },
      { id: 'linkType', title: 'Link Type' },
      { id: 'followType', title: 'Follow Type' },
      { id: 'status', title: 'HTTP Status' },
      { id: 'redirectChain', title: 'Redirect Chain' },
      { id: 'contentType', title: 'Content Type' },
      { id: 'inNavigation', title: 'In Navigation' },
      { id: 'linkDepth', title: 'Link Depth' },
      { id: 'linkQuality', title: 'Link Quality Score' }
    ]
  });

  const reportData = [];
  results.internalLinks?.forEach(page => {
    page.links?.forEach(link => {
      const analysis = analyzeLinkQuality(link);
      reportData.push({
        sourceUrl: page.url,
        targetUrl: link.url,
        linkText: link.text,
        linkType: getLinkType(link.url, page.url),
        followType: link.rel?.includes('nofollow') ? 'NoFollow' : 'Follow',
        status: link.status || 200,
        redirectChain: (link.redirects || []).join(' → '),
        contentType: link.contentType || 'unknown',
        inNavigation: isInNavigation(link) ? 'Yes' : 'No',
        linkDepth: calculateLinkDepth(link.url),
        linkQuality: analysis.qualityScore.toFixed(2)
      });
    });
  });

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`Link analysis report generated with ${reportData.length} records`);
}

/**
 * Generate content quality report
 */
async function generateContentQualityReport(results, outputDir) {
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'content_quality.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'wordCount', title: 'Word Count' },
      { id: 'readabilityScore', title: 'Readability Score' },
      { id: 'keywordDensity', title: 'Keyword Density' },
      { id: 'headingStructure', title: 'Heading Structure Score' },
      { id: 'contentFreshness', title: 'Content Freshness Score' },
      { id: 'uniqueContent', title: 'Content Uniqueness Score' },
      { id: 'grammarScore', title: 'Grammar Score' },
      { id: 'mediaRichness', title: 'Media Richness Score' },
      { id: 'topKeywords', title: 'Top Keywords' },
      { id: 'contentScore', title: 'Overall Content Score' }
    ]
  });

  const reportData = results.contentAnalysis?.map(page => {
    const analysis = analyzeContentQuality(page);
    return {
      url: page.url,
      wordCount: page.wordCount || 0,
      readabilityScore: analysis.readabilityScore.toFixed(2),
      keywordDensity: analysis.keywordDensity.toFixed(2),
      headingStructure: analysis.headingStructureScore.toFixed(2),
      contentFreshness: analysis.freshnessScore.toFixed(2),
      uniqueContent: analysis.uniquenessScore.toFixed(2),
      grammarScore: analysis.grammarScore.toFixed(2),
      mediaRichness: analysis.mediaRichnessScore.toFixed(2),
      topKeywords: analysis.topKeywords.join(', '),
      contentScore: analysis.overallScore.toFixed(2)
    };
  }) || [];

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`Content quality report generated with ${reportData.length} records`);
}

/**
 * Generate security report
 */
async function generateSecurityReport(results, outputDir) {
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'security_report.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'httpsScore', title: 'HTTPS Implementation' },
      { id: 'headerScore', title: 'Security Headers' },
      { id: 'mixedContent', title: 'Mixed Content Issues' },
      { id: 'cookieSecure', title: 'Cookie Security' },
      { id: 'cspScore', title: 'Content Security Policy' },
      { id: 'xssProtection', title: 'XSS Protection' },
      { id: 'certificateDetails', title: 'SSL Certificate Details' },
      { id: 'vulnerabilities', title: 'Vulnerabilities Found' },
      { id: 'securityScore', title: 'Overall Security Score' }
    ]
  });

  const reportData = results.performanceAnalysis?.map(page => {
    const security = analyzeSecurityFeatures(page);
    return {
      url: page.url,
      httpsScore: formatScore(security.httpsScore),
      headerScore: formatScore(security.headerScore),
      mixedContent: security.mixedContentIssues,
      cookieSecure: formatScore(security.cookieScore),
      cspScore: formatScore(security.cspScore),
      xssProtection: formatScore(security.xssScore),
      certificateDetails: security.certificateInfo,
      vulnerabilities: security.vulnerabilitiesCount,
      securityScore: formatScore(security.overallScore)
    };
  }) || [];

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`Security report generated with ${reportData.length} records`);
}

// Export all functions
export {
  generateReports,
  generateSeoReport,
  generatePerformanceReport,
  generateSeoScores,
  generateAccessibilityReport,
  generateImageOptimizationReport,
  generateLinkAnalysisReport,
  generateContentQualityReport,
  generateSecurityReport,
  isInNavigation
};
