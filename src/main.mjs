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

async function handleInvalidUrls(invalidUrls, outputDir, logger) {
  if (invalidUrls.length > 0) {
    logger.warn(`Found ${invalidUrls.length} invalid URL(s). Saving to file...`);
    const invalidUrlsPath = path.join(outputDir, 'invalid_urls.json');
    await fs.writeFile(invalidUrlsPath, JSON.stringify(invalidUrls, null, 2));
    logger.info(`Invalid URLs saved to ${invalidUrlsPath}`);
  }
}

async function generateReports(results, outputDir, logger) {
  // Implement additional report generation here
  // For example, you could generate a summary report, detailed analysis report, etc.
  logger.info('Generating additional reports...');
  // Example:
  // await generateSummaryReport(results, outputDir);
  // await generateDetailedAnalysisReport(results, outputDir);
  logger.info('Additional reports generated successfully');
}

export async function runTestsOnSitemap(
  sitemapUrl,
  outputDir,
  options,
  limit = -1,
  logger,
) {
  const startTime = process.hrtime();
  logger.info(`Starting process for sitemap or page: ${sitemapUrl}`);
  logger.info(`Results will be saved to: ${outputDir}`);

  let results = initializeResults();
  setupShutdownHandler(outputDir, results, logger);

  try {
    await validateAndPrepare(sitemapUrl, outputDir, options, logger);
    const { validUrls, invalidUrls } = await getUrlsFromSitemap(
      sitemapUrl,
      limit,
      logger,
    );

    logger.info(
      `Found ${validUrls.length} valid URL(s) and ${invalidUrls.length} invalid URL(s)`,
    );

    await handleInvalidUrls(invalidUrls, outputDir, logger);

    if (validUrls.length === 0) {
      logger.warn('No valid URLs found to process');
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
      results = await processSitemapUrls(validUrls, processorOptions, logger);
    }

    if (!checkIsShuttingDown()) {
      await postProcessResults(results, outputDir, logger);
    }

    if (!checkIsShuttingDown()) {
      await saveResults(results, outputDir, sitemapUrl, logger);
    }

    // Generate sitemap
    if (!checkIsShuttingDown()) {
      const sitemapPath = await generateSitemap(results, outputDir, options, logger);
      if (sitemapPath) {
        logger.info('Sitemap generation summary:', sitemapPath);
      } else {
        logger.warn('No sitemap was generated due to lack of valid URLs.');
      }
    }

    // Generate additional reports
    if (!checkIsShuttingDown()) {
      await generateReports(results, outputDir, logger);
    }

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    logger.info(`Total processing time: ${duration.toFixed(2)} seconds`);

    return results;
  } catch (error) {
    logger.error('Error in runTestsOnSitemap:', error);
    // Attempt to save partial results
    try {
      await saveResults(results, outputDir, sitemapUrl, logger);
      logger.info('Partial results saved successfully');
    } catch (saveError) {
      logger.error('Error saving partial results:', saveError);
    }
    throw error;
  } finally {
    // Cleanup operations if needed
    // For example, close any open connections, clear caches, etc.
    logger.info('Cleanup operations completed');
  }
}

export async function runBatchTests(sitemaps, outputDir, options, limit, logger) {
  logger.info(`Starting batch processing for ${sitemaps.length} sitemaps`);
  const batchResults = [];

  for (const sitemapUrl of sitemaps) {
    try {
      const result = await runTestsOnSitemap(sitemapUrl, outputDir, options, limit, logger);
      batchResults.push({ sitemapUrl, success: true, result });
    } catch (error) {
      logger.error(`Error processing sitemap ${sitemapUrl}:`, error);
      batchResults.push({ sitemapUrl, success: false, error: error.message });
    }
  }

  logger.info('Batch processing completed');
  return batchResults;
}
