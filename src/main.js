import { getUrlsFromSitemap, processSitemapUrls } from './utils/sitemap.js';
import { generateReports } from './utils/reports.js';
import { setupShutdownHandler, updateCurrentResults } from './utils/shutdownHandler.js';
import { executeNetworkOperation } from './utils/networkUtils.js';
import { getDiscoveredUrls } from './utils/sitemapUtils.js';
import { RESULTS_SCHEMA_VERSION, areVersionsCompatible } from './utils/schemaVersion.js';
import { storeHistoricalResult } from './utils/historicalComparison.js';
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

  // Calculate noCache based on options (same logic as in caching.js)
  const { cache = true, noCache: explicitNoCache = false, forceDeleteCache = false } = global.auditcore.options;
  const noCache = explicitNoCache || !cache;

  // Delete entire results directory if force delete cache is enabled
  if (forceDeleteCache) {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
      global.auditcore.logger.info('Force delete cache: Deleted results directory');
      // Recreate the output directory
      await fs.mkdir(outputDir, { recursive: true });
      global.auditcore.logger.info(`Recreated output directory: ${outputDir}`);
    } catch (error) {
      global.auditcore.logger.debug('Error clearing results directory:', error.message);
    }
  }

  try {
    if (!noCache && !forceDeleteCache) {
      // Try to load existing results to support resume functionality
      const existingResults = await fs.readFile(resultsPath, 'utf-8');
      const parsedResults = JSON.parse(existingResults);

      // Check schema version compatibility
      const cachedVersion = parsedResults.schemaVersion || '1.0.0';

      if (!areVersionsCompatible(cachedVersion, RESULTS_SCHEMA_VERSION)) {
        global.auditcore.logger.warn(`Schema version mismatch: cached=${cachedVersion}, current=${RESULTS_SCHEMA_VERSION}`);
        global.auditcore.logger.warn('Cached results are incompatible with current schema. Reprocessing all URLs...');
        global.auditcore.logger.info(`Reason: New data fields have been added that require fresh analysis`);
        // Don't use cached results - will trigger fresh processing
        results = null;
      } else {
        results = parsedResults;
        global.auditcore.logger.info(`Found existing results (schema v${cachedVersion}), using cached data`);
      }
    }
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
      // Commander.js converts --no-recursive to recursive: false, defaults to true
      const { recursive = true } = global.auditcore.options;

      results = await executeNetworkOperation(
        () => processSitemapUrls(
          urls.slice(0, count === -1 ? urls.length : count),
          recursive  // Pass recursive flag (default: true)
        ),
        'URL processing'
      );

      // Store original sitemap URLs for comparison with discovered URLs
      results.originalSitemapUrls = urls.map(u => u.url);

      // Add schema version to results
      results.schemaVersion = RESULTS_SCHEMA_VERSION;

      // Save results for future use and resume capability
      await fs.writeFile(resultsPath, JSON.stringify(results));
    }

    // Update current results for shutdown handler to ensure data persistence
    updateCurrentResults(results);

    // Store historical result if enabled
    if (global.auditcore.options.enableHistory) {
      try {
        await storeHistoricalResult(results, outputDir);
        global.auditcore.logger.info('Historical result stored for future comparison');
      } catch (error) {
        global.auditcore.logger.warn('Could not store historical result:', error.message);
      }
    }

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

    if (results.externalResourcesAggregation && Object.keys(results.externalResourcesAggregation).length > 0) {
      const totalResources = Object.keys(results.externalResourcesAggregation).length;
      const totalReferences = Object.values(results.externalResourcesAggregation).reduce((sum, r) => sum + r.count, 0);

      // Count by type
      const typeBreakdown = Object.values(results.externalResourcesAggregation).reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {});

      const typeBreakdownStr = Object.entries(typeBreakdown)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ');

      global.auditcore.logger.info(`\n=== All Resources Summary ===\nFound ${totalResources} unique resources (${totalReferences} total references)\nBreakdown: ${typeBreakdownStr}\nSee all_resources_report.csv for details.\n=====================================\n`);
    } else {
      global.auditcore.logger.info(`\n=== All Resources Summary ===\nNo resources found.\n=====================================\n`);
    }

    // Missing sitemap URLs summary
    const discoveredUrls = getDiscoveredUrls(results);
    if (discoveredUrls.length > 0) {
      const urlList = discoveredUrls.map((url, index) => `  ${index + 1}. ${url}`).join('\n');
      global.auditcore.logger.info(`\n=== Missing Sitemap URLs ===\nFound ${discoveredUrls.length} same-domain URLs not in original sitemap\nThese URLs were discovered during page analysis\n\nDiscovered URLs:\n${urlList}\n\nSee missing_sitemap_urls.csv for details\nPerfected sitemap saved as v-sitemap.xml\n=====================================\n`);
    } else {
      global.auditcore.logger.info(`\n=== Missing Sitemap URLs ===\nAll discovered URLs were in the original sitemap\nPerfected sitemap saved as v-sitemap.xml\n=====================================\n`);
    }

    return results;
  } catch (error) {
    global.auditcore.logger.error('Error in runTestsOnSitemap:', error);
    throw error;
  }
}
