/* eslint-disable max-len */
// index.js

/**
 * This script is the entry point for the SEO analysis tool.
 * It processes a sitemap URL, analyzes the pages, and generates various reports.
 * The script uses Commander.js for CLI option parsing and Winston for logging.
 */

import { program } from 'commander';
import winston from 'winston';
import { runTestsOnSitemap } from './src/main';

// Create the global auditcore object
const auditcore = {
  logger: null,
  options: {},
  // Add more properties here as needed
};

// Assign to global namespace
global.auditcore = auditcore;

// Winston logger setup
auditcore.logger = winston.createLogger({
  level: 'info',
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

program
  .requiredOption('-s, --sitemap <url>', 'URL of the sitemap to process')
  .requiredOption('-o, --output <directory>', 'Output directory for results')
  .option(
    '-l, --limit <number>',
    'Limit the number of URLs to test. Use -1 to test all URLs.',
    parseInt,
  )
  .option('--cache-only', 'Use only cached data, do not fetch new data')
  .option('--no-cache', 'Disable caching, always fetch fresh data')
  .option('--no-puppeteer', 'Bypass Puppeteer execution and use cached HTML')
  .option('--force-delete-cache', 'Force delete existing cache before starting')
  .option(
    '--log-level <level>',
    'Set logging level (error, warn, info, verbose, debug)',
    'info',
  )

  .parse(process.argv);

// Store options in the global auditcore object
auditcore.options = program.opts();

// Input validation for required options
if (!auditcore.options.sitemap || !auditcore.options.output) {
  global.auditcore.logger.error(
    'Error: Sitemap URL and output directory are required.',
  );
  process.exit(1);
}

// Ensure limit is a number
auditcore.options.limit = parseInt(auditcore.options.limit, 10);
if (Number.isNaN(auditcore.options.limit)) {
  auditcore.options.limit = -1;
}

// Set log level based on command line option
global.auditcore.logger.level = auditcore.options.logLevel;

global.auditcore.logger.info('Current Settings Summary:');
global.auditcore.logger.info('-------------------------');
global.auditcore.logger.info(`Sitemap URL: ${auditcore.options.sitemap}`);
global.auditcore.logger.info(`Output Directory: ${auditcore.options.output}`);
global.auditcore.logger.info(`Limit: ${auditcore.options.limit}`);
global.auditcore.logger.info(
  `Puppeteer: ${auditcore.options.puppeteer ? 'Enabled' : 'Disabled'}`,
);
global.auditcore.logger.info(
  `Cache Only: ${auditcore.options.cacheOnly ? 'Enabled' : 'Disabled'}`,
);
global.auditcore.logger.info(
  `Cache: ${auditcore.options.cache ? 'Enabled' : 'Disabled'}`,
);
global.auditcore.logger.info(
  `Force Delete Cache: ${auditcore.options.forceDeleteCache ? 'Enabled' : 'Disabled'}`,
);
global.auditcore.logger.info(`Log Level: ${auditcore.options.logLevel}`);

global.auditcore.logger.info('Starting the crawl process...');

try {
  runTestsOnSitemap()
    .then(() => {
      global.auditcore.logger.info('Script completed successfully');
    })
    .catch((error) => {
      global.auditcore.logger.error('Script failed with error:', error);
      process.exit(1);
    });
} catch (error) {
  global.auditcore.logger.error('Uncaught exception:', error);
  process.exit(1);
}
