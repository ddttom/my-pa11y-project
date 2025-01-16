# Project State

## Current Implementation

### Core Features

- [x] Sitemap XML parsing
- [x] HTML page crawling with recursive link discovery
- [x] Intelligent caching system with MD5 hashing
- [x] Invalid URL tracking with detailed reasons
- [x] Graceful shutdown handling with state preservation
- [x] Progress preservation on interruption
- [x] Duplicate URL detection and filtering

### Project Organization

```bash
.
├── index.js               # Entry point and CLI configuration
├── src/
│   ├── main.js           # Core orchestration logic
│   └── utils/
│       ├── setup.js      # Initial setup and validation
│       ├── sitemap.js    # Sitemap processing
│       ├── sitemapUtils.js    # Sitemap generation
│       ├── shutdownHandler.js # Graceful interruption
│       ├── caching.js    # Cache management
│       ├── results.js    # Results processing
│       └── urlUtils.js   # URL validation
├── results/              # Generated output
└── .cache/              # Cached data storage
```

### Generated Files

```bash
results/
├── final/
│   └── final_sitemap.xml    # All discovered URLs
├── invalid_urls.json        # Failed URLs with reasons
├── internal_links.csv       # Site structure analysis
├── content_analysis.csv     # Content metrics
└── pa11y_raw_results.json  # Accessibility data
```

### Performance

- [x] Caching of HTML content with MD5 keys
- [x] Efficient URL deduplication using Sets
- [x] Resource-aware page processing
- [x] Controlled crawl rate
- [x] Optimized memory usage for large sites

### Error Handling

- [x] Invalid URL reporting with source tracking
- [x] HTTP error tracking with status codes
- [x] Network error recovery with retries
- [x] Graceful interruption handling
- [x] Progress preservation on shutdown
- [x] Detailed error logging

## Recent Updates

- Reorganized code structure for better modularity
- Fixed circular dependencies in shutdown handling
- Enhanced error reporting with source tracking
- Added support for gzipped sitemaps
- Improved cache system with MD5 hashing

## Known Issues

- None currently reported

## Planned Improvements

- Enhance parallel processing capabilities
- Add more detailed crawl statistics
- Implement rate limiting configuration
- Add support for custom URL filters
- Enhance reporting formats
- Add support for robots.txt parsing

## Cache System

The `.cache` directory uses MD5 hashing for filenames:

```bash
.cache/
├── be3b1dc7348a079bdab9443dc804c741.json  # HTML content
├── b72b97c79a50c857ae0d684b9125aa24.json  # Results
└── 028671fcf192b30bfb8b8a3cb293830f.json  # Temp data
```

Cache is used to:

- Reduce server load during crawling
- Speed up repeated scans
- Support interrupted crawl recovery
- Store HTML content and processing results
