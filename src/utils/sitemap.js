/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
 

// Node.js built-in modules
import { gunzip } from 'zlib';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

// Third-party modules
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import jsdom from 'jsdom';

// Local modules
import { UrlProcessor } from './urlProcessor.js';
import { isValidUrl, isValidXML } from './urlUtils.js';

const { JSDOM } = jsdom;
const gunzipAsync = promisify(gunzip);

/**
 * Gets URLs from a sitemap or HTML page
 */
export async function getUrlsFromSitemap(url, limit = -1) {
  try {
    global.auditcore.logger.info(`Fetching URL: ${url}`);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const { 'content-type': contentType } = response.headers;
    let content = response.data;

    if (contentType?.includes('gzip')) {
      global.auditcore.logger.debug('Processing gzipped content');
      content = await gunzipAsync(content);
    }

    content = content.toString('utf-8');
    global.auditcore.logger.debug(`Content length: ${content.length}`);

    let urls = [];
    if (isValidXML(content)) {
      global.auditcore.logger.info('Processing as XML sitemap');
      const parsed = await parseStringPromise(content);
      urls = await processSitemapContent(parsed, limit);
    } else {
      global.auditcore.logger.info('Processing as HTML page');
      urls = await processHtmlContent(content, url, limit);
    }

    // Filter and validate URLs
    const validUrls = urls.filter(urlObj => isValidUrl(urlObj.url, url));
    global.auditcore.logger.info(`Found ${validUrls.length} valid URLs out of ${urls.length} total URLs`);
    
    // Generate and save virtual sitemap
    if (validUrls.length > 0) {
      const sitemap = await generateVirtualSitemap(validUrls);
      if (sitemap) {
        const virtualPath = await saveVirtualSitemap(sitemap, global.auditcore.options.output);
        // Store the sitemap in the results object
        global.auditcore.results = global.auditcore.results || {};
        global.auditcore.results.virtualSitemap = sitemap;
      }
    }

    return validUrls;
  } catch (error) {
    global.auditcore.logger.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

/**
 * Process URLs from sitemap content
 */
async function processSitemapContent(parsed, limit) {
  const urls = [];
  
  global.auditcore.logger.info('Processing sitemap content');
  
  if (parsed.sitemapindex) {
    global.auditcore.logger.info('Found sitemap index');
    const sitemapUrls = parsed.sitemapindex.sitemap.map((sitemap) => sitemap.loc[0]);
    global.auditcore.logger.debug(`Found ${sitemapUrls.length} sitemaps in index`);
    
    for (const sitemapUrl of sitemapUrls) {
      global.auditcore.logger.info(`Processing sub-sitemap: ${sitemapUrl}`);
      const subUrls = await getUrlsFromSitemap(sitemapUrl);
      urls.push(...subUrls);
      if (limit > 0 && urls.length >= limit) {
        global.auditcore.logger.info(`Reached URL limit of ${limit}`);
        break;
      }
    }
  } else if (parsed.urlset) {
    global.auditcore.logger.info('Processing single sitemap');
    const extractedUrls = extractUrlsFromUrlset(parsed.urlset);
    global.auditcore.logger.debug(`Extracted ${extractedUrls.length} URLs from sitemap`);
    urls.push(...extractedUrls);
  } else {
    global.auditcore.logger.warn('Invalid sitemap format - no urlset or sitemapindex found');
  }
  
  global.auditcore.logger.info(`Total URLs found: ${urls.length}`);
  return limit > 0 ? urls.slice(0, limit) : urls;
}

/**
 * Process URLs from HTML content
 */
async function processHtmlContent(content, baseUrl, limit) {
  if (!content || !baseUrl) {
    global.auditcore.logger.error('Missing content or baseUrl for HTML processing');
    return [];
  }

  global.auditcore.logger.info(`Processing HTML content from: ${baseUrl}`);
  
  const dom = new JSDOM(content);
  const { document } = dom.window;
  const urls = [];
  const baseUrlObj = new URL(baseUrl);
  
  const links = document.querySelectorAll('a[href]');
  global.auditcore.logger.debug(`Found ${links.length} total links`);
  
  for (const link of links) {
    try {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
        continue;
      }

      const url = new URL(href, baseUrl);
      
      if (url.hostname === baseUrlObj.hostname) {
        global.auditcore.logger.debug(`Found internal URL: ${url.href}`);
        urls.push({
          url: url.href,
          lastmod: new Date().toISOString(),
          changefreq: 'daily',
          priority: 0.7,
        });
      }
    } catch (error) {
      global.auditcore.logger.debug(`Error processing link: ${error.message}`);
    }
  }
  
  global.auditcore.logger.info(`Found ${urls.length} internal URLs`);
  global.auditcore.logger.debug('Internal URLs:', urls.map(u => u.url).join('\n'));
  
  return limit > 0 ? urls.slice(0, limit) : urls;
}

/**
 * Extract URLs from sitemap urlset
 */
function extractUrlsFromUrlset(urlset) {
  if (!urlset?.url) {
    global.auditcore.logger.warn('No URLs found in urlset');
    return [];
  }
  
  global.auditcore.logger.debug(`Processing ${urlset.url.length} URLs from urlset`);
  
  const extractedUrls = urlset.url
    .filter((url) => url?.loc?.[0])
    .map((url) => ({
      url: url.loc[0],
      lastmod: url.lastmod?.[0] || null,
      changefreq: url.changefreq?.[0] || null,
      priority: url.priority ? parseFloat(url.priority[0]) : null,
    }));
    
  global.auditcore.logger.debug(`Successfully extracted ${extractedUrls.length} valid URLs`);
  return extractedUrls;
}

/**
 * Process sitemap URLs with the URL processor
 */
export async function processSitemapUrls(urls) {
  const processor = new UrlProcessor();
  return processor.processUrls(urls);
}

/**
 * Generate a virtual sitemap from processed URLs
 */
export async function generateVirtualSitemap(urls) {
  global.auditcore.logger.info(`Generating virtual sitemap for ${urls.length} URLs`);
  
  if (!Array.isArray(urls) || urls.length === 0) {
    global.auditcore.logger.warn('No URLs provided for virtual sitemap');
    return null;
  }

  const sitemap = {
    urlset: {
      '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      url: urls.map((url) => ({
        loc: url.url,
        lastmod: url.lastmod || new Date().toISOString(),
        changefreq: url.changefreq || 'monthly',
        priority: url.priority || 0.5,
      })),
    },
  };

  return sitemap;
}

