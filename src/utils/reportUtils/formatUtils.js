// Basic utility functions
export function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(2) : '0.00';
}

export function createEmptyAnalysis() {
  return {
    totalIssues: 0,
    bySeverity: {},
    byLevel: {},
    ariaIssues: 0,
    contrastIssues: 0,
    keyboardIssues: 0,
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
    const ext = src.split('.').pop().toLowerCase();
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
