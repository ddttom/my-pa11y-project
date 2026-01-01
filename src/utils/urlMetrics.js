// urlMetrics.js

/**
 * Updates URL metrics based on the test URL.
 * @param {string} testUrl - The URL being tested.
 * @param {string} baseUrl - The base URL of the website.
 * @param {string} html - The HTML content of the page.
 * @param {number} statusCode - The HTTP status code of the response.
 * @param {Object} results - The results object to update.
 */
/**
 * Updates URL metrics based on the analyzed URL.
 * @param {string} url - The URL being analyzed.
 * @param {string} baseUrl - The base URL of the website.
 * @param {string} html - The HTML content of the page.
 * @param {number} statusCode - The HTTP status code of the response.
 * @param {Object} results - The results object to update.
 */
export function updateUrlMetrics(url, baseUrl, html, statusCode, results) {
  // Initialize urlMetrics if it doesn't exist
  results.urlMetrics = results.urlMetrics || {
    total: 0,
    internal: 0,
    external: 0,
    internalIndexable: 0,
    internalNonIndexable: 0,
    nonAscii: 0,
    uppercase: 0,
    underscores: 0,
    containsSpace: 0,
    overLength: 0,
  };

  // Increment total URLs count
  results.urlMetrics.total++;

  // Check if the URL is internal or external
  if (url.startsWith(baseUrl)) {
    results.urlMetrics.internal++;
    // Check if the URL is indexable
    if (!html.includes('noindex') && statusCode === 200) {
      results.urlMetrics.internalIndexable++;
    } else {
      results.urlMetrics.internalNonIndexable++;
    }
  } else {
    results.urlMetrics.external++;
  }
  // Check for non-ASCII characters
  if (/[^\p{ASCII}]/u.test(url)) {
    results.urlMetrics.nonAscii++;
  }
  // Check for uppercase characters
  if (/[A-Z]/.test(url)) {
    results.urlMetrics.uppercase++;
  }

  // Check for underscores
  if (url.includes('_')) {
    results.urlMetrics.underscores++;
  }

  // Check for spaces
  if (url.includes(' ')) {
    results.urlMetrics.containsSpace++;
  }

  // Check for URL length (assuming 115 characters as the limit)
  if (url.length > 115) {
    results.urlMetrics.overLength++;
  }

  // Store individual URL metrics
  results.urlMetrics[url] = results.urlMetrics[url] || {};
  results.urlMetrics[url].internalLinks = (results.urlMetrics[url].internalLinks || 0) + 1;

  // Log the update
  global.auditcore.logger.debug(`Updated URL metrics for ${url}`);
  global.auditcore.logger.debug(`Current URL metrics: ${JSON.stringify(results.urlMetrics, null, 2)}`);
}
export function updateResponseCodeMetrics(statusCode, results) {
  results.responseCodeMetrics = results.responseCodeMetrics || {};
  results.responseCodeMetrics[statusCode] = (results.responseCodeMetrics[statusCode] || 0) + 1;
}
