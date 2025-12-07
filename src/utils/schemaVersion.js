/**
 * Schema version for results.json structure
 *
 * Increment this version when adding new data fields or changing the structure
 * of the results object. This ensures cached results are invalidated when
 * incompatible changes are made.
 *
 * Version History:
 * - 1.0.0: Initial version (all original reports)
 * - 1.1.0: Added llmReadabilityAggregation for LLM readability report
 * - 1.2.0: Added httpStatusAggregation for HTTP status code report; moved logs to results folder
 *
 * When to increment:
 * - MAJOR: Breaking changes to existing data structure
 * - MINOR: New aggregation fields or reports added
 * - PATCH: Bug fixes that don't change data structure
 */
export const RESULTS_SCHEMA_VERSION = '1.2.0';

/**
 * Compare two semantic version strings
 * @param {string} v1 - First version (e.g., "1.1.0")
 * @param {string} v2 - Second version (e.g., "1.0.0")
 * @returns {number} - Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }

  return 0;
}

/**
 * Check if two schema versions are compatible
 * Versions are compatible if they have the same MAJOR.MINOR version
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {boolean} - True if versions are compatible
 */
export function areVersionsCompatible(v1, v2) {
  const parts1 = v1.split('.');
  const parts2 = v2.split('.');

  // Compare MAJOR.MINOR (first two parts)
  return parts1[0] === parts2[0] && parts1[1] === parts2[1];
}
