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
  const requiredProperties = [
    'urlMetrics', 'responseCodeMetrics', 'titleMetrics', 'metaDescriptionMetrics',
    'h1Metrics', 'h2Metrics', 'imageMetrics', 'linkMetrics', 'securityMetrics',
    'hreflangMetrics', 'canonicalMetrics', 'contentMetrics', 'seoScores', 'performanceAnalysis',
    'pa11y', 'contentAnalysis'
  ];
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

export function generateReport(results, sitemapUrl) {
  global.auditcore.logger.info('Generating SEO report');
  const startTime = process.hrtime();

  try {
    validateResults(results);

    const reportSections = getReportSections(results, sitemapUrl);
    const reportData = generateReportSections(reportSections);
    const processedReportData = processReportData(reportData);

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    global.auditcore.logger.info(`Report generation completed in ${duration.toFixed(3)} seconds`);

    return formatCsv(processedReportData);
  } catch (error) {
    global.auditcore.logger.error('Error generating report:', error);
    return null;
  }
}

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
    { name: 'Accessibility Analysis', generator: generateAccessibilityAnalysis, args: [results] },
    { name: 'JavaScript Errors Analysis', generator: generateJavaScriptErrorsAnalysis, args: [results] },
    { name: 'SEO Score Analysis', generator: generateSeoScoreAnalysis, args: [results] },
    { name: 'Performance Analysis', generator: generatePerformanceAnalysis, args: [results] },
    { name: 'Recommendations', generator: generateRecommendations, args: [results] },
  ];
}

function generateReportSections(reportSections) {
  let completedSections = 0;
  const totalSections = reportSections.length;

  return reportSections.flatMap((section) => {
    try {
      global.auditcore.logger.debug(`Generating ${section.name} section`);
      const sectionData = section.generator(...section.args);
      completedSections += 1;
      global.auditcore.logger.debug(`Completed ${completedSections}/${totalSections} sections`);
      return sectionData;
    } catch (error) {
      global.auditcore.logger.error(`Error generating ${section.name} section:`, error);
      return [['Error', `Failed to generate ${section.name} section`]];
    }
  });
}

function processReportData(reportData) {
  return reportData.map((row) => row.map((cell) => {
    const roundedCell = typeof cell === 'number' ? Number(cell.toFixed(2)) : cell;
    return sanitizeForCsv(roundedCell);
  }));
}

function generateHeader(sitemapUrl) {
  return [
    ['SEO Analysis Report'],
    ['Date', new Date().toLocaleDateString()],
    ['Time', new Date().toLocaleTimeString()],
    ['Sitemap URL', sitemapUrl],
    [],
  ];
}

function generateSummary(results, responseCategories) {
  const totalPages = results.urlMetrics.total;
  return [
    ['Summary', 'Count', 'Percentage'],
    ['Total URLs', totalPages, '100%'],
    ['Internal URLs', results.urlMetrics.internal, `${(results.urlMetrics.internal / totalPages * 100).toFixed(2)}%`],
    ['External URLs', results.urlMetrics.external, `${(results.urlMetrics.external / totalPages * 100).toFixed(2)}%`],
    ['Indexable URLs', results.urlMetrics.internalIndexable, `${(results.urlMetrics.internalIndexable / totalPages * 100).toFixed(2)}%`],
    ['Non-Indexable URLs', results.urlMetrics.internalNonIndexable, `${(results.urlMetrics.internalNonIndexable / totalPages * 100).toFixed(2)}%`],
    [],
    ['Response Codes', 'Count', 'Percentage'],
    ['2xx (Success)', responseCategories['2xx'], `${(responseCategories['2xx'] / totalPages * 100).toFixed(2)}%`],
    ['3xx (Redirection)', responseCategories['3xx'], `${(responseCategories['3xx'] / totalPages * 100).toFixed(2)}%`],
    ['4xx (Client Error)', responseCategories['4xx'], `${(responseCategories['4xx'] / totalPages * 100).toFixed(2)}%`],
    ['5xx (Server Error)', responseCategories['5xx'], `${(responseCategories['5xx'] / totalPages * 100).toFixed(2)}%`],
    [],
  ];
}

