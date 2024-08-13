/* eslint-disable import/extensions */
// sitemap.js

import { SitemapStream, streamToPromise } from 'sitemap';
import { createGzip } from 'zlib';
import fs from 'fs/promises';
import path from 'path';
import { isValidUrl } from './urlUtils.js';
import { fetchAndParseSitemap, extractUrls } from './sitemapParser.js';
import { UrlProcessor } from './urlProcessor.js';

export async function getUrlsFromSitemap(sitemapUrl, limit, logger) {
  logger.info(`Processing sitemap: ${sitemapUrl}`);
  try {
    const parsedContent = await fetchAndParseSitemap(sitemapUrl);
    const urlsWithDates = await extractUrls(parsedContent);
    logger.info(`Found ${urlsWithDates.length} URL(s) in the sitemap`);

    const validUrls = [];
    const invalidUrls = [];
    urlsWithDates.forEach((item) => {
      if (isValidUrl(item.url)) {
        validUrls.push(item);
      } else {
        invalidUrls.push(item);
        logger.warn(`Invalid URL found: ${item.url}`);
      }
    });

    logger.info(`${validUrls.length} valid URL(s) will be processed`);
    logger.info(`${invalidUrls.length} invalid URL(s) found`);

    if (validUrls.length === 0) {
      throw new Error('No valid URLs found to process');
    }

    return {
      validUrls: limit === -1 ? validUrls : validUrls.slice(0, limit),
      invalidUrls,
    };
  } catch (error) {
    logger.error(`Error processing sitemap ${sitemapUrl}: ${error.message}`);
    throw error;
  }
}

export async function processSitemapUrls(urls, options, logger) {
  logger.info(`Processing ${urls.length} URL(s)`);

  const processorOptions = {
    ...options,
    baseUrl: options.baseUrl || (urls[0] && new URL(urls[0].url).origin),
    outputDir: options.outputDir || './output',
    concurrency: options.concurrency || 5,
    batchSize: options.batchSize || 10,
  };

  const urlProcessor = new UrlProcessor(processorOptions, logger);

  try {
    const results = await urlProcessor.processUrls(urls);
    logger.info(`Completed processing ${urls.length} URLs`);

    if (results.failedUrls && results.failedUrls.length > 0) {
      logger.warn(`${results.failedUrls.length} URLs encountered errors during processing`);
    }

    return results;
  } catch (error) {
    logger.error(`Error during URL processing: ${error.message}`);
    throw error;
  }
}

export async function generateSitemap(urls, outputDir, hostname, options = {}, logger) {
  logger.info('Starting sitemap generation');
  try {
    const stream = new SitemapStream({ hostname });
    const pipeline = stream.pipe(createGzip());

    urls.forEach((url) => {
      stream.write({
        url: url.url,
        changefreq: url.changefreq || 'weekly',
        priority: url.priority || 0.5,
        lastmod: url.lastmod || new Date(),
      });
    });

    stream.end();

    const sitemapBuffer = await streamToPromise(pipeline);
    const sitemapPath = path.join(outputDir, 'sitemap.xml.gz');
    await fs.writeFile(sitemapPath, sitemapBuffer);

    logger.info(`Sitemap generated and saved to ${sitemapPath}`);
    logger.debug(`Sitemap contains ${urls.length} URLs`);

    return sitemapPath;
  } catch (error) {
    logger.error(`Error generating sitemap: ${error.message}`);
    throw error;
  }
}
