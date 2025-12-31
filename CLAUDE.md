# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Web Audit Suite** is a comprehensive website analysis tool built with Node.js that crawls websites and generates detailed reports on:
- SEO performance
- Accessibility compliance (WCAG 2.1)
- Performance metrics
- Security headers
- Content quality
- AI agent compatibility (LLM suitability)

## Essential Commands

### Development
```bash
# Run analysis with default settings
npm start

# Run with custom sitemap/URL and output directory
npm start -- -s <url> -o <output-dir>

# Run with limited URLs for testing (e.g., 10 pages)
npm start -- -s <url> -c 10

# Include all language variants (default: only /en and /us)
npm start -- --include-all-languages

# Run linting
npm run lint

# Run tests
npm test
```

### Common Options
- `-s, --sitemap <url>`: URL of sitemap or webpage to process
- `-o, --output <directory>`: Output directory (default: "results")
- `-c, --count <number>`: Limit URLs to process (-1 for all)
- `-l, --limit <number>`: Limit URLs to test (-1 for all)
- `--cache-only`: Use only cached data
- `--no-cache`: Disable caching
- `--force-delete-cache`: Force delete existing cache
- `--log-level <level>`: Set logging level (error, warn, info, debug)
- `--include-all-languages`: Include all language variants

## Architecture

### Three-Phase Processing Pipeline

1. **URL Collection Phase** (`getUrlsFromSitemap`):
   - Processes sitemap XML or extracts links from HTML
   - Handles both XML sitemaps and regular webpages
   - Uses Puppeteer fallback for Cloudflare-protected sites
   - Validates and normalizes URLs

2. **Data Collection Phase** (`processSitemapUrls`):
   - Analyzes each page using Puppeteer
   - Collects performance metrics, SEO data, accessibility issues
   - Runs Pa11y for WCAG 2.1 compliance testing
   - Stores all data in `results.json` (single source of truth)

3. **Report Generation Phase** (`generateReports`):
   - Reads from `results.json` only
   - Generates multiple CSV and markdown reports
   - Never fetches new data during report generation

### Key Design Principle: Single Source of Truth

**CRITICAL**: `results.json` is the single source of truth. All reports MUST be generated from this file. Report generation functions should NEVER:
- Fetch URLs directly
- Make network requests
- Collect new data
- Use Puppeteer

If data is missing from `results.json`, re-run the analysis phase, don't add data collection to report generation.

### Directory Structure

```
web-audit-suite/
├── index.js                 # Entry point, CLI parsing, logger setup
├── src/
│   ├── main.js             # Orchestrates 3-phase pipeline
│   ├── config/
│   │   └── options.js      # Configuration management
│   └── utils/
│       ├── sitemap.js      # URL extraction (Phase 1)
│       ├── pageAnalyzer.js # Page content analysis
│       ├── pa11yRunner.js  # Accessibility testing
│       ├── llmMetrics.js   # LLM suitability metrics collection
│       ├── reports.js      # Report coordination (Phase 3)
│       ├── networkUtils.js # Network error handling & retry
│       ├── metricsUpdater.js    # Metrics collection helpers
│       ├── shutdownHandler.js   # Graceful shutdown
│       └── reportUtils/
│           ├── reportGenerators.js     # All report generation
│           ├── llmReports.js           # LLM suitability reports
│           ├── accessibilityAnalysis.js
│           ├── contentAnalysis.js
│           ├── imageAnalysis.js
│           └── linkAnalysis.js
├── results/                 # Generated output
│   ├── results.json        # Single source of truth
│   ├── *.csv               # Various reports
│   └── wcag_report.md      # Accessibility report
├── .cache/                  # Puppeteer cache (auto-created)
└── docs/                    # Extension prompts and documentation
```

## Global State

The application uses a global `auditcore` object:
```javascript
global.auditcore = {
  logger: winston.Logger,  // Winston logger instance
  options: Object          // Parsed CLI options
}
```

Access logger: `global.auditcore.logger.info('message')`
Access options: `global.auditcore.options.sitemap`

## Key Technical Details

### Network Error Handling
- Automatic retry mechanism with user confirmation
- Cloudflare challenge bypass using puppeteer-extra-plugin-stealth
- Graceful fallback from fetch to Puppeteer when blocked
- Network error classification (DNS, timeout, unreachable)

### Language Variant Filtering
By default, only processes English variants (`/en`, `/us`) to avoid duplicate content analysis. Use `--include-all-languages` to disable filtering.

Helper function in `reportUtils/reportGenerators.js`:
```javascript
function shouldSkipLanguageVariant(url)
```

### Pa11y Integration
- WCAG 2.1 Level A, AA, AAA compliance checking
- Issue categorization by severity (Critical, Serious, Moderate, Minor)
- Generates both CSV and markdown reports
- Includes remediation suggestions

### Caching Strategy
- `.cache` directory auto-created on startup
- Puppeteer uses cache for performance
- `--cache-only` to use only cached data
- `--no-cache` to force fresh data
- `--force-delete-cache` to clear cache

