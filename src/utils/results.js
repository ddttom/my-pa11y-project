// results.js

import fs from 'fs/promises';
import path from 'path';
import { formatCsv } from './csvFormatter.js';
import { generateReport } from './reportGenerator.js';

/**
 * Saves content to a file.
 * @param {string} filePath - The path to save the file.
 * @param {string} content - The content to save.
 * @returns {Promise<void>}
 * @throws {Error} If there's an error saving the file.
 */
async function saveFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    global.auditcore.logger.info(`File saved successfully: ${filePath}`);
  } catch (error) {
    global.auditcore.logger.error(`Error saving file ${filePath}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Post-processes the analysis results.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @returns {Promise<void>}
 */
export async function postProcessResults(results, outputDir) {
  global.auditcore.logger.info('Post-processing results');
  const commonPa11yIssues = analyzeCommonPa11yIssues(results.pa11y);
  await saveCommonPa11yIssues(commonPa11yIssues, outputDir);
  results.pa11y = filterRepeatedPa11yIssues(results.pa11y, commonPa11yIssues);
  global.auditcore.logger.info('Results post-processing completed');
}

/**
 * Saves all analysis results to the specified output directory.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {string} sitemapUrl - The URL of the analyzed sitemap.
 * @returns {Promise<void>}
 */
export async function saveResults(results, outputDir, sitemapUrl) {
  global.auditcore.logger.info(`Saving results to: ${outputDir}`);

  const saveOperations = [
    {
      name: 'Diagnostics',
      func: () => saveDiagnostics(results, outputDir),
    },
    {
      name: 'Pa11y results',
      func: () => savePa11yResults(results, outputDir),
    },
    {
      name: 'Internal links',
      func: () => saveInternalLinks(results, outputDir),
    },
    {
      name: 'Images without alt',
      func: () => saveImagesWithoutAlt(results.contentAnalysis, outputDir),
    },
    {
      name: 'Content analysis',
      func: () => saveContentAnalysis(results, outputDir),
    },
    {
      name: 'Orphaned URLs',
      func: () => saveOrphanedUrls(results, outputDir),
    },
    {
      name: 'SEO report',
      func: () => saveSeoReport(results, outputDir, sitemapUrl),
    },
    {
      name: 'SEO scores',
      func: () => saveSeoScores(results, outputDir),
    },
    {
      name: 'Performance analysis',
      func: () => savePerformanceAnalysis(results, outputDir),
    },
    {
      name: 'SEO scores summary',
      func: () => saveSeoScoresSummary(results, outputDir),
    },
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

/**
 * Saves Pa11y results to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @returns {Promise<void>}
 */
async function savePa11yResults(results, outputDir) {
  await saveRawPa11yResult(results, outputDir);
  const pa11yCsv = formatCsv(
    flattenPa11yResults(results.pa11y),
    ['pageUrl', 'type', 'code', 'message', 'context', 'selector', 'error'],
  );
  await saveFile(path.join(outputDir, 'pa11y_results.csv'), pa11yCsv);
  global.auditcore.logger.debug('Pa11y results saved');
}

/**
 * Flattens Pa11y results for CSV formatting.
 * @param {Array} pa11yResults - The Pa11y results to flatten.
 * @returns {Array} Flattened Pa11y results.
 */
function flattenPa11yResults(pa11yResults) {
  if (!pa11yResults) {
    return [];
  }
  return pa11yResults.flatMap((result) => (result.issues
    ? result.issues.map((issue) => ({
      pageUrl: result.pageUrl,
      type: issue.type,
      code: issue.code,
      message: issue.message,
      context: issue.context,
      selector: issue.selector,
    }))
    : [{ pageUrl: result.pageUrl, error: result.error }]));
}

/**
 * Saves internal links to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @returns {Promise<void>}
 */
async function saveInternalLinks(results, outputDir) {
  const internalLinksCsv = formatCsv(
    flattenInternalLinks(results.internalLinks),
    ['source', 'target', 'anchorText', 'statusCode'],
  );
  await saveFile(
    path.join(outputDir, 'internal_links.csv'),
    internalLinksCsv,
  );
  global.auditcore.logger.debug('Internal links results saved');
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
 * @returns {Promise<number>} The number of images without alt text saved.
 */
async function saveImagesWithoutAlt(contentAnalysis, outputDir) {
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
    global.auditcore.logger.info(`${imagesWithoutAlt.length} images without alt text saved`);
  } else {
    global.auditcore.logger.info('No images without alt text found');
  }

  return imagesWithoutAlt.length;
}

/**
 * Saves content analysis results to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @returns {Promise<void>}
 */
async function saveContentAnalysis(results, outputDir) {
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
  );
  await saveFile(
    path.join(outputDir, 'content_analysis.csv'),
    contentAnalysisCsv,
  );
  global.auditcore.logger.debug('Content analysis saved');
}

/**
 * Saves orphaned URLs to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @returns {Promise<number>} The number of orphaned URLs saved.
 */
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

/**
 * Saves the SEO report to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @param {string} sitemapUrl - The URL of the analyzed sitemap.
 * @returns {Promise<void>}
 */
async function saveSeoReport(results, outputDir, sitemapUrl) {
  const report = generateReport(results, sitemapUrl);
  await saveFile(path.join(outputDir, 'seo_report.csv'), report);
  global.auditcore.logger.debug('SEO report saved');
}

/**
 * Saves SEO scores to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @returns {Promise<void>}
 */
async function saveSeoScores(results, outputDir) {
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

  const seoScoresCsv = formatCsv(seoScoresFormatted, headers);
  await saveFile(path.join(outputDir, 'seo_scores.csv'), seoScoresCsv);
  global.auditcore.logger.debug('SEO scores saved');
}

/**
 * Saves performance analysis results to a file.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save results to.
 * @returns {Promise<number>} The number of performance analysis results saved.
 */
async function savePerformanceAnalysis(results, outputDir) {
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
    
      const performanceAnalysisCsv = formatCsv(csvData);
      await saveFile(
        path.join(outputDir, 'performance_analysis.csv'),
        performanceAnalysisCsv,
      );
      global.auditcore.logger.debug('Performance analysis saved');
      return roundedPerformanceAnalysis.length;
    }
    
    /**
     * Saves SEO scores summary to a file.
     * @param {Object} results - The analysis results.
     * @param {string} outputDir - The directory to save results to.
     * @returns {Promise<void>}
     */
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
    
    /**
     * Saves the full results object to a diagnostics JSON file.
     * @param {Object} results - The full results object.
     * @param {string} outputDir - The directory to save the file.
     * @returns {Promise<void>}
     */
    async function saveDiagnostics(results, outputDir) {
      try {
        const filename = 'diagnostics.json';
        const filePath = path.join(outputDir, filename);
        
        // Create a meta object with generation time and options
        const meta = {
          generatedAt: new Date().toISOString(),
          options: {
            sitemap: global.auditcore.options.sitemap,
            output: global.auditcore.options.output,
            limit: global.auditcore.options.limit,
            logLevel: global.auditcore.options.logLevel,
            // Add any other relevant options here
          }
        };
    
        // Create a clean version of results without circular references
        const cleanResults = JSON.parse(JSON.stringify(results, (key, value) => {
          if (key === 'parent' || key === 'children') {
            return undefined; // Exclude parent and children to avoid circular references
          }
          return value;
        }));
    
        // Combine meta and results into a single object
        const diagnosticsData = {
          meta: meta,
          results: cleanResults
        };
    
        await fs.writeFile(filePath, JSON.stringify(diagnosticsData, null, 2));
        global.auditcore.logger.info(`Full diagnostics saved to ${filePath}`);
      } catch (error) {
        global.auditcore.logger.error('Error saving diagnostics:', error);
        global.auditcore.logger.debug('Error stack:', error.stack);
      }
    }
    
    /**
     * Saves raw Pa11y results to a JSON file.
     * @param {Object} results - The analysis results.
     * @param {string} outputDir - The directory to save results to.
     * @returns {Promise<void>}
     */
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
        global.auditcore.logger.debug(`First result (if exists): ${JSON.stringify(pa11yResults[0], null, 2)}`);
    
        await fs.writeFile(filePath, JSON.stringify(pa11yResults, null, 2));
        global.auditcore.logger.info(`Raw pa11y results saved to ${filePath}`);
      } catch (error) {
        global.auditcore.logger.error('Error saving raw pa11y results:', error);
        global.auditcore.logger.error('Error stack:', error.stack);
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
     * @returns {Promise<void>}
     */
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