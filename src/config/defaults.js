/**
 * Default configuration values for the application.
 * This file consolidates all configuration constants and default options.
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// Timeouts (milliseconds)
export const TIMEOUTS = {
  PA11Y: 60000, // 60 seconds for Pa11y tests
  PA11Y_WAIT: 2000, // 2 seconds wait before Pa11y analysis
  PA11Y_RETRY_DELAY: 3000, // 3 seconds between Pa11y retries
  PERFORMANCE: 60000, // 60 seconds for performance analysis
  INITIAL_BACKOFF: 1000, // 1 second initial backoff for retries
  DEFAULT_COMMAND: 120000, // 2 minutes default command timeout
};

// Retry Configuration
export const RETRY = {
  MAX_RETRIES: 3,
  BACKOFF_MULTIPLIER: 2,
};

// Cache Configuration
export const CACHE = {
  DIRECTORY: '.cache',
  RENDERED_DIR: 'rendered',
  SERVED_DIR: 'served',
  SELF_CLEANING_TTL: 900000, // 15 minutes
};

// Sitemap Configuration
export const SITEMAP = {
  MAX_URLS_PER_FILE: 50000,
  DEFAULT_COUNT: -1, // -1 means process all URLs
  COMPRESS: true,
};

// Viewport Configuration
export const VIEWPORT = {
  WIDTH: 1280,
  HEIGHT: 1024,
};

// Content Thresholds
export const CONTENT_LIMITS = {
  LOW_WORD_COUNT: 300,
  MIN_HEADINGS: 3,
  HIGH_EXTERNAL_LINKS: 100,
};

// SEO Thresholds
export const SEO_LIMITS = {
  TITLE_MIN_LENGTH: 30,
  TITLE_MAX_LENGTH: 60,
  META_DESC_MIN_LENGTH: 70,
  META_DESC_MAX_LENGTH: 155,
  URL_MAX_LENGTH: 115,
};

// Performance Thresholds
export const PERFORMANCE_LIMITS = {
  LOAD_TIME: {
    EXCELLENT: 1000,
    GOOD: 2000,
    FAIR: 3000,
  },
  DOM_CONTENT_LOADED: {
    EXCELLENT: 500,
    GOOD: 1000,
    FAIR: 2000,
  },
  FIRST_PAINT: {
    EXCELLENT: 1000,
    GOOD: 2000,
    FAIR: 3000,
  },
  FIRST_CONTENTFUL_PAINT: {
    EXCELLENT: 1500,
    GOOD: 2500,
    FAIR: 4000,
  },
  LARGEST_CONTENTFUL_PAINT: {
    EXCELLENT: 2500,
    GOOD: 4000,
    FAIL: 4000,
  },
  CUMULATIVE_LAYOUT_SHIFT: {
    EXCELLENT: 0.1,
    GOOD: 0.25,
    FAIL: 0.25,
  },
  TIME_TO_INTERACTIVE: {
    EXCELLENT: 3800,
    GOOD: 7300,
    FAIL: 7300,
  },
};

// SEO Score Thresholds
export const SEO_SCORE = {
  EXCELLENT: 90,
  VERY_GOOD: 80,
  GOOD: 70,
  FAIR: 60,
  NEEDS_IMPROVEMENT: 50,
};

// LLM Suitability Scoring
export const LLM_SCORING = {
  // Essential served metrics (works for ALL agents)
  ESSENTIAL_SERVED: {
    SEMANTIC_HTML_MAIN: 10,
    SEMANTIC_HTML_NAV: 5,
    SEMANTIC_HTML_HEADER: 5,
    SEMANTIC_HTML_ARTICLE: 5,
    STANDARD_FORM_FIELD: 2, // per field
    FORM_LABEL_ASSOCIATION: 5, // per form
    JSON_LD_SCHEMA: 10,
    LLMS_TXT: 10,
    HTTP_STATUS_OK: 5,
    SECURITY_HEADERS: 5,
  },
  // Essential rendered metrics (browser agents only)
  ESSENTIAL_RENDERED: {
    EXPLICIT_STATE_ATTR: 10,
    AGENT_VISIBLE_CONTROL: 5,
    PERSISTENT_ERROR_MSG: 10,
    DYNAMIC_VALIDATION: 5,
  },
  // Nice-to-have metrics (speculative)
  NICE_TO_HAVE: {
    TABLE_DATA_ATTR: 1, // per attribute
    BUTTON_DISABLED_REASON: 2,
    AUTH_STATE_ATTR: 3,
  },
  // Maximum scores
  MAX_SERVED_SCORE: 100,
  MAX_RENDERED_SCORE: 100,
};

// Accessibility Issue Severity
export const A11Y_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  NOTICE: 'notice',
};

// Accessibility Score Deductions
export const A11Y_SCORE_DEDUCTIONS = {
  ERROR: 5,
  WARNING: 2,
  NOTICE: 0.5,
};

// Language Variants (for filtering)
export const LANGUAGE_VARIANTS = {
  ALLOWED_PATTERNS: ['/en', '/us'],
  EXCLUDED_PATTERNS: ['/de', '/fr', '/es', '/it', '/pt', '/ja', '/zh', '/ko'],
};

// File Output Configuration
export const OUTPUT = {
  DEFAULT_DIR: 'results',
  HISTORY_DIR: 'history',
  RESULTS_FILE: 'results.json',
  SUMMARY_FILE: 'summary.json',
  EXECUTIVE_SUMMARY_MD: 'executive_summary.md',
  EXECUTIVE_SUMMARY_JSON: 'executive_summary.json',
  DASHBOARD_HTML: 'dashboard.html',
  ERROR_LOG: 'error.log',
  COMBINED_LOG: 'combined.log',
  VIRTUAL_SITEMAP: 'virtual_sitemap.xml',
  FINAL_SITEMAP: 'final_sitemap.xml',
};

// Report File Names
export const REPORTS = {
  SEO: 'seo_report.csv',
  PERFORMANCE: 'performance_analysis.csv',
  SEO_SCORES: 'seo_scores.csv',
  ACCESSIBILITY: 'accessibility_report.csv',
  WCAG: 'wcag_report.md',
  IMAGE_OPTIMIZATION: 'image_optimization.csv',
  LINK_ANALYSIS: 'link_analysis.csv',
  CONTENT_QUALITY: 'content_quality.csv',
  SECURITY: 'security_report.csv',
  LLM_GENERAL: 'llm_general_suitability.csv',
  LLM_FRONTEND: 'llm_frontend_suitability.csv',
  LLM_BACKEND: 'llm_backend_suitability.csv',
};

// Chart Configuration
export const CHART = {
  WIDTH: 800,
  HEIGHT: 400,
  BACKGROUND_COLOR: 'white',
};

// Chart Colors
export const CHART_COLORS = {
  SUCCESS: '#28a745',
  GOOD: '#5cb85c',
  WARNING: '#ffc107',
  DANGER: '#dc3545',
  INFO: '#17a2b8',
  PRIMARY: '#007bff',
  SECONDARY: '#6c757d',
};

// Status Colors for Dashboard
export const STATUS_COLORS = {
  PASS: {
    BACKGROUND: '#d4edda',
    TEXT: '#155724',
  },
  WARN: {
    BACKGROUND: '#fff3cd',
    TEXT: '#856404',
  },
  FAIL: {
    BACKGROUND: '#f8d7da',
    TEXT: '#721c24',
  },
};

// Logging Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

// Schema Version
export const SCHEMA = {
  CURRENT_VERSION: '1.0.0',
  COMPATIBILITY_MAJOR: 1,
};

// Chrome Launch Arguments
export const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-web-security',
  '--disable-gpu',
  '--ignore-certificate-errors',
  '--ignore-certificate-errors-spki-list',
  '--disable-extensions',
];

// Wait Until Options for Puppeteer
export const WAIT_UNTIL = {
  LOAD: 'load',
  DOM_CONTENT_LOADED: 'domcontentloaded',
  NETWORK_IDLE_0: 'networkidle0',
  NETWORK_IDLE_2: 'networkidle2',
};

// WCAG Levels
export const WCAG_LEVELS = {
  A: 'WCAG2A',
  AA: 'WCAG2AA',
  AAA: 'WCAG2AAA',
};

// File Size Limits
export const FILE_SIZE = {
  MAX_OUTPUT_CHARS: 30000, // For truncating large outputs
  MAX_LINE_LENGTH: 2000, // For truncating long lines in file reads
};

// Regex Patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  LANGUAGE_VARIANT: /\/(de|fr|es|it|pt|ja|zh|ko)\//,
  ALLOWED_LANGUAGE: /\/(en|us)\//,
};

// Default URLs (for development/testing)
export const DEFAULTS = {
  SITEMAP_URL: 'https://example.com/sitemap.xml',
  COUNT: -1,
};

// Environment Variable Keys
export const ENV_VARS = {
  NODE_ENV: 'NODE_ENV',
  LOG_LEVEL: 'LOG_LEVEL',
  OUTPUT_DIR: 'OUTPUT_DIR',
  SITEMAP_URL: 'SITEMAP_URL',
  CACHE_DIR: 'CACHE_DIR',
  MAX_RETRIES: 'MAX_RETRIES',
  TIMEOUT: 'TIMEOUT',
  ENABLE_HISTORY: 'ENABLE_HISTORY',
  GENERATE_DASHBOARD: 'GENERATE_DASHBOARD',
  GENERATE_EXECUTIVE_SUMMARY: 'GENERATE_EXECUTIVE_SUMMARY',
  LIMIT: 'LIMIT',
  COUNT: 'COUNT',
  CACHE_ONLY: 'CACHE_ONLY',
  NO_CACHE: 'NO_CACHE',
  NO_PUPPETEER: 'NO_PUPPETEER',
  FORCE_DELETE_CACHE: 'FORCE_DELETE_CACHE',
  INCLUDE_ALL_LANGUAGES: 'INCLUDE_ALL_LANGUAGES',
  NO_RECURSIVE: 'NO_RECURSIVE',
  THRESHOLDS_FILE: 'THRESHOLDS_FILE',
};

// Node Environment Values
export const NODE_ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
};

export const defaultOptions = {
  // Global options
  maxRetries: RETRY.MAX_RETRIES,
  timeout: TIMEOUTS.DEFAULT_COMMAND,
  initialBackoff: TIMEOUTS.INITIAL_BACKOFF,
  logLevel: LOG_LEVELS.DEBUG,
  output: OUTPUT.DEFAULT_DIR,
  sitemap: DEFAULTS.SITEMAP_URL,
  cacheDir: CACHE.DIRECTORY,
  limit: -1,
  count: -1,
  cache: true,
  cacheOnly: false,
  puppeteer: true,
  forceDeleteCache: false,
  includeAllLanguages: false,
  recursive: true,
  enableHistory: false,
  generateDashboard: false,
  generateExecutiveSummary: false,

  // Pa11y specific configuration
  pa11y: {
    timeout: TIMEOUTS.PA11Y,
    wait: TIMEOUTS.PA11Y_WAIT,
    ignore: [
      'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2',
      'css-parsing-error',
      'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.A.EmptyNoId',
    ],
    viewport: {
      width: VIEWPORT.WIDTH,
      height: VIEWPORT.HEIGHT,
    },
    chromeLaunchConfig: {
      args: CHROME_ARGS,
      ignoreHTTPSErrors: true,
    },
    retryDelay: TIMEOUTS.PA11Y_RETRY_DELAY,
  },

  // Sitemap processing options
  sitemapProcessing: {
    maxUrlsPerFile: SITEMAP.MAX_URLS_PER_FILE,
    excludePatterns: [],
    compress: SITEMAP.COMPRESS,
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
    timeout: TIMEOUTS.PERFORMANCE,
    waitUntil: WAIT_UNTIL.NETWORK_IDLE_0,
  },

  // Thresholds
  thresholds: {
    performance: {
      loadTime: { pass: PERFORMANCE_LIMITS.LOAD_TIME.FAIR, warn: 5000 },
      lcp: { pass: PERFORMANCE_LIMITS.LARGEST_CONTENTFUL_PAINT.EXCELLENT, warn: PERFORMANCE_LIMITS.LARGEST_CONTENTFUL_PAINT.GOOD },
      fcp: { pass: 1800, warn: PERFORMANCE_LIMITS.FIRST_PAINT.FAIR },
      cls: { pass: PERFORMANCE_LIMITS.CUMULATIVE_LAYOUT_SHIFT.EXCELLENT, warn: PERFORMANCE_LIMITS.CUMULATIVE_LAYOUT_SHIFT.GOOD },
      tti: { pass: PERFORMANCE_LIMITS.TIME_TO_INTERACTIVE.EXCELLENT, warn: PERFORMANCE_LIMITS.TIME_TO_INTERACTIVE.GOOD },
    },
    accessibility: {
      maxErrors: { pass: 0, warn: 5 },
      maxWarnings: { pass: 10, warn: 30 },
      maxTotalIssues: { pass: 20, warn: 50 },
    },
    seo: {
      minScore: { pass: 80, warn: 60 },
      minTitleLength: { pass: SEO_LIMITS.TITLE_MIN_LENGTH, warn: 20 },
      maxTitleLength: { pass: SEO_LIMITS.TITLE_MAX_LENGTH, warn: 70 },
      minMetaDescLength: { pass: SEO_LIMITS.META_DESC_MIN_LENGTH, warn: 50 },
      maxMetaDescLength: { pass: SEO_LIMITS.META_DESC_MAX_LENGTH, warn: 170 },
    },
    content: {
      minWordCount: { pass: CONTENT_LIMITS.LOW_WORD_COUNT, warn: 150 },
      minHeadings: { pass: CONTENT_LIMITS.MIN_HEADINGS, warn: 1 },
    },
    llm: {
      minServedScore: { pass: 70, warn: 50 },
      minRenderedScore: { pass: 60, warn: 40 },
    },
  },
};
