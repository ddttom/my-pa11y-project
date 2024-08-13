/* eslint-disable import/extensions */
// index.js

import { program } from 'commander';
import winston from 'winston';
import { runTestsOnSitemap } from './src/main.js';
import { displayCachingOptions } from './src/utils/caching.js';

// Winston logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => (
      `${timestamp} ${level}: ${message}`
    )),
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
  .option('--log-level <level>', 'Set logging level (error, warn, info, verbose, debug, silly)', 'info')
  .parse(process.argv);

const options = program.opts();

// Ensure limit is a number
options.limit = parseInt(options.limit, 10) || -1;

// Set log level based on command line option
logger.level = options.logLevel;

logger.info('Current Settings Summary:');
logger.info('-------------------------');
logger.info(`Sitemap URL: ${options.sitemap}`);
logger.info(`Output Directory: ${options.output}`);
logger.info(`Limit: ${options.limit}`);
logger.info(`Puppeteer: ${options.puppeteer ? 'Enabled' : 'Disabled'}`);
logger.info(`Cache Only: ${options.cacheOnly ? 'Enabled' : 'Disabled'}`);
logger.info(`Cache: ${options.cache ? 'Enabled' : 'Disabled'}`);
logger.info(`Force Delete Cache: ${options.forceDeleteCache ? 'Enabled' : 'Disabled'}`);
logger.info(`Log Level: ${options.logLevel}`);

logger.info('\nStarting the crawl process...\n');

displayCachingOptions(options);

runTestsOnSitemap(options.sitemap, options.output, options, options.limit, logger)
  .then(() => {
    logger.info('Script completed successfully');
  })
  .catch((error) => {
    logger.error('Script failed with error:', error);
    process.exit(1);
  });
