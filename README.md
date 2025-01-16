# SEO Analysis Tool

A Node.js tool for analyzing website SEO and performance metrics.

## Data Structure

The tool collects comprehensive data about each page and stores it in `results.json`. This file serves as the source of truth for all reports.

### Key Metrics Collected

#### Performance Metrics
- Load time and DOM content loaded
- First paint and first contentful paint
- Time to interactive and largest contentful paint

#### Content Analysis
- Word count
- Heading structure (h1, h2, h3 counts)
- Image analysis (count, dimensions, alt text)
- Internal and external link counts
- Meta information (title, description)

#### Technical Metrics
- Page size in bytes
- Resource counts (scripts, stylesheets)
- Form and table counts
- JavaScript errors
- Accessibility issues count

#### Detailed Data
- Complete image inventory with dimensions
- Accessibility issues with recommendations
- HTML validation results
- SEO scores with subscores

### Example Data Structure

```json
{
  "url": "https://example.com/page",
  "lastmod": "2025-01-16T15:30:45.892Z",
  "loadTime": 115.79,
  "firstPaint": 700.39,
  "wordCount": 3153,
  "h1Count": 2,
  "imagesCount": 2,
  "images": [
    {
      "src": "./media_1.png",
      "alt": "Description",
      "width": "1087",
      "height": "486"
    }
  ],
  "pageSize": 43104,
  "pa11yIssuesCount": 5
}
```

See [Product Requirements](docs/prd.md) for complete specifications.

## Documentation

- [User Manual](docs/usermanual.md)
- [Product Requirements](docs/prd.md)
- [Project State](docs/projectstate.md)

## Project Structure

```
seo-audit-tool/
├── docs/           # Documentation files
│   ├── prd.md          # Product requirements
│   ├── projectstate.md # Current project status
│   └── usermanual.md   # User guide
├── results/        # Generated reports and analysis
│   ├── seo_report.csv
│   ├── performance_analysis.csv
│   ├── seo_scores.csv
│   ├── virtual_sitemap.xml
│   ├── final_sitemap.xml
│   ├── results.json
│   └── summary.json
├── src/           # Source code
│   ├── main.js
│   └── utils/     # Utility functions
├── index.js       # Entry point
├── README.md
├── combined.log   # Complete activity log
└── error.log      # Error tracking
```

## Features

- Smart content detection (XML sitemap or HTML)
- Recursive link discovery from HTML pages
- Robust URL handling (absolute, relative, protocol-relative)
- Internal/external link analysis
- SEO score calculation
- Performance metrics
- Accessibility testing (Pa11y)
- Virtual and final sitemap generation
- Graceful error recovery

## Requirements

- Node.js >= 20.0.0
- npm

## Installation

```bash
npm install
```

## Usage

```bash
npm start -- -s <url> -o <output-dir> [options]
```

### Options

- `-s, --sitemap <url>`: URL of the sitemap or webpage to process (default: "https://allabout.network/blogs/ddt/edge-delivery-services-knowledge-hub")
- `-o, --output <directory>`: Output directory for results (default: "results")
- `-l, --limit <number>`: Limit the number of URLs to test (-1 for all)
- `--cache-only`: Use only cached data
- `--no-cache`: Disable caching
- `--no-puppeteer`: Bypass Puppeteer execution
- `--force-delete-cache`: Force delete existing cache
- `--log-level <level>`: Set logging level (error, warn, info, debug)

### Output Files

- `seo_report.csv`: Page-level SEO analysis
  - URL
  - Title presence and content
  - Meta description presence and content
  - H1 tag count
  - Image count and alt text usage
  - Internal/external link counts

- `performance_analysis.csv`: Page performance metrics
  - Load time
  - First paint timing
  - First contentful paint timing
  - Page size
  - Resource count

- `seo_scores.csv`: Detailed SEO scoring
  - Overall score
  - Title optimization score
  - Meta description score
  - Content quality score
  - Link structure score

- `virtual_sitemap.xml`: Initial crawl results
  - URLs discovered during first pass
  - Last modification dates
  - Change frequency
  - Priority values

- `final_sitemap.xml`: Complete site structure
  - All unique internal URLs
  - Updated modification dates
  - Consolidated priorities

- `summary.json`: Site-wide metrics
  - Total URLs processed
  - Internal/external URL counts
  - Average SEO score
  - Timestamp

- `results.json`: Complete analysis data
  - Performance metrics
  - SEO scores
  - Accessibility results
  - URL metrics
  - Response codes

### Log Files

- `combined.log`: Complete activity log
  - All processing steps
  - Debug information
  - Warnings and notices

- `error.log`: Error tracking
  - Processing failures
  - Invalid URLs
  - Connection issues
