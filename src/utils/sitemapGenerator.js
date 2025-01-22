/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable no-unused-vars */
/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
// src/utils/sitemapGenerator.js

import fs from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { promisify } from 'util';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';

const gzip = promisify(createGzip);

const MAX_URLS_PER_SITEMAP = 50000;

export async function generateSitemap(results, outputDir) {
  const baseUrl = (() => {
    try {
      const sitemapUrl = new URL(global.auditcore.options.sitemap);
      return `${sitemapUrl.protocol}//${sitemapUrl.hostname}`;
    } catch (error) {
      global.auditcore.logger.warn(`Failed to extract baseUrl from sitemap URL: ${error.message}`);
      return '';
    }
  })();

  if (!baseUrl) {
    global.auditcore.logger.error('Base URL is required for sitemap generation');
    return;
  }

  global.auditcore.logger.info(`Generating sitemap with base URL: ${baseUrl}`);

  try {
    const urls = extractUrlsFromResults(results);

    if (urls.length === 0) {
      global.auditcore.logger.warn("No valid URLs were found to include in the sitemap.");
      return null;
    }

    global.auditcore.logger.info(`Processing ${urls.length} unique URLs for sitemap`);
    global.auditcore.logger.debug('URLs to be included in sitemap:', urls.map(u => u.url));

    global.auditcore.logger.debug("Creating sitemap stream");
    const stream = new SitemapStream({ hostname: baseUrl });
    
    for (const url of urls) {
      const sitemapItem = {
        url: url.url,
        changefreq: url.changefreq,
        priority: typeof url.priority === 'number' ? url.priority : undefined,
        lastmod: url.lastmod
      };
      stream.write(sitemapItem);
      // global.auditcore.logger.debug(`Added to sitemap: ${url.url}`);
    }
    stream.end();

    global.auditcore.logger.debug("Compressing sitemap");
    const sitemapBuffer = await streamToPromise(Readable.from(stream));
  

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
  const urlMap = new Map();

  global.auditcore.logger.debug('Extracting URLs from results');

  function addOrUpdateUrl(url, data) {
    // Handle both absolute and relative URLs
    let pathname;
    try {
      const urlObj = new URL(url, global.auditcore.options.sitemap);
      pathname = urlObj.pathname;
    } catch (error) {
      // If URL parsing fails, treat as relative path
      pathname = url.startsWith('/') ? url : `/${url}`;
    }

    // Skip URLs with 2-character language variants unless --include-all-languages is set
    const pathParts = pathname.split('/').filter(Boolean);
    const hasLanguageVariant = pathParts.length > 0 && pathParts[0].length === 2;
    const isAllowedVariant = ['en', 'us'].includes(pathParts[0]);
    
    if (hasLanguageVariant && !isAllowedVariant && !global.auditcore.options.includeAllLanguages) {
      global.auditcore.logger.debug(`Skipping URL with language variant: ${url}`);
      return;
    }

    if (urlMap.has(url)) {
      global.auditcore.logger.debug(`Updating existing URL: ${url}`);
      const existingData = urlMap.get(url);
      urlMap.set(url, { ...existingData, ...data });
    } else {
      global.auditcore.logger.debug(`Adding new URL: ${url}`);
      urlMap.set(url, createUrlObject({ url, ...data }, results));
    }
  }

  // Extract from internalLinks
  if (results.internalLinks) {
    global.auditcore.logger.debug('Extracting from internalLinks');
    results.internalLinks.forEach((link) => {
      if (link.url) addOrUpdateUrl(link.url, link);
    });
  }

  // Extract from contentAnalysis
  if (results.contentAnalysis) {
    global.auditcore.logger.debug('Extracting from contentAnalysis');
    results.contentAnalysis.forEach((page) => {
      if (page.url) {
        addOrUpdateUrl(page.url, {
          lastmod: page.lastmod || getLastModified(page.url, results),
          changefreq: calculateChangeFreq(page, results),
          priority: typeof page.priority === 'number' ? page.priority : undefined
        });
      }
    });
  }

  // Extract from seoScores
  if (results.seoScores) {
    global.auditcore.logger.debug('Extracting from seoScores');
    results.seoScores.forEach((score) => {
      if (score.url) {
        addOrUpdateUrl(score.url, { 
          priority: (score.score / 100).toFixed(1)
        });
      }
    });
  }

  const uniqueUrls = Array.from(urlMap.values());
  global.auditcore.logger.debug(`Extracted ${uniqueUrls.length} unique URLs for sitemap`);
  global.auditcore.logger.debug('Extracted URLs:', uniqueUrls.map(u => u.url));

  return uniqueUrls;
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
