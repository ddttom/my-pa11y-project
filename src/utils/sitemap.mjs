/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
/* eslint-disable import/prefer-default-export */
/* eslint-disable max-len */
// sitemap.js

import fs from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { SitemapStream, streamToPromise } from 'sitemap';

const parseXml = promisify(parseString);
// const gunzipAsync = promisify(gunzip);
const MAX_URLS_PER_SITEMAP = 50000;

/**
 * Generates a sitemap based on the analysis results.
 * @param {Object} results - The analysis results.
 * @param {string} outputDir - The directory to save the sitemap.
 * @param {Object} options - The options for sitemap generation.
 * @param {Object} logger - The logger object.
 * @returns {Promise<string|null>} The path to the generated sitemap, or null if no URLs were found.
 * @throws {Error} If there's an error during sitemap generation.
 */
export async function generateSitemap(results, outputDir, options, logger) {
  const { baseUrl = '' } = options;
  logger.info(`Generating sitemap with base URL: ${baseUrl}`);

  try {
    const urls = extractUrlsFromResults(results, logger);

    if (urls.length === 0) {
      logger.warn('No valid URLs were found to include in the sitemap.');
      return null;
    }

    if (urls.length > MAX_URLS_PER_SITEMAP) {
      logger.info(`Large number of URLs (${urls.length}). Splitting into multiple sitemaps.`);
      return await generateSplitSitemaps(urls, outputDir, baseUrl, logger);
    }

    logger.debug('Creating sitemap stream');
    const stream = new SitemapStream({ hostname: baseUrl });
    const pipeline = stream.pipe(createGzip());

    for (const url of urls) {
      await stream.write(url);
    }
    await stream.end();

    logger.debug('Compressing sitemap');
    const sitemapBuffer = await streamToPromise(pipeline);

    const sitemapPath = path.join(outputDir, 'sitemap.xml.gz');
    await fs.writeFile(sitemapPath, sitemapBuffer);

    logger.info(`Sitemap generated and saved to ${sitemapPath}`);
    return sitemapPath;
  } catch (error) {
    logger.error('Error generating sitemap:', error);
    throw error;
  }
}

/**
 * Generates split sitemaps for a large number of URLs.
 * @param {Array} urls - The URLs to include in the sitemaps.
 * @param {string} outputDir - The directory to save the sitemaps.
 * @param {string} baseUrl - The base URL for the sitemaps.
 * @param {Object} logger - The logger object.
 * @returns {Promise<string>} The path to the generated sitemap index.
 * @throws {Error} If there's an error during sitemap generation.
 */
async function generateSplitSitemaps(urls, outputDir, baseUrl, logger) {
  const sitemapIndex = [];
  const chunks = chunkArray(urls, MAX_URLS_PER_SITEMAP);

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const sitemapName = `sitemap-${i + 1}.xml.gz`;
    const sitemapPath = path.join(outputDir, sitemapName);

    logger.debug(`Generating sitemap ${i + 1} of ${chunks.length}`);
    const stream = new SitemapStream({ hostname: baseUrl });
    const pipeline = stream.pipe(createGzip());

    for (const url of chunk) {
      await stream.write(url);
    }
    await stream.end();

    const sitemapBuffer = await streamToPromise(pipeline);
    await fs.writeFile(sitemapPath, sitemapBuffer);

    sitemapIndex.push({
      url: `${baseUrl}/${sitemapName}`,
      lastmod: new Date().toISOString(),
    });

    logger.info(`Sitemap ${i + 1} generated and saved to ${sitemapPath}`);
  }

  const indexStream = new SitemapStream({ hostname: baseUrl });
  const indexPipeline = indexStream.pipe(createGzip());

  for (const sitemap of sitemapIndex) {
    await indexStream.write(sitemap);
  }
  await indexStream.end();

  const indexBuffer = await streamToPromise(indexPipeline);
  const indexPath = path.join(outputDir, 'sitemap-index.xml.gz');
  await fs.writeFile(indexPath, indexBuffer);

  logger.info(`Sitemap index generated and saved to ${indexPath}`);
  return indexPath;
}

/**
 * Extracts URLs from the analysis results.
 * @param {Object} results - The analysis results.
 * @param {Object} logger - The logger object.
 * @returns {Array} An array of URL objects.
 */
function extractUrlsFromResults(results, logger) {
  const urls = new Set();

  logger.debug('Extracting URLs from results');

  if (results.internalLinks) {
    results.internalLinks.forEach((link) => {
      if (link.url) urls.add(createUrlObject(link, results));
    });
  }

  if (results.contentAnalysis) {
    results.contentAnalysis.forEach((page) => {
      if (page.url) {
        urls.add(createUrlObject(page, results));
      }
    });
  }

  if (results.seoScores) {
    results.seoScores.forEach((score) => {
      if (score.url) {
        const existingUrl = Array.from(urls).find((u) => u.url === score.url);
        if (existingUrl) {
          existingUrl.priority = (score.score / 100).toFixed(1);
        } else {
          urls.add(createUrlObject({ url: score.url, score: score.score }, results));
        }
      }
    });
  }

  logger.info(`Extracted ${urls.size} unique URLs for sitemap`);
  return Array.from(urls);
}

/**
 * Creates a URL object for the sitemap.
 * @param {Object} page - The page data.
 * @param {Object} results - The analysis results.
 * @returns {Object} A URL object for the sitemap.
 */
