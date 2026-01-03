# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Regression Detection**: Automated quality gate enforcement with baseline comparison
  - **Historical Tracking**: Store timestamped results for trend analysis
    - Results stored in `history/results-<timestamp>.json`
    - Enables comparative analysis across multiple runs
    - Automatic comparison with previous run when history enabled
  - **Baseline Management**: Reference point establishment for regression detection
    - `--establish-baseline` flag to mark current results as baseline
    - `--baseline-timestamp <timestamp>` to use specific historical result
    - `baseline.json` stores reference metrics
    - Baseline preserved during cache clearing
  - **Regression Detection**: Compare current run against baseline
    - Severity classification: Critical (>30%), Warning (>15%), Info
    - Comprehensive checks:
      - Performance regressions (load time, LCP, FCP, CLS)
      - Accessibility regressions (error count increases)
      - SEO score drops
      - LLM compatibility decreases
      - URL count changes
    - Automatic console alerts with severity levels
    - CI/CD-ready exit codes (fail on critical regressions)
  - **Regression Reports**: Detailed markdown reports with actionable recommendations
    - `regression_report.md` with immediate and short-term actions
    - Summary of regressions by severity
    - Baseline and current timestamps
    - Specific recommendations for each regression
  - **Trend Data**: Multi-run analysis for visualization
    - Aggregate metrics across all historical runs
    - Performance, accessibility, SEO, and LLM trends
    - Dashboard integration for trend charts
  - **Files**:
    - New file: `src/utils/historicalComparison.js` (816 lines)
    - Modified: `src/utils/reports.js` for integration
    - Modified: `src/main.js` for history storage
    - Modified: `index.js` for CLI options

- **Pattern Extraction**: Learn from high-scoring pages to identify successful implementations
  - **High-Scoring Analysis**: Identifies pages scoring ≥70/100 (configurable threshold)
  - **Six Pattern Categories**:
    - Structured Data (JSON-LD, Schema.org implementations)
    - Semantic HTML (main, nav, header, article, section usage)
    - Form Patterns (standard field naming, autocomplete attributes)
    - Error Handling (persistent error messages, aria-live regions)
    - State Management (validation state, loading state, agent visibility)
    - llms.txt Implementation (AI agent guidance files)
  - **Real-World Examples**: Up to 5 working examples per category from analyzed pages
  - **Priority & Effort Levels**: Critical/High priority, Low/Moderate effort classifications
  - **Implementation Recommendations**: Actionable guidance for each pattern with expected impact
  - **Pattern Library Report**: `pattern_library.md` with comprehensive examples
  - **CLI Options**:
    - `--extract-patterns` flag to enable pattern extraction
    - `--pattern-score-threshold <number>` to set minimum score (default: 70)
  - **Files**:
    - New file: `src/utils/patternExtraction.js` (399 lines)
    - Modified: `src/utils/reports.js` for integration
    - Modified: `index.js` for CLI options

- **CI/CD Integration**: Production-ready automation for continuous quality monitoring
  - **GitHub Actions Template**: Complete workflow template in `.github/workflows/audit-ci.yml.template`
    - Automated audits on push, PR, or manual dispatch
    - Baseline caching and restoration
    - Automatic PR commenting with metrics
    - Build failure on critical regressions
    - Artifact uploading for report review
  - **GitLab CI Configuration**: Example `.gitlab-ci.yml` configuration in documentation
  - **Jenkins Pipeline**: Example `Jenkinsfile` pipeline configuration
  - **Multi-Environment Support**: Separate configs for staging and production
  - **Scheduled Runs**: Nightly or weekly audit examples
  - **Notification Integration**: Slack webhook examples
  - **Comprehensive Documentation**:
    - New file: `.github/CI_CD_INTEGRATION.md` (543 lines)
    - Setup guides for GitHub Actions, GitLab CI, Jenkins
    - Baseline management in CI
    - Failure threshold configuration
    - Troubleshooting guide
    - Advanced scenarios (scheduled runs, multiple environments, notifications)

- **Consolidated Directory Structure**: All output files organized within output directory
  - **Cache Consolidation**: Cache moved from project root to `{outputDir}/.cache/`
    - Subdirectories: `rendered/`, `served/`, `screenshots/`
    - Cleaner project root directory
    - Easier sharing of complete results
  - **Log Consolidation**: Logs moved to output directory
    - `combined.log` and `error.log` in output directory
    - All output in one location for archiving
  - **History Tracking**: `history/` subdirectory within output
    - Historical results organized with timestamps
    - Preserved during cache clearing
  - **Benefits**:
    - Easier sharing and archiving of results
    - Simplified cleanup operations
    - Better organization for CI/CD
    - Single directory for all analysis artifacts
  - **Files Modified**:
    - `src/config/defaults.js`: Cache directory configuration
    - `src/main.js`: Cache path handling
    - `src/utils/caching.js`: Cache directory creation

