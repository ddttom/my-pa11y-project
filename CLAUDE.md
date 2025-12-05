# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive SEO, accessibility, and performance analysis tool built with Node.js. It uses Puppeteer for browser automation, Pa11y for accessibility testing, and generates detailed CSV reports from analyzed web pages.

**Latest Feature (December 2025):** External Resources Tracking
- Extracts all external dependencies (JavaScript, CSS, images, fonts, videos, etc.)
- Generates site-wide usage counts showing how frequently each resource is used
- Helps identify critical third-party dependencies and potential single points of failure
- New report: `external_resources_report.csv` with Resource URL, Type, and Total Count

## Commands

### Development
```bash
npm start                                      # Run analysis with default sitemap
npm start -- -s <url> -o <output-dir>         # Run with custom sitemap and output
npm start -- --count 5                        # Limit to 5 URLs for testing
npm start -- --cache-only                     # Use only cached data
npm start -- --no-cache                       # Force fresh data fetch
npm start -- --force-delete-cache             # Delete cache before running
npm start -- --include-all-languages          # Include all language variants (default: only /en and /us)
npm test                                      # Run tests with Mocha
npm run lint                                  # Run ESLint
npm audit                                     # Check for security vulnerabilities
npm audit fix                                 # Fix non-breaking vulnerabilities
npm audit fix --force                         # Fix all vulnerabilities (may include breaking changes)
```

### Common Development Workflows
```bash
# Test with small sample before full analysis
npm start -- --count 5 -o results

# Force fresh analysis (no cache)
rm results/results.json && npm start

# Debug with verbose logging
npm start -- --log-level debug
```

## Architecture

### Data Flow Pipeline (4 Phases)

The system follows a strict 4-phase pattern that must be preserved when adding features:

#### 1. Rendering Phase (`src/utils/caching.js`)
- **Entry point**: `renderAndCacheData()` function
- Uses Puppeteer to render pages with `page.evaluate()`
- Extracts raw data from the DOM (lines 277-530)
- Returns `pageData` object with all extracted information
- Caches rendered HTML in `.cache/rendered/` and served HTML in `.cache/served/`
- **Key pattern**: All DOM extraction happens HERE in a single browser context

#### 2. Analysis Phase (`src/utils/pageAnalyzer.js`)
- **Entry point**: `analyzePageContent()` function
- Receives `pageData` from rendering phase
- Uses Cheerio for additional HTML parsing
- Runs Pa11y accessibility tests
- Extracts internal links
- **Key pattern**: Processes pageData but doesn't fetch new network resources

#### 3. Metrics/Aggregation Phase (`src/utils/metricsUpdater.js`)
- **Entry point**: `runMetricsAnalysis()` in pageAnalyzer.js calls multiple `updateXxxMetrics()` functions
- Aggregates data across ALL pages (site-wide)
- Each metric function follows pattern:
  ```javascript
  export function updateXxxMetrics(pageData, results, testUrl) {
    if (!results.xxxAggregation) results.xxxAggregation = {};
    // Aggregate logic here
  }
  ```
- **Key pattern**: Builds aggregation objects keyed by URL or resource identifier

#### 4. Reporting Phase (`src/utils/reportUtils/reportGenerators.js`)
- **Entry point**: `generateReports()` in `src/utils/reports.js`
- Reads from aggregated `results` object (single source of truth)
- Generates CSV reports using `csv-writer` library
- Each report function follows pattern:
  ```javascript
  export async function generateXxxReport(results, outputDir) {
    const csvWriter = createObjectCsvWriter({...});
    const reportData = results.xxxAggregation
      .map(item => ({...}))
      .sort(...);
    await csvWriter.writeRecords(reportData);
  }
  ```
- **Key pattern**: NEVER fetches new data, only transforms `results` object into reports

### Critical Architecture Rules

