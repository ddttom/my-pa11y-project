import { getUrlsFromSitemap, processSitemapUrls } from './utils/sitemap.js';
import { generateReports } from './utils/reports.js';
import { setupShutdownHandler, updateCurrentResults } from './utils/shutdownHandler.js';

/**
 * Run tests on a sitemap or webpage
 */
export async function runTestsOnSitemap() {
  const { sitemap: sitemapUrl, output: outputDir, limit } = global.auditcore.options;

  // Setup shutdown handler at the start
  setupShutdownHandler();

  global.auditcore.logger.info(`Starting process for sitemap or page: ${sitemapUrl}`);
  global.auditcore.logger.info(`Results will be saved to: ${outputDir}`);

  try {
    // Phase 1: Get URLs
    global.auditcore.logger.info('Phase 1: Getting sitemap URLs...');
    const urls = await getUrlsFromSitemap(sitemapUrl, limit);
    
    if (!urls || urls.length === 0) {
      global.auditcore.logger.warn('No valid URLs found to process');
      return null;
    }

    global.auditcore.logger.info(`Found ${urls.length} URLs to process`);

    // Phase 2: Process URLs
    global.auditcore.logger.info('Phase 2: Processing URLs...');
    const results = await processSitemapUrls(urls);

    // Update current results for shutdown handler
    updateCurrentResults(results);

    // Phase 3: Generate Reports
    global.auditcore.logger.info('Phase 3: Generating reports...');
    await generateReports(results, urls, outputDir);

    return results;
  } catch (error) {
    global.auditcore.logger.error('Error in runTestsOnSitemap:', error);
    throw error;
  }
}