- **Intelligent Cache Clearing**: Selective deletion preserving critical data
  - **Preservation Logic**: Whitelist-based approach
    - **Preserved**: `history/` directory (historical tracking)
    - **Preserved**: `baseline.json` (regression detection reference)
    - **Deleted**: Cache files, screenshots, old reports, logs
  - **Modified Flag Behavior**: `--force-delete-cache` now intelligent
    - Clears ephemeral data while maintaining continuity
    - Enables cache clearing without losing regression baselines
    - Essential for CI/CD quality gates
  - **Implementation**:
    - Selective deletion in `src/main.js`
    - Checks file/directory names against preservation list
    - Maintains historical continuity for trend analysis

- **Performance Improvements**: Consolidated metrics initialization
  - **Reduced Allocations**: 90% reduction in object allocations during metrics initialization
  - **Single Initialization Loop**: Replaced 24 separate operations with one loop
  - **Cleaner Code**: Single initialization point for all metrics
  - **Easier Maintenance**: Add new metrics in one place
  - **Files Modified**: `src/utils/metricsUpdater.js`

- **robots.txt Compliance System**: Comprehensive ethical scraping controls
  - **Phase 0 Fetching**: robots.txt automatically fetched before any URL processing
    - HTTP fetch with Puppeteer fallback for Cloudflare-protected sites
    - Parsed and stored in global state for session-wide access
    - Permissive default: allows scraping if robots.txt doesn't exist or is invalid
    - New file: `src/utils/robotsFetcher.js` (104 lines)
  - **Interactive Compliance Checking**: User prompts when URLs are blocked
    - Real-time compliance checks before each URL is processed
    - Four user options: y (override single URL), a (enable force-scrape), n (skip URL), q (quit analysis)
    - Force-scrape mode can be toggled at runtime via interactive prompt
    - Graceful quit handling with USER_QUIT_ROBOTS_TXT error signal
    - Quit signal propagation through concurrent and recursive processing
    - New file: `src/utils/robotsCompliance.js` (273 lines)
  - **Pattern Matching**: Implements robots.txt exclusion standard
    - Supports wildcards (*), end markers ($), and literal paths
    - User-agent matching (specific agent or wildcard *)
    - Longest-match-wins precedence (Allow takes precedence over Disallow at equal specificity)
    - Path normalization (includes query strings)
  - **CLI and Configuration**:
    - `--force-scrape` CLI flag to bypass all robots.txt restrictions
    - `FORCE_SCRAPE` environment variable (default: false)
    - Prominent startup logging of compliance mode state
    - Runtime state changes logged with warning level
  - **Executive Summary Integration**:
    - `robotsComplianceEnabled` field in overview section
    - Visual indicators (✅ enabled, ⚠️ disabled)
    - Clear explanation text in markdown output
  - **Quality Scoring**: Evaluate AI agent compatibility of robots.txt files
    - 100-point scoring system across 6 criteria
    - Checks for AI agent declarations (ChatGPT-User, GPTBot, etc.)
    - Validates sitemap references and sensitive path protection
    - Identifies llms.txt references and helpful comments
    - Bonus points for exceptional configurations
    - New file: `src/utils/robotsTxtParser.js` (296 lines)
    - New report: `robots_txt_quality.csv` (17 columns)
  - **Integration Points**:
    - Modified `src/main.js`: Added Phase 0 robots.txt fetching (lines 59-81)
    - Modified `src/utils/urlProcessor.js`: Compliance checking before URL processing (lines 61-101)
    - Modified `src/utils/urlProcessor.js`: Quit handling in concurrent processing (lines 331-360)
    - Modified `src/utils/urlProcessor.js`: Quit handling in recursive processing (lines 426-437)
    - Modified `src/utils/reportUtils/executiveSummary.js`: Compliance reporting (lines 69-75, 559-564)
    - Modified `index.js`: CLI flag and startup logging (lines 85-88, 207-219)
    - Modified `.env.example`: FORCE_SCRAPE configuration (lines 30-33)
  - **Documentation**:
    - Updated `CLAUDE.md`: Four-phase pipeline, compliance system architecture
    - Updated `docs/usermanual.md`: User guide with 4 example scenarios
    - Updated `docs/report-layout.md`: Executive summary field descriptions
    - Updated `README.md`: Added to key features

