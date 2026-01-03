# Project State

**Last Updated:** 2026-01-03

Current snapshot of Web Audit Suite implementation status.

## Production Status

**Status:** ✅ Production-ready
**Version:** 1.0.0
**Node.js Requirement:** >= 20.0.0

## Core Functionality

### Phase 0: robots.txt Compliance ✅

**Status:** Complete and tested (NEW - Jan 3, 2026)

- robots.txt fetching before any URL processing
- HTTP fetch with Puppeteer fallback
- robots.txt parsing and quality scoring (100-point system)
- Interactive compliance checking with user prompts
- Force-scrape mode with runtime toggle
- Graceful quit handling
- Executive summary reporting

**Files:**

- [src/utils/robotsFetcher.js](src/utils/robotsFetcher.js) (104 lines)
- [src/utils/robotsCompliance.js](src/utils/robotsCompliance.js) (273 lines)
- [src/utils/robotsTxtParser.js](src/utils/robotsTxtParser.js) (296 lines)
- [src/utils/llmsTxtParser.js](src/utils/llmsTxtParser.js) (395 lines)
- [src/utils/reportUtils/aiFileReports.js](src/utils/reportUtils/aiFileReports.js) (273 lines)

### Phase 1: URL Collection ✅

**Status:** Complete and tested

- XML sitemap parsing
- HTML webpage link extraction
- Puppeteer fallback for Cloudflare-protected sites
- URL validation and normalization
- Language variant filtering (optional)

**Files:**

- [src/utils/sitemap.js](src/utils/sitemap.js)
- [src/utils/networkUtils.js](src/utils/networkUtils.js)

### Phase 2: Data Collection ✅

**Status:** Complete and tested

**Page Analysis:**

- Performance metrics collection
- SEO data extraction
- Content quality analysis
- Security header checking
- Image optimization analysis
- Link analysis

**Accessibility:**

- Pa11y WCAG 2.1 integration (Level A, AA, AAA)
- Issue categorization by severity
- Remediation suggestions

**LLM Suitability:**

- Served HTML analysis (all agents)
- Rendered HTML analysis (browser agents)
- llms.txt detection (NEW)
- data-agent-visible tracking (NEW)
- Semantic HTML structure checking
- Form field naming validation
- Schema.org structured data detection

**Files:**

- [src/utils/pageAnalyzer.js](src/utils/pageAnalyzer.js)
- [src/utils/pa11yRunner.js](src/utils/pa11yRunner.js)
- [src/utils/llmMetrics.js](src/utils/llmMetrics.js)
- [src/utils/metricsUpdater.js](src/utils/metricsUpdater.js)

### Phase 3: Report Generation ✅

**Status:** Complete and tested

**Reports Generated:**

1. results.json (single source of truth)
2. summary.json (site-wide metrics)
3. seo_report.csv
4. performance_analysis.csv
5. seo_scores.csv
6. accessibility_report.csv
7. wcag_report.md
8. image_optimization.csv
9. link_analysis.csv
10. content_quality.csv
11. security_report.csv
12. llm_general_suitability.csv
13. llm_frontend_suitability.csv
14. llm_backend_suitability.csv
15. robots_txt_quality.csv (NEW)
16. llms_txt_quality.csv (NEW)
17. ai_files_summary.md (NEW)
18. virtual_sitemap.xml
19. final_sitemap.xml

**Files:**

- [src/utils/reports.js](src/utils/reports.js) (orchestration)
- [src/utils/reportUtils/reportGenerators.js](src/utils/reportUtils/reportGenerators.js) (main generators)
- [src/utils/reportUtils/llmReports.js](src/utils/reportUtils/llmReports.js) (LLM reports)
- [src/utils/reportUtils/accessibilityAnalysis.js](src/utils/reportUtils/accessibilityAnalysis.js)
- [src/utils/reportUtils/contentAnalysis.js](src/utils/reportUtils/contentAnalysis.js)
- [src/utils/reportUtils/imageAnalysis.js](src/utils/reportUtils/imageAnalysis.js)
- [src/utils/reportUtils/linkAnalysis.js](src/utils/reportUtils/linkAnalysis.js)

## Recent Enhancements

