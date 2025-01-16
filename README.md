# Pa11y Sitemap Crawler

A comprehensive web crawler for accessibility testing, SEO analysis, and content checks using sitemaps. Created by Tom Cranstoun, August 2024.

## Features

- Sitemap-based crawling with HTML page support
- Intelligent caching system for reduced server load
- Pa11y accessibility testing
- SEO factor analysis
- Web security header checks
- Internal/external link analysis
- Image and alt text analysis
- Comprehensive reporting
- Graceful shutdown with progress saving

## Prerequisites

- Node.js (v18+)
- npm

## Installation

```bash
git clone https://github.com/ddttom/my-pa11y-project.git
cd my-pa11y-project
npm install
```

## Usage

```bash
npm start -- -s <sitemap-url> -o <output-directory> [options]
```

Options:

- `-s, --sitemap <url>`: Sitemap URL or HTML page URL (required)
- `-o, --output <directory>`: Output directory (required)
- `-l, --limit <number>`: Max URLs to test (-1 for no limit, default)
- `--no-puppeteer`: Skip Puppeteer rendering
- `--cache-only`: Use only cached data
- `--no-cache`: Disable caching
- `--force-delete-cache`: Clear existing cache
- `--log-level <level>`: Set logging level (error, warn, info, verbose, debug)

Example:

```bash
npm start -- -s https://example.com/sitemap.xml -o ./results -l 100
```

## Output

Results are saved in the specified output directory:

```bash
results/
  ├── final/
  │   └── final_sitemap.xml    # Complete sitemap of all discovered URLs
  ├── invalid_urls.json        # List of problematic URLs with reasons
  ├── internal_links.csv       # Internal link analysis
  ├── content_analysis.csv     # Content analysis results
  └── pa11y_raw_results.json   # Detailed accessibility findings
```

## Cache Management

The `.cache` directory uses MD5 hashing to store:

- HTML content from crawled pages
- Processing results and metadata
- Temporary crawl data

Clear the cache when:

- Starting a new project
- Site content has been updated
- Troubleshooting issues
- Cache becomes too large

## Interruption Handling

The crawler handles interruptions gracefully:

- Ctrl+C will trigger a clean shutdown
- Current progress is saved to the `final` directory
- A summary of processed URLs is displayed
- All discovered URLs are preserved in the final sitemap

## Contributing

Contributions welcome. Please submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Pa11y](https://pa11y.org/)
- [Puppeteer](https://pptr.dev/)
- [Commander.js](https://github.com/tj/commander.js/)
