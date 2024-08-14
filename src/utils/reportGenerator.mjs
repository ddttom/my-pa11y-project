/* eslint-disable no-use-before-define */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/extensions */
/* eslint-disable max-len */
// reportGenerator.js

import { formatCsv } from './csvFormatter.mjs';

/**
 * Memoizes a function to cache its results.
 * @param {Function} fn - The function to memoize.
 * @returns {Function} The memoized function.
 */
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

/**
 * Categorizes response codes into groups.
 * @param {Object} responseCodeMetrics - The response code metrics.
 * @returns {Object} Categorized response codes.
 */
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

/**
 * Validates the results object for required properties.
 * @param {Object} results - The results object to validate.
 * @throws {Error} If required properties are missing.
 */
function validateResults(results) {
  const requiredProperties = [
    'urlMetrics', 'responseCodeMetrics', 'titleMetrics', 'metaDescriptionMetrics',
    'h1Metrics', 'h2Metrics', 'imageMetrics', 'linkMetrics', 'securityMetrics',
    'hreflangMetrics', 'canonicalMetrics', 'contentMetrics', 'seoScores', 'performanceAnalysis',
  ];
  const missingProperties = requiredProperties.filter((prop) => !(prop in results));

  if (missingProperties.length > 0) {
    throw new Error(`Missing required properties in results: ${missingProperties.join(', ')}`);
  }
}

/**
 * Sanitizes a value for CSV output.
 * @param {*} value - The value to sanitize.
 * @returns {*} The sanitized value.
 */
function sanitizeForCsv(value) {
  if (typeof value === 'string') {
    return value.replace(/^[=+@-]/, '\'$&');
  }
  return value;
}

/**
 * Generates an SEO analysis report.
 * @param {Object} results - The SEO analysis results.
 * @param {string} sitemapUrl - The URL of the analyzed sitemap.
 * @param {Object} logger - The logger object.
 * @returns {string|null} The generated report as a CSV string, or null if an error occurred.
 */
export function generateReport(results, sitemapUrl, logger) {
  logger.info('Generating SEO report');
  const startTime = process.hrtime();

  try {
    validateResults(results);

    const reportSections = getReportSections(results, sitemapUrl);
    const reportData = generateReportSections(reportSections, logger);
    const processedReportData = processReportData(reportData);

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    logger.info(`Report generation completed in ${duration.toFixed(3)} seconds`);

    logger.debug('Report data generated successfully');
    return formatCsv(processedReportData);
  } catch (error) {
    logger.error('Error generating report:', error);
    return null;
  }
}

/**
 * Gets the report sections configuration.
 * @param {Object} results - The SEO analysis results.
 * @param {string} sitemapUrl - The URL of the analyzed sitemap.
 * @returns {Array} The report sections configuration.
 */
function getReportSections(results, sitemapUrl) {
  return [
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
}

/**
 * Generates report sections based on the configuration.
 * @param {Array} reportSections - The report sections configuration.
 * @param {Object} logger - The logger object.
 * @returns {Array} The generated report data.
 */
function generateReportSections(reportSections, logger) {
  let completedSections = 0;
  const totalSections = reportSections.length;

  return reportSections.flatMap((section) => {
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
}

/**
 * Processes the report data by rounding numeric values and sanitizing.
 * @param {Array} reportData - The raw report data.
 * @returns {Array} The processed report data.
 */
function processReportData(reportData) {
  return reportData.map((row) => row.map((cell) => {
    const roundedCell = typeof cell === 'number' ? Number(cell.toFixed(2)) : cell;
    return sanitizeForCsv(roundedCell);
  }));
}

/**
 * Generates the header section of the report.
 * @param {string} sitemapUrl - The URL of the analyzed sitemap.
 * @returns {Array} The header section data.
 */
function generateHeader(sitemapUrl) {
  return [
    ['SEO Analysis Report'],
    ['Date', new Date().toLocaleDateString()],
    ['Time', new Date().toLocaleTimeString()],
    ['Sitemap URL', sitemapUrl],
    [], // Empty row for spacing
  ];
}
/**
 * Generates the summary section of the report.
 * @param {Object} results - The SEO analysis results.
 * @param {Object} responseCategories - The categorized response codes.
 * @returns {Array} The summary section data.
 */
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

/**
 * Generates the URL analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The URL analysis section data.
 */
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

/**
 * Generates the page title analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The page title analysis section data.
 */
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

/**
 * Generates the meta description analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The meta description analysis section data.
 */
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

/**
 * Generates the heading analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The heading analysis section data.
 */
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

/**
 * Generates the image analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The image analysis section data.
 */
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

/**
 * Generates the link analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The link analysis section data.
 */
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

/**
 * Generates the security analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The security analysis section data.
 */
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

/**
 * Generates the hreflang analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The hreflang analysis section data.
 */
function generateHreflangAnalysis(results) {
  return [
    ['Hreflang Analysis', 'Count'],
    ['Pages with hreflang', results.hreflangMetrics.pagesWithHreflang],
    ['Missing return links', results.hreflangMetrics.missingReturnLinks],
    ['Incorrect language codes', results.hreflangMetrics.incorrectLanguageCodes],
    [],
  ];
}

/**
 * Generates the canonical analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The canonical analysis section data.
 */
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

/**
 * Generates the content analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The content analysis section data.
 */
function generateContentAnalysis(results) {
  return [
    ['Content Analysis', 'Count'],
    ['Low content pages', results.contentMetrics.lowContent],
    ['Duplicate content pages', results.contentMetrics.duplicate],
    [],
  ];
}

/**
 * Generates the orphaned URLs analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The orphaned URLs analysis section data.
 */
function generateOrphanedUrlsAnalysis(results) {
  return [
    ['Orphaned URLs Analysis', 'Count'],
    ['Orphaned URLs', results.orphanedUrls ? results.orphanedUrls.size : 0],
    [],
  ];
}

/**
 * Generates the Pa11y analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The Pa11y analysis section data.
 */
function generatePa11yAnalysis(results) {
  const totalIssues = results.pa11y.reduce((sum, result) => sum + (result.issues ? result.issues.length : 0), 0);
  return [
    ['Accessibility Analysis', 'Count'],
    ['Total Pa11y issues', totalIssues],
    [],
  ];
}

/**
 * Generates the JavaScript errors analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The JavaScript errors analysis section data.
 */
function generateJavaScriptErrorsAnalysis(results) {
  const pagesWithJsErrors = results.contentAnalysis.filter((page) => page.jsErrors && page.jsErrors.length > 0).length;
  return [
    ['JavaScript Errors Analysis', 'Count'],
    ['Pages with JavaScript errors', pagesWithJsErrors],
    [],
  ];
}

/**
 * Generates the SEO score analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The SEO score analysis section data.
 */
function generateSeoScoreAnalysis(results) {
  const averageScore = results.seoScores.reduce((sum, score) => sum + score.score, 0) / results.seoScores.length;
  return [
    ['SEO Score Analysis', 'Score'],
    ['Average SEO Score', averageScore.toFixed(2)],
    [],
  ];
}

/**
 * Generates the performance analysis section of the report.
 * @param {Object} results - The SEO analysis results.
 * @returns {Array} The performance analysis section data.
 */
function generatePerformanceAnalysis(results) {
  const avgLoadTime = results.performanceAnalysis.reduce((sum, perf) => sum + perf.loadTime, 0) / results.performanceAnalysis.length;
  return [
    ['Performance Analysis', 'Time (ms)'],
    ['Average Load Time', avgLoadTime.toFixed(2)],
    [],
  ];
}