/**
 * Save virtual sitemap to file
 */
export async function saveVirtualSitemap(sitemap, outputDir) {
  if (!sitemap) {
    global.auditcore.logger.error('No sitemap data provided');
    return;
  }

  try {
    // Create the directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // Save virtual sitemap
    const { create } = await import('xmlbuilder2');
    const virtualPath = path.join(outputDir, 'virtual_sitemap.xml');
    const xml = create(sitemap).end({ prettyPrint: true });
    await fs.writeFile(virtualPath, xml);
    global.auditcore.logger.info(`Virtual sitemap saved to: ${virtualPath}`);

    return virtualPath;
  } catch (error) {
    global.auditcore.logger.error('Error saving virtual sitemap:', error);
    throw error;
  }
}

/**
 * Generate and save final sitemap with all unique URLs
 */
export async function saveFinalSitemap(results, outputDir) {
  try {
    // Get all unique internal URLs from results
    const uniqueUrls = new Set();
    
    // Add URLs from initial crawl (from global state)
    const virtualSitemap = global.auditcore.results?.virtualSitemap;
    if (virtualSitemap?.urlset?.url) {
      virtualSitemap.urlset.url.forEach(item => uniqueUrls.add(item.loc));
    }

    // Add URLs found during processing
    if (results.internalLinks) {
      results.internalLinks.forEach(link => uniqueUrls.add(link.url));
    }

    const finalSitemap = {
      urlset: {
        '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        url: Array.from(uniqueUrls).map(url => ({
          loc: url,
          lastmod: new Date().toISOString(),
          changefreq: 'monthly',
          priority: 0.5,
        })),
      },
    };

    // Create the directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // Save final sitemap
    const { create } = await import('xmlbuilder2');
    const finalPath = path.join(outputDir, 'final_sitemap.xml');
    const xml = create(finalSitemap).end({ prettyPrint: true });
    await fs.writeFile(finalPath, xml);
    
    global.auditcore.logger.info(`Final sitemap with ${uniqueUrls.size} URLs saved to: ${finalPath}`);
    return finalPath;
  } catch (error) {
    global.auditcore.logger.error('Error saving final sitemap:', error);
    throw error;
  }
}
