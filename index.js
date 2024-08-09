// index.js

import { program } from 'commander';
import { runTestsOnSitemap } from './src/main.js';
import { setDebugMode } from './src/utils/debug.js';
import { displayCachingOptions } from './src/utils/caching.js';

program
    .requiredOption('-s, --sitemap <url>', 'URL of the sitemap to process')
    .requiredOption('-o, --output <directory>', 'Output directory for results')
    .option('-l, --limit <number>', 'Limit the number of URLs to test. Use -1 to test all URLs.', parseInt, -1)
    .option('--cache-only', 'Use only cached data, do not fetch new data')
    .option('--no-cache', 'Disable caching, always fetch fresh data')
    .option('--no-puppeteer', 'Bypass Puppeteer execution and use cached HTML')
    .option('--force-delete-cache', 'Force delete existing cache before starting')
    .option('--debug', 'Enable debug mode for verbose logging')
    .parse(process.argv);

const options = program.opts();

setDebugMode(options.debug);

console.log('Welcome to the Pa11y Crawler\n');
displayCachingOptions(options);
console.log('Starting the crawl process...\n');

runTestsOnSitemap(options.sitemap, options.output, options, options.limit)
    .then(() => {
        console.log('Script completed successfully');
    })
    .catch((error) => {
        console.error('Script failed with error:', error);
    });