# Product Requirements Document

## Overview

Pa11y Sitemap Crawler is a comprehensive web crawler designed for accessibility testing, SEO analysis, and content checks using sitemaps.

## Core Requirements

### Crawling Capabilities

- [x] Process XML sitemaps and HTML pages
- [x] Recursive link discovery from HTML pages
- [x] Handle gzipped sitemaps
- [x] Support both HTTP and HTTPS protocols
- [x] Follow robots.txt directives (planned)
- [x] Configurable rate limiting (planned)
- [x] URL deduplication and filtering

### Performance Requirements

- [x] MD5-based caching system
- [x] Memory-optimized for sites >10,000 pages
- [x] Resource-aware concurrent processing
- [x] Configurable crawl rate limits
- [x] Parallel processing support (planned)
- [x] Cache invalidation after 24 hours

### Error Handling

- [x] Track invalid URLs with source and reason
- [x] Log HTTP status codes (200, 301, 404, etc.)
- [x] Auto-retry on network errors (3 attempts)
- [x] Graceful shutdown with state preservation
- [x] Progress recovery from interruption
- [x] Detailed error logging with stack traces

### Output Requirements

1. File Structure:

   ```bash
   results/
   ├── final/
   │   └── final_sitemap.xml    # All discovered URLs
   ├── invalid_urls.json        # Failed URLs with reasons
   ├── internal_links.csv       # Site structure analysis
   ├── content_analysis.csv     # Content metrics
   └── pa11y_raw_results.json  # Accessibility data
   ```

2. Data Requirements:
   - final_sitemap.xml: Valid XML format with unique URLs
   - invalid_urls.json: URL, source, reason, timestamp
   - internal_links.csv: Source URL, target URL, anchor text
   - content_analysis.csv: URL, title, meta tags, word count
   - pa11y_raw_results.json: WCAG compliance data

3. Clean Start:
   - Results directory cleared at startup
   - Fresh output files created with headers
   - Existing data backed up if needed

### Cache Management

1. Structure:

   ```bash
   .cache/
   ├── [MD5].json  # HTML content with metadata
   ├── [MD5].json  # Processing results
   └── [MD5].json  # Temporary crawl data
   ```

2. Cache Requirements:
   - MD5 hash of URL as filename
   - Content freshness tracking (24h expiry)
   - Automatic stale cache invalidation
   - Optional force cache clearing
   - Cache size monitoring

### CLI Interface

- Required Options:
  - `-s, --sitemap <url>`: Sitemap URL or HTML page URL
  - `-o, --output <directory>`: Output directory path

- Optional Flags:
  - `-l, --limit <number>`: Max URLs (-1 for unlimited)
  - `--no-puppeteer`: Skip JavaScript rendering
  - `--cache-only`: Use cached data only
  - `--no-cache`: Disable caching
  - `--force-delete-cache`: Clear cache
  - `--log-level <level>`: Log detail level

### Analysis Features

1. Accessibility Testing:
   - Pa11y integration for WCAG 2.1
   - Accessibility score (0-100)
   - Error categorization
   - Remediation suggestions

2. SEO Analysis:
   - Meta tag completeness check
   - Content quality score (0-100)
   - URL structure validation
   - Internal link mapping
   - Duplicate content detection

3. Content Analysis:
   - Word count per page
   - Heading hierarchy check
   - Image alt text validation
   - Link text quality check
   - Mobile responsiveness

### Interruption Handling

- Graceful shutdown on Ctrl+C
- Auto-save progress every 5 minutes
- Final sitemap generation on exit
- Results preservation in 'final' dir
- Detailed process summary display

### System Requirements

- Node.js v18+ with ES modules
- npm for dependency management
- 1GB minimum free disk space
- Stable network connection
- 2GB minimum RAM

### Security

- HTTPS support with cert validation
- Security header checking
- Configurable rate limiting
- Robots.txt compliance (planned)
- Cookie handling configuration

## Non-functional Requirements

### Performance

- Process 100 URLs/minute minimum
- <100MB memory per 1000 URLs
- <1s response time per request
- Efficient cache usage

### Reliability

- 99.9% completion rate
- Auto-retry on network errors
- Graceful error handling
- Consistent output format

### Maintainability

- Modular code architecture
- Comprehensive documentation
- Airbnb style guide compliance
- Detailed error logging

### Scalability

- Handle sitemaps with 100k+ URLs
- Process multiple domains
- Parallel processing capability
- Resource usage monitoring
