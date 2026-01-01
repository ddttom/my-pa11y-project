import fs from 'fs/promises';
import path from 'path';
import { formatCsv } from './csvFormatter.js';
import {
  seoScoreThresholds,
  performanceThresholds,
  contentThresholds,
  urlThresholds,
  titleThresholds,
  metaDescriptionThresholds,
} from '../config/options.js';

// Utility function for percentage calculation
function calculatePercentage(value, total, decimalPlaces = 2) {
  if (total === 0) return '0.00%';
  return `${((value / total) * 100).toFixed(decimalPlaces)}%`;
}

function getSeoScoreComment(score) {
  if (score >= seoScoreThresholds.excellent) return 'Excellent';
  if (score >= seoScoreThresholds.veryGood) return 'Very Good';
  if (score >= seoScoreThresholds.good) return 'Good';
  if (score >= seoScoreThresholds.fair) return 'Fair';
  if (score >= seoScoreThresholds.needsImprovement) return 'Needs Improvement';
  return 'Poor';
}

function getPerformanceComment(metric, value) {
  if (value === null || value === undefined) return 'N/A';
  const thresholds = performanceThresholds[metric];
  if (!thresholds) return 'Unknown metric';
  if (value <= thresholds.excellent) return 'Excellent';
  if (value <= thresholds.good) return 'Good';
  if (value <= thresholds.fair) return 'Fair';
  return 'Needs Improvement';
}

function roundToTwoDecimals(value) {
  return value !== null && value !== undefined ? Number(value.toFixed(2)) : null;
}

async function saveFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    global.auditcore.logger.info(`File saved successfully: ${filePath}`);
  } catch (error) {
    global.auditcore.logger.error(`Error saving file ${filePath}:`, error);
    throw error;
  }
}

export async function postProcessResults(results, outputDir) {
  global.auditcore.logger.info('Post-processing results');
  const commonPa11yIssues = analyzeCommonPa11yIssues(results.pa11y);
  await saveCommonPa11yIssues(commonPa11yIssues, outputDir);
  results.pa11y = filterRepeatedPa11yIssues(results.pa11y, commonPa11yIssues);
  global.auditcore.logger.info('Results post-processing completed');
}

export async function saveResults(results, outputDir, sitemapUrl) {
  global.auditcore.logger.info(`Saving results to: ${outputDir}`);

  const saveOperations = [
    { name: 'Results', func: () => saveDiagnostics(results, outputDir) },
    { name: 'Image information', func: () => saveImageInfo(results.contentAnalysis, outputDir) },
    { name: 'Pa11y results', func: () => savePa11yResults(results, outputDir) },
    { name: 'Internal links', func: () => saveInternalLinks(results, outputDir) },
    { name: 'Images without alt', func: () => saveImagesWithoutAlt(results.contentAnalysis, outputDir) },
    { name: 'Content analysis', func: () => saveContentAnalysis(results, outputDir) },
    { name: 'Orphaned URLs', func: () => saveOrphanedUrls(results, outputDir) },
    { name: 'SEO report', func: () => saveSeoReport(results, outputDir, sitemapUrl) },
    { name: 'SEO scores', func: () => saveSeoScores(results, outputDir) },
    { name: 'Performance analysis', func: () => savePerformanceAnalysis(results, outputDir) },
    { name: 'SEO scores summary', func: () => saveSeoScoresSummary(results, outputDir) },
  ];

  const saveResultsList = await Promise.allSettled(
    saveOperations.map(async (operation) => {
      try {
        global.auditcore.logger.debug(`Attempting to save ${operation.name}...`);
        const result = await operation.func();
        if (typeof result === 'number') {
          global.auditcore.logger.debug(`${operation.name}: ${result} items saved`);
        } else {
          global.auditcore.logger.debug(`${operation.name} saved successfully`);
        }
        return { name: operation.name, success: true, result };
      } catch (error) {
        global.auditcore.logger.error(`Error saving ${operation.name}:`, error);
        return { name: operation.name, success: false, error: error.message };
      }
    }),
  );

  const successfulOperations = saveResultsList.filter(
    (result) => result.status === 'fulfilled' && result.value.success,
  );
  const failedOperations = saveResultsList.filter(
    (result) => result.status === 'rejected' || !result.value.success,
  );

  global.auditcore.logger.info(
    `Successfully saved ${successfulOperations.length} out of ${saveOperations.length} result types`,
  );
  if (failedOperations.length > 0) {
    global.auditcore.logger.warn(`Failed to save ${failedOperations.length} result types`);
    failedOperations.forEach((result) => {
      global.auditcore.logger.warn(
        `  - ${result.value.name}: ${result.value.error || result.reason}`,
      );
    });
  }

  global.auditcore.logger.info(`All results saved to ${outputDir}`);
}

async function savePa11yResults(results, outputDir) {
  global.auditcore.logger.debug('Starting savePa11yResults function');

  await saveRawPa11yResult(results, outputDir);

  const flattenedResults = flattenPa11yResults(results.pa11y);

  if (flattenedResults.length === 0) {
    global.auditcore.logger.info('No Pa11y issues found to save');
    return;
  }

  const pa11yCsv = formatCsv(
    flattenedResults,
    ['pageUrl', 'type', 'code', 'message', 'context', 'selector', 'error'],
  );

  await saveFile(path.join(outputDir, 'pa11y_results.csv'), pa11yCsv);
  global.auditcore.logger.info(`Pa11y results saved: ${flattenedResults.length} issues`);
}