### January 3, 2026

**robots.txt Compliance System:**

- **Phase 0 Fetching** (NEW)
  - robots.txt automatically fetched before any URL processing
  - HTTP fetch with Puppeteer fallback for Cloudflare-protected sites
  - Parsed and stored in global state for session-wide access
  - Permissive default: allows scraping if robots.txt doesn't exist or is invalid
  - Files: [src/utils/robotsFetcher.js](src/utils/robotsFetcher.js) (104 lines)

- **Interactive Compliance Checking** (NEW)
  - Real-time compliance checks before each URL is processed
  - Four user options: y (override single URL), a (enable force-scrape), n (skip URL), q (quit analysis)
  - Force-scrape mode can be toggled at runtime via interactive prompt
  - Graceful quit handling with USER_QUIT_ROBOTS_TXT error signal
  - Quit signal propagation through concurrent and recursive URL processing
  - Files: [src/utils/robotsCompliance.js](src/utils/robotsCompliance.js) (273 lines)

- **Pattern Matching Implementation**
  - Implements robots.txt exclusion standard with wildcards (*), end markers ($), and literal paths
  - User-agent matching (specific agent or wildcard *)
  - Longest-match-wins precedence (Allow takes precedence over Disallow at equal specificity)
  - Path normalization including query strings

- **CLI and Configuration**
  - `--force-scrape` CLI flag to bypass all robots.txt restrictions
  - `FORCE_SCRAPE` environment variable (default: false)
  - Prominent startup logging of compliance mode state
  - Runtime state changes logged with warning level
  - Files: [index.js](index.js:85-88,207-219), [.env.example](.env.example:30-33)

- **Executive Summary Integration**
  - `robotsComplianceEnabled` field in overview section
  - Visual indicators (✅ enabled, ⚠️ disabled)
  - Clear explanation text in markdown output
  - Files: [src/utils/reportUtils/executiveSummary.js](src/utils/reportUtils/executiveSummary.js:69-75,559-564)

- **Quality Scoring for AI Agent Compatibility**
  - robots.txt: 100-point scoring system across 6 criteria
    - Checks for AI agent declarations (ChatGPT-User, GPTBot, etc.)
    - Validates sitemap references and sensitive path protection
    - Identifies llms.txt references and helpful comments
    - Bonus points for exceptional configurations
    - Files: [src/utils/robotsTxtParser.js](src/utils/robotsTxtParser.js) (296 lines)
    - Report: robots_txt_quality.csv (17 columns)
  - llms.txt: 105-point scoring system with bonuses across 5 main criteria
    - Checks for core elements (title, overview, directory, examples)
    - Validates important sections (architecture, API, setup, troubleshooting, etc.)
    - Evaluates content length, link quality, and technical specificity
    - Bonus points for exceptional documentation
    - Files: [src/utils/llmsTxtParser.js](src/utils/llmsTxtParser.js) (395 lines)
    - Report: llms_txt_quality.csv (27 columns)
  - AI File Reports: Consolidated quality analysis
    - Files: [src/utils/reportUtils/aiFileReports.js](src/utils/reportUtils/aiFileReports.js) (273 lines)
    - Report: ai_files_summary.md (markdown summary)

- **Integration Points**
  - Modified [src/main.js](src/main.js:59-81): Added Phase 0 robots.txt fetching
  - Modified [src/utils/urlProcessor.js](src/utils/urlProcessor.js:61-101): Compliance checking before URL processing
  - Modified [src/utils/urlProcessor.js](src/utils/urlProcessor.js:331-360): Quit handling in concurrent processing
  - Modified [src/utils/urlProcessor.js](src/utils/urlProcessor.js:426-437): Quit handling in recursive processing

- **Documentation Updates**
  - Updated [CLAUDE.md](CLAUDE.md): Four-phase pipeline, compliance system architecture
  - Updated [docs/usermanual.md](docs/usermanual.md:145-288): User guide with 4 example scenarios
  - Updated [docs/report-layout.md](docs/report-layout.md:1262-1287): Executive summary field descriptions
  - Updated [README.md](README.md:21-30): Added to key features

### January 1, 2026

**Performance Optimizations:**

