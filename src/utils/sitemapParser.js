/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
/* eslint-disable import/extensions */
// sitemapParser.js

import axios from 'axios';
import xml2js from 'xml2js';
import { URL } from 'url';
import fs from 'fs/promises';
import zlib from 'zlib';
import { promisify } from 'util';
import RateLimiter from 'limiter';
import { fixUrl } from './urlUtils.js';

const gunzip = promisify(zlib.gunzip);
const { RateLimiter: Limiter } = RateLimiter;

const axiosInstance = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  },
});

// Rate limiter: 5 requests per second
const limiter = new Limiter({ tokensPerInterval: 5, interval: 'second' });

export async function fetchAndParseSitemap(sitemapPath, logger) {
  logger.info(`Fetching content from: ${sitemapPath}`);
  try {
    await limiter.removeTokens(1);
    let content;
    let isCompressed = false;

    if (isUrl(sitemapPath)) {
      const response = await axiosInstance.get(sitemapPath, { responseType: 'arraybuffer' });
      content = response.data;
      isCompressed = response.headers['content-encoding'] === 'gzip' || sitemapPath.endsWith('.gz');
      logger.debug(`Successfully fetched sitemap from URL: ${sitemapPath}`);
    } else {
      content = await fs.readFile(sitemapPath);
      isCompressed = sitemapPath.endsWith('.gz');
      logger.debug(`Successfully read sitemap from file: ${sitemapPath}`);
    }

    if (isCompressed) {
      logger.debug('Decompressing gzipped content');
      content = await gunzip(content);
    }

    content = content.toString('utf-8');

    // Check if the content is XML or HTML
    if (content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html')) {
      logger.warn('Found HTML content instead of sitemap');
      return { html: content, url: sitemapPath };
    }

    logger.debug('Parsing sitemap XML');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);
    logger.info('Sitemap parsed successfully');
    return { xml: result };
  } catch (error) {
    logger.error(`Error fetching or parsing content from ${sitemapPath}:`, error);
    throw error;
  }
}

export async function extractUrls(parsedContent, logger) {
  if (parsedContent.html) {
    logger.debug('Extracting URL from HTML content');
    return [{ url: normalizeUrl(parsedContent.url), lastmod: null }];
  }
  if (parsedContent.xml) {
    if (parsedContent.xml.sitemapindex) {
      return processSitemapIndex(parsedContent.xml.sitemapindex, logger);
    }

    if (parsedContent.xml.urlset) {
      return processUrlset(parsedContent.xml.urlset, logger);
    }

    logger.error('Unknown sitemap format');
    throw new Error('Unknown sitemap format');
  }

  logger.error('Invalid parsed content');
  throw new Error('Invalid parsed content');
}

async function processSitemapIndex(sitemapindex, logger) {
  logger.info('Found a sitemap index. Processing nested sitemaps...');
  const sitemapUrls = sitemapindex.sitemap.map((sitemap) => ({
    url: normalizeUrl(sitemap.loc?.[0] || ''),
    lastmod: sitemap.lastmod?.[0] || null,
  }));
  let allUrls = [];
  for (const sitemapUrl of sitemapUrls) {
    if (global.isShuttingDown) {
      logger.warn('Shutdown signal received. Stopping sitemap processing.');
      break;
    }
    if (!sitemapUrl.url) {
      logger.warn('Skipping sitemap with empty URL');
      continue;
    }
    logger.debug(`Processing nested sitemap: ${sitemapUrl.url}`);
    try {
      await limiter.removeTokens(1);
      const nestedParsedContent = await fetchAndParseSitemap(sitemapUrl.url, logger);
      const nestedUrls = await extractUrls(nestedParsedContent, logger);
      allUrls = allUrls.concat(nestedUrls);
    } catch (error) {
      logger.error(`Error processing nested sitemap ${sitemapUrl.url}:`, error);
    }
  }
  return allUrls;
}

function processUrlset(urlset, logger) {
  logger.debug('Extracting URLs from sitemap');
  const urls = urlset.url
    .map((url) => ({
      url: normalizeUrl(url.loc?.[0] || ''),
      lastmod: url.lastmod?.[0] || null,
      changefreq: url.changefreq?.[0] || null,
      priority: url.priority?.[0] || null,
      // Support for image sitemaps
      images: url.image?.map((image) => ({
        loc: image.loc?.[0] || '',
        caption: image.caption?.[0] || '',
        title: image.title?.[0] || '',
      })) || [],
      // Support for news sitemaps
      news: url['news:news']?.map((newsItem) => ({
        publication: newsItem['news:publication']?.[0]['news:name']?.[0] || '',
        publicationDate: newsItem['news:publication_date']?.[0] || '',
        title: newsItem['news:title']?.[0] || '',
      })) || [],
    }))
    .filter((item) => item.url);
  logger.info(`Extracted ${urls.length} URLs from sitemap`);
  return urls;
}

function isUrl(string) {
  try {
    // eslint-disable-next-line no-new
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function normalizeUrl(url) {
  try {
    const parsedUrl = new URL(url);
    // Convert to lowercase
    parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
    // Remove default ports
    if ((parsedUrl.protocol === 'http:' && parsedUrl.port === '80')
        || (parsedUrl.protocol === 'https:' && parsedUrl.port === '443')) {
      parsedUrl.port = '';
    }
    // Remove trailing slash
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/$/, '');
    // Sort query parameters
    parsedUrl.searchParams.sort();
    return fixUrl(parsedUrl.toString());
  } catch (error) {
    return fixUrl(url);
  }
}