function generateUrlAnalysis(results) {
  const totalUrls = results.urlMetrics.total;
  return [
    ['URL Analysis', 'Count', 'Percentage'],
    ['URLs with non-ASCII characters', results.urlMetrics.nonAscii, `${(results.urlMetrics.nonAscii / totalUrls * 100).toFixed(2)}%`],
    ['URLs with uppercase characters', results.urlMetrics.uppercase, `${(results.urlMetrics.uppercase / totalUrls * 100).toFixed(2)}%`],
    ['URLs with underscores', results.urlMetrics.underscores, `${(results.urlMetrics.underscores / totalUrls * 100).toFixed(2)}%`],
    ['URLs with spaces', results.urlMetrics.containsSpace, `${(results.urlMetrics.containsSpace / totalUrls * 100).toFixed(2)}%`],
    ['URLs over 115 characters', results.urlMetrics.overLength, `${(results.urlMetrics.overLength / totalUrls * 100).toFixed(2)}%`],
    [],
  ];
}
function safePercentage(count, total) {
  if (total === 0 || typeof count !== 'number') return 'N/A';
  return `${((count / total) * 100).toFixed(2)}%`;
}

function generatePageTitleAnalysis(results) {
  const totalPages = results.urlMetrics.total;
  return [
    ['Page Title Analysis', 'Count', 'Percentage'],
    ['Missing titles', results.titleMetrics.missing || 0, safePercentage(results.titleMetrics.missing, totalPages)],
    ['Duplicate titles', results.titleMetrics.duplicate || 0, safePercentage(results.titleMetrics.duplicate, totalPages)],
    ['Titles over 60 characters', results.titleMetrics.tooLong || 0, safePercentage(results.titleMetrics.tooLong, totalPages)],
    ['Titles under 30 characters', results.titleMetrics.tooShort || 0, safePercentage(results.titleMetrics.tooShort, totalPages)],
    [],
  ];
}

function generateMetaDescriptionAnalysis(results) {
  const totalPages = results.urlMetrics.total;
  return [
    ['Meta Description Analysis', 'Count', 'Percentage'],
    ['Missing meta descriptions', results.metaDescriptionMetrics.missing || 0, safePercentage(results.metaDescriptionMetrics.missing, totalPages)],
    ['Duplicate meta descriptions', results.metaDescriptionMetrics.duplicate || 0, safePercentage(results.metaDescriptionMetrics.duplicate, totalPages)],
    ['Meta descriptions over 155 characters', results.metaDescriptionMetrics.tooLong || 0, safePercentage(results.metaDescriptionMetrics.tooLong, totalPages)],
    ['Meta descriptions under 70 characters', results.metaDescriptionMetrics.tooShort || 0, safePercentage(results.metaDescriptionMetrics.tooShort, totalPages)],
    [],
  ];
}

function generateHeadingAnalysis(results) {
  const totalPages = results.urlMetrics.total;
  return [
    ['Heading Analysis', 'Count', 'Percentage'],
    ['Missing H1', results.h1Metrics.missing || 0, safePercentage(results.h1Metrics.missing, totalPages)],
    ['Multiple H1s', results.h1Metrics.multiple || 0, safePercentage(results.h1Metrics.multiple, totalPages)],
    ['H1s over 70 characters', results.h1Metrics.tooLong || 0, safePercentage(results.h1Metrics.tooLong, totalPages)],
    ['Missing H2', results.h2Metrics.missing || 0, safePercentage(results.h2Metrics.missing, totalPages)],
    ['Non-sequential H2s', results.h2Metrics.nonSequential || 0, safePercentage(results.h2Metrics.nonSequential, totalPages)],
    [],
  ];
}

function generateImageAnalysis(results) {
  const totalImages = results.imageMetrics.total || 0;
  return [
    ['Image Analysis', 'Count', 'Percentage'],
    ['Total images', totalImages, '100%'],
    ['Images missing alt text', results.imageMetrics.missingAlt || 0, safePercentage(results.imageMetrics.missingAlt, totalImages)],
    ['Images with empty alt attribute', results.imageMetrics.missingAltAttribute || 0, safePercentage(results.imageMetrics.missingAltAttribute, totalImages)],
    ['Images with alt text over 100 characters', results.imageMetrics.altTextTooLong || 0, safePercentage(results.imageMetrics.altTextTooLong, totalImages)],
    [],
  ];
}

