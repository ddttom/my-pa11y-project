/**
 * robots.txt Fetcher
 *
 * Fetches and processes robots.txt BEFORE any URL crawling begins.
 * This ensures compliance checking can happen for all URLs.
 */

import { processRobotsTxt } from './robotsTxtParser.js';
import { getRobotsSummary } from './robotsCompliance.js';

/**
 * Fetch robots.txt for a given site
 * @param {string} siteUrl - The base URL of the site (e.g., https://example.com)
 * @returns {Promise<Object|null>} Parsed robots.txt data or null if not found
 */
export async function fetchRobotsTxt(siteUrl) {
  try {
    const urlObj = new URL(siteUrl);
    const robotsTxtUrl = `${urlObj.origin}/robots.txt`;

    global.auditcore.logger.info(`Fetching robots.txt from: ${robotsTxtUrl}`);

    // Try fetch first (faster, no browser overhead)
    try {
      const response = await fetch(robotsTxtUrl, {
        headers: {
          'User-Agent': 'WebAuditSuite/1.0',
        },
        redirect: 'follow',
      });

      if (response.ok) {
        const content = await response.text();
        global.auditcore.logger.info('✓ robots.txt fetched successfully via HTTP');

        const robotsData = await processRobotsTxt(robotsTxtUrl, content);

        // Log summary
        const summary = getRobotsSummary(robotsData);
        global.auditcore.logger.info(summary);

        return robotsData;
      }

      if (response.status === 404) {
        global.auditcore.logger.info('robots.txt not found (404) - allowing all URLs by default');
        return null;
      }

      global.auditcore.logger.warn(`robots.txt returned status ${response.status}`);
      return null;
    } catch (fetchError) {
      global.auditcore.logger.debug(`Fetch failed for robots.txt: ${fetchError.message}`);

      // Try with Puppeteer as fallback (for sites with Cloudflare, etc.)
      global.auditcore.logger.info('Attempting to fetch robots.txt with Puppeteer...');

      const { executePuppeteerOperation } = await import('./networkUtils.js');

      const content = await executePuppeteerOperation(async (page) => {
        await page.goto(robotsTxtUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Get the text content
        const textContent = await page.evaluate(() => document.body.textContent);

        return textContent;
      }, robotsTxtUrl);

      if (content && content.trim().length > 0) {
        global.auditcore.logger.info('✓ robots.txt fetched successfully via Puppeteer');

        const robotsData = await processRobotsTxt(robotsTxtUrl, content);

        // Log summary
        const summary = getRobotsSummary(robotsData);
        global.auditcore.logger.info(summary);

        return robotsData;
      }

      global.auditcore.logger.info('robots.txt not accessible - allowing all URLs by default');
      return null;
    }
  } catch (error) {
    global.auditcore.logger.warn(`Error fetching robots.txt: ${error.message}`);
    global.auditcore.logger.info('Proceeding without robots.txt (allowing all URLs by default)');
    return null;
  }
}

/**
 * Extract base URL from a sitemap or page URL
 * @param {string} url - Any URL from the site
 * @returns {string} Base URL (origin)
 */
export function extractBaseUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}
