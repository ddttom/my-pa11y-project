/* eslint-disable max-len */
/* eslint-disable no-use-before-define */
/* eslint-disable import/extensions */
// reportGenerator.js

import { formatCsv } from './csvFormatter.js';

const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

function categorizeResponseCodes(responseCodeMetrics) {
  const categories = {
    '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0,
  };

  Object.entries(responseCodeMetrics).forEach(([code, count]) => {
    const codeNum = parseInt(code, 10);
    if (codeNum >= 200 && codeNum < 300) categories['2xx'] += count;
    else if (codeNum >= 300 && codeNum < 400) categories['3xx'] += count;
    else if (codeNum >= 400 && codeNum < 500) categories['4xx'] += count;
    else if (codeNum >= 500 && codeNum < 600) categories['5xx'] += count;
  });

  return categories;
}

const memoizedCategorizeResponseCodes = memoize(categorizeResponseCodes);

function validateResults(results) {
  const requiredProperties = ['urlMetrics', 'responseCodeMetrics', 'titleMetrics', 'metaDescriptionMetrics', 'h1Metrics', 'h2Metrics', 'imageMetrics', 'linkMetrics', 'securityMetrics', 'hreflangMetrics', 'canonicalMetrics', 'contentMetrics', 'seoScores', 'performanceAnalysis'];
  const missingProperties = requiredProperties.filter((prop) => !(prop in results));

  if (missingProperties.length > 0) {
    throw new Error(`Missing required properties in results: ${missingProperties.join(', ')}`);
  }
}

function sanitizeForCsv(value) {
  if (typeof value === 'string') {
    return value.replace(/^[=+@-]/, '\'$&');
  }
  return value;
}

// eslint-disable-next-line import/prefer-default-export
export function generateReport(results, sitemapUrl, logger) {
  logger.info('Generating SEO report');
  const startTime = process.hrtime();

  try {
    validateResults(results);
  } catch (error) {
    logger.error('Invalid results object:', error);
    return null;
  }

  const reportSections = [
    { name: 'Header', generator: generateHeader, args: [sitemapUrl] },
    { name: 'Summary', generator: generateSummary, args: [results, memoizedCategorizeResponseCodes(results.responseCodeMetrics)] },
    { name: 'URL Analysis', generator: generateUrlAnalysis, args: [results] },
    { name: 'Page Title Analysis', generator: generatePageTitleAnalysis, args: [results] },
    { name: 'Meta Description Analysis', generator: generateMetaDescriptionAnalysis, args: [results] },
    { name: 'Heading Analysis', generator: generateHeadingAnalysis, args: [results] },
    { name: 'Image Analysis', generator: generateImageAnalysis, args: [results] },
    { name: 'Link Analysis', generator: generateLinkAnalysis, args: [results] },
    { name: 'Security Analysis', generator: generateSecurityAnalysis, args: [results] },
    { name: 'Hreflang Analysis', generator: generateHreflangAnalysis, args: [results] },
    { name: 'Canonical Analysis', generator: generateCanonicalAnalysis, args: [results] },
    { name: 'Content Analysis', generator: generateContentAnalysis, args: [results] },
    { name: 'Orphaned URLs Analysis', generator: generateOrphanedUrlsAnalysis, args: [results] },
    { name: 'Pa11y Analysis', generator: generatePa11yAnalysis, args: [results] },
    { name: 'JavaScript Errors Analysis', generator: generateJavaScriptErrorsAnalysis, args: [results] },
    { name: 'SEO Score Analysis', generator: generateSeoScoreAnalysis, args: [results] },
    { name: 'Performance Analysis', generator: generatePerformanceAnalysis, args: [results] },
  ];

  let completedSections = 0;
  const totalSections = reportSections.length;

  const reportData = reportSections.flatMap((section) => {
    try {
      logger.debug(`Generating ${section.name} section`);
      const sectionData = section.generator(...section.args);
      completedSections += 1;
      logger.debug(`Completed ${completedSections}/${totalSections} sections`);
      return sectionData;
    } catch (error) {
      logger.error(`Error generating ${section.name} section:`, error);
      return [['Error', `Failed to generate ${section.name} section`]];
    }
  });

  // Round all numeric values in the report to 2 decimal places and sanitize
  const processedReportData = reportData.map((row) => row.map((cell) => {
    const roundedCell = typeof cell === 'number' ? Number(cell.toFixed(2)) : cell;
    return sanitizeForCsv(roundedCell);
  }));

  const [seconds, nanoseconds] = process.hrtime(startTime);
  const duration = seconds + nanoseconds / 1e9;
  logger.info(`Report generation completed in ${duration.toFixed(3)} seconds`);

  logger.debug('Report data generated successfully');
  return formatCsv(processedReportData);
}

