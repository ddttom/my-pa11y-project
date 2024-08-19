import path from 'path';
import fs from 'fs/promises';
import { validateAndPrepare } from './utils/setup.js';
import { getUrlsFromSitemap, processSitemapUrls } from './utils/sitemap.js';
import { postProcessResults, saveResults } from './utils/results.js';
import { generateSitemap } from './utils/sitemapGenerator.js';
import {
  checkIsShuttingDown,
  setupShutdownHandler,
} from './utils/shutdownHandler.js';
function initializeResults() {
  const createMetrics = (additionalFields = {}) => ({
    total: 0,
    ...additionalFields
  });

  const createCountMetrics = () => ({
    count: 0,
    urls: []
  });

  return {
    pa11y: [],
    internalLinks: [],
    contentAnalysis: [],
    orphanedUrls: new Set(),
    urlMetrics: createMetrics({
      internal: 0,
      external: 0,
      internalIndexable: 0,
      internalNonIndexable: 0,
      nonAscii: 0,
      uppercase: 0,
      underscores: 0,
      containsSpace: 0,
      overLength: 0,
    }),
    responseCodeMetrics: {},
    titleMetrics: createMetrics({
      missing: createCountMetrics(),
      duplicate: createCountMetrics(),
      tooLong: createCountMetrics(),
      tooShort: createCountMetrics(),
      pixelWidth: {},
    }),
    metaDescriptionMetrics: createMetrics({
      missing: createCountMetrics(),
      duplicate: createCountMetrics(),
      tooLong: createCountMetrics(),
      tooShort: createCountMetrics(),
      pixelWidth: {},
    }),
    h1Metrics: createMetrics({
      missing: createCountMetrics(),
      duplicate: createCountMetrics(),
      tooLong: createCountMetrics(),
      multiple: createCountMetrics(),
    }),
    h2Metrics: createMetrics({
      missing: createCountMetrics(),
      duplicate: createCountMetrics(),
      tooLong: createCountMetrics(),
      multiple: createCountMetrics(),
      nonSequential: createCountMetrics(),
    }),
    imageMetrics: createMetrics({
      missingAlt: createCountMetrics(),
      missingAltAttribute: createCountMetrics(),
      altTextTooLong: createCountMetrics(),
    }),
    linkMetrics: createMetrics({
      pagesWithoutInternalOutlinks: createCountMetrics(),
      pagesWithHighExternalOutlinks: createCountMetrics(),
      internalOutlinksWithoutAnchorText: createCountMetrics(),
      nonDescriptiveAnchorText: createCountMetrics(),
    }),
    securityMetrics: createMetrics({
      httpUrls: createCountMetrics(),
      missingHstsHeader: createCountMetrics(),
      missingContentSecurityPolicy: createCountMetrics(),
      missingXFrameOptions: createCountMetrics(),
      missingXContentTypeOptions: createCountMetrics(),
    }),
    hreflangMetrics: createMetrics({
      pagesWithHreflang: createCountMetrics(),
      missingReturnLinks: createCountMetrics(),
      incorrectLanguageCodes: createCountMetrics(),
    }),
    canonicalMetrics: createMetrics({
      missing: createCountMetrics(),
      selfReferencing: createCountMetrics(),
      nonSelf: createCountMetrics(),
    }),
    contentMetrics: createMetrics({
      lowContent: createCountMetrics(),
      duplicate: createCountMetrics(),
    }),
    seoScores: [],
    performanceAnalysis: [],
    failedUrls: [],
  };
}
async function handleInvalidUrls(invalidUrls, outputDir) {
  if (invalidUrls.length > 0) {
    global.auditcore.logger.warn(`Found ${invalidUrls.length} invalid URL(s). Saving to file...`);
    const invalidUrlsPath = path.join(outputDir, 'invalid_urls.json');
    await fs.writeFile(invalidUrlsPath, JSON.stringify(invalidUrls, null, 2));
    global.auditcore.logger.info(`Invalid URLs saved to ${invalidUrlsPath}`);
  }
}

async function getUrlsFromSitemapWithRetry(sitemapUrl, limit, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      global.auditcore.logger.debug(`Attempt ${attempt} to get URLs from sitemap...`);
      const result = await getUrlsFromSitemap(sitemapUrl, limit);
      if (!result || typeof result !== 'object') {
        throw new Error(`getUrlsFromSitemap returned invalid result: ${JSON.stringify(result)}`);
      }
      
      result.validUrls = result.validUrls || [];
      result.invalidUrls = result.invalidUrls || [];
      
      global.auditcore.logger.debug(`Valid URLs: ${JSON.stringify(result.validUrls)}`);
      global.auditcore.logger.debug(`Invalid URLs: ${JSON.stringify(result.invalidUrls)}`);
      
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        global.auditcore.logger.error(`Failed to get URLs after ${maxRetries} attempts:`, error);
        throw error;
      }
      global.auditcore.logger.warn(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
}

