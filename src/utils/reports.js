import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { saveFinalSitemap } from './sitemap.js';

/**
 * Generate all reports from the results
 */
export async function generateReports(results, urls, outputDir) {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Validate results structure
    if (!results?.performanceAnalysis?.length) {
      throw new Error('No performance analysis data found');
    }

    // Generate reports with retry logic
    const reports = [
      { name: 'SEO report', fn: () => generateSeoReport(results, outputDir) },
      { name: 'Performance report', fn: () => generatePerformanceReport(results, outputDir) },
      { name: 'SEO scores', fn: () => generateSeoScores(results, outputDir) },
      { name: 'Summary', fn: () => generateSummary(results, outputDir) },
      { name: 'Final sitemap', fn: () => saveFinalSitemap(results, outputDir) }
    ];

    for (const report of reports) {
      try {
        await report.fn();
      } catch (error) {
        global.auditcore.logger.error(`Error generating ${report.name}:`, error);
        // Retry once
        await report.fn();
      }
    }

    // Save final results JSON
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
      { id: 'wordCount', title: 'Word Count' }
    ],
  });

  // Map from pa11y data for titles and URLs, then merge with content metrics
  const reportData = results.pa11y.map((page) => {
    // Find matching content metrics for this URL from the content metrics array
    const contentMetrics = Object.values(results).find(p => 
      p.url === page.pageUrl && p.wordCount !== undefined
    );

    // Get title from pa11y and metrics from content data
    return {
      url: page.pageUrl,
      title: page.documentTitle || '',
      description: contentMetrics?.metaDescription || '',
      h1Count: Math.round(contentMetrics?.h1Count || 0),
      imageCount: Math.round(contentMetrics?.imagesCount || 0),
      imagesWithoutAlt: Math.round(contentMetrics?.imagesWithoutAlt || 0),
      internalLinks: Math.round(contentMetrics?.internalLinksCount || 0),
      externalLinks: Math.round(contentMetrics?.externalLinksCount || 0),
      pageSize: Math.round(contentMetrics?.pageSize || 0),
      wordCount: Math.round(contentMetrics?.wordCount || 0)
    };
  });

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`SEO report generated with ${reportData.length} records`);
}

async function generatePerformanceReport(results, outputDir) {
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'performance_analysis.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'loadTime', title: 'Load Time (ms)' },
      { id: 'firstPaint', title: 'First Paint (ms)' },
      { id: 'firstContentfulPaint', title: 'First Contentful Paint (ms)' },
      { id: 'pageSize', title: 'Page Size (bytes)' },
      { id: 'resourceCount', title: 'Resource Count' },
    ],
  });

  const reportData = results.performanceAnalysis.map((page) => ({
    url: page.url,
    loadTime: Math.round(page.loadTime || 0),
    firstPaint: Math.round(page.firstPaint || 0),
    firstContentfulPaint: Math.round(page.firstContentfulPaint || 0),
    pageSize: Math.round(page.pageSize || 0),
    resourceCount: (page.scriptsCount || 0) + (page.stylesheetsCount || 0)
  }));

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`Performance report generated with ${reportData.length} records`);
}

async function generateSeoScores(results, outputDir) {
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'seo_scores.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'overallScore', title: 'Overall Score' },
      { id: 'titleScore', title: 'Title Score' },
      { id: 'metaScore', title: 'Meta Score' },
      { id: 'contentScore', title: 'Content Score' },
      { id: 'linksScore', title: 'Links Score' },
    ],
  });

  const reportData = results.performanceAnalysis.map((page) => ({
    url: page.url,
    overallScore: Number((page.details?.score || 0).toFixed(2)),
    titleScore: Number((page.details?.titleOptimization || 0).toFixed(2)),
    metaScore: Number((page.details?.metaDescriptionOptimization || 0).toFixed(2)),
    contentScore: Number((page.details?.contentQuality || 0).toFixed(2)),
    linksScore: Number((page.details?.internalLinking || 0).toFixed(2))
  }));

  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`SEO scores report generated with ${reportData.length} records`);
}

async function generateSummary(results, outputDir) {
  const summary = {
    totalUrls: Math.round(results.performanceAnalysis.length),
    internalUrls: Math.round(results.performanceAnalysis.filter(p => p.internalLinksCount > 0).length),
    externalUrls: Math.round(results.performanceAnalysis.filter(p => p.externalLinksCount > 0).length),
    averageScore: Number(calculateAverageScore(results.performanceAnalysis).toFixed(2)),
    timestamp: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
}

function calculateAverageScore(pages = []) {
  if (!pages.length) return 0;
  const sum = pages.reduce((acc, page) => acc + (page.details?.score || 0), 0);
  return Number((sum / pages.length).toFixed(2));
} 
