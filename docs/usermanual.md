# SEO Audit Tool User Manual

## Overview

This tool analyzes websites for SEO optimization by crawling sitemaps or web pages, generating reports, and providing actionable insights.

## Getting Started

1. Install Node.js (version 20 or higher)
2. Clone the repository
3. Run `npm install`
4. Start the tool with `npm start -- [options]`

## Command Line Options

### Basic Usage

```bash
npm start -- -s https://example.com/sitemap.xml -o results
```

### Available Options

- `-s, --sitemap <url>`: The URL to analyze (default: "<https://allabout.network/blogs/ddt/edge-delivery-services-knowledge-hub>")
- `-o, --output <directory>`: Where to save results (default: "results")
- `-l, --limit <number>`: Maximum URLs to process (default: -1)
- `--log-level <level>`: Logging detail level (default: "debug")

### Caching Options

- `--cache-only`: Use cached data only
- `--no-cache`: Disable caching
- `--force-delete-cache`: Clear cache before starting

## Output Files

The tool generates several files in the output directory:

- `virtual_sitemap.xml`: URLs found during initial crawl
- `final_sitemap.xml`: All unique internal URLs discovered
- `seo_scores.csv`: SEO analysis scores
- `performance_analysis.csv`: Performance metrics
- `seo_report.csv`: Detailed SEO findings
- `summary.json`: Overall statistics
- `results.json`: Complete results data

## Logging

- `error.log`: Error messages
- `combined.log`: All log messages

## Interruption Handling

The tool handles Ctrl+C (SIGINT) gracefully:

- Saves all current results
- Generates reports with available data
- Creates sitemaps with discovered URLs
- Ensures logs are written before exit
