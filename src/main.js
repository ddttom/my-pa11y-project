import { getUrlsFromSitemap, processSitemapUrls } from './utils/sitemap.js';
import { generateReports } from './utils/reports.js';
import { setupShutdownHandler, updateCurrentResults } from './utils/shutdownHandler.js';
import { executeNetworkOperation, executeBrowserNetworkOperation } from './utils/networkUtils.js';

/**
 * Run tests on a sitemap or webpage
 */
export async function runTestsOnSitemap() {
  const { sitemap: sitemapUrl, output: outputDir, count } = global.auditcore.options;

  // Setup shutdown handler at the start
  setupShutdownHandler();

  global.auditcore.logger.info(`Starting process for sitemap or page: ${sitemapUrl}`);
  global.auditcore.logger.info(`Results will be saved to: ${outputDir}`);

  try {
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
    const results = await executeBrowserNetworkOperation(
      () => processSitemapUrls(urls.slice(0, count === -1 ? urls.length : count)),
      'URL processing'
    );

    // Update current results for shutdown handler
    updateCurrentResults(results);

    // Phase 3: Generate Reports
    global.auditcore.logger.info('Phase 3: Generating reports...');
    await executeNetworkOperation(
      () => generateReports(results, urls, outputDir),
      'report generation'
    );

    return results;
  } catch (error) {
    global.auditcore.logger.error('Error in runTestsOnSitemap:', error);
    throw error;
  }
}
