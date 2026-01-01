# Project State

**Last Updated:** 2025-12-31

Current snapshot of Web Audit Suite implementation status.

## Production Status

**Status:** ✅ Production-ready
**Version:** 1.0.0
**Node.js Requirement:** >= 20.0.0

## Core Functionality

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
15. virtual_sitemap.xml
16. final_sitemap.xml

**Files:**

- [src/utils/reports.js](src/utils/reports.js) (orchestration)
- [src/utils/reportUtils/reportGenerators.js](src/utils/reportUtils/reportGenerators.js) (main generators)
- [src/utils/reportUtils/llmReports.js](src/utils/reportUtils/llmReports.js) (LLM reports)
- [src/utils/reportUtils/accessibilityAnalysis.js](src/utils/reportUtils/accessibilityAnalysis.js)
- [src/utils/reportUtils/contentAnalysis.js](src/utils/reportUtils/contentAnalysis.js)
- [src/utils/reportUtils/imageAnalysis.js](src/utils/reportUtils/imageAnalysis.js)
- [src/utils/reportUtils/linkAnalysis.js](src/utils/reportUtils/linkAnalysis.js)

## Recent Enhancements

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
- Removed package-lock.json (project policy)

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

### Three-Phase Pipeline

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

3. **Performance**
   - Parallel page analysis
   - Distributed processing
   - Database storage option

## File Structure

```text
web-audit-suite/
├── index.js                 # Entry point
├── src/
│   ├── main.js             # Pipeline orchestration
│   ├── config/
│   │   └── options.js      # CLI option handling
│   └── utils/
│       ├── sitemap.js      # URL collection
│       ├── pageAnalyzer.js # Page analysis
│       ├── pa11yRunner.js  # Accessibility testing
│       ├── llmMetrics.js   # LLM suitability
│       ├── reports.js      # Report coordination
│       ├── networkUtils.js # Network operations
│       ├── metricsUpdater.js    # Metrics helpers
│       ├── shutdownHandler.js   # Graceful shutdown
│       └── reportUtils/
│           ├── reportGenerators.js
│           ├── llmReports.js
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
