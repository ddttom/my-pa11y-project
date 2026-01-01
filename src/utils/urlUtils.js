import fs from 'fs/promises';
import path from 'path';

// urlUtils.js

/**
 * Check if a URL is valid for processing
 */
export function isValidUrl(url, baseUrl = null) {
  try {
    const urlObj = new URL(url);

    // Skip non-HTTP protocols
    if (!urlObj.protocol.startsWith('http')) {
      return false;
    }

    // If baseUrl is provided, check if URL is from same domain
    if (baseUrl) {
      const baseUrlObj = new URL(baseUrl);
      if (urlObj.hostname !== baseUrlObj.hostname) {
        return false;
      }
    }

    // Skip common file extensions we don't want to process
    const skipExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.css', '.js'];
    if (skipExtensions.some((ext) => urlObj.pathname.toLowerCase().endsWith(ext))) {
      return false;
    }

    // Language variant filtering (unless --include-all-languages is set)
    if (!global.auditcore?.options?.includeAllLanguages) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const firstPath = pathParts[0];
        // Check if first path part is a 2-character language code
        if (/^[a-z]{2}$/i.test(firstPath)) {
          // Only allow /en and /us language variants
          if (!['en', 'us'].includes(firstPath.toLowerCase())) {
            return false;
          }
        }
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Fixes a URL by removing duplicate slashes while preserving the protocol.
 * @param {string} url - The URL to fix.
 * @returns {string} The fixed URL.
 */
export function fixUrl(url) {
  if (typeof url !== 'string') {
    return '';
  }
  if (!url) return '';
  // Remove duplicate slashes, but keep the protocol slashes intact
  return url.replace(/(https?:\/\/)|(\/)+/g, '$1$2');
}

/**
 * Normalizes a URL by removing trailing slashes, converting to lowercase,
 * removing default ports, and sorting query parameters.
 * @param {string} url - The URL to normalize.
 * @returns {string} The normalized URL.
 */
export function normalizeUrl(url) {
  if (typeof url !== 'string') {
    return '';
  }
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

/**
 * Extracts the domain from a given URL.
 * @param {string} url - The URL to extract the domain from.
 * @returns {string} The extracted domain, or an empty string if invalid.
 */
export function extractDomain(url) {
  if (!isValidUrl(url)) {
    return '';
  }
  const { hostname } = new URL(url);
  return hostname;
}

export async function writeToInvalidUrlFile(invalidUrl) {
  const invalidUrlsPath = path.join(global.auditcore.options.output, 'invalid_urls.json');
  // Check if the file exists, if not, create it with an empty array
  try {
    await fs.access(invalidUrlsPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(invalidUrlsPath, '[]', 'utf8');
    } else {
      console.error(`Error accessing invalid_urls.json: ${error.message}`);
      return;
    }
  }
  fs.readFile(invalidUrlsPath, 'utf8')
    .then((data) => {
      const invalidUrls = JSON.parse(data);
      invalidUrls.push(invalidUrl);
      return fs.writeFile(
        invalidUrlsPath,
        JSON.stringify(invalidUrls, null, 2),
      );
    })
    .catch((error) => {
      console.error(`Error updating invalid_urls.json: ${error.message}`);
    });
}

export function isValidXML(content) {
  try {
    // Try to find XML declaration or sitemap namespace
    const hasXMLDeclaration = content.trim().startsWith('<?xml');
    const hasSitemapNamespace = content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/');

    // Check for basic XML structure
    const hasUrlsetTag = content.includes('<urlset') && content.includes('</urlset>');

    return (hasXMLDeclaration || hasSitemapNamespace) && hasUrlsetTag;
  } catch (error) {
    return false;
  }
}