function flattenPa11yResults(pa11yResults) {
  if (!pa11yResults || !Array.isArray(pa11yResults)) {
    global.auditcore.logger.warn('Pa11y results are missing or not in the expected format');
    return [];
  }

  return pa11yResults.flatMap((result) => {
    if (result.error) {
      return [{ pageUrl: result.url, error: result.error }];
    }
    if (!result.issues || !Array.isArray(result.issues)) {
      global.auditcore.logger.warn(`No issues found for ${result.url}`);
      return [];
    }
    return result.issues.map((issue) => ({
      pageUrl: result.pageUrl,
      type: issue.type,
      code: issue.code,
      message: issue.message,
      context: issue.context,
      selector: issue.selector,
    }));
  });
}

async function saveInternalLinks(results, outputDir) {
  global.auditcore.logger.debug('Starting to save internal links');

  const flattenedLinks = flattenInternalLinks(results.internalLinks);
  global.auditcore.logger.debug(`Flattened ${flattenedLinks.length} internal links`);

  const internalLinksCsv = formatCsv(
    flattenedLinks,
    ['source', 'target', 'anchorText'],
  );

  await saveFile(
    path.join(outputDir, 'internal_links.csv'),
    internalLinksCsv,
  );
  global.auditcore.logger.info(`Saved ${flattenedLinks.length} internal links to CSV`);
}

function flattenInternalLinks(internalLinks) {
  return internalLinks.flatMap((page) => (page.links || []).map((link) => ({
    source: page.url,
    target: link.url,
    anchorText: link.text || '',
  })));
}

async function saveImagesWithoutAlt(contentAnalysis, outputDir) {
  const totalImages = contentAnalysis.reduce((sum, page) => sum + (page.images ? page.images.length : 0), 0);
  global.auditcore.logger.info(`Total images scanned: ${totalImages}`);
  global.auditcore.logger.debug(`Pages scanned: ${contentAnalysis.map((page) => page.url).join(', ')}`);

  const imagesWithoutAlt = contentAnalysis.flatMap(
    (page) => page.imagesWithoutAlt || [],
  );

  if (imagesWithoutAlt.length > 0) {
    const headers = ['url', 'src', 'location'];
    const formattedImagesWithoutAlt = imagesWithoutAlt.map((img) => ({
      url: img.url,
      src: img.src,
      location: img.location || '',
    }));
    const imagesWithoutAltCsv = formatCsv(
      formattedImagesWithoutAlt,
      headers,
    );

    await saveFile(
      path.join(outputDir, 'images_without_alt.csv'),
      imagesWithoutAltCsv,
    );
    global.auditcore.logger.info(`${imagesWithoutAlt.length} out of ${totalImages} images are without alt text (${calculatePercentage(imagesWithoutAlt.length, totalImages)})`);
  } else {
    global.auditcore.logger.info(`All ${totalImages} images have alt text`);
  }

  return imagesWithoutAlt.length;
}

async function saveContentAnalysis(results, outputDir) {
  const headers = [
    'URL', 'Word Count', 'H1 Count', 'H2 Count', 'H3 Count', 'H4 Count', 'H5 Count', 'H6 Count',
    'Missing Headers', 'Zero H1', 'Images Count', 'Internal Links Count', 'External Links Count',
    'Title', 'Meta Description', 'Has Responsive Meta Tag', 'Scripts Count', 'Stylesheets Count',
    'HTML Lang', 'Canonical URL', 'Forms Count', 'Tables Count', 'Page Size', 'JS Errors Count',
    'Pa11y Issues Count',
  ];

  const contentAnalysisData = results.contentAnalysis.map((page) => ({
    URL: page.url,
    'Word Count': page.wordCount,
    'H1 Count': page.h1Count,
    'H2 Count': page.h2Count,
    'H3 Count': page.h3Count,
    'H4 Count': page.h4Count,
    'H5 Count': page.h5Count,
    'H6 Count': page.h6Count,
    'Missing Headers': getMissingHeaders(page.h1Count, page.h2Count, page.h3Count, page.h4Count, page.h5Count, page.h6Count),
    'Zero H1': page.h1Count === 0 ? 'true' : 'false',
    'Images Count': page.imagesCount,
    'Internal Links Count': page.internalLinksCount,
    'External Links Count': page.externalLinksCount,
    Title: page.title,
    'Meta Description': page.metaDescription,
    'Has Responsive Meta Tag': page.hasResponsiveMetaTag,
    'Scripts Count': page.scriptsCount,
    'Stylesheets Count': page.stylesheetsCount,
    'HTML Lang': page.htmlLang,
    'Canonical URL': page.canonicalUrl,
    'Forms Count': page.formsCount,
    'Tables Count': page.tablesCount,
    'Page Size': page.pageSize,
    'JS Errors Count': page.jsErrors,
    'Pa11y Issues Count': page.pa11yIssuesCount,
  }));

  const contentAnalysisCsv = formatCsv(contentAnalysisData, headers);

  try {
    await saveFile(
      path.join(outputDir, 'content_analysis.csv'),
      contentAnalysisCsv,
    );
    global.auditcore.logger.info('Content analysis saved to content_analysis.csv');
  } catch (error) {
    global.auditcore.logger.error(`Error saving content_analysis.csv: ${error.message}`);
  }
}