function generateLinkAnalysis(results) {
  const totalPages = results.urlMetrics.total;
  return [
    ['Link Analysis', 'Count', 'Percentage'],
    ['Pages without internal links', results.linkMetrics.pagesWithoutInternalOutlinks || 0, safePercentage(results.linkMetrics.pagesWithoutInternalOutlinks, totalPages)],
    ['Pages with high number of external links', results.linkMetrics.pagesWithHighExternalOutlinks || 0, safePercentage(results.linkMetrics.pagesWithHighExternalOutlinks, totalPages)],
    ['Internal links without anchor text', results.linkMetrics.internalOutlinksWithoutAnchorText || 0, safePercentage(results.linkMetrics.internalOutlinksWithoutAnchorText, totalPages)],
    ['Non-descriptive anchor text', results.linkMetrics.nonDescriptiveAnchorText || 0, safePercentage(results.linkMetrics.nonDescriptiveAnchorText, totalPages)],
    [],
  ];
}

function generateSecurityAnalysis(results) {
  const totalPages = results.urlMetrics.total;
  return [
    ['Security Analysis', 'Count', 'Percentage'],
    ['HTTP URLs (non-secure)', results.securityMetrics.httpUrls || 0, safePercentage(results.securityMetrics.httpUrls, totalPages)],
    ['Missing HSTS header', results.securityMetrics.missingHstsHeader || 0, safePercentage(results.securityMetrics.missingHstsHeader, totalPages)],
    ['Missing Content Security Policy', results.securityMetrics.missingContentSecurityPolicy || 0, safePercentage(results.securityMetrics.missingContentSecurityPolicy, totalPages)],
    ['Missing X-Frame-Options header', results.securityMetrics.missingXFrameOptions || 0, safePercentage(results.securityMetrics.missingXFrameOptions, totalPages)],
    ['Missing X-Content-Type-Options header', results.securityMetrics.missingXContentTypeOptions || 0, safePercentage(results.securityMetrics.missingXContentTypeOptions, totalPages)],
    [],
  ];
}

function generateHreflangAnalysis(results) {
  const totalPages = results.urlMetrics.total;
  return [
    ['Hreflang Analysis', 'Count', 'Percentage'],
    ['Pages with hreflang', results.hreflangMetrics.pagesWithHreflang || 0, safePercentage(results.hreflangMetrics.pagesWithHreflang, totalPages)],
    ['Missing return links', results.hreflangMetrics.missingReturnLinks || 0, safePercentage(results.hreflangMetrics.missingReturnLinks, totalPages)],
    ['Incorrect language codes', results.hreflangMetrics.incorrectLanguageCodes || 0, safePercentage(results.hreflangMetrics.incorrectLanguageCodes, totalPages)],
    [],
  ];
}

function generateCanonicalAnalysis(results) {
  const totalPages = results.urlMetrics.total;
  const pagesWithCanonical = (results.canonicalMetrics.selfReferencing || 0) + (results.canonicalMetrics.nonSelf || 0);
  return [
    ['Canonical Analysis', 'Count', 'Percentage'],
    ['Pages with canonical tags', pagesWithCanonical, safePercentage(pagesWithCanonical, totalPages)],
    ['Self-referencing canonicals', results.canonicalMetrics.selfReferencing || 0, safePercentage(results.canonicalMetrics.selfReferencing, totalPages)],
    ['Non-self canonicals', results.canonicalMetrics.nonSelf || 0, safePercentage(results.canonicalMetrics.nonSelf, totalPages)],
    ['Missing canonical tags', results.canonicalMetrics.missing || 0, safePercentage(results.canonicalMetrics.missing, totalPages)],
    [],
  ];
}