- **Browser Pooling** (NEW)
  - Implemented browser pool for reusing Puppeteer instances
  - Pool size: 3 browsers by default (configurable via `browserPoolSize`)
  - Eliminates 2-5 second browser startup overhead per URL
  - Automatic browser restart after 50 pages to prevent memory leaks
  - Queue management with FIFO waiting requests
  - Graceful shutdown and fallback mode
  - Files: [src/utils/browserPool.js](src/utils/browserPool.js) (new)

- **Concurrent URL Processing** (NEW)
  - Process 3 URLs simultaneously by default (configurable via `urlConcurrency`)
  - Batch processing with `Promise.allSettled()`
  - Progress tracking and per-URL error handling
  - Automatically enabled for non-recursive processing
  - Files: [src/utils/urlProcessor.js](src/utils/urlProcessor.js) - added `processUrlsConcurrently()`

- **Performance Metrics**
  - 75-85% faster execution time (100 URLs: ~45min → ~10min)
  - 97% reduction in browser launch overhead
  - 3-5x speedup for URL processing phase

- **Other Optimizations**
  - JSON minification: Removes pretty-printing for 30-50% I/O improvement
  - Consolidated metrics initialization: 90% reduction in object allocations
  - Fixed pre-existing import error in [src/utils/results.js](src/utils/results.js)

**Configuration Consolidation:**

- Merged `src/config/constants.js` into `src/config/defaults.js`
- Centralized all static configuration and constants
- Deleted `src/config/constants.js`
- Updated consumers to point to single source of truth

**Refinements and Bug Fixes:**

- **Base Domain Auto-Discovery** (NEW)
  - Automatically adds base domain URL (e.g., `https://example.com/`) to processing queue
  - Automatically adds llms.txt URL for AI agent compatibility checks
  - Priority URLs inserted at beginning of queue using `unshift()` instead of `push()`
  - Ensures homepage and llms.txt always analyzed even with strict count limits (e.g., `-c 10`)
  - Works with both sitemap URLs and raw page URLs
  - Files: [src/utils/sitemap.js](src/utils/sitemap.js:119-157)

- **llms.txt Detection Fixes**
  - Fixed executive summary to check correct nested property structure
  - Fixed counting logic to only count pages with explicit references, not all pages when global llms.txt exists
  - Files: [src/utils/reportUtils/executiveSummary.js](src/utils/reportUtils/executiveSummary.js)

- **Code Quality Improvements**
  - Reduced logging verbosity by removing configuration JSON dumps from debug logs
  - Removed temporary debug code for specific URL search feature (346 lines)
  - Suppressed empty "No resources found" message when no external resources exist
  - Updated markdown linting configuration to exclude results folder and CHANGELOG.md

### December 31, 2025

**Markdown Linting:**

- Added [.markdownlint.json](.markdownlint.json) configuration
- Added `npm run lint:md` and `npm run lint:md:fix` scripts
- Line length limit: 200 characters
- Fixed many markdown formatting issues

**LLM Agent Features:**

1. **llms.txt Detection**
   - Detects llms.txt references via `<link>`, `<a>`, and `<meta>` tags
   - Worth 10 points in served score (ESSENTIAL_SERVED)
   - Added to general and backend LLM reports
   - See <https://llmstxt.org/>

2. **data-agent-visible Attribute**
   - Tracks explicit agent visibility control
   - Counts visible/hidden elements
   - ESSENTIAL_RENDERED category (browser agents)
   - Added to general and frontend LLM reports

**Configuration Updates:**

- ESLint: Added `node/no-missing-import: 'off'`
- Claude Code: Added `npm install` to approved operations

## Known Issues

### Markdown Linting (Non-blocking)

Several markdown linting issues remain that require manual fixes:

- Line length violations in BLOG.md, PITCH.md, LICENSE.md
- Table formatting in [docs/report-layout.md](docs/report-layout.md)
- Some headings use emphasis instead of proper heading syntax
- Some code blocks missing language specification

These are stylistic issues that don't affect functionality.

### Pa11y Integration

- Pa11y occasionally times out on slow pages
- Retry logic handles most cases
- Some sites with aggressive bot protection may fail

## Configuration

### ESLint

