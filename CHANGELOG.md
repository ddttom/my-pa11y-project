# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Recursive Site Crawling (Default)**: Automatic analysis of all discovered same-domain URLs
  - Queue-based processing automatically scans sitemap URLs + all discovered pages
  - Ensures complete site coverage with no pages left behind
  - Set-based duplicate prevention
  - Real-time progress logging showing queue depth and discovered URL counts
  - **Default behavior**: Recursive crawling enabled (use `--no-recursive` to disable)
  - Processes URLs until queue is empty (no new pages discovered)
  - Benefits: Complete SEO/accessibility/performance analysis for entire site
  - Command-line flag: `--no-recursive` to revert to sitemap-only analysis
- **External Resources Tracking**: Comprehensive extraction and reporting of all external dependencies
  - Tracks JavaScript, CSS, images (all formats including SVG), fonts, videos, audio, iframes, and other external resources
  - Site-wide aggregation showing usage count for each external resource across all analyzed pages
  - New report: `external_resources_report.csv` with Resource URL, Resource Type, and Total Count
  - Sorted by usage frequency to identify critical third-party dependencies
  - Console summary showing total unique resources and breakdown by type
  - Supports detection of resources from: `<script>`, `<link>`, `<img>`, `<picture>`, `<video>`, `<audio>`, `<iframe>`, `<object>`, `<embed>`, `@font-face` rules, background images, and preload/prefetch hints
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