async function saveOrphanedUrls(results, outputDir) {
  if (results.orphanedUrls && results.orphanedUrls.size > 0) {
    const orphanedUrlsArray = Array.from(results.orphanedUrls).map((url) => ({
      url,
    }));
    const orphanedUrlsCsv = formatCsv(orphanedUrlsArray, ['url']);
    await saveFile(
      path.join(outputDir, 'orphaned_urls.csv'),
      orphanedUrlsCsv,
    );
    global.auditcore.logger.info(`${results.orphanedUrls.size} orphaned URLs saved`);
    return results.orphanedUrls.size;
  }
  global.auditcore.logger.info('No orphaned URLs found');
  return 0;
}

async function saveSeoReport(results, outputDir, sitemapUrl) {
  const report = generateUpdatedReport(results, sitemapUrl);
  await saveFile(path.join(outputDir, 'seo_report.csv'), report);
  global.auditcore.logger.debug('SEO report saved');
}

function generateUpdatedReport(results, sitemapUrl) {
  const totalUrls = results.contentAnalysis.length;
  const analysis = analyzeContentData(results.contentAnalysis);

  const reportSections = [
    generateHeader(sitemapUrl),
    generateSummary(results, totalUrls),
    generateUrlAnalysis(results.urlMetrics, totalUrls),
    generatePageTitleAnalysis(analysis, totalUrls),
    generateMetaDescriptionAnalysis(analysis, totalUrls),
    generateHeadingAnalysis(analysis, totalUrls),
    generateImageAnalysis(analysis),
    generateLinkAnalysis(results.linkMetrics, totalUrls),
    generateSecurityAnalysis(results.securityMetrics, totalUrls),
    generateHreflangAnalysis(results.hreflangMetrics, totalUrls),
    generateCanonicalAnalysis(results.canonicalMetrics, totalUrls),
    generateContentAnalysis(analysis, totalUrls),
    generateOrphanedUrlsAnalysis(results.orphanedUrls, totalUrls),
    generateAccessibilityAnalysis(results.pa11y),
    generateJavaScriptErrorsAnalysis(analysis, totalUrls),
    generateSeoScoreAnalysis(results.seoScores),
    generatePerformanceAnalysis(results.performanceAnalysis),
    generateRecommendations(analysis, results),
  ];

  return formatCsv(reportSections.flat());
}

function getMissingHeaders(h1Count, h2Count, h3Count, h4Count, h5Count, h6Count) {
  const headers = [h1Count, h2Count, h3Count, h4Count, h5Count, h6Count];
  const missingHeaders = new Set(); // Use a Set to avoid duplicates

  // Check for missing H1 separately
  if (h1Count === 0) {
    missingHeaders.add('H1');
  }

  let highestSeen = h1Count > 0 ? 0 : -1;

  for (let i = 1; i < headers.length; i++) {
    if (headers[i] > 0) {
      for (let j = highestSeen + 1; j < i; j++) {
        missingHeaders.add(`H${j + 1}`);
      }
      highestSeen = i;
    }
  }

  const missingHeadersArray = Array.from(missingHeaders);
  return missingHeadersArray.length > 0 ? missingHeadersArray.join(', ') : 'None';
}

