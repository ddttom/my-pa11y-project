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

# Generate dashboard with historical tracking
npm start -- -s <url> --enable-history --generate-dashboard

# Generate executive summary
npm start -- -s <url> --generate-executive-summary

# Full analysis with all enhanced features
npm start -- -s <url> --enable-history --generate-dashboard --generate-executive-summary

# Run linting (IMPORTANT: use npm script, not global eslint)
npm run lint

# Run markdown linting
npm run lint:md

# Auto-fix markdown linting issues
npm run lint:md:fix

# Run tests
npm test
```

**Note on ESLint**: This project uses ESLint 8.57.0 with `.eslintrc.cjs` configuration. Always use `npm run lint` to ensure you're using the project's local ESLint version.
Global ESLint 9.x installations are incompatible with the `.eslintrc.cjs` format and will fail.

**Note on Markdown Linting**: This project uses markdownlint-cli with configuration in `.markdownlint.json`.
The `npm run lint:md:fix` command automatically fixes many issues like blank lines around lists and code block formatting.
Some issues like line length and table formatting require manual fixes.

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
- `--enable-history`: Enable historical tracking for comparative analysis
- `--generate-dashboard`: Generate interactive HTML dashboard with charts
- `--generate-executive-summary`: Generate executive summary report
- `--thresholds <file>`: Path to custom thresholds configuration (JSON)

### Performance Options

The tool includes significant performance optimizations:

- **Browser Pooling**: Reuses Puppeteer browser instances (default: 3 browsers)
  - Configure via `browserPoolSize` in defaults.js (default: 3)
  - Eliminates 2-5 second browser startup overhead per URL
  - Automatic browser restart after 50 pages to prevent memory leaks

- **Concurrent URL Processing**: Processes multiple URLs simultaneously (default: 3 concurrent)
  - Configure via `urlConcurrency` in defaults.js (default: 3)
  - 3-5x performance improvement for typical workloads
  - Expected: 75-85% faster execution time

**Performance Impact:**

- 100 URLs: ~45 minutes → ~10 minutes (4-5x faster)
- Browser launches: 100 × 3s = 300s → 3 × 3s = 9s (97% reduction)
- URL processing: Sequential → Concurrent (3-5x speedup)

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

```text
web-audit-suite/
├── index.js                 # Entry point, CLI parsing, logger setup
├── src/
│   ├── main.js             # Orchestrates 3-phase pipeline
│   ├── config/
│   │   └── defaults.js     # Default configuration values
│   └── utils/
│       ├── sitemap.js      # URL extraction (Phase 1)
│       ├── pageAnalyzer.js # Page content analysis
│       ├── pa11yRunner.js  # Accessibility testing
│       ├── llmMetrics.js   # LLM suitability metrics collection
│       ├── reports.js      # Report coordination (Phase 3)
│       ├── networkUtils.js # Network error handling & retry, browser pool
│       ├── browserPool.js  # Browser pooling for performance
│       ├── urlProcessor.js # URL processing with concurrency
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

### Performance Optimizations

#### Browser Pooling (`browserPool.js`)

Implements a pool of reusable Puppeteer browser instances to eliminate startup overhead:

**Features:**

- Pool of 3 browser instances by default (configurable via `browserPoolSize`)
- Automatic browser acquisition and release with queue management
- Smart browser restart after 50 pages to prevent memory leaks
- Graceful shutdown handling
- Fallback mode if pool initialization fails

**Architecture:**

- Pool maintains available and busy browsers
- FIFO queue for waiting requests
- Each browser tracked with ID, usage count, and status
- Integrated with `networkUtils.js` via `executePuppeteerOperation()`

**Impact:** Eliminates 2-5 second browser launch per URL (97% reduction for 100 URLs)

#### Concurrent URL Processing (`urlProcessor.js`)

Processes multiple URLs simultaneously instead of sequentially:

**Implementation:**

- `processUrlsConcurrently()` method processes URLs in batches
- Default concurrency: 3 URLs at a time (configurable via `urlConcurrency`)
- Uses `Promise.allSettled()` for batch processing
- Progress tracking and per-URL error handling
- Automatically enabled for non-recursive processing

**Impact:** 3-5x speedup for URL processing phase

#### Other Optimizations

- **JSON Minification**: Removes pretty-printing from results.json (30-50% I/O improvement)
- **Consolidated Metrics**: Single initialization loop instead of 24 separate operations (90% reduction in allocations)

### Network Error Handling

- Automatic retry mechanism with user confirmation
- Cloudflare challenge bypass using puppeteer-extra-plugin-stealth
- Graceful fallback from fetch to Puppeteer when blocked
- Network error classification (DNS, timeout, unreachable)
- Browser pool integration for retry operations

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

Evaluates website compatibility with AI agents based on patterns from "The Invisible Users" book.

**Reference Documentation:**

- GitHub repository: <https://github.com/tomcranstoun/invisible-users>
- Local repository: `/Users/tomcranstoun/Documents/GitHub/invisible-users`
- This local repository contains the authoritative guidance on LLM agent compatibility patterns

### CRITICAL DISTINCTION: Two HTML States

AI agents operate in two fundamentally different modes:

1. **SERVED HTML** (static) - What CLI agents and server-based agents see (no JavaScript execution)
2. **RENDERED HTML** (dynamic) - What browser-based agents see (after JavaScript execution)

Reports show BOTH states because different agents need different information.

**Metric Categories by Importance:**

**ESSENTIAL_SERVED (works for ALL agents):**