function generateHeader(sitemapUrl) {
  return [
    ['SEO Analysis Report'],
    ['Date', new Date().toLocaleDateString()],
    ['Time', new Date().toLocaleTimeString()],
    ['Sitemap URL', sitemapUrl],
    [], // Empty row for spacing
  ];
}

function generateSummary(results, responseCategories) {
  return [
    ['Summary', 'Count'],
    ['Total URLs', results.urlMetrics.total],
    ['Internal URLs', results.urlMetrics.internal],
    ['External URLs', results.urlMetrics.external],
    ['Indexable URLs', results.urlMetrics.internalIndexable],
    ['Non-Indexable URLs', results.urlMetrics.internalNonIndexable],
    [],
    ['Response Codes', 'Count'],
    ['2xx (Success)', responseCategories['2xx']],
    ['3xx (Redirection)', responseCategories['3xx']],
    ['4xx (Client Error)', responseCategories['4xx']],
    ['5xx (Server Error)', responseCategories['5xx']],
    [],
  ];
}

function generateUrlAnalysis(results) {
  return [
    ['URL Analysis', 'Count'],
    ['URLs with non-ASCII characters', results.urlMetrics.nonAscii],
    ['URLs with uppercase characters', results.urlMetrics.uppercase],
    ['URLs with underscores', results.urlMetrics.underscores],
    ['URLs with spaces', results.urlMetrics.containsSpace],
    ['URLs over 115 characters', results.urlMetrics.overLength],
    [],
  ];
}

function generatePageTitleAnalysis(results) {
  return [
    ['Page Title Analysis', 'Count'],
    ['Missing titles', results.titleMetrics.missing],
    ['Duplicate titles', results.titleMetrics.duplicate],
    ['Titles over 60 characters', results.titleMetrics.tooLong],
    ['Titles under 30 characters', results.titleMetrics.tooShort],
    [],
  ];
}

function generateMetaDescriptionAnalysis(results) {
  return [
    ['Meta Description Analysis', 'Count'],
    ['Missing meta descriptions', results.metaDescriptionMetrics.missing],
    ['Duplicate meta descriptions', results.metaDescriptionMetrics.duplicate],
    ['Meta descriptions over 155 characters', results.metaDescriptionMetrics.tooLong],
    ['Meta descriptions under 70 characters', results.metaDescriptionMetrics.tooShort],
    [],
  ];
}

function generateHeadingAnalysis(results) {
  return [
    ['Heading Analysis', 'Count'],
    ['Missing H1', results.h1Metrics.missing],
    ['Multiple H1s', results.h1Metrics.multiple],
    ['H1s over 70 characters', results.h1Metrics.tooLong],
    ['Missing H2', results.h2Metrics.missing],
    ['Non-sequential H2s', results.h2Metrics.nonSequential],
    [],
  ];
}

function generateImageAnalysis(results) {
  return [
    ['Image Analysis', 'Count'],
    ['Total images', results.imageMetrics.total],
    ['Images missing alt text', results.imageMetrics.missingAlt],
    ['Images with empty alt attribute', results.imageMetrics.missingAltAttribute],
    ['Images with alt text over 100 characters', results.imageMetrics.altTextTooLong],
    [],
  ];
}

