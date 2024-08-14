/* eslint-disable no-param-reassign */
/* eslint-disable no-use-before-define */
/* eslint-disable import/extensions */
// results.js

import fs from 'fs/promises';
import path from 'path';
import { formatCsv } from './csvFormatter.mjs';
import { generateReport } from './reportGenerator.mjs';

/**
 * Saves content to a file.
 * @param {string} filePath - The path to save the file.
 * @param {string} content - The content to save.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 * @throws {Error} If there's an error saving the file.
 */
async function saveFile(filePath, content, logger) {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    logger.info(`File saved successfully: ${filePath}`);
  } catch (error) {
    logger.error(`Error saving file ${filePath}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Post-processes the analysis results.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
export async function postProcessResults(results, outputDir, logger) {
  logger.info('Post-processing results');
  const commonPa11yIssues = analyzeCommonPa11yIssues(results.pa11y);
  await saveCommonPa11yIssues(commonPa11yIssues, outputDir, logger);
  results.pa11y = filterRepeatedPa11yIssues(results.pa11y, commonPa11yIssues);
  logger.info('Results post-processing completed');
}

/**
 * Saves all analysis results to the specified output directory.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {string} sitemapUrl - The URL of the analyzed sitemap.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
export async function saveResults(results, outputDir, sitemapUrl, logger) {
  logger.info(`Saving results to: ${outputDir}`);

  const saveOperations = [
    {
      name: 'Pa11y results',
      func: () => savePa11yResults(results, outputDir, logger),
    },
    {
      name: 'Internal links',
      func: () => saveInternalLinks(results, outputDir, logger),
    },
    {
      name: 'Images without alt',
      func: () => saveImagesWithoutAlt(results.contentAnalysis, outputDir, logger),
    },
    {
      name: 'Content analysis',
      func: () => saveContentAnalysis(results, outputDir, logger),
    },
    {
      name: 'Orphaned URLs',
      func: () => saveOrphanedUrls(results, outputDir, logger),
    },
    {
      name: 'SEO report',
      func: () => saveSeoReport(results, outputDir, sitemapUrl, logger),
    },
    {
      name: 'SEO scores',
      func: () => saveSeoScores(results, outputDir, logger),
    },
    {
      name: 'Performance analysis',
      func: () => savePerformanceAnalysis(results, outputDir, logger),
    },
    {
      name: 'SEO scores summary',
      func: () => saveSeoScoresSummary(results, outputDir, logger),
    },
  ];

  const saveResultsList = await Promise.allSettled(
    saveOperations.map(async (operation) => {
      try {
        logger.debug(`Attempting to save ${operation.name}...`);
        const result = await operation.func();
        if (typeof result === 'number') {
          logger.debug(`${operation.name}: ${result} items saved`);
        } else {
          logger.debug(`${operation.name} saved successfully`);
        }
        return { name: operation.name, success: true, result };
      } catch (error) {
        logger.error(`Error saving ${operation.name}:`, error);
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

  logger.info(
    `Successfully saved ${successfulOperations.length} out of ${saveOperations.length} result types`,
  );
  if (failedOperations.length > 0) {
    logger.warn(`Failed to save ${failedOperations.length} result types`);
    failedOperations.forEach((result) => {
      logger.warn(
        `  - ${result.value.name}: ${result.value.error || result.reason}`,
      );
    });
  }

  logger.info(`All results saved to ${outputDir}`);
}

/**
 * Saves Pa11y results to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
async function savePa11yResults(results, outputDir, logger) {
  await saveRawPa11yResult(results, outputDir, logger);
  const pa11yCsv = formatCsv(
    flattenPa11yResults(results.pa11y),
    ['url', 'type', 'code', 'message', 'context', 'selector', 'error'],
    logger,
  );
  await saveFile(path.join(outputDir, 'pa11y_results.csv'), pa11yCsv, logger);
  logger.debug('Pa11y results saved');
}

/**
 * Flattens Pa11y results for CSV formatting.
 * @param {Array} pa11yResults - The Pa11y results to flatten.
 * @returns {Array} Flattened Pa11y results.
 */
function flattenPa11yResults(pa11yResults) {
  return pa11yResults.flatMap((result) => (result.issues
    ? result.issues.map((issue) => ({
      url: result.url,
      type: issue.type,
      code: issue.code,
      message: issue.message,
      context: issue.context,
      selector: issue.selector,
    }))
    : [{ url: result.url, error: result.error }]));
}

/**
 * Saves internal links to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
async function saveInternalLinks(results, outputDir, logger) {
  const internalLinksCsv = formatCsv(
    flattenInternalLinks(results.internalLinks),
    ['source', 'target', 'anchorText', 'statusCode'],
    logger,
  );
  await saveFile(
    path.join(outputDir, 'internal_links.csv'),
    internalLinksCsv,
    logger,
  );
  logger.debug('Internal links results saved');
}

/**
 * Flattens internal links for CSV formatting.
 * @param {Array} internalLinks - The internal links to flatten.
 * @returns {Array} Flattened internal links.
 */
function flattenInternalLinks(internalLinks) {
  return internalLinks.flatMap((result) => (result.checkedLinks
    ? result.checkedLinks.map((link) => ({
      source: result.url,
      target: link.url,
      anchorText: link.text,
      statusCode: link.statusCode,
    }))
    : [{ source: result.url, error: result.error }]));
}

/**
 * Saves images without alt text to a file.
 * @param {Array} contentAnalysis - The content analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<number>} The number of images without alt text saved.
 */
async function saveImagesWithoutAlt(contentAnalysis, outputDir, logger) {
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
      logger,
    );

    await saveFile(
      path.join(outputDir, 'images_without_alt.csv'),
      imagesWithoutAltCsv,
      logger,
    );
    logger.info(`${imagesWithoutAlt.length} images without alt text saved`);
  } else {
    logger.info('No images without alt text found');
  }

  return imagesWithoutAlt.length;
}

/**
 * Saves content analysis results to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
async function saveContentAnalysis(results, outputDir, logger) {
  const contentAnalysisCsv = formatCsv(
    results.contentAnalysis,
    [
      'url',
      'wordCount',
      'h1Count',
      'imagesCount',
      'internalLinksCount',
      'externalLinksCount',
    ],
    logger,
  );
  await saveFile(
    path.join(outputDir, 'content_analysis.csv'),
    contentAnalysisCsv,
    logger,
  );
  logger.debug('Content analysis saved');
}

/**
 * Saves orphaned URLs to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<number>} The number of orphaned URLs saved.
 */
async function saveOrphanedUrls(results, outputDir, logger) {
  if (results.orphanedUrls && results.orphanedUrls.size > 0) {
    const orphanedUrlsArray = Array.from(results.orphanedUrls).map((url) => ({
      url,
    }));
    const orphanedUrlsCsv = formatCsv(orphanedUrlsArray, ['url'], logger);
    await saveFile(
      path.join(outputDir, 'orphaned_urls.csv'),
      orphanedUrlsCsv,
      logger,
    );
    logger.info(`${results.orphanedUrls.size} orphaned URLs saved`);
    return results.orphanedUrls.size;
  }
  logger.info('No orphaned URLs found');
  return 0;
}

/**
 * Saves the SEO report to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {string} sitemapUrl - The URL of the analyzed sitemap.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
async function saveSeoReport(results, outputDir, sitemapUrl, logger) {
  const report = generateReport(results, sitemapUrl, logger);
  await saveFile(path.join(outputDir, 'seo_report.csv'), report, logger);
  logger.debug('SEO report saved');
}

/**
 * Saves SEO scores to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
async function saveSeoScores(results, outputDir, logger) {
  const seoScoresFormatted = results.seoScores.map((score) => ({
    url: score.url || '',
    score:
      typeof score.score === 'number' ? Number(score.score.toFixed(2)) : 'N/A',
    ...Object.fromEntries(
      Object.entries(score.details || {}).map(([key, value]) => [
        `details.${key}`,
        typeof value === 'number' ? Number(value.toFixed(2)) : 'N/A',
      ]),
    ),
  }));

  const headers = [
    'url',
    'score',
    'details.titleOptimization',
    'details.metaDescriptionOptimization',
    'details.urlStructure',
    'details.h1Optimization',
    'details.contentLength',
    'details.internalLinking',
    'details.imageOptimization',
    'details.pageSpeed',
    'details.mobileOptimization',
    'details.securityFactors',
    'details.structuredData',
    'details.socialMediaTags',
  ];

  const seoScoresCsv = formatCsv(seoScoresFormatted, headers, logger);
  await saveFile(path.join(outputDir, 'seo_scores.csv'), seoScoresCsv, logger);
  logger.debug('SEO scores saved');
}

/**
 * Saves performance analysis results to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<number>} The number of performance analysis results saved.
 */
async function savePerformanceAnalysis(results, outputDir, logger) {
  const getPerformanceComment = (metric, value) => {
    if (value === null || value === undefined) return 'N/A';
    const thresholds = {
      loadTime: { excellent: 1000, good: 2000, fair: 3000 },
      domContentLoaded: { excellent: 500, good: 1000, fair: 2000 },
      firstPaint: { excellent: 1000, good: 2000, fair: 3000 },
      firstContentfulPaint: { excellent: 1500, good: 2500, fair: 4000 },
    };

    if (value <= thresholds[metric].excellent) return 'Excellent';
    if (value <= thresholds[metric].good) return 'Good';
    if (value <= thresholds[metric].fair) return 'Fair';
    return 'Needs Improvement';
  };

  const roundedPerformanceAnalysis = results.performanceAnalysis.map(
    (entry) => ({
      url: entry.url,
      loadTime:
        entry.loadTime !== null && entry.loadTime !== undefined
          ? Number(entry.loadTime.toFixed(2))
          : null,
      loadTimeComment: getPerformanceComment('loadTime', entry.loadTime),
      domContentLoaded:
        entry.domContentLoaded !== null && entry.domContentLoaded !== undefined
          ? Number(entry.domContentLoaded.toFixed(2))
          : null,
      domContentLoadedComment: getPerformanceComment(
        'domContentLoaded',
        entry.domContentLoaded,
      ),
      firstPaint:
        entry.firstPaint !== null && entry.firstPaint !== undefined
          ? Number(entry.firstPaint.toFixed(2))
          : null,
      firstPaintComment: getPerformanceComment('firstPaint', entry.firstPaint),
      firstContentfulPaint:
        entry.firstContentfulPaint !== null
        && entry.firstContentfulPaint !== undefined
          ? Number(entry.firstContentfulPaint.toFixed(2))
          : null,
      firstContentfulPaintComment: getPerformanceComment(
        'firstContentfulPaint',
        entry.firstContentfulPaint,
      ),
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

  const performanceAnalysisCsv = formatCsv(csvData, logger);
  await saveFile(
    path.join(outputDir, 'performance_analysis.csv'),
    performanceAnalysisCsv,
    logger,
  );
  logger.debug('Performance analysis saved');
  return roundedPerformanceAnalysis.length;
}

/**
 * Saves SEO scores summary to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
async function saveSeoScoresSummary(results, outputDir, logger) {
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
      logger.warn(`Detail key '${key}' not found in average scores.`);
    }
  });

  const seoScoresSummaryCsv = formatCsv(summaryData, '', logger);
  await saveFile(
    path.join(outputDir, 'seo_scores_summary.csv'),
    seoScoresSummaryCsv,
    logger,
  );
  logger.debug('SEO scores summary saved');
}

/**
 * Saves raw Pa11y results to a JSON file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
async function saveRawPa11yResult(results, outputDir, logger) {
  try {
    const filename = 'pa11y_raw_results.json';
    const filePath = path.join(outputDir, filename);
    const pa11yResults = results.pa11y.map((result) => ({
      url: result.url,
      issues: result.issues,
    }));
    await fs.writeFile(filePath, JSON.stringify(pa11yResults, null, 2));
    logger.debug(`Raw pa11y results saved to ${filePath}`);
  } catch (error) {
    logger.error('Error saving raw pa11y results:', error);
  }
}

/**
 * Analyzes common Pa11y issues.
 * @param {Array} pa11yResults - The Pa11y results to analyze.
 * @returns {Array} Common Pa11y issues.
 */
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

/**
 * Saves common Pa11y issues to a file.
 * @param {Array} commonIssues - The common Pa11y issues to save.
 * @param {string} outputDir - The directory to save results to.
 * @param {Object} logger - The logger object.
 * @returns {Promise<void>}
 */
async function saveCommonPa11yIssues(commonIssues, outputDir, logger) {
  if (commonIssues.length > 0) {
    const csvData = formatCsv(
      commonIssues,
      ['code', 'message', 'count'],
      logger,
    );
    await saveFile(
      path.join(outputDir, 'common_pa11y_issues.csv'),
      csvData,
      logger,
    );
    logger.debug('Common Pa11y issues saved');
  } else {
    logger.debug('No common Pa11y issues found');
  }
}

/**
 * Filters out repeated Pa11y issues.
 * @param {Array} pa11yResults - The Pa11y results to filter.
 * @param {Array} commonIssues - The common Pa11y issues.
 * @returns {Array} Filtered Pa11y results.
 */
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
};