function generateContentAnalysis(results) {
  const totalPages = results.urlMetrics.total;
  return [
    ['Content Analysis', 'Count', 'Percentage'],
    ['Low content pages', results.contentMetrics.lowContent || 0, safePercentage(results.contentMetrics.lowContent, totalPages)],
    ['Duplicate content pages', results.contentMetrics.duplicate || 0, safePercentage(results.contentMetrics.duplicate, totalPages)],
    ['Average word count', results.contentMetrics.averageWordCount || 'N/A', 'N/A'],
    [],
  ];
}
function generateOrphanedUrlsAnalysis(results) {
  const totalPages = results.urlMetrics.total;
  const orphanedUrls = results.orphanedUrls ? results.orphanedUrls.size : 0;
  return [
    ['Orphaned URLs Analysis', 'Count', 'Percentage'],
    ['Orphaned URLs', orphanedUrls, `${(orphanedUrls / totalPages * 100).toFixed(2)}%`],
    [],
  ];
}

function generateAccessibilityAnalysis(results) {
  const totalIssues = results.pa11y.reduce((sum, result) => sum + (result.issues?.length || 0), 0);
  const issuesByType = results.pa11y.reduce((acc, result) => {
    result.issues?.forEach(issue => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
    });
    return acc;
  }, {});

  const analysisRows = [
    ['Accessibility Analysis', 'Count'],
    ['Total Pa11y issues', totalIssues],
  ];

  Object.entries(issuesByType).forEach(([type, count]) => {
    analysisRows.push([`${type} issues`, count]);
  });

  analysisRows.push([]);
  return analysisRows;
}

function generateJavaScriptErrorsAnalysis(results) {
  const pagesWithJsErrors = results.contentAnalysis.filter(page => page.jsErrors?.length > 0).length;
  const totalPages = results.urlMetrics.total;
  return [
    ['JavaScript Errors Analysis', 'Count', 'Percentage'],
    ['Pages with JavaScript errors', pagesWithJsErrors, `${(pagesWithJsErrors / totalPages * 100).toFixed(2)}%`],
    [],
  ];
}

function generateSeoScoreAnalysis(results) {
  const scores = results.seoScores.map(score => score.score);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  return [
    ['SEO Score Analysis', 'Score'],
    ['Average SEO Score', averageScore.toFixed(2)],
    ['Lowest SEO Score', minScore],
    ['Highest SEO Score', maxScore],
    [],
  ];
}

function generatePerformanceAnalysis(results) {
  const avgLoadTime = results.performanceAnalysis.reduce((sum, perf) => sum + perf.loadTime, 0) / results.performanceAnalysis.length;
  const avgFirstPaint = results.performanceAnalysis.reduce((sum, perf) => sum + perf.firstPaint, 0) / results.performanceAnalysis.length;
  const avgFirstContentfulPaint = results.performanceAnalysis.reduce((sum, perf) => sum + perf.firstContentfulPaint, 0) / results.performanceAnalysis.length;

  return [
    ['Performance Analysis', 'Time (ms)'],
    ['Average Load Time', avgLoadTime.toFixed(2)],
    ['Average First Paint', avgFirstPaint.toFixed(2)],
    ['Average First Contentful Paint', avgFirstContentfulPaint.toFixed(2)],
    [],
  ];
}

function generateRecommendations(results) {
  const recommendations = [];

  if (results.titleMetrics.missing > 0) {
    recommendations.push('Add title tags to pages missing them');
  }
  if (results.titleMetrics.tooLong > 0) {
    recommendations.push('Shorten title tags that are over 60 characters');
  }
  if (results.metaDescriptionMetrics.missing > 0) {
    recommendations.push('Add meta descriptions to pages missing them');
  }
  if (results.h1Metrics.missing > 0) {
    recommendations.push('Add H1 tags to pages missing them');
  }
  if (results.imageMetrics.missingAlt > 0) {
    recommendations.push('Add alt text to images missing it');
  }
  if (results.securityMetrics.httpUrls > 0) {
    recommendations.push('Migrate all pages to HTTPS');
  }
  if (results.contentMetrics.lowContent > 0) {
    recommendations.push('Improve content on pages with low word count');
  }

  return [
    ['Top SEO Recommendations'],
    ...recommendations.map(rec => [rec]),
    [],
  ];
}
