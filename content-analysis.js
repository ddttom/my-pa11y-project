import fs from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify/sync';

const extractKeywords = (text, count = 5) => {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const wordFrequency = {};
  words.forEach(word => {
    if (word.length > 3) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });
  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(entry => entry[0])
    .join(', ');
};

const detectHeadingErrors = (result) => {
  const errors = [];
  
  if (result.h1Count === 0) {
    errors.push("Missing H1");
  } else if (result.h1Count > 1) {
    errors.push("Multiple H1 tags");
  }

  const headingLevels = [
    result.h1Count,
    result.h2Count,
    result.h3Count,
    result.h4Count,
    result.h5Count,
    result.h6Count
  ];

  let lastNonZeroIndex = 0;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > 0) {
      if (i - lastNonZeroIndex > 1) {
        errors.push(`Skipped heading level: H${lastNonZeroIndex + 1} to H${i + 1}`);
      }
      lastNonZeroIndex = i;
    }
  }

  return errors.join('; ');
};

const formatContentAnalysisResult = (result) => {
  const normalizeString = (str) => {
    if (typeof str === 'string') {
      return str.normalize('NFC');
    }
    return str;
  };

  const fullText = `${result.title} ${result.metaDescription} ${result.h1} ${result.pageData?.bodyText || ''}`;
  const keywords = extractKeywords(fullText);
  const headingErrors = detectHeadingErrors(result);

  return {
    url: normalizeString(result.url) || '',
    title: normalizeString(result.title) || '',
    metaDescription: normalizeString(result.metaDescription) || '',
    h1: normalizeString(result.h1) || '',
    wordCount: result.wordCount || 0,
    h1Count: result.h1Count || 0,
    h2Count: result.h2Count || 0,
    h3Count: result.h3Count || 0,
    h4Count: result.h4Count || 0,
    h5Count: result.h5Count || 0,
    h6Count: result.h6Count || 0,
    keywords: keywords,
    headingErrors: headingErrors,
    imageCount: result.images ? result.images.length : 0,
    imagesWithoutAlt: result.images ? result.images.filter(img => !img.alt || img.alt.trim() === '').length : 0,
    jsErrors: Array.isArray(result.jsErrors) ? result.jsErrors.length : 0,
    schemaTypes: Array.isArray(result.structuredData) ? result.structuredData.length : 0,
    pageSize: result.pageSize || 0,
    scriptsCount: result.scriptsCount || 0,
    stylesheetsCount: result.stylesheetsCount || 0,
    imagesCount: result.images ? result.images.length : 0,
    hasResponsiveMetaTag: result.hasResponsiveMetaTag ? 'Yes' : 'No',
    htmlLang: normalizeString(result.htmlLang) || '',
    canonicalUrl: normalizeString(result.canonicalUrl) || '',
    openGraphTags: result.openGraphTags ? 'Yes' : 'No',
    twitterTags: result.twitterTags ? 'Yes' : 'No',
    structuredData: result.structuredData && result.structuredData.length > 0 ? 'Yes' : 'No',
    formsCount: result.formsCount || 0,
    tablesCount: result.tablesCount || 0,
    lastModifiedDate: result.contentFreshness?.lastModifiedDate || 'Unknown',
    daysSinceLastModified: result.contentFreshness?.daysSinceLastModified || 'Unknown',
    lastCrawledDate: result.contentFreshness?.lastCrawledDate || 'Unknown',
    daysSinceLastCrawled: result.contentFreshness?.daysSinceLastCrawled || 'Unknown',
    freshnessStatus: result.contentFreshness?.freshnessStatus || 'Unknown'
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
    'structuredData', 'formsCount', 'tablesCount',
    'lastModifiedDate', 'daysSinceLastModified', 'lastCrawledDate',
    'daysSinceLastCrawled', 'freshnessStatus'
  ];
  
  let formattedResults = [];
  if (Array.isArray(results.contentAnalysis)) {
    formattedResults = results.contentAnalysis.map(formatContentAnalysisResult);
  } else if (results.contentAnalysis && typeof results.contentAnalysis === 'object') {
    formattedResults = [formatContentAnalysisResult(results.contentAnalysis)];
  } else {
    console.warn('results.contentAnalysis is neither an array nor an object. No content analysis will be saved.');
  }
  
  const contentAnalysisCsv = formatCsv(formattedResults, headers);
  try {
    await fs.writeFile(path.join(outputDir, 'content_analysis.csv'), contentAnalysisCsv, 'utf8');
    console.log('Content analysis results saved');
  } catch (error) {
    console.error('Error saving content analysis results:', error);
  }
}

export { saveContentAnalysis };