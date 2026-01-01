/**
 * Default configuration values for the application.
 * This replaces the scattered options in options.js
 */

export const defaultOptions = {
  // Global options
  maxRetries: 3,
  timeout: 120000,
  initialBackoff: 1000,
  logLevel: 'debug',
  output: 'results',
  sitemap: 'https://example.com/sitemap.xml',
  cacheDir: '.cache',

  // Pa11y specific configuration
  pa11y: {
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
    retryDelay: 3000,
  },

  // Sitemap processing options
  sitemapProcessing: {
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
  },

  // Performance analysis options
  performance: {
    timeout: 60000,
    waitUntil: 'networkidle0',
  },

  // Thresholds
  thresholds: {
    performance: {
      loadTime: { pass: 3000, warn: 5000 },
      lcp: { pass: 2500, warn: 4000 },
      fcp: { pass: 1800, warn: 3000 },
      cls: { pass: 0.1, warn: 0.25 },
      tti: { pass: 3800, warn: 7300 },
    },
    accessibility: {
      maxErrors: { pass: 0, warn: 5 },
      maxWarnings: { pass: 10, warn: 30 },
      maxTotalIssues: { pass: 20, warn: 50 },
    },
    seo: {
      minScore: { pass: 80, warn: 60 },
      minTitleLength: { pass: 30, warn: 20 },
      maxTitleLength: { pass: 60, warn: 70 },
      minMetaDescLength: { pass: 70, warn: 50 },
      maxMetaDescLength: { pass: 155, warn: 170 },
    },
    content: {
      minWordCount: { pass: 300, warn: 150 },
      minHeadings: { pass: 3, warn: 1 },
    },
    llm: {
      minServedScore: { pass: 70, warn: 50 },
      minRenderedScore: { pass: 60, warn: 40 },
    },
  },
};
