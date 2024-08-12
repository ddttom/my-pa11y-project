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
import { debug } from './debug.js';

const gzip = promisify(createGzip);

export async function generateSitemap(results, outputDir, options) {
  const baseUrl = typeof options.baseUrl === 'string' ? options.baseUrl : '';
  debug(`Generating sitemap with base URL: ${baseUrl}`);

  const urls = extractUrlsFromResults(results);

  let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemapXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  let urlAdded = false;
  for (const url of urls) {
    try {
      const fullUrl = url.loc.startsWith('http') ? url.loc : new URL(url.loc, baseUrl).href;
      sitemapXml += '  <url>\n';
      sitemapXml += `    <loc>${escapeXml(fullUrl)}</loc>\n`;
      if (url.lastmod) sitemapXml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      if (url.changefreq) sitemapXml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      if (url.priority) sitemapXml += `    <priority>${url.priority}</priority>\n`;
      sitemapXml += '  </url>\n';
      urlAdded = true;
    } catch (error) {
      console.warn(`Failed to add URL to sitemap: ${url.loc}`, error);
    }
  }

  sitemapXml += '</urlset>';

  if (!urlAdded) {
    console.warn('No valid URLs were added to the sitemap.');
    return null;
  }

  // Compress the sitemap
  const compressedSitemap = await gzip(Buffer.from(sitemapXml, 'utf-8'));

  // Save the sitemap
  const sitemapPath = path.join(outputDir, 'sitemap.xml.gz');
  await fs.writeFile(sitemapPath, compressedSitemap);

  console.log(`Sitemap generated and saved to ${sitemapPath}`);

  return sitemapPath;
}

function extractUrlsFromResults(results) {
  const urls = new Set();

  // Extract from internalLinks
  if (results.internalLinks) {
    results.internalLinks.forEach((link) => {
      if (link.url) urls.add({ loc: link.url });
    });
  }

  // Extract from contentAnalysis
  if (results.contentAnalysis) {
    results.contentAnalysis.forEach((page) => {
      if (page.url) {
        urls.add({
          loc: page.url,
          lastmod: page.lastmod,
          changefreq: calculateChangeFreq(page),
          priority: calculatePriority(page),
        });
      }
    });
  }

  // Extract from seoScores
  if (results.seoScores) {
    results.seoScores.forEach((score) => {
      if (score.url) {
        urls.add({
          loc: score.url,
          priority: (score.score / 100).toFixed(1),
        });
      }
    });
  }

  return Array.from(urls);
}

function calculateChangeFreq(page) {
  // Implement logic to determine change frequency
  return 'weekly'; // Default value
}

function calculatePriority(page) {
  // Implement logic to determine priority
  return '0.5'; // Default value
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
