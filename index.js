// index.js

import { program } from 'commander';
import winston from 'winston';
import fs from 'fs';
import { runTestsOnSitemap } from './src/main.js';

const logFiles = ['error.log', 'combined.log'];

// Clear log files before starting, only if they exist
logFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    try {
      fs.writeFileSync(file, '', { flag: 'w' }); // Truncate the file
    } catch (err) {
      console.error(`Failed to clear log file ${file}:`, err);
    }
  }
});

program
  .option('-s, --sitemap <url>', 'URL of the sitemap to process', 'https://allabout.network/sitemap.xml')
  .option('-o, --output <directory>', 'Output directory for results', 'results')
  .option(
    '-l, --limit <number>',
    'Limit the number of URLs to test. Use -1 to test all URLs.',
    parseInt,
    -1,
  )
  .option('--cache-only', 'Use only cached data, do not fetch new data')
  .option('--no-cache', 'Disable caching, always fetch fresh data')
  .option('--no-puppeteer', 'Bypass Puppeteer execution and use cached HTML')
  .option('--force-delete-cache', 'Force delete existing cache before starting')
  .option(
    '--log-level <level>',
    'Set logging level (error, warn, info, verbose, debug)',
    'warn',
  )
  .parse(process.argv);

global.auditcore = {
  logger: null,
  options: program.opts(),
};

const { output: outputDir } = global.auditcore.options;

if (fs.existsSync(outputDir)) {
  try {
    fs.rmSync(outputDir, { recursive: true, force: true });
    console.log(`Output directory '${outputDir}' removed successfully.`);
  } catch (err) {
    console.error(`Failed to remove output directory '${outputDir}':`, err);
    process.exit(1);
  }
}

global.auditcore.logger = winston.createLogger({
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

global.auditcore.options.limit = parseInt(global.auditcore.options.limit, 10);
if (Number.isNaN(global.auditcore.options.limit)) {
  global.auditcore.options.limit = -1;
}

global.auditcore.logger.level = global.auditcore.options.logLevel;

global.auditcore.logger.info('Current Settings Summary:');
global.auditcore.logger.info('-------------------------');
global.auditcore.logger.info(`Sitemap URL: ${global.auditcore.options.sitemap}`);
global.auditcore.logger.info(`Output Directory: ${global.auditcore.options.output}`);
global.auditcore.logger.info(`Limit: ${global.auditcore.options.limit}`);
global.auditcore.logger.info(
  `Puppeteer: ${global.auditcore.options.puppeteer ? 'Enabled' : 'Disabled'}`,
);
global.auditcore.logger.info(
  `Cache Only: ${global.auditcore.options.cacheOnly ? 'Enabled' : 'Disabled'}`,
);
global.auditcore.logger.info(
  `Cache: ${global.auditcore.options.cache ? 'Enabled' : 'Disabled'}`,
);
global.auditcore.logger.info(
  `Force Delete Cache: ${global.auditcore.options.forceDeleteCache ? 'Enabled' : 'Disabled'}`,
);
global.auditcore.logger.info(`Log Level: ${global.auditcore.options.logLevel}`);

global.auditcore.logger.info('Starting the crawl process...');

async function main() {
  try {
    const results = await runTestsOnSitemap();
    
    // Check for specific errors in the results
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

main().catch((error) => {
  global.auditcore.logger.error('Uncaught exception:', error);
  process.exit(1);
});