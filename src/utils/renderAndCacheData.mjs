/* eslint-disable import/extensions */
/* eslint-disable import/prefer-default-export */
// renderAndCacheData.js

import puppeteer from 'puppeteer';
import { calculateSeoScore } from './seoScoring.mjs';

/**
 * Renders a page using Puppeteer and collects various data.
 * @param {string} url - The URL to render and analyze.
 * @param {Object} logger - The logger object.
 * @returns {Promise<Object>} The rendered and analyzed data.
 */
async function renderAndCacheData(url, logger) {
  logger.debug(`Rendering and caching data for ${url}`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Set up console log capturing
    const jsErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    // Set up response interception for headers
    let headers = {};
    page.on('response', (response) => {
      if (response.url() === url) {
        headers = response.headers();
      }
    });

    const response = await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();
    const statusCode = response.status();

    // Collect page data
    const pageData = await page.evaluate(() => ({
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.content || '',
      h1: document.querySelector('h1')?.textContent || '',
      wordCount: document.body.innerText.trim().split(/\s+/).length,
      hasResponsiveMetaTag: !!document.querySelector('meta[name="viewport"]'),
      images: Array.from(document.images).map((img) => ({
        src: img.src,
        alt: img.alt || '',
      })),
      internalLinks: document.querySelectorAll(`a[href^="/"], a[href^="${window.location.origin}"]`).length,
      structuredData: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((script) => script.textContent),
      openGraphTags: Array.from(document.querySelectorAll('meta[property^="og:"]')).map((tag) => ({
        [tag.getAttribute('property')]: tag.getAttribute('content'),
      })),
      twitterTags: Array.from(document.querySelectorAll('meta[name^="twitter:"]')).map((tag) => ({
        [tag.getAttribute('name')]: tag.getAttribute('content'),
      })),
      h1Count: document.querySelectorAll('h1').length,
      h2Count: document.querySelectorAll('h2').length,
      h3Count: document.querySelectorAll('h3').length,
      h4Count: document.querySelectorAll('h4').length,
      h5Count: document.querySelectorAll('h5').length,
      h6Count: document.querySelectorAll('h6').length,
      scriptsCount: document.scripts.length,
      stylesheetsCount: document.styleSheets.length,
      htmlLang: document.documentElement.lang,
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href,
      formsCount: document.forms.length,
      tablesCount: document.querySelectorAll('table').length,
      pageSize: document.documentElement.outerHTML.length,
    }));

    // Performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const { timing } = performance;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find((entry) => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint').find((entry) => entry.name === 'first-contentful-paint')?.startTime,
      };
    });

    await browser.close();

    const data = {
      html,
      jsErrors,
      statusCode,
      headers,
      pageData,
      performanceMetrics,
      seoScore: calculateSeoScore({
        ...pageData,
        url,
        jsErrors,
        performanceMetrics,
      }),
      lastCrawled: new Date().toISOString(),
    };

    logger.debug(`Successfully rendered, scored, and analyzed ${url}`);
    return data;
  } catch (error) {
    logger.error(`Error rendering data for ${url}:`, error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

export { renderAndCacheData };
