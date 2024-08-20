# Pa11y Sitemap Crawler

A comprehensive web crawler for accessibility testing, SEO analysis, and content checks using sitemaps. Created by Tom Cranstoun, August 2024.

## Features

- Sitemap-based crawling
- Pa11y accessibility testing
- SEO factor analysis
- Web security header checks
- Internal/external link analysis
- Image and alt text analysis
- Comprehensive reporting

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

- `-s, --sitemap <url>`: Sitemap URL (required)
- `-o, --output <directory>`: Output directory (required)
- `-l, --limit <number>`: Max URLs to test (-1 for no limit)
- `--no-puppeteer`: Skip Puppeteer rendering
- `--cache-only`: Use only cached data
- `--no-cache`: Disable caching
- `--force-delete-cache`: Clear existing cache
- `--debug`: Enable detailed logging

Example:

```bash
npm start -- -s https://example.com/sitemap.xml -o ./results -l 100
```

## Output

Results are saved in the specified output directory:

- `seo_report.csv`: Comprehensive SEO and accessibility findings
- `pa11y_results.csv`: Detailed Pa11y test results
- `internal_links.csv`: Internal link analysis
- `content_analysis.csv`: Content analysis results
- `sitemap.xml`: Optimized sitemap for the crawled site

## Cache Management

Clear the `.cache` folder when:

- Pulling a new project
- Updating sites
- Troubleshooting issues

## Configuration

Modify `pa11yOptions` in `pa11y-sitemap-crawler.mjs` for custom Pa11y tests. See [Pa11y documentation](https://github.com/pa11y/pa11y#configuration) for options.

## Contributing

Contributions welcome. Please submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Pa11y](https://pa11y.org/)
- [Cheerio](https://cheerio.js.org/)
- [Commander.js](https://github.com/tj/commander.js/)