async function runPostProcessingTasks(results, outputDir, sitemapUrl) {
  const tasks = [
    { name: 'Post-processing', func: () => postProcessResults(results, outputDir) },
    { name: 'Saving results', func: () => saveResults(results, outputDir, sitemapUrl) },
    { name: 'Generating sitemap', func: () => generateSitemap(results, outputDir) },
  ];

  for (const task of tasks) {
    if (checkIsShuttingDown()) break;
    global.auditcore.logger.debug(`Starting ${task.name.toLowerCase()}...`);
    try {
      await task.func();
      global.auditcore.logger.debug(`${task.name} completed successfully`);
    } catch (error) {
      global.auditcore.logger.error(`Error during ${task.name.toLowerCase()}:`, error);
      global.auditcore.logger.debug(`${task.name} error stack:`, error.stack);
    }
  }
}

function logProcessingTime(startTime) {
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const duration = seconds + nanoseconds / 1e9;
  global.auditcore.logger.info(`Total processing time: ${duration.toFixed(2)} seconds`);
}

async function handleError(error, results, outputDir, sitemapUrl) {
  global.auditcore.logger.error('Error in runTestsOnSitemap:', error);
  global.auditcore.logger.debug('Error stack:', error.stack);
  try {
    await saveResults(results, outputDir, sitemapUrl);
    global.auditcore.logger.info('Partial results saved successfully');
  } catch (saveError) {
    global.auditcore.logger.error('Error saving partial results:', saveError);
    global.auditcore.logger.debug('Save error stack:', saveError.stack);
  }
}

async function performCleanup() {
  global.auditcore.logger.info('Cleanup operations completed');
}

export async function runTestsOnSitemap() {
  const { sitemap: sitemapUrl, output: outputDir, limit, ...otherOptions } = global.auditcore.options;
  
  const startTime = process.hrtime();
  global.auditcore.logger.info(`Starting process for sitemap or page: ${sitemapUrl}`);
  global.auditcore.logger.info(`Results will be saved to: ${outputDir}`);

  let results = initializeResults();
  setupShutdownHandler(outputDir, results);

  try {
    await validateAndPrepare(sitemapUrl, outputDir, otherOptions);
    
    const urlsResult = await getUrlsFromSitemapWithRetry(sitemapUrl, limit);
    
    const { validUrls = [], invalidUrls = [] } = urlsResult;

    global.auditcore.logger.info(
      `Found ${validUrls.length} valid URL(s) and ${invalidUrls.length} invalid URL(s)`,
    );

    global.auditcore.logger.debug(`Valid URLs: ${JSON.stringify(validUrls)}`);
    global.auditcore.logger.debug(`Invalid URLs: ${JSON.stringify(invalidUrls)}`);

    if (invalidUrls.length > 0) {
      await handleInvalidUrls(invalidUrls, outputDir);
    }

    if (validUrls.length === 0) {
      global.auditcore.logger.warn('No valid URLs found to process');
      return results;
    }

    if (!checkIsShuttingDown()) {
      const baseUrl = otherOptions.baseUrl || (validUrls[0] && new URL(validUrls[0].url).origin);
      const processorOptions = { ...otherOptions, baseUrl, outputDir, sitemapUrl };
      results = await processSitemapUrls(validUrls, processorOptions);
    }

    global.auditcore.logger.info('Summary of results:');
    global.auditcore.logger.info(`Total URLs processed: ${results.urlMetrics.total}`);
    global.auditcore.logger.info(`Internal URLs: ${results.urlMetrics.internal}`);
    global.auditcore.logger.info(`External URLs: ${results.urlMetrics.external}`);
    global.auditcore.logger.info(`Indexable URLs: ${results.urlMetrics.internalIndexable}`);
    global.auditcore.logger.info(`Non-Indexable URLs: ${results.urlMetrics.internalNonIndexable}`);
    global.auditcore.logger.info(`Total Pa11y issues: ${results.pa11y.reduce((sum, result) => sum + (result.issues ? result.issues.length : 0), 0)}`);
    global.auditcore.logger.info(`Average SEO Score: ${results.seoScores.reduce((sum, score) => sum + score.score, 0) / results.seoScores.length}`);

    await runPostProcessingTasks(results, outputDir, sitemapUrl, otherOptions);

    logProcessingTime(startTime);

    return results;
  } catch (error) {
    await handleError(error, results, outputDir, sitemapUrl);
    throw error;
  } finally {
    await performCleanup();
  }
}