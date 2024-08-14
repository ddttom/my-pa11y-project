/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/extensions */
// main.js

import path from 'path';
import fs from 'fs/promises';
import { validateAndPrepare } from './utils/setup.mjs';
import { getUrlsFromSitemap, processSitemapUrls } from './utils/sitemap.mjs';
import { postProcessResults, saveResults } from './utils/results.mjs';
import { generateSitemap } from './utils/sitemapGenerator.mjs';
import {
  checkIsShuttingDown,
  setupShutdownHandler,
} from './utils/shutdownHandler.mjs';

export function initializeResults() {
  // ... (keep the existing initializeResults function unchanged)
}

async function handleInvalidUrls(invalidUrls, outputDir) {
  if (invalidUrls.length > 0) {
    global.auditcore.logger.warn(`Found ${invalidUrls.length} invalid URL(s). Saving to file...`);
    const invalidUrlsPath = path.join(outputDir, 'invalid_urls.json');
    await fs.writeFile(invalidUrlsPath, JSON.stringify(invalidUrls, null, 2));
    global.auditcore.logger.info(`Invalid URLs saved to ${invalidUrlsPath}`);
  }
}

async function generateReports(results, outputDir) {
  // Implement additional report generation here
  // For example, you could generate a summary report, detailed analysis report, etc.
  global.auditcore.logger.info('Generating additional reports...');
  // Example:
  // await generateSummaryReport(results, outputDir);
  // await generateDetailedAnalysisReport(results, outputDir);
  global.auditcore.logger.info('Additional reports generated successfully');
}

export async function runTestsOnSitemap() {

  sitemapUrl = global.auditcore.options.sitemap;
  outputDir = global.auditcore.options.output;
  options = global.auditcore.options;
  limit = global.auditcore.options.limit;

  const startTime = process.hrtime();
  global.auditcore.logger.info(`Starting process for sitemap or page: ${sitemapUrl}`);
  global.auditcore.logger.info(`Results will be saved to: ${outputDir}`);

  let results = initializeResults();
  setupShutdownHandler(outputDir, results);

  try {
    await validateAndPrepare(sitemapUrl, outputDir, options);
    const { validUrls, invalidUrls } = await getUrlsFromSitemap(
      sitemapUrl,
      limit,
      logger,
    );

    global.global.auditcore.logger.info(
      `Found ${validUrls.length} valid URL(s) and ${invalidUrls.length} invalid URL(s)`,
    );

    await handleInvalidUrls(invalidUrls, outputDir);

    if (validUrls.length === 0) {
      global.auditcore.logger.warn('No valid URLs found to process');
      return results;
    }

    // Process URLs
    if (!checkIsShuttingDown()) {
      const processorOptions = {
        ...options,
        baseUrl: options.baseUrl || new URL(validUrls[0].url).origin,
        outputDir,
        sitemapUrl, // Add this for context in the processor
      };
      results = await processSitemapUrls(validUrls, processorOptions);
    }

    if (!checkIsShuttingDown()) {
      await postProcessResults(results, outputDir);
    }

    if (!checkIsShuttingDown()) {
      await saveResults(results, outputDir, sitemapUrl);
    }

    // Generate sitemap
    if (!checkIsShuttingDown()) {
      const sitemapPath = await generateSitemap(results, outputDir, options);
      if (sitemapPath) {
        global.auditcore.logger.info('Sitemap generation summary:', sitemapPath);
      } else {
        global.auditcore.logger.warn('No sitemap was generated due to lack of valid URLs.');
      }
    }

    // Generate additional reports
    if (!checkIsShuttingDown()) {
      await generateReports(results, outputDir);
    }

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    global.auditcore.logger.info(`Total processing time: ${duration.toFixed(2)} seconds`);

    return results;
  } catch (error) {
    global.auditcore.logger.error('Error in runTestsOnSitemap:', error);
    // Attempt to save partial results
    try {
      await saveResults(results, outputDir, sitemapUrl);
      global.auditcore.logger.info('Partial results saved successfully');
    } catch (saveError) {
      global.auditcore.logger.error('Error saving partial results:', saveError);
    }
    throw error;
  } finally {
    // Cleanup operations if needed
    // For example, close any open connections, clear caches, etc.
    global.auditcore.logger.info('Cleanup operations completed');
  }
}

export async function runBatchTests(sitemaps, outputDir, options, limit) {
  global.auditcore.logger.info(`Starting batch processing for ${sitemaps.length} sitemaps`);
  const batchResults = [];

  for (const sitemapUrl of sitemaps) {
    try {
      const result = await runTestsOnSitemap(sitemapUrl, outputDir, options, limit);
      batchResults.push({ sitemapUrl, success: true, result });
    } catch (error) {
      global.auditcore.logger.error(`Error processing sitemap ${sitemapUrl}:`, error);
      batchResults.push({ sitemapUrl, success: false, error: error.message });
    }
  }

  global.auditcore.logger.info('Batch processing completed');
  return batchResults;
}
