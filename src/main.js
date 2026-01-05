import fs from 'fs/promises';
import path from 'path';
import { getUrlsFromSitemap, processSitemapUrls } from './utils/sitemap.js';
import { generateReports } from './utils/reports.js';
import { setupShutdownHandler, updateCurrentResults } from './utils/shutdownHandler.js';
import { executeNetworkOperation, initializeBrowserPool, shutdownBrowserPool } from './utils/networkUtils.js';
import { getDiscoveredUrls } from './utils/sitemapUtils.js';
import { RESULTS_SCHEMA_VERSION, areVersionsCompatible } from './utils/schemaVersion.js';
import { storeHistoricalResult, establishBaseline } from './utils/historicalComparison.js';
import { fetchRobotsTxt, extractBaseUrl } from './utils/robotsFetcher.js';

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

  // Initialize browser pool for performance optimization
  try {
    await initializeBrowserPool({
      poolSize: global.auditcore.options.browserPoolSize || 3,
    });
  } catch (error) {
    global.auditcore.logger.warn('Failed to initialize browser pool, will use fallback mode:', error.message);
  }

  // Fetch robots.txt FIRST before any URL processing (Phase 0: robots.txt compliance check)
  global.auditcore.logger.info('Phase 0: Fetching robots.txt for compliance checking...');
  try {
    const baseUrl = extractBaseUrl(sitemapUrl);
    const robotsTxtData = await fetchRobotsTxt(baseUrl);

    // Store in global state for access throughout the session
    global.auditcore.robotsTxtData = robotsTxtData;
    global.auditcore.forceScrape = global.auditcore.options.forceScrape || false;
    global.auditcore.isFirstBlockedUrl = true; // Track if this is the first time we encounter a blocked URL

    if (robotsTxtData) {
      global.auditcore.logger.info('✓ robots.txt fetched and parsed successfully');
    } else {
      global.auditcore.logger.info('✓ No robots.txt found - allowing all URLs by default');
    }
  } catch (error) {
    global.auditcore.logger.warn(`Error fetching robots.txt: ${error.message}`);
    global.auditcore.logger.info('Proceeding without robots.txt (allowing all URLs by default)');
    global.auditcore.robotsTxtData = null;
    global.auditcore.forceScrape = global.auditcore.options.forceScrape || false;
    global.auditcore.isFirstBlockedUrl = true;
  }

  // Check for existing results to support resume functionality
  const resultsPath = path.join(outputDir, 'results.json');
  let results;

  // Calculate noCache based on options (same logic as in caching.js)
  const { cache = true, noCache: explicitNoCache = false, forceDeleteCache = false } = global.auditcore.options;
  const noCache = explicitNoCache || !cache;

  // Set cache directory relative to output directory for consolidated structure
  // Cache will be stored in {outputDir}/.cache instead of project root .cache
  const cacheDir = path.join(outputDir, global.auditcore.options.cacheDir || '.cache');
  global.auditcore.options.cacheDir = cacheDir;

  // Delete cache and old reports, but preserve history and baseline
  if (forceDeleteCache) {
    try {
      // Delete cache directory
      try {
        await fs.rm(cacheDir, { recursive: true, force: true });
        global.auditcore.logger.info('Force delete cache: Deleted cache directory');
      } catch (error) {
        global.auditcore.logger.debug('Cache directory does not exist or already deleted');
      }

      // Delete old reports but keep history/ and baseline.json
      try {
        const files = await fs.readdir(outputDir);
        for (const file of files) {
          const filePath = path.join(outputDir, file);
          // Skip history directory, baseline.json, and cache directory
          if (file === 'history' || file === 'baseline.json' || file === '.cache') {
            continue;
          }
          await fs.rm(filePath, { recursive: true, force: true });
        }
        global.auditcore.logger.info('Force delete cache: Deleted old reports (preserved history and baseline)');
      } catch (error) {
        global.auditcore.logger.debug('Error deleting old reports:', error.message);
      }

      // Recreate cache directory
      await fs.mkdir(cacheDir, { recursive: true });
      global.auditcore.logger.info('Recreated cache directory');
    } catch (error) {
      global.auditcore.logger.debug('Error clearing cache:', error.message);
    }
  } else {
    // Ensure cache directory exists within output directory
    try {
      await fs.mkdir(cacheDir, { recursive: true });
    } catch (error) {
      global.auditcore.logger.debug('Cache directory already exists or creation failed:', error.message);
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
        global.auditcore.logger.info('Reason: New data fields have been added that require fresh analysis');
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
        'sitemap URL retrieval',
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
          recursive, // Pass recursive flag (default: true)
        ),
        'URL processing',
      );

      // Store original sitemap URLs for comparison with discovered URLs
      results.originalSitemapUrls = urls.map((u) => u.url);

      // Add schema version to results
      results.schemaVersion = RESULTS_SCHEMA_VERSION;

      // Save results for future use and resume capability (minified for performance)
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
      'report generation',
    );

    // Establish baseline if requested
    if (global.auditcore.options.establishBaseline) {
      if (!global.auditcore.options.enableHistory) {
        global.auditcore.logger.warn('⚠️ --establish-baseline requires --enable-history flag');
      } else {
        try {
          const timestamp = global.auditcore.options.baselineTimestamp || null;
          await establishBaseline(outputDir, timestamp);
          global.auditcore.logger.info('✅ Baseline established successfully');
          global.auditcore.logger.info('Future audits will compare against this baseline to detect regressions');
        } catch (error) {
          global.auditcore.logger.error('Failed to establish baseline:', error.message);
        }
      }
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
        .map(([type, c]) => `${type}: ${c}`)
        .join(', ');

      global.auditcore.logger.info(`\n=== All Resources Summary ===\nFound ${totalResources} unique resources (${totalReferences} total references)\nBreakdown: ${typeBreakdownStr}\nSee all_resources_report.csv for details.\n=====================================\n`);
    }

    // Missing sitemap URLs summary
    const discoveredUrls = getDiscoveredUrls(results);
    if (discoveredUrls.length > 0) {
      const urlList = discoveredUrls.map((url, index) => `  ${index + 1}. ${url}`).join('\n');
      global.auditcore.logger.info(`\n=== Missing Sitemap URLs ===\nFound ${discoveredUrls.length} same-domain URLs not in original sitemap\nThese URLs were discovered during page analysis\n\nDiscovered URLs:\n${urlList}\n\nSee missing_sitemap_urls.csv for details\nPerfected sitemap saved as v-sitemap.xml\n=====================================\n`);
    } else {
      global.auditcore.logger.info('\n=== Missing Sitemap URLs ===\nAll discovered URLs were in the original sitemap\nPerfected sitemap saved as v-sitemap.xml\n=====================================\n');
    }

    return results;
  } catch (error) {
    global.auditcore.logger.error('Error in runTestsOnSitemap:', error);
    throw error;
  } finally {
    // Cleanup browser pool
    await shutdownBrowserPool();
  }
}
