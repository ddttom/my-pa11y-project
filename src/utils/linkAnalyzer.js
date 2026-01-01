import * as cheerio from 'cheerio';
import { writeToInvalidUrlFile, fixUrl } from './urlUtils.js';

// linkAnalyzer.js

/**
 * Extracts internal links from HTML content.
 * @param {string} html - The HTML content to analyze.
 * @param {string} pageUrl - The URL of the page being analyzed.
 * @param {string} baseUrl - The base URL of the website.
 * @returns {Array<Object>} An array of internal link objects.
 * @throws {Error} If the HTML content is invalid.
 */
export function getInternalLinks(html, pageUrl, baseUrl) {
  if (typeof html !== 'string' || html.trim().length === 0) {
    throw new Error('Invalid HTML content');
  }

  try {
    const $ = cheerio.load(html);
    const links = new Set();
    const baseUrlObj = new URL(baseUrl);
    const pageUrlObj = new URL(pageUrl);

    $('a').each((i, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, pageUrlObj);
          if (absoluteUrl.hostname === baseUrlObj.hostname) {
            links.add({
              url: fixUrl(absoluteUrl.href),
              text: $(element).text().trim(),
              title: $(element).attr('title') || '',
              rel: $(element).attr('rel') || '',
            });
          }
        } catch (urlError) {
          global.auditcore.logger.warn(`Invalid URL found: ${href}`);
          const invalidUrl = {
            url: href,
            reason: 'Bad internal link',
            sourceUrl: pageUrl,
          };
          writeToInvalidUrlFile(invalidUrl);
        }
      }
    });

    return Array.from(links);
  } catch (error) {
    throw new Error(`Error parsing HTML: ${error.message}`);
  }
}

/**
 * Extracts external links from HTML content.
 * @param {string} html - The HTML content to analyze.
 * @param {string} pageUrl - The URL of the page being analyzed.
 * @param {string} baseUrl - The base URL of the website.
 * @returns {Array<Object>} An array of external link objects.
 * @throws {Error} If the HTML content is invalid.
 */
export function getExternalLinks(html, pageUrl, baseUrl) {
  if (typeof html !== 'string' || html.trim().length === 0) {
    throw new Error('Invalid HTML content');
  }

  try {
    const $ = cheerio.load(html);
    const links = new Set();

    $('a').each((i, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, pageUrl).href;
          if (!absoluteUrl.startsWith(baseUrl)) {
            links.add({
              url: fixUrl(absoluteUrl),
              text: $(element).text().trim(),
              title: $(element).attr('title') || '',
              rel: $(element).attr('rel') || '',
            });
          }
        } catch (urlError) {
          global.auditcore.logger.warn(`Invalid URL found: ${href}`);
        }
      }
    });

    return Array.from(links);
  } catch (error) {
    throw new Error(`Error parsing HTML: ${error.message}`);
  }
}