1. **Single Source of Truth**: `results.json` contains ALL analysis data
2. **No Data Collection During Reporting**: Reports only transform existing data from `results`
3. **Puppeteer Extraction Pattern**: All DOM queries in rendering phase must use `page.evaluate()` to run in browser context
4. **Aggregation Objects**: Site-wide metrics stored as objects with URLs or resource URLs as keys
5. **Sequential Phase Execution**: Rendering → Analysis → Metrics → Reports (never skip or reorder)

## Key Files and Their Roles

### Entry Points
- **`index.js`**: CLI argument parsing, logging setup, global config initialization
- **`src/main.js`**: Orchestrates 3-phase workflow (URL collection → Processing → Reporting)

### Core Processing
- **`src/utils/caching.js`**: Puppeteer rendering, page data extraction, HTML caching
- **`src/utils/pageAnalyzer.js`**: Content analysis orchestration, Pa11y integration
- **`src/utils/urlProcessor.js`**: URL processing loop, retry logic, error handling
- **`src/utils/metricsUpdater.js`**: Metric aggregation functions (title, meta, images, links, security, etc.)

### Report Generation
- **`src/utils/reports.js`**: Report orchestration, calls all report generators
- **`src/utils/reportUtils/reportGenerators.js`**: Individual CSV report functions
- **`src/utils/reportUtils/*.js`**: Analysis helpers (accessibility, images, links, content)

### Specialized Utilities
- **`src/utils/sitemap.js`**: Sitemap parsing (XML/HTML), recursive processing, Puppeteer fallback
- **`src/utils/seoScoring.js`**: SEO score calculation algorithms
- **`src/utils/performanceAnalyzer.js`**: Performance metrics analysis
- **`src/utils/networkUtils.js`**: Network error handling, retry mechanisms
- **`src/utils/shutdownHandler.js`**: Graceful shutdown, results preservation

## Global State

```javascript
global.auditcore = {
  logger: winston.Logger,  // Winston logger instance
  options: {               // CLI options from commander
    sitemap: string,
    output: string,
    limit: number,
    count: number,
    cacheOnly: boolean,
    cache: boolean,
    puppeteer: boolean,
    forceDeleteCache: boolean,
    logLevel: string,
    includeAllLanguages: boolean
  }
}
```

## Data Structures

### Results Object (in `results.json`)
```javascript
{
  urls: string[],                    // All processed URLs
  contentAnalysis: Array<{           // Per-page content metrics
    url, title, metaDescription,
    h1Count, wordCount, imagesCount,
    images: [{src, alt, width, height}],
    externalResources: [{url, type}], // NEW: External resources per page
    // ... more fields
  }>,
  performanceAnalysis: Array<{       // Per-page performance
    url, loadTime, firstPaint, largestContentfulPaint, ...
  }>,
  seoScores: Array<{                 // Per-page SEO scores
    url, score, details: {...}
  }>,
  pa11y: Array<{                     // Per-page accessibility issues
    url, issues: [...], wcagCompliance: {...}
  }>,
  internalLinks: Array<{             // Per-page link data
    url, links: [{url, text, ...}]
  }>,

  // Aggregated site-wide metrics (keyed by URL or resource)
  urlMetrics: {},
  titleMetrics: {},
  imageMetrics: {},
  linkMetrics: {},
  securityMetrics: {},
  externalResourcesAggregation: {    // NEW: Site-wide external resources
    "https://cdn.example.com/script.js": {
      url: string,
      type: "javascript"|"css"|"image"|"font"|"video"|"audio"|"iframe"|"other",
      count: number,
      pages: string[]
    }
  }
}
```

## Adding New Features

When adding new features that extract data or generate reports, follow the 4-phase pattern:

### Example: Adding a New Data Point

1. **Extract in Rendering Phase** (`caching.js` line ~291 in `page.evaluate()`):
   ```javascript
   const myNewData = document.querySelectorAll('.my-selector').length;
   ```
   Add to return object (line ~528):
   ```javascript
   return {
     // existing fields...
     myNewData: myNewData
   }
   ```

