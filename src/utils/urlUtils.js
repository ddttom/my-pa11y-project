/* eslint-disable import/extensions */
// urlUtils.js

export function isValidUrl(url) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export function fixUrl(url) {
  if (!url) return '';
  // Remove duplicate slashes, but keep the protocol slashes intact
  return url.replace(/(https?:\/\/)|(\/)+/g, '$1$2');
}