function generateLinkAnalysis(results) {
  return [
    ['Link Analysis', 'Count'],
    ['Pages without internal links', results.linkMetrics.pagesWithoutInternalOutlinks],
    ['Pages with high number of external links', results.linkMetrics.pagesWithHighExternalOutlinks],
    ['Internal links without anchor text', results.linkMetrics.internalOutlinksWithoutAnchorText],
    ['Non-descriptive anchor text', results.linkMetrics.nonDescriptiveAnchorText],
    [],
  ];
}

function generateSecurityAnalysis(results) {
  return [
    ['Security Analysis', 'Count'],
    ['HTTP URLs (non-secure)', results.securityMetrics.httpUrls],
    ['Missing HSTS header', results.securityMetrics.missingHstsHeader],
    ['Missing Content Security Policy', results.securityMetrics.missingContentSecurityPolicy],
    ['Missing X-Frame-Options header', results.securityMetrics.missingXFrameOptions],
    ['Missing X-Content-Type-Options header', results.securityMetrics.missingXContentTypeOptions],
    [],
  ];
}

function generateHreflangAnalysis(results) {
  return [
    ['Hreflang Analysis', 'Count'],
    ['Pages with hreflang', results.hreflangMetrics.pagesWithHreflang],
    ['Missing return links', results.hreflangMetrics.missingReturnLinks],
    ['Incorrect language codes', results.hreflangMetrics.incorrectLanguageCodes],
    [],
  ];
}

function generateCanonicalAnalysis(results) {
  return [
    ['Canonical Analysis', 'Count'],
    ['Pages with canonical tags', results.canonicalMetrics.selfReferencing + results.canonicalMetrics.nonSelf],
    ['Self-referencing canonicals', results.canonicalMetrics.selfReferencing],
    ['Non-self canonicals', results.canonicalMetrics.nonSelf],
    ['Missing canonical tags', results.canonicalMetrics.missing],
    [],
  ];
}

function generateContentAnalysis(results) {
  return [
    ['Content Analysis', 'Count'],
    ['Low content pages', results.contentMetrics.lowContent],
    ['Duplicate content pages', results.contentMetrics.duplicate],
    [],
  ];
}

function generateOrphanedUrlsAnalysis(results) {
  return [
    ['Orphaned URLs Analysis', 'Count'],
    ['Orphaned URLs', results.orphanedUrls ? results.orphanedUrls.size : 0],
    [],
  ];
}

function generatePa11yAnalysis(results) {
  const totalIssues = results.pa11y.reduce((sum, result) => sum + (result.issues ? result.issues.length : 0), 0);
  return [
    ['Accessibility Analysis', 'Count'],
    ['Total Pa11y issues', totalIssues],
    [],
  ];
}

function generateJavaScriptErrorsAnalysis(results) {
  const pagesWithJsErrors = results.contentAnalysis.filter((page) => page.jsErrors && page.jsErrors.length > 0).length;
  return [
    ['JavaScript Errors Analysis', 'Count'],
    ['Pages with JavaScript errors', pagesWithJsErrors],
    [],
  ];
}

function generateSeoScoreAnalysis(results) {
  const averageScore = results.seoScores.reduce((sum, score) => sum + score.score, 0) / results.seoScores.length;
  return [
    ['SEO Score Analysis', 'Score'],
    ['Average SEO Score', averageScore.toFixed(2)],
    [],
  ];
}

function generatePerformanceAnalysis(results) {
  const avgLoadTime = results.performanceAnalysis.reduce((sum, perf) => sum + perf.loadTime, 0) / results.performanceAnalysis.length;
  return [
    ['Performance Analysis', 'Time (ms)'],
    ['Average Load Time', avgLoadTime.toFixed(2)],
    [],
  ];
}