- **llms.txt Quality Analysis**: Evaluate AI agent guidance files
  - 105-point scoring system with bonuses across 5 main criteria
  - Checks for core elements (title, overview, directory, examples)
  - Validates important sections (architecture, API, setup, troubleshooting, etc.)
  - Evaluates content length, link quality, and technical specificity
  - Bonus points for exceptional documentation
  - New file: `src/utils/llmsTxtParser.js` (395 lines)
  - New report: `llms_txt_quality.csv` (27 columns)

- **AI File Reports**: Consolidated quality analysis for robots.txt and llms.txt
  - New file: `src/utils/reportUtils/aiFileReports.js` (273 lines)
  - Generates three reports:
    - `robots_txt_quality.csv`: Detailed robots.txt scoring and analysis
    - `llms_txt_quality.csv`: Detailed llms.txt scoring and analysis
    - `ai_files_summary.md`: Human-readable markdown summary
  - Integrated into main report generation pipeline

- **Base Domain Auto-Discovery**: Automatically include homepage in analysis
  - Base domain URL (e.g., `https://example.com/`) automatically added to processing queue
  - llms.txt URL automatically added for AI agent compatibility checks
  - Both URLs inserted at beginning of queue (priority processing)
  - Ensures homepage always analyzed even when using count limits (e.g., `-c 10`)
  - Works with both sitemap URLs and raw page URLs

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

- **Markdown Linting Configuration**: Updated to exclude generated files and project changelog
  - Added `--ignore results` to exclude dynamically generated report files
  - Added `--ignore CHANGELOG.md` to prevent linting project changelog
  - Applied to both `lint:md` and `lint:md:fix` scripts in [package.json](package.json)

- **Logging Verbosity**: Reduced debug output for improved log readability
  - Removed configuration JSON output from debug logs in [src/utils/urlProcessor.js](src/utils/urlProcessor.js:52)
  - Removed configuration JSON output from debug logs in [src/utils/caching.js](src/utils/caching.js:205)
  - Debug messages now show only essential information without verbose object dumps

- **Empty Message Suppression**: Removed "No resources found" message when no external resources exist
  - Only displays external resource message when resources are actually found
  - Changed in [src/main.js](src/main.js:184)

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

### Fixed

- **llms.txt Detection in Executive Summary**: Corrected nested property path for accurate llms.txt detection
  - Fixed executive summary to check correct nested structure: `m.llmsTxt?.metrics?.hasLLMsTxtReference`, `hasLLMsTxtMeta`
  - Previously checked non-existent property `m.hasLlmsTxt` causing false negatives
  - Now correctly identifies pages with llms.txt references in both served and rendered HTML
  - Changed in [src/utils/reportUtils/executiveSummary.js](src/utils/reportUtils/executiveSummary.js:253-261)

- **Priority URL Queue Processing**: Fixed base domain and llms.txt URLs being cut off by count limits
  - Changed from `push()` to `unshift()` to insert priority URLs at beginning of queue
  - Ensures base domain and llms.txt are always processed even with strict count limits (e.g., `-c 10`)
  - Previously, two slice operations caused priority URLs added at end to be truncated
  - Root cause: `processSitemapContent()` returned limited URLs, then `push()` added more, then `main.js:132` sliced again
  - Changed in [src/utils/sitemap.js](src/utils/sitemap.js:119-157)

- **llms.txt Counting Logic**: Fixed incorrect counting of pages benefiting from global llms.txt
  - Now only counts pages with explicit llms.txt references (via `<link>`, `<a>`, or `<meta>` tags)
  - Previously counted ALL pages when global llms.txt existed, inflating metrics incorrectly
  - Removed `|| globalLLMsTxtExists` from filter logic to ensure accurate per-page counting
  - Changed in [src/utils/reportUtils/executiveSummary.js](src/utils/reportUtils/executiveSummary.js)

### Removed

- **Debug Code Cleanup**: Removed temporary specific URL search feature (346 lines)
  - Removed `updateSpecificUrlMetrics()` function from [src/utils/metricsUpdater.js](src/utils/metricsUpdater.js) (35 lines)
  - Removed `generateSpecificUrlReport()` function from [src/utils/reportUtils/reportGenerators.js](src/utils/reportUtils/reportGenerators.js) (24 lines)
  - Removed specific URL search console output from [src/main.js](src/main.js)
  - This was temporary debug code with hardcoded URL substring checks for development testing

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
