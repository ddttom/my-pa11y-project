/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable import/extensions */
// src/utils/sitemap.js

import { SitemapStream, streamToPromise } from 'sitemap';
import { createGzip } from 'zlib';
import fs from 'fs/promises';
import path from 'path';
import { debug } from './debug.js';
import { isValidUrl } from './urlUtils.js';
import { fetchAndParseSitemap, extractUrls } from './sitemapParser.js';
import { processUrl } from './urlProcessor.js';

function fixUrl(url) {
  if (!url) return '';
  return url.replace(/([^:]\/)\/+/g, '$1');
}

export async function getUrlsFromSitemap(sitemapUrl, limit) {
  debug(`Processing sitemap: ${sitemapUrl}`);
  const parsedContent = await fetchAndParseSitemap(sitemapUrl);
  const urlsWithDates = await extractUrls(parsedContent);
  console.info(`Found ${urlsWithDates.length} URL(s) in the sitemap`);

  const validUrls = [];
  const invalidUrls = [];

  urlsWithDates.forEach((item) => {
    if (isValidUrl(item.url)) {
      validUrls.push(item);
    } else {
      invalidUrls.push(item);
    }
  });

  console.info(`${validUrls.length} valid URL(s) will be processed`);
  console.info(`${invalidUrls.length} invalid URL(s) found`);

  if (validUrls.length === 0) {
    throw new Error('No valid URLs found to process');
  }

  // Return both valid and invalid URLs
  return {
    validUrls: limit === -1 ? validUrls : validUrls.slice(0, limit),
    invalidUrls,
  };
}

export async function processSitemapUrls(urls, baseUrl, results, options) {
  const totalTests = urls.length;
  console.info(`Processing ${totalTests} URL(s)`);

  const sitemapUrls = new Set(urls.map((item) => item.url.split('#')[0])); // Strip fragment identifiers

  for (let i = 0; i < urls.length; i++) {
    if (global.isShuttingDown) break;
    const testUrl = fixUrl(urls[i].url);
    const { lastmod } = urls[i];
    console.info(`Processing ${i + 1} of ${totalTests}: ${testUrl}`);
    await processUrl(testUrl, lastmod, i, totalTests, baseUrl, sitemapUrls, results, options);
  }

  return results;
}

export async function generateSitemap(urls, outputDir, hostname, options = {}) {
  const stream = new SitemapStream({ hostname });
  const pipeline = stream.pipe(createGzip());

  // Add URLs to the sitemap stream
  urls.forEach((url) => {
    stream.write({
      url: url.url,
      changefreq: url.changefreq || 'weekly',
      priority: url.priority || 0.5,
      lastmod: url.lastmod || new Date(),
    });
  });

  stream.end();

  // Save the sitemap
  const sitemapBuffer = await streamToPromise(pipeline);
  const sitemapPath = path.join(outputDir, 'sitemap.xml.gz');
  await fs.writeFile(sitemapPath, sitemapBuffer);

  console.log(`Sitemap generated and saved to ${sitemapPath}`);

  return sitemapPath;
}
