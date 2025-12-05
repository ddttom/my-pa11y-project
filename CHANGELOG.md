# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **External Resources Tracking**: Comprehensive extraction and reporting of all external dependencies
  - Tracks JavaScript, CSS, images (all formats including SVG), fonts, videos, audio, iframes, and other external resources
  - Site-wide aggregation showing usage count for each external resource across all analyzed pages
  - New report: `external_resources_report.csv` with Resource URL, Resource Type, and Total Count
  - Sorted by usage frequency to identify critical third-party dependencies
  - Console summary showing total unique resources and breakdown by type
  - Supports detection of resources from: `<script>`, `<link>`, `<img>`, `<picture>`, `<video>`, `<audio>`, `<iframe>`, `<object>`, `<embed>`, `@font-face` rules, background images, and preload/prefetch hints
- **CLAUDE.md**: Comprehensive documentation for Claude Code instances
  - Detailed 4-phase architecture documentation (Rendering → Analysis → Metrics → Reporting)
  - Step-by-step guide for adding new features following existing patterns
  - Complete data structure documentation including `results.json` schema
  - Command reference and common development workflows
- Initial unit tests for utility functions.
- CI/CD pipeline using GitHub Actions.
- Standard documentation (LICENSE, CONTRIBUTING.md).
- Linting fixes and improved configuration.
