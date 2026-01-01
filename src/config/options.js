// options.mjs

/**
 * Global configuration options.
 * @type {Object}
 */
export const globalOptions = {
  MAX_RETRIES: 3,
  INITIAL_BACKOFF: 1000, // 1 second
};

/**
 * Configuration options for Pa11y accessibility testing.
 * @type {Object}
 */
export const pa11yOptions = {
  timeout: 60000,
  wait: 2000,
  ignore: [
    'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2',
    'css-parsing-error',
    'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.A.EmptyNoId',
  ],
  viewport: {
    width: 1280,
    height: 1024,
  },
  chromeLaunchConfig: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-gpu',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      '--disable-extensions',
    ],
    ignoreHTTPSErrors: true,
  },
  RETRY_DELAY: 3000, // 3 seconds
};

/**
 * Configuration options for sitemap generation and processing.
 * @type {Object}
 */
export const sitemapOptions = {
  maxUrlsPerFile: 50000,
  excludePatterns: [],
  compress: true,
  customChangeFreq: null,
  customPriority: null,
  includeLastmod: true,
  includeChangefreq: true,
  includePriority: true,
  addStylesheet: false,
  robotsTxtPath: null,
};

/**
 * Configuration options for performance analysis.
 * @type {Object}
 */
export const performanceOptions = {
  timeout: 60000,
  waitUntil: 'networkidle0',
};


// config.js

export const seoScoreThresholds = {
  excellent: 90,
  veryGood: 80,
  good: 70,
  fair: 60,
  needsImprovement: 50
};

export const performanceThresholds = {
  loadTime: { excellent: 1000, good: 2000, fair: 3000 },
  domContentLoaded: { excellent: 500, good: 1000, fair: 2000 },
  firstPaint: { excellent: 1000, good: 2000, fair: 3000 },
  firstContentfulPaint: { excellent: 1500, good: 2500, fair: 4000 },
};

export const contentThresholds = {
  lowWordCount: 300
};

export const linkThresholds = {
  highExternalLinks: 100
};

export const urlThresholds = {
  maxLength: 115
};

export const titleThresholds = {
  minLength: 30,
  maxLength: 60
};

export const metaDescriptionThresholds = {
  minLength: 70,
  maxLength: 155
};

/**
 * Configurable pass/fail thresholds for various metrics
 * These can be customized via CLI or config file
 */
export const passFailThresholds = {
  performance: {
    loadTime: { pass: 3000, warn: 5000 },          // milliseconds
    lcp: { pass: 2500, warn: 4000 },               // milliseconds
    fcp: { pass: 1800, warn: 3000 },               // milliseconds
    cls: { pass: 0.1, warn: 0.25 },                // score
    tti: { pass: 3800, warn: 7300 }                // milliseconds
  },
  accessibility: {
    maxErrors: { pass: 0, warn: 5 },               // count
    maxWarnings: { pass: 10, warn: 30 },           // count
    maxTotalIssues: { pass: 20, warn: 50 }         // count
  },
  seo: {
    minScore: { pass: 80, warn: 60 },              // score 0-100
    minTitleLength: { pass: 30, warn: 20 },        // characters
    maxTitleLength: { pass: 60, warn: 70 },        // characters
    minMetaDescLength: { pass: 70, warn: 50 },     // characters
    maxMetaDescLength: { pass: 155, warn: 170 }    // characters
  },
  content: {
    minWordCount: { pass: 300, warn: 150 },        // words
    minHeadings: { pass: 3, warn: 1 }              // count
  },
  llm: {
    minServedScore: { pass: 70, warn: 50 },        // score 0-100
    minRenderedScore: { pass: 60, warn: 40 }       // score 0-100
  }
};

/**
 * Load custom thresholds from a config file or CLI options
 * @param {Object} customThresholds - Custom threshold values
 * @returns {Object} Merged threshold configuration
 */
export function loadCustomThresholds(customThresholds = {}) {
  return {
    ...passFailThresholds,
    ...customThresholds
  };
}