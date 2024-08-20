/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
/* eslint-disable max-len */
// sitemap.js


import { gunzip } from "zlib";
import axios from "axios";
import { parseString } from "xml2js";
import { promisify } from "util";
import { UrlProcessor } from "./urlProcessor.js";
import { isValidUrl } from './urlUtils.js';

const parseXml = promisify(parseString);
const gunzipAsync = promisify(gunzip);


/**
 * Fetches URLs from a sitemap.
 * @param {string} sitemapUrl - The URL of the sitemap.
 * @param {number} limit - The maximum number of URLs to fetch (-1 for no limit).
 * @returns {Promise<Object>} An object containing arrays of valid and invalid URLs.
 * @throws {Error} If there's an error fetching or parsing the sitemap.
 */
export async function getUrlsFromSitemap(sitemapUrl, limit) {
  global.auditcore.logger.info(`Fetching sitemap from ${sitemapUrl}`);

  try {
    const response = await axios.get(sitemapUrl, {
      responseType: "arraybuffer",
    });
    let sitemapContent = response.data;

    // Check if the content is gzipped
    if (
      response.headers["content-encoding"] === "gzip" ||
      sitemapUrl.endsWith(".gz")
    ) {
      sitemapContent = await gunzipAsync(sitemapContent);
    }

    const sitemapString = sitemapContent.toString("utf-8");
   
    const result = await parseXml(sitemapString);

    let urls = [];
    let validUrls = [];
    let invalidUrls = [];

    if (result.sitemapindex) {
      // This is a sitemap index, we need to fetch each sitemap
      global.auditcore.logger.info(
        "Sitemap index detected. Fetching individual sitemaps..."
      );
      const sitemapUrls = result.sitemapindex.sitemap.map(
        (sitemap) => sitemap.loc[0]
      );
      for (const url of sitemapUrls) {
        const sitemapUrlsResult = await getUrlsFromSitemap(url, -1);
        validUrls = validUrls.concat(sitemapUrlsResult.validUrls);
        invalidUrls = invalidUrls.concat(sitemapUrlsResult.invalidUrls);
        if (limit !== -1 && validUrls.length >= limit) break;
      }
    } else if (result.urlset) {
      // This is a regular sitemap
      urls = result.urlset.url.map((url) => ({
        url: url.loc[0],
        lastmod: url.lastmod ? url.lastmod[0] : null,
        changefreq: url.changefreq ? url.changefreq[0] : null,
        priority: url.priority ? parseFloat(url.priority[0]) : null,
      }));

      // Validate URLs
      urls.forEach((url) => {
        // Inline normalization of the URL
        const normalizedUrl = url.url.replace(/([^:]\/)\/+/g, "$1");

        if (isValidUrl(normalizedUrl)) {
          validUrls.push({ ...url, url: normalizedUrl });
        } else {
          invalidUrls.push(url);
        }
      });
    } else {
      throw new Error("Invalid sitemap format");
    }

    if (limit !== -1) {
      validUrls = validUrls.slice(0, limit);
    }

    global.auditcore.logger.info(
      `Extracted ${validUrls.length} valid URLs and ${invalidUrls.length} invalid URLs from sitemap`
    );
    global.auditcore.logger.debug(`Valid URLs: ${JSON.stringify(validUrls)}`);
    global.auditcore.logger.debug(
      `Invalid URLs: ${JSON.stringify(invalidUrls)}`
    );

    return { validUrls, invalidUrls };
  } catch (error) {
    global.auditcore.logger.error(`Error fetching sitemap: ${error.message}`);
    global.auditcore.logger.debug(`Error stack: ${error.stack}`);
    throw error;
  }
}


/**
 * Processes URLs extracted from a sitemap.
 * @param {Array} urls - The URLs to process.
 * @param {Object} options - The options for URL processing.
 * @returns {Promise<Object>} The results of URL processing.
 * @throws {Error} If there's an error during URL processing.
 */
export async function processSitemapUrls(urls, options) {
  global.auditcore.logger.info(`Processing ${urls.length} URL(s)`);

  const processorOptions = {
    ...options,
    baseUrl: options.baseUrl || (urls[0] && new URL(urls[0].url).origin),
    outputDir: options.outputDir || "./output",
    concurrency: options.concurrency || 5,
    batchSize: options.batchSize || 10,
  };

  const urlProcessor = new UrlProcessor(processorOptions);

  try {
    const results = await urlProcessor.processUrls(urls);
    
    // Initialize URL metrics if they don't exist
    results.urlMetrics = results.urlMetrics || {
      total: 0,
      internal: 0,
      external: 0,
      internalIndexable: 0,
      internalNonIndexable: 0,
    };

    // Update total URLs processed
    results.urlMetrics.total = urls.length;

    global.auditcore.logger.info(`Completed processing ${urls.length} URLs`);

    return results;
  } catch (error) {
    global.auditcore.logger.error(`Error during URL processing: ${error.message}`);
    global.auditcore.logger.debug(`Error stack: ${error.stack}`);
    throw error;
  }
}

