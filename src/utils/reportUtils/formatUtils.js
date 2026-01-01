// Core formatting utilities for accessibility analysis reports
// Handles score formatting, WCAG guideline mapping, and data structure creation

/**
 * Formats numerical scores to two decimal places
 * @param {number|string} score - The score to format
 * @returns {string} Formatted score as string with two decimal places
 * @example formatScore(95.1234) => "95.12"
 */
export function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(2) : '0.00';
}

/**
 * WCAG 2.1 guideline mapping for accessibility analysis
 * Maps guideline numbers to human-readable descriptions
 * @type {Object}
 */
const WCAG_2_1_GUIDELINES = {
  1.1: 'Text Alternatives',
  1.2: 'Time-based Media',
  1.3: 'Adaptable',
  1.4: 'Distinguishable',
  2.1: 'Keyboard Accessible',
  2.2: 'Enough Time',
  2.3: 'Seizures and Physical Reactions',
  2.4: 'Navigable',
  2.5: 'Input Modalities',
  3.1: 'Readable',
  3.2: 'Predictable',
  3.3: 'Input Assistance',
  4.1: 'Compatible',
};

/**
 * Creates an empty accessibility analysis data structure
 * @returns {Object} Initialized analysis object with:
 *   - Total issues count
 *   - Issues categorized by severity and WCAG level
 *   - WCAG guideline-specific counts
 *   - Specialized issue counters (ARIA, contrast, keyboard)
 *   - Manual check tracking
 *   - Remediation suggestions
 *   - Initial score
 */
export function createEmptyAnalysis() {
  return {
    totalIssues: 0,
    bySeverity: {
      Critical: 0,
      Serious: 0,
      Moderate: 0,
      Minor: 0,
    },
    byLevel: {
      A: 0,
      AA: 0,
      AAA: 0,
    },
    byGuideline: Object.keys(WCAG_2_1_GUIDELINES).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {}),
    ariaIssues: 0,
    contrastIssues: 0,
    keyboardIssues: 0,
    manualChecks: [],
    requiredManualChecks: [],
    remediationSuggestions: [],
    score: 100,
  };
}

/**
 * Counts syllables in text for readability analysis
 * @param {string} text - Input text to analyze
 * @returns {number} Total syllable count
 * @note Uses basic vowel counting heuristic
 */
export function countSyllables(text) {
  return text.toLowerCase()
    .split(/\s+/)
    .reduce((total, word) => total + (word.match(/[aeiouy]{1,2}/g) || []).length, 0);
}

/**
 * Determines image format from URL
 * @param {string} src - Image source URL
 * @returns {string} Image format (jpg, png, gif, webp, svg) or 'unknown'
 * @note Handles URLs with query parameters and malformed inputs
 */
export function getImageFormat(src) {
  if (!src) return 'unknown';
  try {
    // Remove query string if present
    const cleanSrc = src.split('?')[0];
    // Get the last part after splitting by dots
    const ext = cleanSrc.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'img unknown';
  } catch {
    return 'img unknown';
  }
}

/**
 * Calculates URL path depth for link analysis
 * @param {string} url - Full URL to analyze
 * @returns {number} Number of path segments
 * @example calculateLinkDepth('https://example.com/a/b/c') => 3
 */
export function calculateLinkDepth(url) {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).length;
  } catch {
    return 0;
  }
}

/**
 * Maps accessibility issue to WCAG guideline
 * @param {Object} issue - Accessibility issue object
 * @returns {string|null} WCAG guideline number (e.g., '1.1') or null
 */
export function mapIssueToGuideline(issue) {
  const guidelineMatch = issue.code?.match(/WCAG2[ABC]\.(\d+\.\d+)/);
  if (guidelineMatch) {
    return guidelineMatch[1];
  }
  return null;
}

/**
 * Gets human-readable description for WCAG guideline
 * @param {string} guideline - WCAG guideline number (e.g., '1.1')
 * @returns {string} Description of guideline
 */
export function getGuidelineDescription(guideline) {
  return WCAG_2_1_GUIDELINES[guideline] || 'Unknown Guideline';
}

/**
 * Gets required manual checks for specific WCAG guideline
 * @param {string} guideline - WCAG guideline number (e.g., '1.1')
 * @returns {Array} List of manual check descriptions
 */
export function getRequiredManualChecks(guideline) {
  const manualChecks = {
    1.1: ['Verify all non-text content has appropriate text alternatives'],
    1.2: ['Check time-based media has captions and transcripts'],
    1.3: ['Verify content structure and relationships are programmatically determinable'],
    1.4: ['Check color contrast and text resizing'],
    2.1: ['Verify all functionality is available via keyboard'],
    2.2: ['Check timing is adjustable or can be turned off'],
    2.3: ['Verify no content flashes more than 3 times per second'],
    2.4: ['Check navigation and focus order'],
    2.5: ['Verify pointer gestures have alternative input methods'],
    3.1: ['Check language of page and parts'],
    3.2: ['Verify consistent navigation and identification'],
    3.3: ['Check error prevention and recovery'],
    4.1: ['Verify compatibility with assistive technologies'],
  };
  return manualChecks[guideline] || [];
}
