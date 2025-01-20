import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import { formatScore } from './formatUtils.js';
import { analyzePa11yResults, createEmptyAnalysis } from './accessibilityAnalysis.js';
import { analyzeImage } from './imageAnalysis.js';
import { analyzeLinkQuality, getLinkType, isInNavigation } from './linkAnalysis.js';
import { analyzeContentQuality } from './contentAnalysis.js';
import { analyzeSecurityFeatures } from './securityAnalysis.js';

/**
 * Generate SEO report
 */
export async function generateSeoReport(results, outputDir) {
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
export async function generatePerformanceReport(results, outputDir) {
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
export async function generateSeoScores(results, outputDir) {
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
export async function generateAccessibilityReport(results, outputDir) {
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
export async function generateImageOptimizationReport(results, outputDir) {
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
        format: analysis.format,
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
export async function generateLinkAnalysisReport(results, outputDir) {
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
        linkDepth: analysis.linkDepth,
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
export async function generateContentQualityReport(results, outputDir) {
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
export async function generateSecurityReport(results, outputDir) {
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
