// options.js

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
