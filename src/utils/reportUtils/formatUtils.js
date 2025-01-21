// Basic utility functions
export function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(2) : '0.00';
}

// WCAG 2.1 guideline mapping
const WCAG_2_1_GUIDELINES = {
  '1.1': 'Text Alternatives',
  '1.2': 'Time-based Media',
  '1.3': 'Adaptable',
  '1.4': 'Distinguishable',
  '2.1': 'Keyboard Accessible',
  '2.2': 'Enough Time',
  '2.3': 'Seizures and Physical Reactions',
  '2.4': 'Navigable',
  '2.5': 'Input Modalities',
  '3.1': 'Readable',
  '3.2': 'Predictable',
  '3.3': 'Input Assistance',
  '4.1': 'Compatible'
};

export function createEmptyAnalysis() {
  return {
    totalIssues: 0,
    bySeverity: {
      Critical: 0,
      Serious: 0,
      Moderate: 0,
      Minor: 0
    },
    byLevel: {
      A: 0,
      AA: 0,
      AAA: 0
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
    score: 100
  };
}

export function countSyllables(text) {
  return text.toLowerCase()
    .split(/\s+/)
    .reduce((total, word) => {
      return total + (word.match(/[aeiouy]{1,2}/g) || []).length;
    }, 0);
}

export function getImageFormat(src) {
  if (!src) return 'unknown';
  try {
    // Remove query string if present
    const cleanSrc = src.split('?')[0];
    // Get the last part after splitting by dots
    const ext = cleanSrc.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function calculateLinkDepth(url) {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).length;
  } catch {
    return 0;
  }
}

// Enhanced WCAG 2.1 analysis utilities
export function mapIssueToGuideline(issue) {
  const guidelineMatch = issue.code?.match(/WCAG2[ABC]\.(\d+\.\d+)/);
  if (guidelineMatch) {
    return guidelineMatch[1];
  }
  return null;
}

export function getGuidelineDescription(guideline) {
  return WCAG_2_1_GUIDELINES[guideline] || 'Unknown Guideline';
}

export function getRequiredManualChecks(guideline) {
  const manualChecks = {
    '1.1': ['Verify all non-text content has appropriate text alternatives'],
    '1.2': ['Check time-based media has captions and transcripts'],
    '1.3': ['Verify content structure and relationships are programmatically determinable'],
    '1.4': ['Check color contrast and text resizing'],
    '2.1': ['Verify all functionality is available via keyboard'],
    '2.2': ['Check timing is adjustable or can be turned off'],
    '2.3': ['Verify no content flashes more than 3 times per second'],
    '2.4': ['Check navigation and focus order'],
    '2.5': ['Verify pointer gestures have alternative input methods'],
    '3.1': ['Check language of page and parts'],
    '3.2': ['Verify consistent navigation and identification'],
    '3.3': ['Check error prevention and recovery'],
    '4.1': ['Verify compatibility with assistive technologies']
  };
  return manualChecks[guideline] || [];
}
