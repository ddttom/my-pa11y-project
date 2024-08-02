import fs from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify/sync';

const formatContentAnalysisResult = (result) => {
  // Log the structure of the result object
  console.log('Result structure:', JSON.stringify(result, null, 2));

  return {
    url: result.url || '',
    title: result.title || '',
    metaDescription: result.metaDescription || '',
    h1: result.h1 || '',
    wordCount: result.wordCount || 0,
    h1Count: result.headings?.h1 || 0,
    h2Count: result.headings?.h2 || 0,
    h3Count: result.headings?.h3 || 0,
    h4Count: result.headings?.h4 || 0,
    h5Count: result.headings?.h5 || 0,
    h6Count: result.headings?.h6 || 0,
    keywords: result.keywords ? result.keywords.join(', ') : '',
    headingErrors: result.headingErrors ? result.headingErrors.join('; ') : '',
    imageCount: result.images ? result.images.length : 0,
    imagesWithoutAlt: result.imagesWithoutAlt ? result.imagesWithoutAlt.length : 0,
    jsErrors: Array.isArray(result.jsErrors) ? result.jsErrors.length : 0,
    schemaTypes: result.schemaTypes ? result.schemaTypes.join(', ') : '',
    pageSize: result.pageSize || 0,
    scriptsCount: result.resources?.scripts?.length || 0,
    stylesheetsCount: result.resources?.stylesheets?.length || 0,
    imagesCount: result.resources?.images?.length || 0,
    hasResponsiveMetaTag: result.hasResponsiveMetaTag ? 'Yes' : 'No',
    htmlLang: result.htmlLang || '',
    canonicalUrl: result.canonicalUrl || '',
    openGraphTags: Object.keys(result.openGraphTags || {}).length > 0 ? 'Yes' : 'No',
    twitterTags: Object.keys(result.twitterTags || {}).length > 0 ? 'Yes' : 'No',
    structuredData: (result.structuredData && result.structuredData.length > 0) ? 'Yes' : 'No',
    formsCount: result.forms ? result.forms.length : 0,
    tablesCount: result.tables ? result.tables.length : 0,
  };
};

const formatCsv = (data, headers) => 
  stringify([headers, ...data.map(row => headers.map(header => {
    const value = row[header];
    return value !== undefined && value !== null ? value : '';
  }))]);

async function saveContentAnalysis(results, outputDir) {
  const headers = [
    'url', 'title', 'metaDescription', 'h1', 'wordCount',
    'h1Count', 'h2Count', 'h3Count', 'h4Count', 'h5Count', 'h6Count',
    'keywords', 'headingErrors', 'imageCount', 'imagesWithoutAlt',
    'jsErrors', 'schemaTypes', 'pageSize', 'scriptsCount',
    'stylesheetsCount', 'imagesCount', 'hasResponsiveMetaTag',
    'htmlLang', 'canonicalUrl', 'openGraphTags', 'twitterTags',
    'structuredData', 'formsCount', 'tablesCount'
  ];

  const formattedResults = results.contentAnalysis.map(result => {
    return formatContentAnalysisResult(result);
  });

  const contentAnalysisCsv = formatCsv(formattedResults, headers);
  await fs.writeFile(path.join(outputDir, 'content_analysis.csv'), contentAnalysisCsv);
  console.log('Content analysis results saved');
}

export { saveContentAnalysis };