### Resume Capability
The tool can resume from existing `results.json` if found, skipping data collection phase and going straight to report generation.

### LLM Suitability Analysis
Evaluates website compatibility with AI agents based on patterns from "The Invisible Users" book (https://github.com/tomcranstoun/invisible-users).

**CRITICAL DISTINCTION: Two HTML States**

AI agents operate in two fundamentally different modes:
1. **SERVED HTML** (static) - What CLI agents and server-based agents see (no JavaScript execution)
2. **RENDERED HTML** (dynamic) - What browser-based agents see (after JavaScript execution)

Reports show BOTH states because different agents need different information.

**Metric Categories by Importance:**

**ESSENTIAL_SERVED (works for ALL agents):**
- Semantic HTML structure (`<main>`, `<nav>`, `<header>`, `<article>`)
- Form field naming (email, firstName, lastName vs custom names)
- Schema.org structured data (JSON-LD)
- HTTP status codes (200, 404, etc.)
- Security headers (HSTS, CSP)

**ESSENTIAL_RENDERED (works for browser agents):**
- Explicit state attributes (data-state, data-validation-state)
- Persistent error messages (role="alert", aria-live)
- Dynamic validation feedback

**NICE_TO_HAVE (speculative, not critical):**
- Table data attributes (data-price, data-currency)
- Button disabled explanations (data-disabled-reason)
- Auth state attributes (data-authenticated)

Scoring heavily weights ESSENTIAL patterns, lightly weights NICE_TO_HAVE patterns.

**Three Reports Generated:**
1. **General LLM Report** (`llm_general_suitability.csv`)
   - Shows both served score (all agents) and rendered score (browser agents)
   - Lists essential vs nice-to-have issues
   - Provides actionable recommendations

2. **Frontend LLM Report** (`llm_frontend_suitability.csv`)
   - Separates served metrics (forms, semantic HTML) from rendered metrics (dynamic state)
   - Shows percentages for standard field naming and label usage
   - Identifies critical frontend issues

3. **Backend LLM Report** (`llm_backend_suitability.csv`)
   - Focuses on served state only (HTTP codes, headers, structured data)
   - No dynamic/rendered metrics needed for backend
   - Essential for all agent types

## Output Files

All files generated in the output directory (default: `results/`):

### Primary Data
- `results.json` - Complete raw data (single source of truth)
- `summary.json` - High-level site-wide metrics

### Reports (Generated from results.json)
- `seo_report.csv` - Page-level SEO analysis
- `performance_analysis.csv` - Performance metrics
- `seo_scores.csv` - Detailed SEO scoring
- `accessibility_report.csv` - WCAG compliance data
- `wcag_report.md` - Human-readable accessibility report
- `image_optimization.csv` - Image analysis
- `link_analysis.csv` - Link quality and structure
- `content_quality.csv` - Content analysis
- `security_report.csv` - Security headers analysis
- `llm_general_suitability.csv` - Overall AI agent compatibility scoring
- `llm_frontend_suitability.csv` - Frontend-specific AI patterns analysis
- `llm_backend_suitability.csv` - Backend/server-side AI patterns analysis

### Sitemaps
- `virtual_sitemap.xml` - Initial crawl results
- `final_sitemap.xml` - Complete discovered URLs

### Logs
- `combined.log` - All activity logs
- `error.log` - Error tracking only

## Development Guidelines

### ESLint Configuration
- Uses `eslint:recommended` and `plugin:node/recommended`
- Required: ES Modules with `.js` extensions in imports
- Required: Node.js >= 20.0.0
- `no-process-exit` rule disabled for intentional exits

### Module System
- Uses ES Modules (`"type": "module"` in package.json)
- All imports must include `.js` extension: `import { foo } from './utils/bar.js'`

### Error Handling
- Use `global.auditcore.logger` for all logging
- Network operations wrapped in `executeNetworkOperation()` for retry logic
- Puppeteer operations wrapped in `executePuppeteerOperation()`
- Graceful shutdown handler ensures data persistence

### When Modifying Reports
1. Check what data exists in `results.json` structure
2. Add data collection in Phase 2 (pageAnalyzer, metricsUpdater)
3. Update report generation in Phase 3 to read from `results.json`
4. Never fetch data during report generation

### Testing Workflow
1. Test with small sample: `npm start -- -c 10`
2. Review generated reports
3. Iterate on report logic
4. Run full analysis: `npm start -- -c -1`

## Common Patterns

### Adding a New Metric
1. Collect data in `src/utils/pageAnalyzer.js` or `metricsUpdater.js`
2. Store in page object that goes into `results.json`
3. Add report generation function in `src/utils/reportUtils/reportGenerators.js`
4. Call from `src/utils/reports.js`

### Adding a New Report
1. Create generator function in `reportUtils/reportGenerators.js`
2. Accept `results` and `outputDir` parameters
3. Read data from `results` array
4. Write CSV/markdown file to `outputDir`
5. Export and call from `generateReports()` in `reports.js`

## Extension Prompts

The `/docs` folder contains markdown files with prompts useful for extending this project. These can guide development of new features or modifications.
