import { getUrlsFromSitemap, processSitemapUrls } from './utils/sitemap.js';
import { generateReports } from './utils/reports.js';
import { setupShutdownHandler, updateCurrentResults } from './utils/shutdownHandler.js';
import { executeNetworkOperation } from './utils/networkUtils.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Run tests on a sitemap or webpage
 */
export async function runTestsOnSitemap() {
  const { sitemap: sitemapUrl, output: outputDir, count } = global.auditcore.options;

  // Setup shutdown handler at the start
  setupShutdownHandler();

  global.auditcore.logger.info(`Starting process for sitemap or page: ${sitemapUrl}`);
  global.auditcore.logger.info(`Results will be saved to: ${outputDir}`);

  // Check for existing results
  const resultsPath = path.join(outputDir, 'results.json');
  let results;
  
  try {
    // Try to load existing results
    const existingResults = await fs.readFile(resultsPath, 'utf-8');
    results = JSON.parse(existingResults);
    global.auditcore.logger.info('Found existing results, using cached data');
  } catch (error) {
    global.auditcore.logger.debug('No existing results found, starting fresh processing');
  }

  try {
    if (!results) {
      // Phase 1: Get URLs
      global.auditcore.logger.info('Phase 1: Getting sitemap URLs...');
      const urls = await executeNetworkOperation(
        () => getUrlsFromSitemap(sitemapUrl, count),
        'sitemap URL retrieval'
      );
      
      if (!urls || urls.length === 0) {
        global.auditcore.logger.warn('No valid URLs found to process');
        return null;
      }

      global.auditcore.logger.info(`Found ${urls.length} URLs to process`);

      // Phase 2: Process URLs
      global.auditcore.logger.info('Phase 2: Processing URLs...');
      results = await executeNetworkOperation(
        () => processSitemapUrls(urls.slice(0, count === -1 ? urls.length : count)),
        'URL processing'
      );

      // Save results for future use
      await fs.writeFile(resultsPath, JSON.stringify(results));
    }

    // Update current results for shutdown handler
    updateCurrentResults(results);

    // Phase 3: Generate Reports
    global.auditcore.logger.info('Phase 3: Generating reports...');
    await executeNetworkOperation(
      () => generateReports(results, results.urls || [], outputDir),
      'report generation'
    );

    return results;
  } catch (error) {
    global.auditcore.logger.error('Error in runTestsOnSitemap:', error);
    throw error;
  }
}
