import fs from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify/sync';

const formatContentAnalysisResult = (result) => ({
  url: result.url,
  title: result.title,
  metaDescription: result.metaDescription,
  h1: result.h1,
  wordCount: result.wordCount,
  h1Count: result.headings?.h1,
  h2Count: result.headings?.h2,
  h3Count: result.headings?.h3,
  h4Count: result.headings?.h4,
  h5Count: result.headings?.h5,
  h6Count: result.headings?.h6,
  keywords: result.keywords ? result.keywords.join(', ') : '',
  headingErrors: result.headingErrors ? result.headingErrors.join('; ') : '',
  imageCount: result.images ? result.images.length : 0,
  imagesWithoutAlt: result.imagesWithoutAlt ? result.imagesWithoutAlt.length : 0,
  jsErrors: result.jsErrors ? JSON.stringify(result.jsErrors) : '',
  schemaTypes: result.schemaTypes ? result.schemaTypes.join(', ') : '',
  pageSize: result.pageSize,
  scriptsCount: result.resources?.scripts.length,
  stylesheetsCount: result.resources?.stylesheets.length,
  imagesCount: result.resources?.images.length,
  hasResponsiveMetaTag: result.hasResponsiveMetaTag ? 'Yes' : 'No',
  htmlLang: result.htmlLang,
  canonicalUrl: result.canonicalUrl,
  openGraphTags: Object.keys(result.openGraphTags || {}).length > 0 ? 'Yes' : 'No',
  twitterTags: Object.keys(result.twitterTags || {}).length > 0 ? 'Yes' : 'No',
  structuredData: result.structuredData && result.structuredData.length > 0 ? 'Yes' : 'No',
  forms: result.forms ? JSON.stringify(result.forms) : '',
  tables: result.tables ? JSON.stringify(result.tables) : '',
});

const formatCsv = (data, headers) => 
  stringify([headers, ...data.map(row => headers.map(header => row[header] ?? ''))]);

async function saveContentAnalysis(results, outputDir) {
  const headers = [
    'url', 'title', 'metaDescription', 'h1', 'wordCount',
    'h1Count', 'h2Count', 'h3Count', 'h4Count', 'h5Count', 'h6Count',
    'keywords', 'headingErrors', 'imageCount', 'imagesWithoutAlt',
    'jsErrors', 'schemaTypes', 'pageSize', 'scriptsCount',
    'stylesheetsCount', 'imagesCount', 'hasResponsiveMetaTag',
    'htmlLang', 'canonicalUrl', 'openGraphTags', 'twitterTags',
    'structuredData', 'forms', 'tables'
  ];

  const formattedResults = results.contentAnalysis.map(formatContentAnalysisResult);
  const contentAnalysisCsv = formatCsv(formattedResults, headers);

  await fs.writeFile(path.join(outputDir, 'content_analysis.csv'), contentAnalysisCsv);
  console.log('Content analysis results saved');
}

export { saveContentAnalysis };