- Version: 8.57.0
- Format: `.eslintrc.cjs` (CommonJS)
- Extends: eslint:recommended, plugin:node/recommended
- Important: Must use `npm run lint`, not global eslint

### Puppeteer

- Stealth plugin enabled for Cloudflare bypass
- Cache directory: `.cache` (auto-created)
- Headless mode: true
- Default viewport: 1920x1080
- **Browser pooling:** 3 instances by default (configurable)
- **Concurrent URL processing:** 3 simultaneous by default (configurable)

### Pa11y

- Standards: WCAG2A, WCAG2AA, WCAG2AAA
- Runner: htmlcs
- Timeout: 60000ms
- Includes: notices, warnings, errors

## Architecture

### Global State

```javascript
global.auditcore = {
  logger: winston.Logger,  // Winston logger instance
  options: Object          // Parsed CLI options
}
```

### Four-Phase Pipeline

0. **robots.txt Compliance** (`fetchRobotsTxt`)
   - Input: Base URL
   - Output: robotsTxtData (stored in global state)

1. **URL Collection** (`getUrlsFromSitemap`)
   - Input: Sitemap URL or webpage URL
   - Output: Array of URLs to analyze

2. **Data Collection** (`processSitemapUrls`)
   - Input: Array of URLs
   - Output: results.json

3. **Report Generation** (`generateReports`)
   - Input: results.json
   - Output: Multiple CSV and markdown reports

**Critical Principle:** Report generation NEVER fetches new data. All reports generated from results.json.

## Dependencies

### Key Dependencies

- puppeteer: ^23.11.1
- puppeteer-extra: ^3.3.6
- puppeteer-extra-plugin-stealth: ^2.11.2
- pa11y: ^8.0.0
- winston: ^3.17.0
- cheerio: ^1.0.0
- commander: ^13.0.0
- dayjs: ^1.11.13

### Dev Dependencies

- eslint: ^8.57.0
- eslint-plugin-node: ^11.1.0
- markdownlint-cli: ^0.43.0

## Testing Status

### Manual Testing

- ✅ Small sites (10-50 pages)
- ✅ Medium sites (100-500 pages)
- ✅ Large sites (1000+ pages)
- ✅ Cloudflare-protected sites
- ✅ Sites with complex JavaScript
- ✅ Sites with XML sitemaps
- ✅ Sites without sitemaps (HTML parsing)

### Edge Cases

- ✅ Resume from existing results.json
- ✅ Cache-only mode
- ✅ No-cache mode
- ✅ Force delete cache
- ✅ Language variant filtering
- ✅ Network retry logic
- ✅ Graceful shutdown

## Future Enhancements

### Planned

None currently planned. Tool is feature-complete for current use cases.

### Considered

1. **SaaS Platform**
   - Web dashboard
   - Scheduled recurring audits
   - Historical comparison
   - Team collaboration
   - API access

2. **Additional Reports**
   - Mobile responsiveness analysis
   - Lighthouse integration
   - Carbon footprint estimation

3. **Performance** (Partially Complete)
   - ✅ Browser pooling (completed)
   - ✅ Concurrent URL processing (completed)
   - ⏸️ Streaming for large files (future)
   - ⏸️ Distributed processing (future)
   - ⏸️ Database storage option (future)

## File Structure