function analyzeContentData(contentAnalysis) {
  return contentAnalysis.reduce((acc, page) => {
    const titleLength = page.title ? page.title.length : 0;
    const metaDescLength = page.metaDescription ? page.metaDescription.length : 0;
    const missingHeaders = getMissingHeaders(page.h1Count, page.h2Count, page.h3Count, page.h4Count, page.h5Count, page.h6Count);

    acc.pagesWithMissingHeaders += missingHeaders !== 'None' ? 1 : 0;
    acc.missingHeaders.push(missingHeaders);

    acc.titleOverLength += titleLength > titleThresholds.maxLength ? 1 : 0;
    acc.titleUnderLength += titleLength < titleThresholds.minLength && titleLength > 0 ? 1 : 0;
    acc.missingTitles += titleLength === 0 ? 1 : 0;

    acc.metaDescOverLength += metaDescLength > metaDescriptionThresholds.maxLength ? 1 : 0;
    acc.metaDescUnderLength += metaDescLength < metaDescriptionThresholds.minLength && metaDescLength > 0 ? 1 : 0;
    acc.missingMetaDesc += metaDescLength === 0 ? 1 : 0;

    acc.missingH1 += page.h1Count === 0 ? 1 : 0;
    acc.multipleH1 += page.h1Count > 1 ? 1 : 0;
    acc.zeroH1 += page.h1Count === 0 ? 1 : 0;

    acc.totalImages += page.imagesCount || 0;
    acc.imagesWithoutAlt += page.imagesWithoutAlt || 0;

    acc.lowContentPages += page.wordCount < contentThresholds.lowWordCount ? 1 : 0;
    acc.totalWordCount += page.wordCount || 0;

    acc.pagesWithJsErrors += page.jsErrors > 0 ? 1 : 0;

    return acc;
  }, {
    titleOverLength: 0,
    titleUnderLength: 0,
    missingTitles: 0,
    missingHeaders: [],
    metaDescOverLength: 0,
    metaDescUnderLength: 0,
    missingMetaDesc: 0,
    missingH1: 0,
    multipleH1: 0,
    pagesWithMissingHeaders: 0,
    zeroH1: 0,
    totalImages: 0,
    imagesWithoutAlt: 0,
    lowContentPages: 0,
    totalWordCount: 0,
    pagesWithJsErrors: 0,
  });
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

function generateSummary(results, totalUrls) {
  const responseCategories = categorizeResponseCodes(results.responseCodeMetrics);
  return [
    ['Summary', 'Count', 'Percentage'],
    ['Total URLs', totalUrls, '100%'],
    ['Internal URLs', results.urlMetrics.internal, calculatePercentage(results.urlMetrics.internal, totalUrls)],
    ['External URLs', results.urlMetrics.external, calculatePercentage(results.urlMetrics.external, totalUrls)],
    ['Indexable URLs', results.urlMetrics.internalIndexable, calculatePercentage(results.urlMetrics.internalIndexable, totalUrls)],
    ['Non-Indexable URLs', results.urlMetrics.internalNonIndexable, calculatePercentage(results.urlMetrics.internalNonIndexable, totalUrls)],
    [],
    ['Response Codes', 'Count', 'Percentage'],
    ['2xx (Success)', responseCategories['2xx'], calculatePercentage(responseCategories['2xx'], totalUrls)],
    ['3xx (Redirection)', responseCategories['3xx'], calculatePercentage(responseCategories['3xx'], totalUrls)],
    ['4xx (Client Error)', responseCategories['4xx'], calculatePercentage(responseCategories['4xx'], totalUrls)],
    ['5xx (Server Error)', responseCategories['5xx'], calculatePercentage(responseCategories['5xx'], totalUrls)],
    [],
  ];
}

function generateUrlAnalysis(urlMetrics, totalUrls) {
  return [
    ['URL Analysis', 'Count', 'Percentage'],
    ['URLs with non-ASCII characters', urlMetrics.nonAscii, calculatePercentage(urlMetrics.nonAscii, totalUrls)],
    ['URLs with uppercase characters', urlMetrics.uppercase, calculatePercentage(urlMetrics.uppercase, totalUrls)],
    ['URLs with underscores', urlMetrics.underscores, calculatePercentage(urlMetrics.underscores, totalUrls)],
    ['URLs with spaces', urlMetrics.containsSpace, calculatePercentage(urlMetrics.containsSpace, totalUrls)],
    [`URLs over ${urlThresholds.maxLength} characters`, urlMetrics.overLength, calculatePercentage(urlMetrics.overLength, totalUrls)],
    [],
  ];
}

function generatePageTitleAnalysis(analysis, totalUrls) {
  return [
    ['Page Title Analysis', 'Count', 'Percentage'],
    ['Missing titles', analysis.missingTitles, calculatePercentage(analysis.missingTitles, totalUrls)],
    [`Titles over ${titleThresholds.maxLength} characters`, analysis.titleOverLength, calculatePercentage(analysis.titleOverLength, totalUrls)],
    [`Titles under ${titleThresholds.minLength} characters`, analysis.titleUnderLength, calculatePercentage(analysis.titleUnderLength, totalUrls)],
    [],
  ];
}

function generateMetaDescriptionAnalysis(analysis, totalUrls) {
  return [
    ['Meta Description Analysis', 'Count', 'Percentage'],
    ['Missing meta descriptions', analysis.missingMetaDesc, calculatePercentage(analysis.missingMetaDesc, totalUrls)],
    [`Meta descriptions over ${metaDescriptionThresholds.maxLength} characters`, analysis.metaDescOverLength, calculatePercentage(analysis.metaDescOverLength, totalUrls)],
    [`Meta descriptions under ${metaDescriptionThresholds.minLength} characters`, analysis.metaDescUnderLength, calculatePercentage(analysis.metaDescUnderLength, totalUrls)],
    [],
  ];
}

function generateHeadingAnalysis(analysis, totalUrls) {
  return [
    ['Heading Analysis', 'Count', 'Percentage'],
    ['Missing H1', analysis.missingH1, calculatePercentage(analysis.missingH1, totalUrls)],
    ['Multiple H1s', analysis.multipleH1, calculatePercentage(analysis.multipleH1, totalUrls)],
    [],
  ];
}

function generateImageAnalysis(analysis) {
  return [
    ['Image Analysis', 'Count', 'Percentage'],
    ['Total images', analysis.totalImages, '100%'],
    ['Images missing alt text', analysis.imagesWithoutAlt, calculatePercentage(analysis.imagesWithoutAlt, analysis.totalImages)],
    [],
  ];
}

function generateLinkAnalysis(linkMetrics, totalUrls) {
  return [
    ['Link Analysis', 'Count', 'Percentage'],
    ['Pages without internal links', linkMetrics.pagesWithoutInternalOutlinks || 0, calculatePercentage(linkMetrics.pagesWithoutInternalOutlinks || 0, totalUrls)],
    ['Pages with high number of external links', linkMetrics.pagesWithHighExternalOutlinks || 0, calculatePercentage(linkMetrics.pagesWithHighExternalOutlinks || 0, totalUrls)],
    [],
  ];
}

function generateSecurityAnalysis(securityMetrics, totalUrls) {
  return [
    ['Security Analysis', 'Count', 'Percentage'],
    ['HTTP URLs (non-secure)', securityMetrics.httpUrls || 0, calculatePercentage(securityMetrics.httpUrls || 0, totalUrls)],
    ['Missing HSTS header', securityMetrics.missingHstsHeader || 0, calculatePercentage(securityMetrics.missingHstsHeader || 0, totalUrls)],
    ['Missing Content Security Policy', securityMetrics.missingContentSecurityPolicy || 0, calculatePercentage(securityMetrics.missingContentSecurityPolicy || 0, totalUrls)],
    ['Missing X-Frame-Options header', securityMetrics.missingXFrameOptions || 0, calculatePercentage(securityMetrics.missingXFrameOptions || 0, totalUrls)],
    ['Missing X-Content-Type-Options header', securityMetrics.missingXContentTypeOptions || 0, calculatePercentage(securityMetrics.missingXContentTypeOptions || 0, totalUrls)],
    [],
  ];
}

function generateHreflangAnalysis(hreflangMetrics, totalUrls) {
  return [
    ['Hreflang Analysis', 'Count', 'Percentage'],
    ['Pages with hreflang', hreflangMetrics.pagesWithHreflang || 0, calculatePercentage(hreflangMetrics.pagesWithHreflang || 0, totalUrls)],
    [],
  ];
}

function generateCanonicalAnalysis(canonicalMetrics, totalUrls) {
  const totalCanonicals = (canonicalMetrics.selfReferencing || 0) + (canonicalMetrics.nonSelf || 0);
  const hasCanonicalsData = totalCanonicals > 0 || (canonicalMetrics.missing || 0) > 0;

  if (!hasCanonicalsData) {
    return [
      ['Canonical Analysis', 'Count', 'Percentage'],
      ['Pages with canonical tags', '0', '0.00%'],
      ['Self-referencing canonicals', '0', '0.00%'],
      ['Non-self canonicals', '0', '0.00%'],
      ['Missing canonical tags', totalUrls.toString(), '100.00%'],
      [],
    ];
  }

  return [
    ['Canonical Analysis', 'Count', 'Percentage'],
    ['Pages with canonical tags', totalCanonicals.toString(), calculatePercentage(totalCanonicals, totalUrls)],
    ['Self-referencing canonicals', (canonicalMetrics.selfReferencing || 0).toString(), calculatePercentage(canonicalMetrics.selfReferencing || 0, totalUrls)],
    ['Non-self canonicals', (canonicalMetrics.nonSelf || 0).toString(), calculatePercentage(canonicalMetrics.nonSelf || 0, totalUrls)],
    ['Missing canonical tags', (canonicalMetrics.missing || 0).toString(), calculatePercentage(canonicalMetrics.missing || 0, totalUrls)],
    [],
  ];
}

function generateContentAnalysis(analysis, totalUrls) {
  return [
    ['Content Analysis', 'Count', 'Percentage'],
    ['Low content pages', analysis.lowContentPages, calculatePercentage(analysis.lowContentPages, totalUrls)],
    ['Average word count', Math.round(analysis.totalWordCount / totalUrls), 'N/A'],
    [],
  ];
}

function generateOrphanedUrlsAnalysis(orphanedUrls, totalUrls) {
  const orphanedCount = orphanedUrls ? orphanedUrls.size : 0;
  return [
    ['Orphaned URLs Analysis', 'Count', 'Percentage'],
    ['Orphaned URLs', orphanedCount, calculatePercentage(orphanedCount, totalUrls)],
    [],
  ];
}

function generateAccessibilityAnalysis(pa11yResults) {
  const totalIssues = pa11yResults.reduce((sum, result) => sum + (result.issues ? result.issues.length : 0), 0);
  const issueTypes = pa11yResults.reduce((types, result) => {
    if (result.issues) {
      result.issues.forEach((issue) => {
        types[issue.type] = (types[issue.type] || 0) + 1;
      });
    }
    return types;
  }, {});

  const rows = [
    ['Accessibility Analysis', 'Count'],
    ['Total Pa11y issues', totalIssues],
  ];

  Object.entries(issueTypes).forEach(([type, count]) => {
    rows.push([`${type} issues`, count]);
  });

  rows.push([]);
  return rows;
}

function generateJavaScriptErrorsAnalysis(analysis, totalUrls) {
  return [
    ['JavaScript Errors Analysis', 'Count', 'Percentage'],
    ['Pages with JavaScript errors', analysis.pagesWithJsErrors, calculatePercentage(analysis.pagesWithJsErrors, totalUrls)],
    [],
  ];
}

function generateSeoScoreAnalysis(seoScores) {
  const scores = seoScores.map((score) => score.score);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const lowestScore = Math.min(...scores);
  const highestScore = Math.max(...scores);

  return [
    ['SEO Score Analysis', 'Score', 'Description'],
    ['Average SEO Score', averageScore.toFixed(2), getSeoScoreComment(averageScore)],
    ['Lowest SEO Score', lowestScore.toString(), getSeoScoreComment(lowestScore)],
    ['Highest SEO Score', highestScore.toString(), getSeoScoreComment(highestScore)],
    [],
  ];
}

function generatePerformanceAnalysis(performanceAnalysis) {
  const calculateAverage = (metric) => {
    const validValues = performanceAnalysis
      .map((perf) => perf[metric])
      .filter((value) => value !== null && value !== undefined);
    return validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : null;
  };

  const avgLoadTime = calculateAverage('loadTime');
  const avgFirstPaint = calculateAverage('firstPaint');
  const avgFirstContentfulPaint = calculateAverage('firstContentfulPaint');

  return [
    ['Performance Analysis', 'Time (ms)', 'Comment'],
    ['Average Load Time', roundToTwoDecimals(avgLoadTime), getPerformanceComment('loadTime', avgLoadTime)],
    ['Average First Paint', roundToTwoDecimals(avgFirstPaint), getPerformanceComment('firstPaint', avgFirstPaint)],
    ['Average First Contentful Paint', roundToTwoDecimals(avgFirstContentfulPaint), getPerformanceComment('firstContentfulPaint', avgFirstContentfulPaint)],
    [],
  ];
}

function generateRecommendations(analysis, results) {
  const recommendations = [];

  if (analysis.missingTitles > 0) recommendations.push('Add title tags to pages missing them');
  if (analysis.titleOverLength > 0) recommendations.push('Shorten title tags that are over 60 characters');
  if (analysis.missingMetaDesc > 0) recommendations.push('Add meta descriptions to pages missing them');
  if (analysis.missingH1 > 0) recommendations.push('Add H1 tags to pages missing them');
  if (analysis.imagesWithoutAlt > 0) recommendations.push('Add alt text to images missing it');
  if (results.securityMetrics.httpUrls > 0) recommendations.push('Migrate all pages to HTTPS');
  if (analysis.lowContentPages > 0) recommendations.push('Improve content on pages with low word count');

  return [
    ['Top SEO Recommendations'],
    ...recommendations.map((rec) => [rec]),
    [],
  ];
}

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

async function saveSeoScores(results, outputDir) {
  const seoScoresFormatted = results.seoScores.map((score) => ({
    url: score.url || '',
    score: typeof score.score === 'number' ? Number(score.score.toFixed(2)) : 'N/A',
    description: typeof score.score === 'number' ? getSeoScoreComment(score.score) : 'N/A',
    ...Object.fromEntries(
      Object.entries(score.details || {}).map(([key, value]) => [
        `details.${key}`,
        typeof value === 'number' ? Number(value.toFixed(2)) : 'N/A',
      ]),
    ),
  }));

  const headers = [
    'url', 'score', 'description', 'details.titleOptimization', 'details.metaDescriptionOptimization',
    'details.urlStructure', 'details.h1Optimization', 'details.contentLength',
    'details.internalLinking', 'details.imageOptimization', 'details.pageSpeed',
    'details.mobileOptimization', 'details.securityFactors', 'details.structuredData',
    'details.socialMediaTags',
  ];

  const seoScoresCsv = formatCsv(seoScoresFormatted, headers);
  await saveFile(path.join(outputDir, 'seo_scores.csv'), seoScoresCsv);
  global.auditcore.logger.debug('SEO scores saved');
}

async function savePerformanceAnalysis(results, outputDir) {
  const roundedPerformanceAnalysis = results.performanceAnalysis.map(
    (entry) => ({
      url: entry.url,
      loadTime: roundToTwoDecimals(entry.loadTime),
      loadTimeComment: getPerformanceComment('loadTime', entry.loadTime),
      domContentLoaded: roundToTwoDecimals(entry.domContentLoaded),
      domContentLoadedComment: getPerformanceComment('domContentLoaded', entry.domContentLoaded),
      firstPaint: roundToTwoDecimals(entry.firstPaint),
      firstPaintComment: getPerformanceComment('firstPaint', entry.firstPaint),
      firstContentfulPaint: roundToTwoDecimals(entry.firstContentfulPaint),
      firstContentfulPaintComment: getPerformanceComment('firstContentfulPaint', entry.firstContentfulPaint),
    }),
  );

  const csvData = [
    [
      'url',
      'loadTime',
      'loadTimeComment',
      'domContentLoaded',
      'domContentLoadedComment',
      'firstPaint',
      'firstPaintComment',
      'firstContentfulPaint',
      'firstContentfulPaintComment',
    ],
    ...roundedPerformanceAnalysis.map((entry) => [
      entry.url,
      entry.loadTime,
      entry.loadTimeComment,
      entry.domContentLoaded,
      entry.domContentLoadedComment,
      entry.firstPaint,
      entry.firstPaintComment,
      entry.firstContentfulPaint,
      entry.firstContentfulPaintComment,
    ]),
  ];

  const performanceAnalysisCsv = formatCsv(csvData);
  await saveFile(
    path.join(outputDir, 'performance_analysis.csv'),
    performanceAnalysisCsv,
  );
  global.auditcore.logger.debug('Performance analysis saved');
  return roundedPerformanceAnalysis.length;
}

async function saveSeoScoresSummary(results, outputDir) {
  const getScoreComment = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  };

  const sumScores = results.seoScores.reduce(
    (sum, score) => {
      if (score && typeof score === 'object') {
        sum.totalScore += score.score || 0;
        if (score.details && typeof score.details === 'object') {
          Object.entries(score.details).forEach(([key, value]) => {
            sum.details[key] = (sum.details[key] || 0) + (value || 0);
          });
        }
      }
      return sum;
    },
    { totalScore: 0, details: {} },
  );

  const urlCount = results.seoScores.length;
  const averageScores = {
    overallScore: sumScores.totalScore / urlCount,
    details: Object.fromEntries(
      Object.entries(sumScores.details).map(([key, value]) => [
        key,
        value / urlCount,
      ]),
    ),
  };

  const summaryData = [['Metric', 'Average Score', 'Comment']];

  const addMetricToSummary = (metricName, score) => {
    const formattedScore = (score * 100).toFixed(2);
    summaryData.push([
      metricName,
      formattedScore,
      getScoreComment(parseFloat(formattedScore)),
    ]);
  };

  addMetricToSummary('Overall SEO Score', averageScores.overallScore / 100);

  const detailKeys = [
    'titleOptimization',
    'metaDescriptionOptimization',
    'urlStructure',
    'h1Optimization',
    'contentLength',
    'internalLinking',
    'imageOptimization',
    'pageSpeed',
    'mobileOptimization',
    'securityFactors',
    'structuredData',
    'socialMediaTags',
  ];

  detailKeys.forEach((key) => {
    if (averageScores.details[key] !== undefined) {
      addMetricToSummary(
        key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase()),
        averageScores.details[key],
      );
    } else {
      global.auditcore.logger.warn(`Detail key '${key}' not found in average scores.`);
    }
  });

  const seoScoresSummaryCsv = formatCsv(summaryData, '');
  await saveFile(
    path.join(outputDir, 'seo_scores_summary.csv'),
    seoScoresSummaryCsv,
  );
  global.auditcore.logger.debug('SEO scores summary saved');
}

