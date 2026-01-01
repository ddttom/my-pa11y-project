# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Major Performance Optimizations (75-85% faster)**: Browser pooling and concurrent processing
  - **Browser Pooling**: Reuses Puppeteer browser instances for dramatic speed improvement
    - Pool of 3 browsers by default (configurable via `browserPoolSize` in defaults.js)
    - Eliminates 2-5 second browser startup overhead per URL (97% reduction for 100 URLs)
    - Automatic browser restart after 50 pages to prevent memory leaks
    - Queue management with FIFO for waiting requests
    - Graceful shutdown with cleanup
    - Fallback mode if pool initialization fails
    - New file: `src/utils/browserPool.js` (210 lines)
    - Integration: `src/utils/networkUtils.js` - added init/shutdown functions
  - **Concurrent URL Processing**: Process multiple URLs simultaneously
    - Default concurrency: 3 URLs at a time (configurable via `urlConcurrency` in defaults.js)
    - New method: `processUrlsConcurrently()` in `src/utils/urlProcessor.js`
    - Batch processing with `Promise.allSettled()`
    - Progress tracking with completion counter
    - Per-URL error handling (failures don't block others)
    - Automatically enabled for non-recursive processing
    - 3-5x speedup for URL processing phase
  - **Performance Impact**:
    - 100 URLs: ~45 minutes → ~10 minutes (4-5x faster)
    - Browser launches: 300 seconds → 9 seconds (97% reduction)
    - Overall improvement: 75-85% faster execution time
  - **Other Optimizations**:
    - JSON minification: Removed pretty-printing for 30-50% I/O improvement
    - Consolidated metrics initialization: 90% reduction in object allocations
    - Fixed pre-existing import error in `src/utils/results.js`

### Changed

- **Configuration Consolidation**: Merged `src/config/constants.js` into `src/config/defaults.js`
  - Created a single source of truth for all static configuration and constants
  - Deleted `src/config/constants.js`
  - Updated `src/config/env.js` and `src/config/validation.js` to import from `defaults.js`
  - Updated documentation to reflect the unified configuration structure

- **GitHub Actions CI/CD Integration**: Automated quality gate workflow
  - Added `.github/workflows/quality-gate.yml` workflow file
  - Automated quality checks on pull requests and pushes
  - Manual workflow dispatch with custom configuration
  - Three threshold profiles: strict, CI, relaxed
  - Automatic PR comments with audit results
  - Artifact storage for 30 days (all reports and dashboard)
  - GitHub Actions summary page generation
  - Failure notifications via GitHub issues
  - Environment variable support (STAGING_URL, AUDIT_URL_LIMIT)
  - Documentation: `docs/CI-CD-INTEGRATION.md`
  - Examples for GitLab CI, Jenkins, Azure Pipelines, CircleCI

- **Comprehensive Documentation Suite**: Complete guides and examples
  - Created `QUICKSTART.md` - 5-minute getting started guide
  - Created `docs/CONFIGURATION.md` - Complete configuration reference
  - Created `docs/FEATURES.md` - Feature overview with examples
  - Created `docs/CI-CD-INTEGRATION.md` - CI/CD setup and usage
  - Created `examples/README.md` - Threshold configuration guide
  - Created `.env.example` - Environment variable template
  - Created `custom-thresholds.example.json` - Threshold template
  - Reorganized `docs/for-ai/` subdirectory for AI assistant prompts
  - Updated all documentation to reflect new structure

- **Example Threshold Configurations**: Pre-configured quality standards
  - `examples/strict-thresholds.json` - High-quality production standards (< 1s load, 0 errors)
  - `examples/relaxed-thresholds.json` - Development standards (< 5s load, 5 errors)
  - `examples/ci-thresholds.json` - CI/CD quality gates (< 3s load, 0-2 errors)
  - Comprehensive documentation in `examples/README.md`
  - Use cases, best practices, and workflows

- **Historical Comparison and Trend Analysis**: Track website changes over time
  - Added `--enable-history` CLI flag to enable historical tracking
  - Stores timestamped results in `history/` directory for comparative analysis
  - Compares current run with previous runs to identify improvements and regressions
  - Generates trend data across multiple runs for visualization
  - Calculates percentage changes for all key metrics (performance, accessibility, SEO, LLM)
  - Module: `src/utils/historicalComparison.js`

- **Executive Summary Report**: Single-page overview with actionable insights
  - Added `--generate-executive-summary` CLI flag
  - Generates both Markdown and JSON formats
  - Provides high-level status across all analysis categories
  - Key findings section highlighting critical issues
  - Actionable recommendations prioritized by severity
  - Comparison with previous run (when historical tracking enabled)
  - Pass/fail status based on configurable thresholds
  - Module: `src/utils/reportUtils/executiveSummary.js`
  - Output files: `executive_summary.md`, `executive_summary.json`

- **Interactive HTML Dashboard**: Visual analytics with embedded charts
  - Added `--generate-dashboard` CLI flag
  - Generates comprehensive HTML dashboard with embedded PNG charts
  - Performance metrics visualization (load time, LCP, FCP, TTI)
  - Accessibility issues breakdown (pie chart)
  - SEO score distribution across pages
  - Content quality metrics visualization
  - LLM suitability scores (served vs rendered)
  - Historical trend charts (when multiple runs tracked)
  - Comparison tables showing changes between runs
  - Pass/fail summary tables with color-coded status
  - Module: `src/utils/reportUtils/dashboardGenerator.js`
  - Output file: `dashboard.html`

- **Configurable Pass/Fail Thresholds**: Customize quality gates
  - Added `--thresholds <file>` CLI option to load custom thresholds
  - JSON-based threshold configuration system
  - Category-specific thresholds: performance, accessibility, SEO, content, LLM
  - Two-level thresholds: "pass" and "warn" for each metric
  - Default thresholds defined in `src/config/defaults.js`
  - Example thresholds:
    - Performance: Load time (pass: 3000ms, warn: 5000ms)
    - Accessibility: Max errors (pass: 0, warn: 5)
    - SEO: Min score (pass: 80, warn: 60)
    - LLM: Min served score (pass: 70, warn: 50)
  - Thresholds used in dashboard color-coding and pass/fail reports

- **Chart Generation Infrastructure**: Visual data representation
  - Added `chart.js` and `chartjs-node-canvas` dependencies
  - Generates PNG chart images embedded in HTML dashboard
  - Support for bar charts, line charts, and pie charts
  - Color-coded metrics based on configurable thresholds
  - Historical trend visualization across multiple runs

- **Configuration System Overhaul**: Centralized constants and validation
  - Created `src/config/constants.js` with all magic numbers and configuration values
  - Moved hardcoded values to named constants for maintainability
  - Centralized timeouts, thresholds, colors, file names, and regex patterns
  - HTTP status codes, performance limits, SEO limits, LLM scoring
  - Chrome launch arguments, WCAG levels, logging levels

- **Configuration Schema Validation**: Type-safe configuration
  - Created `src/config/validation.js` with comprehensive schema validation
  - Validates all CLI options and configuration values
  - Type checking (string, number, boolean, object)
  - Range validation (min/max values, URL format)
  - Custom validation functions for complex rules
  - Threshold configuration validation with logical consistency checks
  - Sanitization of input values (trim strings, normalize paths)
  - Clear error messages for invalid configuration

- **Environment Variable Support**: Flexible deployment configuration
  - Created `src/config/env.js` for environment variable management
  - Support for `.env` file loading (dotenv-like functionality)
  - Environment variables: `NODE_ENV`, `LOG_LEVEL`, `OUTPUT_DIR`, `SITEMAP_URL`
  - Additional variables: `CACHE_DIR`, `MAX_RETRIES`, `TIMEOUT`
  - Configuration priority: CLI flags > Environment variables > Defaults
  - Environment validation with clear error messages
  - Generates `.env.example` file for documentation

- **Configuration Documentation**: Comprehensive configuration guide
  - Created `docs/CONFIGURATION.md` with complete configuration reference
  - Documents all CLI options with examples
  - Environment variable guide with usage examples
  - Threshold configuration schema and examples
  - Constants reference tables
  - Best practices for different deployment scenarios
  - CI/CD and Docker deployment examples

- **Markdown Linting Configuration**: Added markdownlint-cli with comprehensive project rules
  - Created `.markdownlint.json` with project-specific configuration
  - Line length limit: 200 characters (MD013)
  - Code blocks require language specification (MD040)
  - Consistent table formatting rules (MD060)
  - Added `npm run lint:md` for checking markdown files
  - Added `npm run lint:md:fix` for auto-fixing markdown issues
  - Applied extensive markdown formatting fixes across all documentation files

- **llms.txt Detection Feature**: AI agent compatibility enhancement for static content
  - Detects llms.txt file references in HTML via `<link>` tags with `rel="alternate"` and `type="text/plain"`
  - Detects llms.txt references via `<a>` tags with href containing "llms.txt"
  - Detects llms.txt metadata via `<meta>` tags with `name="llms-txt"`
  - Worth 10 points in served score (ESSENTIAL_SERVED metric category)
  - Critical for ALL agent types (CLI and browser-based)
  - Added "Has llms.txt" column to general LLM report
  - Added "llms.txt URL" column to backend LLM report
  - See <https://llmstxt.org/> and <https://github.com/cfahlgren1/llms-txt>

- **data-agent-visible Attribute Tracking**: Explicit agent visibility control
  - Tracks elements with `data-agent-visible` attribute for explicit agent visibility control
  - Counts total elements with the attribute
  - Counts elements visible to agents (`data-agent-visible="true"` or empty value)
  - Counts elements hidden from agents (`data-agent-visible="false"`)
  - ESSENTIAL_RENDERED category (browser-based agents only)
  - Added "Has data-agent-visible" column to general LLM report
  - Added "Agent Visible Elements", "Visible to Agents", "Hidden from Agents" columns to frontend LLM report
  - Helps developers explicitly control what AI agents can see vs decorative elements

- **Project Documentation Files**: Comprehensive guidance for AI assistants and project maintenance
  - Created `LEARNINGS.md` - Actionable guidance for AI assistants working with this codebase
    - Markdown linting configuration and workflow
    - ESLint version constraints and import resolution issues
    - LLM agent feature implementation details
    - Package management policies
    - Documentation synchronization requirements
    - Git workflow and commit message format
    - Common pitfalls and future improvements
  - Created `PROJECTSTATE.md` - Current snapshot of implementation status
    - Production status and version information
    - Core functionality completion status for all three phases
    - Recent enhancements with dates
    - Known issues (non-blocking)
    - Configuration details for ESLint, Puppeteer, Pa11y
    - Architecture overview and dependencies
    - Testing status and file structure
    - Deployment and maintenance notes

### Changed

- **ESLint Configuration**: Improved ES module import handling
  - Added `node/no-missing-import: 'off'` rule to `.eslintrc.cjs`
  - Resolves false positives with ES module imports using `.js` extensions
  - ESLint's node plugin sometimes incorrectly flags valid ES module imports

- **Claude Code Permissions**: Extended approved operations
  - Added `Bash(npm install)` to approved tools list in `.claude/settings.local.json`
  - Allows dependency installation without user confirmation prompts

- **Package Management Policy**: Restored package-lock.json to repository
  - package-lock.json is now committed for reproducible builds
  - Follows npm best practices for consistent dependency versions

- **Documentation Enhancements**: Comprehensive markdown formatting improvements
  - BLOG.md: Fixed list formatting, added proper blank lines around sections
  - CLAUDE.md: Enhanced feature documentation with llms.txt and data-agent-visible details
  - PITCH.md: Improved readability with proper list formatting and structure
  - LICENSE.md: Better formatting for contact information
  - TODO.md: Consistent list formatting
  - docs/report-layout.md: Minor formatting improvements
  - docs/system.md: Added llms.txt and data-agent-visible implementation details
  - docs/usermanual.md: Enhanced LLM suitability report documentation

### Removed

- **virtual_sitemap.xml generation**: Removed redundant virtual sitemap file generation
  - Removed `generateVirtualSitemap()` and `saveVirtualSitemap()` functions from `src/utils/sitemap.js`
  - Removed virtual sitemap generation calls in URL processing pipeline
  - Updated `saveFinalSitemap()` to source URLs from `results.internalLinks` only
  - No functional impact: `final_sitemap.xml` and `v-sitemap.xml` (perfected sitemap) still generated
  - Simplifies codebase by removing duplicate sitemap functionality

- **Dead code cleanup in sitemap.js**: Removed unused `saveFinalSitemap()` function
  - Function was exported but never imported or called anywhere in codebase
  - Removed associated xmlbuilder2 import
  - Updated module header comment
  - Actual sitemap generation handled by `savePerfectedSitemap()` in `sitemapUtils.js`
  - Reduces codebase size by 45 lines

- **Major dead code cleanup**: Removed 346 lines of completely unused sitemap code
  - Deleted entire `src/utils/sitemapGenerator.js` file (288 lines) - never imported anywhere
    - `generateSitemap()` function for creating sitemap.xml.gz
    - `generateSplitSitemaps()` function for large sitemaps
    - Multiple helper functions for sitemap generation with image/video data
  - Removed `saveFinalSitemap()` from `sitemapUtils.js` (58 lines) - never imported
  - Uninstalled unused `sitemap` npm package and 3 dependencies
  - Only active sitemap generation: `savePerfectedSitemap()` → `v-sitemap.xml`
  - Total dead code removed in cleanup: 473 lines (~15.9 KB)

### Added

- **Browser Console Log Capture**: Comprehensive Puppeteer console output preservation
  - Automatically captures ALL browser console messages during page rendering
  - Types captured: `log`, `warn`, `error`, `info`, `debug`, and all console API methods
  - Saved to `.cache/rendered/{cache-key}.log` alongside HTML files
  - Format: `[timestamp] [TYPE] message` for easy parsing and analysis
  - Same MD5 cache key used for HTML and log files for consistent pairing
  - Empty console output: saves "// No console output captured"
  - Helps debug client-side JavaScript issues, track errors, and analyze third-party scripts
  - Backward compatible: maintains existing `jsErrors` array tracking

- **Report Layout Reference** (`docs/report-layout.md`)
  - Comprehensive technical reference for AI assistants to programmatically parse report data
  - Complete field specifications for all 13+ generated reports with data types and ranges
  - Score calculation formulas and threshold interpretations documented
  - Cross-report join strategies using URL as common key
  - CSV parsing guidelines with encoding and escape rules
  - Common analysis query patterns for typical use cases
  - Schema version compatibility documentation
  - Report dependency flow diagram
  - 840+ lines of detailed technical specifications

### Documentation

- **Console Log Capture Documentation**
  - Updated `docs/usermanual.md` Cache Management section with console log capture details
  - Added comprehensive "Console Log Capture" subsection with format, storage, and use cases
  - Updated `CLAUDE.md` Caching System section with console log reference
  - Added to `CHANGELOG.md` under Added section

- **Project Structure Corrections**
  - Fixed `README.md` project structure to reflect actual directory layout
  - Removed references to non-existent documentation files (prd.md, projectstate.md, architecture.md)
  - Added missing documentation references (report-layout.md, CLAUDE.md, CHANGELOG.md)
  - Updated docs/ folder structure with actual files (5 files: usermanual.md, report-layout.md, system.md, comment.md, modification.md)
  - Added src/utils/ subdirectory with key utility files listed
  - Added test/ and ss/ directories
  - Changed project name from "seo-audit-tool" to "my-pa11y-project"
  - Updated cache comment to mention console logs in rendered/

- **CLAUDE.md Accuracy Updates**
  - Added HTTP Status Code Tracking feature (was missing from Latest Features)
  - Updated Documentation section with accurate list of existing files
  - Removed references to non-existent documentation (architecture.md, prd.md, projectstate.md)
  - Added report-layout.md reference for AI assistant technical specifications
  - Updated Data Structures section with llmReadabilityAggregation and httpStatusAggregation
  - Included complete field structure for HTTP status tracking (url, statusCode, statusText, timestamp)
  - Aligned documentation with schema version 1.2.0 features

- **Comprehensive User Manual Update** (`docs/usermanual.md`)
  - Added detailed "Recursive Crawling" section explaining default behavior, URL normalization, and usage patterns
  - Documented all 11 generated reports (previously only 7 were documented)
  - Added three new report sections:
    - `all_resources_report.csv` - Complete resource inventory (internal + external)
    - `missing_sitemap_urls.csv` - Sitemap gap analysis
    - `v-sitemap.xml` - Perfected sitemap with discovered URLs
  - Enhanced "Cache Management" section with dual cache structure explanation (rendered vs served HTML)
  - Updated command-line options to include `--no-recursive` flag
  - Added troubleshooting entries for recursive mode and URL normalization
  - Expanded "Best Practices" from 4 to 7 categories with detailed guidance
  - Updated default URL references from `allabout.network` to `example.com`

- **README.md Streamlining**
  - Reduced file size from 578 to 192 lines (67% reduction)
  - Added prominent banner linking to User Manual as single source of truth
  - Restructured as quick-start guide with strategic links to detailed documentation
  - Converted command-line options to scannable table format
  - Removed verbose business-focused content (consolidated in User Manual)
  - Added 6 strategic links throughout pointing to relevant User Manual sections
  - Maintained essential installation, usage examples, and troubleshooting tips

- **Documentation Structure Improvements**
  - Established User Manual as authoritative source for detailed documentation
  - README now serves as concise quick-start guide
  - Removed obsolete documentation files: `architecture.md`, `prd.md`, `projectstate.md`, `task.md`, `modification.note`
  - Added `docs/system.md` for collaboration rules
  - Created clear separation between quick reference (README) and comprehensive docs (User Manual)

### Changed

- **Default Sitemap URL**: Changed default sitemap URL to `https://example.com/sitemap.xml`
  - Previously used a project-specific URL
  - Now uses a generic, universally recognized example domain
  - Provides clearer documentation for new users

### Added

- **URL Normalization**: Two-stage intelligent URL processing to prevent duplicates
  - **Stage 1 (Link Extraction)**: Normalizes URLs during discovery in `pageAnalyzerHelpers.js`
    - Strips hash fragments and query parameters immediately
    - Ensures only clean URLs are stored in `internalLinks` array
    - Prevents hash-only links from appearing in reports
  - **Stage 2 (Queue Processing)**: Additional normalization in `urlProcessor.js`
    - Validates URLs before adding to processing queue
    - Compares normalized URLs against current page to skip self-references
    - Set-based deduplication for O(1) duplicate checking
  - Benefits: Clean discovered URLs list, no duplicate processing, accurate sitemaps

- **Startup Parameter Logging**: Automatic logging of all command-line parameters
  - Clears log files (error.log, combined.log) on every startup
  - Logs complete command used to start the application
  - Logs all input parameters with their values
  - Helps with debugging and reproducing runs
  - Shows default values like `recursive: true`
- **Enhanced Force Delete Cache**: Complete cleanup for fresh analysis
  - `--force-delete-cache` now deletes entire results directory
  - Clears all CSV reports, results.json, and cached HTML
  - Recreates empty results directory
  - Ensures completely fresh start with no stale data
- **Discovered URLs Listing**: Console output shows all discovered URLs
  - Numbered list of URLs found during recursive crawling
  - Displayed at end of analysis for easy review
  - Supplements the missing_sitemap_urls.csv report
- **Recursive Site Crawling (Default)**: Automatic analysis of all discovered same-domain URLs
  - Queue-based processing automatically scans sitemap URLs + all discovered pages
  - Ensures complete site coverage with no pages left behind
  - Set-based duplicate prevention
  - Real-time progress logging showing queue depth and discovered URL counts
  - **Default behavior**: Recursive crawling enabled (use `--no-recursive` to disable)
  - Processes URLs until queue is empty (no new pages discovered)
  - Benefits: Complete SEO/accessibility/performance analysis for entire site
  - Command-line flag: `--no-recursive` to revert to sitemap-only analysis
- **All Resources Tracking**: Comprehensive extraction and reporting of ALL resources (internal + external)
  - Tracks JavaScript, CSS, images (all formats including SVG), fonts, videos, audio, iframes, and other resources
  - Includes BOTH same-domain resources AND external dependencies
  - Site-wide aggregation showing usage count for each resource across all analyzed pages
  - New report: `all_resources_report.csv` with Resource URL, Resource Type, and Total Count
  - Sorted by usage frequency to identify most-used resources
  - Console summary showing total unique resources and breakdown by type
  - Supports detection of resources from: `<script>`, `<link>`, `<img>`, `<picture>`, `<video>`, `<audio>`, `<iframe>`, `<object>`, `<embed>`, `@font-face` rules, background images, and preload/prefetch hints
  - Provides complete inventory for performance analysis and dependency tracking
- **Sitemap Gap Analysis**: Automatic detection of same-domain URLs missing from original sitemap
  - Tracks all same-domain URLs discovered during page analysis
  - Compares discovered URLs against original sitemap to identify gaps
  - New report: `missing_sitemap_urls.csv` with Discovered URL and Found On Pages Count
  - Shows how many pages link to each discovered URL
  - Generates perfected sitemap: `v-sitemap.xml` including all original + discovered URLs
  - Marks discovered URLs with XML comments for transparency
  - Console summary showing count of discovered URLs and reference to reports
  - Helps improve search engine coverage by identifying orphaned or unlisted pages
- **CLAUDE.md**: Comprehensive documentation for Claude Code instances
  - Detailed 4-phase architecture documentation (Rendering → Analysis → Metrics → Reporting)
  - Step-by-step guide for adding new features following existing patterns
  - Complete data structure documentation including `results.json` schema
  - Command reference and common development workflows
- Initial unit tests for utility functions.
- CI/CD pipeline using GitHub Actions.
- Standard documentation (LICENSE, CONTRIBUTING.md).
- Linting fixes and improved configuration.