function createUrlObject(page, results) {
  const urlObject = {
    url: page.url,
    lastmod: page.lastmod || getLastModified(page.url, results),
    changefreq: calculateChangeFreq(page, results),
    priority: calculatePriority(page, results),
  };

  if (page.images && page.images.length > 0) {
    urlObject.img = page.images.map((img) => ({
      url: img.url,
      caption: img.caption,
      title: img.title,
    }));
  }

  if (page.videos && page.videos.length > 0) {
    urlObject.video = page.videos.map((video) => ({
      thumbnail_loc: video.thumbnailUrl,
      title: video.title,
      description: video.description,
      content_loc: video.url,
      duration: video.duration,
    }));
  }

  return urlObject;
}

/**
 * Gets the last modified date for a URL.
 * @param {string} url - The URL to check.
 * @param {Object} results - The analysis results.
 * @returns {string} The last modified date in ISO format.
 */
function getLastModified(url, results) {
  const contentAnalysis = results.contentAnalysis?.find((page) => page.url === url);
  if (contentAnalysis && contentAnalysis.lastModified) {
    return new Date(contentAnalysis.lastModified).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Calculates the change frequency for a URL.
 * @param {Object} page - The page data.
 * @param {Object} results - The analysis results.
 * @returns {string} The change frequency.
 */
function calculateChangeFreq(page, results) {
  const lastModified = new Date(getLastModified(page.url, results));
  const daysSinceLastMod = Math.floor((new Date() - lastModified) / (1000 * 60 * 60 * 24));

  const contentAnalysis = results.contentAnalysis?.find((p) => p.url === page.url);
  const updateFrequency = contentAnalysis?.updateFrequency || 'unknown';

  if (updateFrequency === 'daily' || daysSinceLastMod < 1) return 'daily';
  if (updateFrequency === 'weekly' || daysSinceLastMod < 7) return 'weekly';
  if (updateFrequency === 'monthly' || daysSinceLastMod < 30) return 'monthly';
  if (daysSinceLastMod < 365) return 'yearly';
  return 'never';
}

/**
 * Calculates the priority for a URL.
 * @param {Object} page - The page data.
 * @param {Object} results - The analysis results.
 * @returns {string} The priority as a string with one decimal place.
 */
function calculatePriority(page, results) {
  let priority = 0.5;

  const urlDepth = page.url.split('/').length - 1;
  if (urlDepth === 0) priority = 1.0;
  else if (urlDepth === 1) priority = 0.8;
  else if (urlDepth === 2) priority = 0.6;

  const seoScore = results.seoScores?.find((score) => score.url === page.url)?.score;
  if (seoScore) {
    priority = Math.max(priority, seoScore / 100);
  }

  const internalLinksCount = results.internalLinks?.filter((link) => link.url === page.url).length || 0;
  if (internalLinksCount > 10) priority = Math.min(1, priority + 0.1);
  else if (internalLinksCount > 5) priority = Math.min(1, priority + 0.05);

  return priority.toFixed(1);
}

/**
 * Splits an array into chunks of a specified size.
 * @param {Array} array - The array to split.
 * @param {number} size - The size of each chunk.
 * @returns {Array} An array of chunks.
 */
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Fetches URLs from a sitemap.
 * @param {string} sitemapUrl - The URL of the sitemap.
 * @param {number} limit - The maximum number of URLs to fetch (-1 for no limit).
 * @param {Object} logger - The logger object.
 * @returns {Promise<Array>} An array of URL objects.
 * @throws {Error} If there's an error fetching or parsing the sitemap.
 */
export async function getUrlsFromSitemap(sitemapUrl, limit, logger) {
  logger.info(`Fetching sitemap from ${sitemapUrl}`);

  try {
    const response = await axios.get(sitemapUrl, { responseType: 'arraybuffer' });
    let sitemapContent = response.data;

    // Check if the content is gzipped
    if (response.headers['content-encoding'] === 'gzip' || sitemapUrl.endsWith('.gz')) {
      sitemapContent = await gunzipAsync(sitemapContent);
    }

    const sitemapString = sitemapContent.toString('utf-8');
    const result = await parseXml(sitemapString);

    let urls = [];

    if (result.sitemapindex) {
      // This is a sitemap index, we need to fetch each sitemap
      logger.info('Sitemap index detected. Fetching individual sitemaps...');
      const sitemapUrls = result.sitemapindex.sitemap.map((sitemap) => sitemap.loc[0]);
      for (const url of sitemapUrls) {
        const sitemapUrlsList = await getUrlsFromSitemap(url, -1, logger);
        urls = urls.concat(sitemapUrlsList);
        if (limit !== -1 && urls.length >= limit) break;
      }
    } else if (result.urlset) {
      // This is a regular sitemap
      urls = result.urlset.url.map((url) => ({
        url: url.loc[0],
        lastmod: url.lastmod ? url.lastmod[0] : null,
        changefreq: url.changefreq ? url.changefreq[0] : null,
        priority: url.priority ? parseFloat(url.priority[0]) : null,
      }));
    } else {
      throw new Error('Invalid sitemap format');
    }

    if (limit !== -1) {
      urls = urls.slice(0, limit);
    }

    logger.info(`Extracted ${urls.length} URLs from sitemap`);
    return urls;
  } catch (error) {
    logger.error(`Error fetching sitemap: ${error.message}`);
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