async function saveDiagnostics(results, outputDir) {
  try {
    const filename = 'results.json';
    const filePath = path.join(outputDir, filename);

    const meta = {
      generatedAt: new Date().toISOString(),
      options: {
        sitemap: global.auditcore.options.sitemap,
        output: global.auditcore.options.output,
        limit: global.auditcore.options.limit,
        logLevel: global.auditcore.options.logLevel,
      },
    };

    const cleanResults = JSON.parse(JSON.stringify(results, (key, value) => {
      if (key === 'parent' || key === 'children') {
        return undefined;
      }
      return value;
    }));

    const diagnosticsData = {
      meta,
      results: cleanResults,
    };

    await fs.writeFile(filePath, JSON.stringify(diagnosticsData, null, 2));
    global.auditcore.logger.info(`Full diagnostics saved to ${filePath}`);
  } catch (error) {
    global.auditcore.logger.error('Error saving diagnostics:', error);
    global.auditcore.logger.debug('Error stack:', error.stack);
  }
}

async function saveRawPa11yResult(results, outputDir) {
  try {
    const filename = 'pa11y_raw_results.json';
    const filePath = path.join(outputDir, filename);

    global.auditcore.logger.debug('Starting saveRawPa11yResult function');
    global.auditcore.logger.debug(`Results object keys: ${Object.keys(results)}`);
    global.auditcore.logger.debug(`Pa11y results type: ${typeof results.pa11y}`);

    if (!results || !results.pa11y || !Array.isArray(results.pa11y)) {
      global.auditcore.logger.warn('Pa11y results are missing or not in the expected format');
      global.auditcore.logger.debug(`results: ${JSON.stringify(results)}`);
      await fs.writeFile(filePath, JSON.stringify([], null, 2));
      global.auditcore.logger.debug(`Empty pa11y results saved to ${filePath}`);
      return;
    }

    global.auditcore.logger.debug(`Processing ${results.pa11y.length} Pa11y results`);

    const pa11yResults = results.pa11y.map((result, index) => {
      global.auditcore.logger.debug(`Processing result ${index + 1}/${results.pa11y.length}`);
      global.auditcore.logger.debug(`Result type: ${typeof result}`);

      if (!result || typeof result !== 'object') {
        global.auditcore.logger.warn(`Invalid Pa11y result entry at index ${index}:`, result);
        return null;
      }

      return {
        url: result.pageUrl || 'Unknown URL',
        issues: Array.isArray(result.issues) ? result.issues : [],
      };
    }).filter(Boolean);

    global.auditcore.logger.debug(`Processed ${pa11yResults.length} valid Pa11y results`);

    await fs.writeFile(filePath, JSON.stringify(pa11yResults, null, 2));
    global.auditcore.logger.info(`Raw pa11y results saved to ${filePath}`);
  } catch (error) {
    global.auditcore.logger.error('Error saving raw pa11y results:', error);
    global.auditcore.logger.error('Error stack:', error.stack);
  }
}

