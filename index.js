// index.js

import { program } from 'commander';
import winston from 'winston';
import fs from 'fs';
import { runTestsOnSitemap } from './src/main.js';

const logFiles = ['error.log', 'combined.log'];

// Clear log files before starting
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
  .option(
    '-s, --sitemap <url>', 
    'URL of the sitemap to process', 
    'https://allabout.network/blogs/ddt/edge-delivery-services-knowledge-hub'
  )
  .option('-o, --output <directory>', 'Output directory for results', 'results')
  .option(
    '-l, --limit <number>',
    'Limit the number of URLs to test. Use -1 to test all URLs.',
    (value) => parseInt(value, 10),
    -1
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
  .parse(process.argv);

global.auditcore = {
  logger: null,
  options: program.opts(),
};

const { output: outputDir } = global.auditcore.options;

// Clear output directory at startup
if (fs.existsSync(outputDir)) {
  try {
    fs.rmSync(outputDir, { recursive: true, force: true });
    console.log(`Output directory '${outputDir}' removed successfully.`);
  } catch (err) {
    console.error(`Failed to remove output directory '${outputDir}':`, err);
    process.exit(1);
  }
}

// Setup logger
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

async function main() {
  try {
    const results = await runTestsOnSitemap();
    
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
