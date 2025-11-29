/**
 * Main entry point for the SEO and Accessibility Analysis Tool
 * 
 * This module handles:
 * - Command line argument parsing
 * - Application initialization
 * - Logging configuration
 * - Main execution flow
 * - Error handling and cleanup
 * 
 * @module index
 */

import { program } from 'commander';
import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { runTestsOnSitemap } from './src/main.js';

// Log files to manage application logging
const logFiles = ['error.log', 'combined.log'];

let defurl;
let defcount;

// Default URL for analysis when none is provided
defurl = 'https://allabout.network/blogs/ddt/';
defurl='https://allabout.network/sitemap.xml';
// Default count for analysis when none is provided, -1 = infinite
defcount = -1

// Clear existing log files before starting new session
logFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    try {
      // Truncate log files to ensure fresh start
      fs.writeFileSync(file, '', { flag: 'w' });
    } catch (err) {
      console.error(`Failed to clear log file ${file}:`, err);
    }
  }
});

/**
 * Configure command line options using Commander
 * 
 * Available options:
 * - sitemap: URL of the sitemap to process
 * - output: Output directory for results
 * - limit: Number of URLs to test
 * - count: Number of files to include in both passes
 * - cache-only: Use only cached data
 * - no-cache: Disable caching
 * - no-puppeteer: Bypass Puppeteer execution
 * - force-delete-cache: Force delete existing cache
 * - log-level: Set logging level
 * - include-all-languages: Include all language variants in sitemap
 */
program
  .option(
    '-s, --sitemap <url>', 
    'URL of the sitemap to process', 
    defurl
  )
  .option('-o, --output <directory>', 'Output directory for results', 'results')
  .option(
    '-l, --limit <number>',
    'Limit the number of URLs to test. Use -1 to test all URLs.',
    (value) => parseInt(value, 10),
    defcount
  )
  .option(
    '-c, --count <number>',
    'Number of files to include in both passes (virtual XML creation and analysis). Use -1 for infinite.',
    (value) => parseInt(value, 10),
    defcount
  )
  .option('--cache-only', 'Use only cached data, do not fetch new data')
  .option('--no-cache', 'Disable caching, always fetch fresh data')
  .option('--no-puppeteer', 'Bypass Puppeteer execution')
  .option('--force-delete-cache', 'Force delete existing cache')
  .option(
    '--log-level <level>',
    'Set logging level (error, warn, info, debug)',
    'debug'
  )
  .option(
    '--include-all-languages',
    'Include all language variants in sitemap (default: only /en and /us)'
  )
  .parse(process.argv);

// Global configuration object for shared state
global.auditcore = {
  logger: null,
  options: program.opts(),
};

// Destructure output directory from options
const { output: outputDir } = global.auditcore.options;

// Ensure output directory exists
try {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Output directory '${outputDir}' created successfully.`);
  } else {
    console.log(`Output directory '${outputDir}' already exists.`);
  }
} catch (err) {
  console.error(`Failed to create output directory '${outputDir}':`, err);
  process.exit(1);
}

/**
 * Configure Winston logger with console and file transports
 * 
 * Logging levels:
 * - error: Critical errors
 * - warn: Warnings
 * - info: Informational messages
 * - debug: Debugging information
 */
global.auditcore.logger = winston.createLogger({
  level: global.auditcore.options.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`,
    ),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

/**
 * Ensures cache directory exists for storing temporary data
 * @throws {Error} If directory creation fails
 */
function ensureCacheDirectory() {
  const cacheDir = path.join(process.cwd(), '.cache');
  const renderedDir = path.join(cacheDir, 'rendered');
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      global.auditcore.logger.info(`Created cache directory at ${cacheDir}`);
    }
    if (!fs.existsSync(renderedDir)) {
      fs.mkdirSync(renderedDir, { recursive: true });
      global.auditcore.logger.info(`Created rendered cache directory at ${renderedDir}`);
    }
  } catch (error) {
    global.auditcore.logger.error(`Failed to create cache directory: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Main execution function
 * 
 * Handles:
 * - Cache directory initialization
 * - Sitemap analysis execution
 * - Result processing
 * - Error handling
 * 
 * @async
 * @throws {Error} If any critical operation fails
 */
async function main() {
  try {
    // Ensure cache directory exists before running tests
    ensureCacheDirectory();
    
    // Execute main analysis process
    const results = await runTestsOnSitemap();
    
    // Handle specific analysis errors
    if (results && results.errors) {
      results.errors.forEach((error) => {
        if (error.includes('openGraphTags must be an object')) {
          global.auditcore.logger.warn('Warning: Issue with openGraphTags in scoreSocialMediaTags. This may affect SEO scores.');
        }
      });
    }
    
    global.auditcore.logger.info('Script completed successfully');
  } catch (error) {
    global.auditcore.logger.error('Script failed with error:', error);
    process.exit(1);
  }
}

// Execute main function with error handling
main().catch((error) => {
  global.auditcore.logger.error('Uncaught exception:', error);
  process.exit(1);
});
