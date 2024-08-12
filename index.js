#!/usr/bin/env node

import { program } from 'commander';
import { runTestsOnSitemap } from './src/main.js';
import { setDebugMode } from './src/utils/debug.js';
import { displayCachingOptions } from './src/utils/caching.js';

program
    .requiredOption('-s, --sitemap <url>', 'URL of the sitemap to process')
    .requiredOption('-o, --output <directory>', 'Output directory for results')
    .option('-l, --limit <number>', 'Limit the number of URLs to test. Use -1 to test all URLs.', parseInt)
    .option('--cache-only', 'Use only cached data, do not fetch new data')
    .option('--no-cache', 'Disable caching, always fetch fresh data')
    .option('--no-puppeteer', 'Bypass Puppeteer execution and use cached HTML')
    .option('--force-delete-cache', 'Force delete existing cache before starting')
    .option('--debug', 'Enable debug mode for verbose logging')
    .parse(process.argv);

const options = program.opts();

// Ensure limit is a number
options.limit = parseInt(options.limit) || -1;

setDebugMode(options.debug);

console.log('Current Settings Summary:');
console.log('-------------------------');
console.log(`Sitemap URL: ${options.sitemap}`);
console.log(`Output Directory: ${options.output}`);
console.log(`Limit: ${options.limit}`);
console.log(`Puppeteer: ${options.puppeteer ? 'Enabled' : 'Disabled'}`);
console.log(`Cache Only: ${options.cacheOnly ? 'Enabled' : 'Disabled'}`);
console.log(`Cache: ${options.cache ? 'Enabled' : 'Disabled'}`);
console.log(`Force Delete Cache: ${options.forceDeleteCache ? 'Enabled' : 'Disabled'}`);
console.log(`Debug Mode: ${options.debug ? 'Enabled' : 'Disabled'}`);

console.log('\nStarting the crawl process...\n');

displayCachingOptions(options);

runTestsOnSitemap(options.sitemap, options.output, options, options.limit)
    .then(() => {
        console.log('Script completed successfully');
    })
    .catch((error) => {
        console.error('Script failed with error:', error);
        process.exit(1);
    });