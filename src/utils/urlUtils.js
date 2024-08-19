import fs from 'fs/promises';
import path from 'path';


// urlUtils.js

/**
 * Checks if a given string is a valid URL.
 * @param {string} url - The URL to validate.
 * @returns {boolean} True if the URL is valid, false otherwise.
 */
export function isValidUrl(url) {
  if (typeof url !== "string") {
    return false;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(url);
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
  if (typeof url !== "string") {
    return "";
  }
  if (!url) return "";
  // Remove duplicate slashes, but keep the protocol slashes intact
  return url.replace(/(https?:\/\/)|(\/)+/g, "$1$2");
}

/**
 * Normalizes a URL by removing trailing slashes and converting to lowercase.
 * @param {string} url - The URL to normalize.
 * @returns {string} The normalized URL.
 */
export function normalizeUrl(url) {
  if (typeof url !== "string") {
    return "";
  }
  let normalized = url.toLowerCase();
  normalized = fixUrl(normalized);
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

/**
 * Extracts the domain from a given URL.
 * @param {string} url - The URL to extract the domain from.
 * @returns {string} The extracted domain, or an empty string if invalid.
 */
export function extractDomain(url) {
  if (!isValidUrl(url)) {
    return "";
  }
  const { hostname } = new URL(url);
  return hostname;
}

export async function writeToInvalidUrlFile(invalidUrl) {
  const invalidUrlsPath = path.join(global.auditcore.options.output,"invalid_urls.json");
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
  fs.readFile(invalidUrlsPath, "utf8")
    .then((data) => {
      const invalidUrls = JSON.parse(data);
      invalidUrls.push(invalidUrl);
      return fs.writeFile(
        invalidUrlsPath,
        JSON.stringify(invalidUrls, null, 2)
      );
    })
    .catch((error) => {
      console.error(`Error updating invalid_urls.json: ${error.message}`);
    });
}
