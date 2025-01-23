# SEO Analysis Tool

A Node.js tool for analyzing website SEO and performance metrics with comprehensive accessibility testing.

## Key Features

- **SEO Analysis**: Detailed SEO metrics and scoring
- **Performance Metrics**: Comprehensive page load analysis  
- **Accessibility Testing**: WCAG 2.1 compliance checking with Pa11y integration
  - Detailed markdown reports for better readability
- **Content Quality**: Structure and freshness analysis
- **Automatic Cache Management**: .cache directory creation and management
- **Robust Error Handling**: Network error recovery and retry mechanism
- **URL Processing Control**: Limit number of URLs processed using count parameter
- **Output Directory Preservation**: Existing output directory contents are preserved
- **Configurable Sampling**: Test with small samples before full analysis
- **Results File Detection**: Automatic detection of results.json for report generation
- **Iterative Testing**: Test reports with small samples, then run full analysis
- **Language Variant Filtering**: Skip non-English variants by default (only process /en and /us)
  - Enhanced URL extraction logic with automatic language variant detection
  - Centralized language variant checking in report generation
  - Can be overridden with --include-all-languages flag

## Data Structure

The tool collects comprehensive data about each page and stores it in `results.json`. This file serves as the source of truth for all reports.

### Key Metrics Collected

#### Performance Metrics

- Load time and DOM content loaded
- First paint and first contentful paint
- Largest contentful paint
- Time to interactive
- Total blocking time
- Cumulative layout shift

#### Content Analysis

- Word count
- Heading structure (h1, h2, h3 counts)
- Image analysis (count, dimensions, alt text)
- Internal and external link counts
- Meta information (title, description)

#### Accessibility Metrics

- WCAG 2.1 compliance levels (A, AA, AAA)
- Issue severity tracking (Critical, Serious, Moderate, Minor)
- Required manual checks
- Remediation suggestions
- Human-readable markdown reports

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
  "pa11yIssuesCount": 5,
  "wcagCompliance": {
    "A": 0,
    "AA": 2,
    "AAA": 1
  }
}
```

See [Product Requirements](docs/prd.md) for complete specifications.

## Documentation

- [User Manual](docs/usermanual.md)
- [Product Requirements](docs/prd.md)
- [Project State](docs/projectstate.md)

## Project Structure

```bash
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
│   ├── wcag_report.md
│   └── summary.json
├── src/           # Source code
│   ├── main.js
│   └── utils/     # Utility functions
│       ├── reportUtils/  # Report generation modules
│       │   ├── formatUtils.js        # Formatting utilities
│       │   ├── accessibilityAnalysis.js # Accessibility analysis
│       │   ├── imageAnalysis.js      # Image analysis
│       │   ├── linkAnalysis.js       # Link analysis
│       │   ├── contentAnalysis.js    # Content quality analysis
│       │   └── reportGenerators.js   # Report generation functions
│       ├── networkUtils.js # Network error handling
│       └── reports.js    # Main report coordination
├── .cache/        # Cache directory (automatically created)
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
- WCAG 2.1 accessibility testing (Pa11y)
  - Detailed markdown reports for better review
- Virtual and final sitemap generation
- Graceful error recovery
- Enhanced network error handling with retry mechanism
- Automatic cache directory management
- URL processing control with count parameter
- Preserved output directory contents
- Configurable sampling limits for testing
- Results file detection for report generation
- Iterative testing workflow:
  - Test with small samples (e.g., 10 pages)
  - Review and adjust reports
  - Run full analysis when satisfied
- Language variant filtering:
  - Skip non-English variants by default
  - Only process /en and /us variants
  - Enhanced URL extraction logic with automatic detection
  - Centralized language variant checking in report generation
  - Override with --include-all-languages flag

## Network Error Handling

The tool includes robust network error handling that:

1. Detects network-related errors automatically
2. Provides clear console messages about the issue
3. Allows the user to retry after fixing the problem
4. Handles both regular network requests and browser operations
5. Implements automatic retries with user confirmation
6. Provides detailed error classification for:
   - DNS failures
   - Connection timeouts
   - Host unreachable errors
   - Browser network errors
7. Includes Cloudflare challenge bypass capability with:
   - Automatic detection of Cloudflare challenges
   - Randomized browser fingerprinting
   - Human-like behavior simulation
   - Fallback to visible browser mode when needed
   - Detailed logging of bypass attempts
   - Configurable retry logic for persistent challenges

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

- `-s, --sitemap <url>`: URL of the sitemap or webpage to process (default: "<https://allabout.network/blogs/ddt/edge-delivery-services-knowledge-hub>")
- `-o, --output <directory>`: Output directory for results (default: "results")
  - Preserves existing contents if directory exists
  - Creates directory if it doesn't exist
- `-l, --limit <number>`: Limit the number of URLs to test (-1 for all)
- `-c, --count <number>`: Limit number of files to include in both passes (-1 for infinite)
- `--cache-only`: Use only cached data
- `--no-cache`: Disable caching
- `--force-delete-cache`: Force delete existing cache
- `--log-level <level>`: Set logging level (error, warn, info, debug)
- `--include-all-languages`: Include all language variants in analysis (default: only /en and /us)

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
  - Largest contentful paint
  - Time to interactive
  - Total blocking time
  - Cumulative layout shift

- `accessibility_report.csv`: WCAG 2.1 compliance analysis
  - Total issues by severity
  - WCAG compliance levels
  - Required manual checks
  - Remediation suggestions

- `wcag_report.md`: Human-readable WCAG issues report
  - Path-by-path organization
  - Unique issues with occurrence counts
  - Detailed issue descriptions
  - Remediation suggestions
  - Required manual checks

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