function analyzeCommonPa11yIssues(pa11yResults) {
  const issueCounts = pa11yResults.reduce((counts, result) => {
    if (result.issues) {
      result.issues.forEach((issue) => {
        const issueKey = `${issue.code}-${issue.message}`;
        counts[issueKey] = (counts[issueKey] || 0) + 1;
      });
    }
    return counts;
  }, {});

  return Object.entries(issueCounts)
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({
      code: key.split('-')[0],
      message: key.split('-')[1],
      count,
    }));
}

async function saveCommonPa11yIssues(commonIssues, outputDir) {
  if (commonIssues.length > 0) {
    const csvData = formatCsv(
      commonIssues,
      ['code', 'message', 'count'],
    );
    await saveFile(
      path.join(outputDir, 'common_pa11y_issues.csv'),
      csvData,
    );
    global.auditcore.logger.debug('Common Pa11y issues saved');
  } else {
    global.auditcore.logger.debug('No common Pa11y issues found');
  }
}

function filterRepeatedPa11yIssues(pa11yResults, commonIssues) {
  const commonIssueKeys = new Set(
    commonIssues.map((issue) => `${issue.code}-${issue.message}`),
  );
  return pa11yResults.map((result) => ({
    ...result,
    issues: result.issues
      ? result.issues.filter(
        (issue) => !commonIssueKeys.has(`${issue.code}-${issue.message}`),
      )
      : [],
  }));
}