```text
web-audit-suite/
├── index.js                 # Entry point
├── src/
│   ├── main.js             # Pipeline orchestration
│   ├── config/
│   │   ├── defaults.js     # Consolidated constants and defaults
│   │   ├── env.js          # Environment configuration
│   │   └── validation.js   # Configuration validation
│   └── utils/
│       ├── sitemap.js      # URL collection
│       ├── pageAnalyzer.js # Page analysis
│       ├── pa11yRunner.js  # Accessibility testing
│       ├── llmMetrics.js   # LLM suitability
│       ├── reports.js      # Report coordination
│       ├── networkUtils.js # Network operations & browser pool
│       ├── browserPool.js  # Browser pooling for performance
│       ├── urlProcessor.js # URL processing with concurrency
│       ├── metricsUpdater.js    # Metrics helpers
│       ├── shutdownHandler.js   # Graceful shutdown
│       ├── robotsFetcher.js     # robots.txt fetching (NEW)
│       ├── robotsCompliance.js  # Compliance checking (NEW)
│       ├── robotsTxtParser.js   # robots.txt quality scoring (NEW)
│       ├── llmsTxtParser.js     # llms.txt quality scoring (NEW)
│       └── reportUtils/
│           ├── reportGenerators.js
│           ├── llmReports.js
│           ├── aiFileReports.js  # AI file quality reports (NEW)
│           ├── accessibilityAnalysis.js
│           ├── contentAnalysis.js
│           ├── imageAnalysis.js
│           └── linkAnalysis.js
├── .claude/                # Claude Code configuration
│   ├── settings.local.json
│   ├── commands/
│   ├── skills/
│   └── hooks/
├── docs/                   # Documentation
│   ├── CONFIGURATION.md    # Configuration guide
│   ├── FEATURES.md         # Feature overview
│   ├── report-layout.md    # Report structure documentation
│   ├── usermanual.md       # User manual
│   └── for-ai/             # AI assistant extension prompts
│       ├── comment.md          # Commenting guidelines
│       ├── modification.md     # Code modification templates
│       └── system.md           # Development standards
├── examples/               # Example configurations
│   ├── README.md               # Threshold configuration guide
│   ├── strict-thresholds.json  # High-quality production standards
│   ├── relaxed-thresholds.json # Development/staging standards
│   └── ci-thresholds.json      # CI/CD quality gate standards
├── results/                # Generated output (gitignored)
├── .cache/                 # Puppeteer cache (gitignored)
├── LEARNINGS.md           # AI assistant guidance
├── PROJECTSTATE.md        # This file
├── CHANGELOG.md           # Change history
├── CLAUDE.md              # Project instructions for Claude
├── README.md              # Project overview
├── QUICKSTART.md          # 5-minute getting started guide
├── BLOG.md                # Marketing content
├── PITCH.md               # Business pitch
├── TODO.md                # Task tracking
├── .env.example           # Environment variable template
└── custom-thresholds.example.json # Custom thresholds template
```

## Deployment

### Current State

- ✅ Runs locally on macOS, Linux, Windows
- ✅ Can be packaged as npm package
- ✅ Documentation complete
- ✅ Ready for licensing

### Requirements

- Node.js >= 20.0.0
- npm >= 10.0.0
- Sufficient disk space for Puppeteer cache
- Internet connection for site analysis

## Support

### Documentation

- [README.md](README.md) - Quick start and overview
- [QUICKSTART.md](QUICKSTART.md) - 5-minute getting started guide
- [CLAUDE.md](CLAUDE.md) - Comprehensive technical guide
- [docs/usermanual.md](docs/usermanual.md) - User manual
- [docs/CONFIGURATION.md](docs/CONFIGURATION.md) - Configuration reference
- [docs/FEATURES.md](docs/FEATURES.md) - Feature overview
- [docs/report-layout.md](docs/report-layout.md) - Report specifications
- [docs/for-ai/system.md](docs/for-ai/system.md) - Architecture details
- [examples/README.md](examples/README.md) - Threshold configuration examples

### Logs

- combined.log - All activity
- error.log - Errors only
- Console output with configurable log levels

## Maintainer Notes

### Before Releasing New Version

1. Update version in package.json
2. Run full test suite (`npm start -- -c 100`)
3. Review all reports for accuracy
4. Update CHANGELOG.md
5. Update this PROJECTSTATE.md
6. Tag release in git

### Common Maintenance Tasks

1. **Update Dependencies**
   - Check for security updates monthly
   - Test thoroughly after major version updates
   - Puppeteer updates may require stealth plugin updates

2. **Review LLM Scoring**
   - Check against latest patterns in invisible-users repo
   - Update scoring weights if needed
   - Add new ESSENTIAL patterns as web standards evolve

3. **Documentation Sync**
   - Keep BLOG.md, PITCH.md, CLAUDE.md synchronized
   - Update user manual for new features
   - Maintain LEARNINGS.md for AI assistant guidance

## Contact

**Project Owner:** Tom Cranstoun
**Email:** <tom@allabout.network>
**Repository:** (Internal - contact for access)
