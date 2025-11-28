import { getUrlsFromSitemap, processSitemapUrls } from './utils/sitemap.js';
import { generateReports } from './utils/reports.js';
import { setupShutdownHandler, updateCurrentResults } from './utils/shutdownHandler.js';
import { executeNetworkOperation } from './utils/networkUtils.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Main function to run accessibility and SEO tests on a sitemap or webpage
 * 
 * This function orchestrates the entire testing process in three phases:
 * 1. URL Collection: Retrieves URLs from sitemap or processes single page
 * 2. URL Processing: Analyzes each URL for accessibility and SEO metrics
 * 3. Report Generation: Creates detailed reports from collected data
 * 
 * @returns {Promise<Object|null>} Analysis results object containing:
 *   - urls: Array of processed URLs
 *   - contentAnalysis: Content quality metrics
 *   - performanceAnalysis: Performance metrics
 *   - seoScores: SEO scoring data
 *   - pa11y: Accessibility analysis results
 *   - internalLinks: Link analysis data
 * @throws {Error} If any phase fails
 * @example
 * // Run tests with default options
 * const results = await runTestsOnSitemap();
 * 
 * // Results structure:
 * {
 *   urls: ['https://example.com'],
 *   contentAnalysis: [...],
 *   performanceAnalysis: [...],
 *   seoScores: [...],
 *   pa11y: [...],
 *   internalLinks: [...]
 * }
 */
export async function runTestsOnSitemap() {
  const { sitemap: sitemapUrl, output: outputDir, count } = global.auditcore.options;

  // Setup shutdown handler at the start to ensure graceful termination
  setupShutdownHandler();

  global.auditcore.logger.info(`Starting process for sitemap or page: ${sitemapUrl}`);
  global.auditcore.logger.info(`Results will be saved to: ${outputDir}`);

  // Check for existing results to support resume functionality
  const resultsPath = path.join(outputDir, 'results.json');
  let results;
  
  try {
    // Try to load existing results to support resume functionality
    const existingResults = await fs.readFile(resultsPath, 'utf-8');
    results = JSON.parse(existingResults);
    global.auditcore.logger.info('Found existing results, using cached data');
  } catch (error) {
    global.auditcore.logger.debug('No existing results found, starting fresh processing');
  }

  try {
    if (!results) {
      // Phase 1: Get URLs from sitemap or process single page
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

      // Phase 2: Process URLs through analysis pipeline
      global.auditcore.logger.info('Phase 2: Processing URLs...');
      results = await executeNetworkOperation(
        () => processSitemapUrls(urls.slice(0, count === -1 ? urls.length : count)),
        'URL processing'
      );

      // Save results for future use and resume capability
      await fs.writeFile(resultsPath, JSON.stringify(results));
    }

    // Update current results for shutdown handler to ensure data persistence
    updateCurrentResults(results);

    // Phase 3: Generate comprehensive reports from collected data
    global.auditcore.logger.info('Phase 3: Generating reports...');
    await executeNetworkOperation(
      () => generateReports(results, results.urls || [], outputDir),
      'report generation'
    );

    if (results.specificUrlMetrics && results.specificUrlMetrics.length > 0) {
      global.auditcore.logger.info(`\n=== Specific URL Search Results ===\nFound ${results.specificUrlMetrics.length} occurrences of the target URL.\nSee specific_url_report.csv for details.\n=====================================\n`);
    } else {
      global.auditcore.logger.info(`\n=== Specific URL Search Results ===\nNo occurrences of the target URL were found.\n=====================================\n`);
    }

    return results;
  } catch (error) {
    global.auditcore.logger.error('Error in runTestsOnSitemap:', error);
    throw error;
  }
}