- Semantic HTML structure (`<main>`, `<nav>`, `<header>`, `<article>`)
- Form field naming (email, firstName, lastName vs custom names)
- Schema.org structured data (JSON-LD)
- llms.txt file presence (see <https://llmstxt.org/>)
- HTTP status codes (200, 404, etc.)
- Security headers (HSTS, CSP)

**ESSENTIAL_RENDERED (works for browser agents):**

- Explicit state attributes (data-state, data-validation-state)
- Agent visibility control (data-agent-visible attribute)
- Persistent error messages (role="alert", aria-live)
- Dynamic validation feedback

**NICE_TO_HAVE (speculative, not critical):**

- Table data attributes (data-price, data-currency)
- Button disabled explanations (data-disabled-reason)
- Auth state attributes (data-authenticated)

Scoring heavily weights ESSENTIAL patterns, lightly weights NICE_TO_HAVE patterns.

**New LLM Agent Features:**

1. **llms.txt Detection**
   - Detects llms.txt file references in HTML via `<link>` or `<a>` tags
   - Checks for llms.txt metadata tags (`<meta name="llms-txt">`)
   - Provides recommendations when missing
   - Worth 10 points in served score (ESSENTIAL_SERVED metric)
   - Learn more: <https://llmstxt.org/> and <https://github.com/cfahlgren1/llms-txt>

2. **data-agent-visible Attribute**
   - Tracks elements with explicit agent visibility control
   - Counts elements visible to agents (`data-agent-visible="true"` or empty)
   - Counts elements hidden from agents (`data-agent-visible="false"`)
   - Provides recommendations for usage (ESSENTIAL_RENDERED metric)
   - Helps developers explicitly control what AI agents can see

**Three Reports Generated:**

1. **General LLM Report** (`llm_general_suitability.csv`)
   - Shows both served score (all agents) and rendered score (browser agents)
   - Lists essential vs nice-to-have issues
   - Provides actionable recommendations
   - New columns: "Has llms.txt", "Has data-agent-visible"

2. **Frontend LLM Report** (`llm_frontend_suitability.csv`)
   - Separates served metrics (forms, semantic HTML) from rendered metrics (dynamic state)
   - Shows percentages for standard field naming and label usage
   - Identifies critical frontend issues
   - New columns: "Agent Visible Elements", "Visible to Agents", "Hidden from Agents"

3. **Backend LLM Report** (`llm_backend_suitability.csv`)
   - Focuses on served state only (HTTP codes, headers, structured data)
   - No dynamic/rendered metrics needed for backend
   - Essential for all agent types
   - New columns: "Has llms.txt", "llms.txt URL"

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

### Enhanced Reports (New Features)

- `executive_summary.md` - Executive summary with key insights (--generate-executive-summary)
- `executive_summary.json` - Machine-readable executive summary
- `dashboard.html` - Interactive HTML dashboard with charts (--generate-dashboard)

### Historical Data (--enable-history)

- `history/results-<timestamp>.json` - Timestamped historical results for comparison

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

## Claude Code Configuration

This project includes custom Claude Code configuration in the `.claude/` directory:

### Custom Skills

Two custom skills are available via the `/` command syntax:

1. **`/step-commit`** - Systematic commit workflow
   - Reviews all changes with git status and diff
   - Commits code changes
   - Runs linting and fixes errors
   - Reviews and updates documentation (README, CLAUDE.md, CHANGELOG.md)
   - Updates LEARNINGS.md (actionable guidance only)
   - Updates PROJECTSTATE.md (current state snapshot)
   - Updates CHANGELOG.md
   - Prompts to push changes
   - Does NOT add attribution or "Generated with" messages

2. **`/md-fix`** - Markdown linting and auto-fix
   - Runs `npm run lint:md:fix` to auto-fix issues
   - Verifies all issues are resolved
   - Reports remaining issues requiring manual fixes
   - Shows modified files

### Git Hooks

Three git hooks provide workflow reminders:

1. **`pre-commit.sh`** - Runs before commits
   - Checks staged markdown files for linting issues
   - Prompts to run `/md-fix` or `npm run lint:md:fix`
   - Allows bypassing with user confirmation

2. **`pre-push.sh`** - Runs before pushes
   - Warns about uncommitted changes
   - Checks if documentation is outdated vs code changes
   - Suggests using `/step-commit` workflow

3. **`post-tool-use.sh`** - Runs after git operations
   - Reminds about `/step-commit` workflow after manual commits
   - Ensures comprehensive commit practices

### Permissions

The `.claude/settings.local.json` file pre-approves common operations:

- Git operations (commit, add, push)
- Linting commands
- Project commands (npm start)
- Directory inspection (ls, tree, find)

### Claude Code Directory Structure

```text
.claude/
├── settings.local.json       # Local permissions configuration
├── commands/                  # Command definitions (user-facing)
│   ├── step-commit.md        # Step-commit workflow description
│   └── md-fix.md             # Markdown fix workflow description
├── skills/                    # Skill definitions (agent instructions)
│   ├── step-commit.json      # Step-commit agent configuration
│   └── md-fix.json           # Markdown fix agent configuration
├── hooks/                     # Git hooks for workflow enforcement
│   ├── pre-commit.sh         # Pre-commit markdown check
│   ├── pre-push.sh           # Pre-push documentation check
│   └── post-tool-use.sh      # Post-commit workflow reminder
└── prompt-master/            # Reserved for future use
```

## Documentation Structure

The `docs/` directory contains comprehensive documentation:

### User Documentation

- `usermanual.md` - Complete user guide
- `CONFIGURATION.md` - Configuration reference
- `FEATURES.md` - Feature overview
- `report-layout.md` - Report structure and data schema

### AI Assistant Extension Prompts

The `docs/for-ai/` subdirectory contains prompts for extending this project:

- `comment.md` - Guidelines for code comments
- `modification.md` - Templates for code modifications
- `system.md` - Development standards and conventions

These files guide development of new features or modifications.
