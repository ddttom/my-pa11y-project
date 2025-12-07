# SEO Analysis Tool

A comprehensive Node.js tool for analyzing website SEO, performance, accessibility, and content quality metrics.

> **📖 For detailed documentation, see the [User Manual](docs/usermanual.md)**

## Quick Start

```bash
# Install dependencies
npm install

# Run basic analysis
npm start -- -s https://example.com/sitemap.xml

# Run with custom output directory
npm start -- -s https://example.com/sitemap.xml -o my-results
```

## Key Features

- **Recursive Site Crawling** (default): Automatically discovers and analyzes all same-domain URLs
- **SEO Analysis**: Comprehensive SEO metrics, scoring, and recommendations
- **Performance Metrics**: Load times, Core Web Vitals, and optimization insights
- **Accessibility Testing**: WCAG 2.1 compliance checking with Pa11y integration
- **Content Quality**: Structure, freshness, and readability analysis
- **All Resources Tracking**: Complete inventory of JavaScript, CSS, images, fonts, and media (internal + external)
- **Sitemap Gap Analysis**: Discovers URLs missing from your sitemap
- **Dual Caching System**: Preserves rendered and served HTML for debugging

## Requirements

- Node.js >= 20.0.0
- npm

## Installation

```bash
npm install
```

## Basic Usage

```bash
# Analyze a website (recursive crawling enabled by default)
npm start -- -s https://example.com/sitemap.xml

# Limit to 10 URLs for testing
npm start -- -s https://example.com/sitemap.xml -l 10

# Disable recursive crawling (sitemap-only)
npm start -- -s https://example.com/sitemap.xml --no-recursive

# Force fresh analysis (delete cache and results)
npm start -- --force-delete-cache -s https://example.com/sitemap.xml
```

## Common Options

| Option | Description |
|--------|-------------|
| `-s, --sitemap <url>` | URL of sitemap or webpage to analyze |
| `-o, --output <dir>` | Output directory (default: "results") |
| `-l, --limit <n>` | Limit number of URLs to process |
| `--no-recursive` | Disable automatic URL discovery |
| `--force-delete-cache` | Delete all results and cache before starting |
| `--log-level <level>` | Set logging level (error, warn, info, debug) |

**For complete options and detailed usage, see the [User Manual](docs/usermanual.md).**

## Generated Reports

The tool generates 11+ comprehensive reports:

### Core Reports
- **seo_report.csv** - Page-level SEO metrics
- **performance_analysis.csv** - Load times and Core Web Vitals
- **accessibility_report.csv** - WCAG 2.1 compliance
- **wcag_report.md** - Human-readable accessibility report
- **content_quality.csv** - Content analysis and scoring
- **seo_scores.csv** - Detailed SEO scoring

### Advanced Reports
- **all_resources_report.csv** - Complete resource inventory (internal + external)
- **missing_sitemap_urls.csv** - Discovered URLs not in sitemap
- **v-sitemap.xml** - Perfected sitemap with all discovered URLs
- **image_optimization.csv** - Image analysis and recommendations
- **link_analysis.csv** - Internal/external link structure

**For detailed report descriptions, see the [User Manual](docs/usermanual.md#generated-reports).**

## Recursive Crawling

By default, the tool performs **recursive site crawling**:
- Starts with your sitemap URLs
- Discovers all same-domain links from each page
- Continues until no new URLs are found
- Normalizes URLs to prevent duplicates

This ensures complete site coverage. Use `--no-recursive` to analyze only sitemap URLs.

**For detailed information on recursive crawling, see the [User Manual](docs/usermanual.md#recursive-crawling).**

## Documentation

- **[User Manual](docs/usermanual.md)** - Complete usage guide and feature documentation
- **[Product Requirements](docs/prd.md)** - Product specifications
- **[Project State](docs/projectstate.md)** - Current project status
- **[System Instructions](docs/system.md)** - Collaboration rules

## Project Structure

```
seo-audit-tool/
├── docs/              # Documentation
│   ├── usermanual.md  # Complete user guide
│   ├── prd.md         # Product requirements
│   └── ...
├── src/               # Source code
│   ├── main.js        # Entry point
│   └── utils/         # Utility functions
├── results/           # Generated reports
├── .cache/            # Cache directory
│   ├── rendered/      # Puppeteer-rendered HTML
│   └── served/        # Original served HTML
└── index.js           # CLI entry point
```

## Features Overview

### SEO & Performance
- Page titles, meta descriptions, and heading structure
- Core Web Vitals (LCP, FID, CLS)
- Load time analysis
- SEO scoring and recommendations
- Structured data detection

### Accessibility
- WCAG 2.1 Level A, AA, AAA compliance
- Issue severity tracking (Critical, Serious, Moderate, Minor)
- Remediation suggestions
- Manual check requirements
- Human-readable markdown reports

### Content & Resources
- Word count and content structure
- Content freshness and uniqueness scores
- Complete resource inventory (JS, CSS, images, fonts, videos)
- External dependency tracking
- Usage frequency analysis

### Site Analysis
- Automatic URL discovery and mapping
- Sitemap gap detection
- Internal/external link analysis
- Broken link detection
- Navigation quality assessment

## Troubleshooting

**For comprehensive troubleshooting, see the [User Manual](docs/usermanual.md#troubleshooting).**

Common issues:
- **Too many URLs processed?** Recursive mode is enabled by default. Use `--no-recursive`.
- **Need fresh analysis?** Use `--force-delete-cache` to delete all cached data.
- **Memory issues?** Reduce URLs with `-l` or `-c` options.

## Support

For issues and questions:
1. Check the [User Manual](docs/usermanual.md)
2. Review error logs (`error.log`, `combined.log`)
3. Verify input parameters
4. Submit issue with full error details

## Development

```bash
# Run tests
npm test

# Run linter
npm run lint

# Check security vulnerabilities
npm audit
```

## License

See LICENSE file for details.
