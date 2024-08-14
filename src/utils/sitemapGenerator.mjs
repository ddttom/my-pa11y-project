/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable no-unused-vars */
/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
/* eslint-disable import/extensions */
// src/utils/sitemapGenerator.js

import fs from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { promisify } from 'util';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';

const gzip = promisify(createGzip);

const MAX_URLS_PER_SITEMAP = 50000;

export async function generateSitemap(results, outputDir, options) {
  const baseUrl = typeof options.baseUrl === 'string' ? options.baseUrl : '';
  global.auditcore.logger.info(`Generating sitemap with base URL: ${baseUrl}`);

  try {
    const urls = extractUrlsFromResults(results);

    if (urls.length === 0) {
      global.auditcore.logger.warn('No valid URLs were found to include in the sitemap.');
      return null;
    }

    if (urls.length > MAX_URLS_PER_SITEMAP) {
      global.auditcore.logger.info(`Large number of URLs (${urls.length}). Splitting into multiple sitemaps.`);
      return await generateSplitSitemaps(urls, outputDir, baseUrl);
    }

    global.auditcore.logger.debug('Creating sitemap stream');
    const stream = new SitemapStream({ hostname: baseUrl });
    const pipeline = stream.pipe(createGzip());

    for (const url of urls) {
      stream.write(url);
    }
    stream.end();

    global.auditcore.logger.debug('Compressing sitemap');
    const sitemapBuffer = await streamToPromise(pipeline);

    const sitemapPath = path.join(outputDir, 'sitemap.xml.gz');
    await fs.writeFile(sitemapPath, sitemapBuffer);

    global.auditcore.logger.info(`Sitemap generated and saved to ${sitemapPath}`);
    return sitemapPath;
  } catch (error) {
    global.auditcore.logger.error('Error generating sitemap:', error);
    throw error;
  }
}

async function generateSplitSitemaps(urls, outputDir, baseUrl) {
  const sitemapIndex = [];
  const chunks = chunkArray(urls, MAX_URLS_PER_SITEMAP);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const sitemapName = `sitemap-${i + 1}.xml.gz`;
    const sitemapPath = path.join(outputDir, sitemapName);

    global.auditcore.logger.debug(`Generating sitemap ${i + 1} of ${chunks.length}`);
    const stream = new SitemapStream({ hostname: baseUrl });
    const pipeline = stream.pipe(createGzip());

    for (const url of chunk) {
      stream.write(url);
    }
    stream.end();

    const sitemapBuffer = await streamToPromise(pipeline);
    await fs.writeFile(sitemapPath, sitemapBuffer);

    sitemapIndex.push({
      url: `${baseUrl}/${sitemapName}`,
      lastmod: new Date().toISOString(),
    });

    global.auditcore.logger.info(`Sitemap ${i + 1} generated and saved to ${sitemapPath}`);
  }

  const indexStream = new SitemapStream({ hostname: baseUrl });
  const indexPipeline = indexStream.pipe(createGzip());

  for (const sitemap of sitemapIndex) {
    indexStream.write(sitemap);
  }
  indexStream.end();

  const indexBuffer = await streamToPromise(indexPipeline);
  const indexPath = path.join(outputDir, 'sitemap-index.xml.gz');
  await fs.writeFile(indexPath, indexBuffer);

  global.auditcore.logger.info(`Sitemap index generated and saved to ${indexPath}`);
  return indexPath;
}

function extractUrlsFromResults(results) {
  const urls = new Set();

  global.auditcore.logger.debug('Extracting URLs from results');

  // Extract from internalLinks
  if (results.internalLinks) {
    results.internalLinks.forEach((link) => {
      if (link.url) urls.add(createUrlObject(link, results));
    });
  }

  // Extract from contentAnalysis
  if (results.contentAnalysis) {
    results.contentAnalysis.forEach((page) => {
      if (page.url) {
        urls.add(createUrlObject(page, results));
      }
    });
  }

  // Extract from seoScores
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

  global.auditcore.logger.info(`Extracted ${urls.size} unique URLs for sitemap`);
  return Array.from(urls);
}

function createUrlObject(page, results) {
  const urlObject = {
    url: page.url,
    lastmod: page.lastmod || getLastModified(page.url, results),
    changefreq: calculateChangeFreq(page, results),
    priority: calculatePriority(page, results),
  };

  // Add image data if available
  if (page.images && page.images.length > 0) {
    urlObject.img = page.images.map((img) => ({
      url: img.url,
      caption: img.caption,
      title: img.title,
    }));
  }

  // Add video data if available
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

function getLastModified(url, results) {
  // Try to find last modified date in contentAnalysis
  const contentAnalysis = results.contentAnalysis?.find((page) => page.url === url);
  if (contentAnalysis && contentAnalysis.lastModified) {
    return new Date(contentAnalysis.lastModified).toISOString();
  }
  // If not found, return current date
  return new Date().toISOString();
}

function calculateChangeFreq(page, results) {
  const lastModified = new Date(getLastModified(page.url, results));
  const daysSinceLastMod = Math.floor((new Date() - lastModified) / (1000 * 60 * 60 * 24));

  // Check update frequency in content analysis
  const contentAnalysis = results.contentAnalysis?.find((p) => p.url === page.url);
  const updateFrequency = contentAnalysis?.updateFrequency || 'unknown';

  if (updateFrequency === 'daily' || daysSinceLastMod < 1) return 'daily';
  if (updateFrequency === 'weekly' || daysSinceLastMod < 7) return 'weekly';
  if (updateFrequency === 'monthly' || daysSinceLastMod < 30) return 'monthly';
  if (daysSinceLastMod < 365) return 'yearly';
  return 'never';
}

function calculatePriority(page, results) {
  let priority = 0.5; // Default priority

  // Adjust based on URL depth
  const urlDepth = page.url.split('/').length - 1;
  if (urlDepth === 0) priority = 1.0; // Homepage
  else if (urlDepth === 1) priority = 0.8;
  else if (urlDepth === 2) priority = 0.6;

  // Adjust based on SEO score if available
  const seoScore = results.seoScores?.find((score) => score.url === page.url)?.score;
  if (seoScore) {
    priority = Math.max(priority, seoScore / 100);
  }

  // Adjust based on internal links count
  const internalLinksCount = results.internalLinks?.filter((link) => link.url === page.url).length || 0;
  if (internalLinksCount > 10) priority = Math.min(1, priority + 0.1);
  else if (internalLinksCount > 5) priority = Math.min(1, priority + 0.05);

  return priority.toFixed(1);
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