2. **Process in Analysis Phase** (if needed, `pageAnalyzer.js`)

3. **Aggregate in Metrics Phase** (`metricsUpdater.js`):
   ```javascript
   export function updateMyNewMetrics(pageData, results, testUrl) {
     if (!results.myNewAggregation) results.myNewAggregation = {};
     results.myNewAggregation[testUrl] = pageData.myNewData;
   }
   ```
   Call in `runMetricsAnalysis()` (pageAnalyzer.js ~line 246)

4. **Report in Reporting Phase** (`reportGenerators.js`):
   ```javascript
   export async function generateMyNewReport(results, outputDir) {
     const csvWriter = createObjectCsvWriter({...});
     const reportData = Object.entries(results.myNewAggregation)
       .map(([url, data]) => ({url, myMetric: data}));
     await csvWriter.writeRecords(reportData);
   }
   ```
   Wire up in `reports.js` (import, call, export)

## Caching System

- `.cache/rendered/`: Puppeteer-rendered HTML (after JavaScript execution)
- `.cache/served/`: Original served HTML (as received from server)
- Cache keys: URL-based with sanitized filenames
- Cache control: `--cache-only`, `--no-cache`, `--force-delete-cache` flags
- Screenshots saved in `ss/` directory for debugging

## Language Variant Filtering

By default, the tool only processes `/en` and `/us` language variants. This is controlled by:
- `shouldIncludeUrl()` function in `reportGenerators.js`
- `--include-all-languages` flag to override
- Filtering applied during report generation phase

## Error Handling

- Network errors: Automatic retry with exponential backoff (see `networkUtils.js`)
- Failed URLs tracked in `results.failedUrls[]`
- Graceful shutdown: `SIGINT`/`SIGTERM` handlers save partial results
- Logging: Winston logger with levels (error, warn, info, debug)
- Invalid URLs logged to `invalid_urls.txt`

## Testing

- Test framework: Mocha
- Test files: `test/**/*.test.js`
- Focus on utility functions and data transformations
- Use real fixtures for integration tests

## Performance Considerations

- Puppeteer runs with `waitUntil: 'networkidle0'` for complete page rendering
- Sequential URL processing (no parallel browser instances to avoid resource exhaustion)
- Cheerio used for fast HTML parsing where possible
- Results cached to enable resume functionality

## Dependency Management and Security

### Security Vulnerability Management

This project actively manages npm security vulnerabilities:

**Current Status (as of latest update):**
- Production dependencies: All critical and high-severity vulnerabilities resolved
- Remaining vulnerabilities: 9 (7 low, 2 moderate) in devDependencies only
- These do not affect production runtime security

**Important Dependencies:**
- **Production**: axios, cheerio, puppeteer, pa11y, lighthouse, csv-writer
- **Development**: eslint, mocha, prettier

**Vulnerability Response Process:**
1. Run `npm audit` to identify vulnerabilities
2. Apply `npm audit fix` for non-breaking updates
3. Evaluate breaking changes before using `npm audit fix --force`
4. Commit `package-lock.json` with detailed explanation
5. Monitor remaining vulnerabilities in devDependencies

**Known Acceptable Risks:**
- **brace-expansion** (low) - ReDoS in devDependency, no production impact
- **js-yaml** (moderate) - In xmlbuilder2, used only for report generation
- **tmp** (low) - In eslint-config-node, development tool only

### When to Update Dependencies

- **Security patches**: Apply immediately with `npm audit fix`
- **Minor updates**: Test thoroughly, especially Puppeteer and Pa11y
- **Major updates**: Plan carefully, may require code changes
- **Breaking changes**: Only apply when necessary, document in CHANGELOG.md

## Documentation

See `/docs` folder for:
- `architecture.md`: System architecture details
- `usermanual.md`: User guide
- `prd.md`: Product requirements
- `projectstate.md`: Current project status
- Extension prompts in other `.md` files for AI-assisted development
