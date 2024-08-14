// metricsCommon.js

export const AVERAGE_CHAR_WIDTH = 6; // Assuming an average character width of 6 pixels

/**
 * Estimates the pixel width of a text string.
 * @param {string} text - The text to estimate.
 * @returns {number} The estimated pixel width.
 */
export function estimatePixelWidth(text) {
  return text.length * AVERAGE_CHAR_WIDTH;
}

/**
 * Safely increments a value in an object.
 * @param {Object} obj - The object to update.
 * @param {string} key - The key to increment.
 */
export function safeIncrement(obj, key) {
  // Create a shallow copy of the object
  const newObj = { ...obj };

  // Modify the copy instead of the original object
  newObj[key] = (newObj[key] || 0) + 1;
  // Return the modified copy
  return newObj;
}
