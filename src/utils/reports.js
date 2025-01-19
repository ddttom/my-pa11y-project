import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs/promises';
import { 
  generateAccessibilityReport,
  generateDetailedAccessibilityReport 
} from './accessibilityReport.js';

export async function generateReports(results, urls, outputDir) {
  try {
    if (!results) {
      throw new Error('Invalid results structure');
    }

    await generateSeoReport(results, outputDir);
    await generatePerformanceReport(results, outputDir);
    await generateSeoScores(results, outputDir);
    
    // Generate accessibility reports
    await generateAccessibilityReport(results, outputDir);
    await generateDetailedAccessibilityReport(results, outputDir);

    await fs.writeFile(
      path.join(outputDir, 'results.json'),
      JSON.stringify(results, null, 2),
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
      { id: 'wordCount', title: 'Word Count' },
    ],
  });

  const reportData = results.contentAnalysis?.map((page) => ({
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
  })) || [];

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

  const reportData = results.performanceAnalysis?.map((page) => ({
    url: page.url || '',
    loadTime: Math.round(page.loadTime || 0),
    firstPaint: Math.round(page.firstPaint || 0),
    firstContentfulPaint: Math.round(page.firstContentfulPaint || 0),
    pageSize: Math.round(page.pageSize || 0),
    resourceCount: (page.scriptsCount || 0) + (page.stylesheetsCount || 0),
  })) || [];

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

  const reportData = results.seoScores?.map((page) => ({
    url: page.url || '',
    overallScore: Number((page.score || 0).toFixed(2)),
    titleScore: Number((page.details?.titleOptimization || 0).toFixed(2)),
    metaScore: Number((page.details?.metaDescriptionOptimization || 0).toFixed(2)),
    contentScore: Number((page.details?.contentQuality || 0).toFixed(2)),
    linksScore: Number((page.details?.internalLinking || 0).toFixed(2)),
  })) || [];

  global.auditcore.logger.debug(`SEO Scores data: ${JSON.stringify(reportData, null, 2)}`);
  await csvWriter.writeRecords(reportData);
  global.auditcore.logger.info(`SEO scores report generated with ${reportData.length} records`);
}
