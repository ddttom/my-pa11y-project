# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