async function saveImageInfo(contentAnalysis, outputDir) {
  global.auditcore.logger.debug('Starting saveImageInfo function');
  global.auditcore.logger.debug(`Content analysis length: ${contentAnalysis.length}`);

  const allImages = [];
  const imagesWithoutAlt = [];

  contentAnalysis.forEach((page, index) => {
    global.auditcore.logger.debug(`Processing page ${index}: ${page.url}`);

    if (!page.images || !Array.isArray(page.images)) {
      global.auditcore.logger.warn(`No images array found for page: ${page.url}`);
      return;
    }

    global.auditcore.logger.debug(`Found ${page.images.length} images for page: ${page.url}`);

    page.images.forEach((img) => {
      const imageInfo = {
        pageUrl: page.url,
        imageSrc: img.src,
        altText: img.alt || '',
        width: img.width || '',
        height: img.height || '',
      };
      allImages.push(imageInfo);

      if (!img.alt || img.alt.trim() === '') {
        imagesWithoutAlt.push(imageInfo);
      }
    });
  });

  global.auditcore.logger.debug(`Total images found: ${allImages.length}`);
  global.auditcore.logger.debug(`Images without alt text: ${imagesWithoutAlt.length}`);

  if (allImages.length > 0) {
    const headers = ['Page URL', 'Image Source', 'Alt Text', 'Width', 'Height'];
    const imageInfoCsv = formatCsv(allImages, headers);

    try {
      await saveFile(path.join(outputDir, 'image_info.csv'), imageInfoCsv);
      global.auditcore.logger.info(`${allImages.length} images information saved to image_info.csv`);
    } catch (error) {
      global.auditcore.logger.error(`Error saving image_info.csv: ${error.message}`);
    }
  } else {
    global.auditcore.logger.warn('No images found to save');
  }

  if (imagesWithoutAlt.length > 0) {
    const headers = ['Page URL', 'Image Source', 'Width', 'Height'];
    const imagesWithoutAltCsv = formatCsv(imagesWithoutAlt.map((img) => ({
      pageUrl: img.pageUrl,
      imageSrc: img.imageSrc,
      width: img.width,
      height: img.height,
    })), headers);

    try {
      await saveFile(path.join(outputDir, 'images_without_alt.csv'), imagesWithoutAltCsv);
      global.auditcore.logger.info(`${imagesWithoutAlt.length} images without alt text saved to images_without_alt.csv`);
    } catch (error) {
      global.auditcore.logger.error(`Error saving images_without_alt.csv: ${error.message}`);
    }
  } else {
    global.auditcore.logger.info('All images have alt text');
  }

  return {
    totalImages: allImages.length,
    imagesWithoutAlt: imagesWithoutAlt.length,
  };
}

export {
  saveFile,
  savePa11yResults,
  saveInternalLinks,
  saveImagesWithoutAlt,
  saveContentAnalysis,
  saveOrphanedUrls,
  saveSeoReport,
  saveSeoScores,
  savePerformanceAnalysis,
  saveSeoScoresSummary,
  saveRawPa11yResult,
  analyzeCommonPa11yIssues,
  saveCommonPa11yIssues,
  filterRepeatedPa11yIssues,
  generateUpdatedReport,
  analyzeContentData,
};
