# Product Requirements Document

## Overview

A Node.js tool for analyzing website SEO and performance metrics.

## Data Architecture

### Source of Truth

- results.json is the authoritative source of all collected data
- All report files (CSV, XML) are generated from results.json
- No direct data collection in report generation phase
- Consistent data formatting across all outputs

### Data Structure

- results.json contains:
  - performanceAnalysis: Array of page data including:
    - Performance metrics:
      - url, lastmod
      - loadTime, domContentLoaded
      - firstPaint, firstContentfulPaint
      - timeToInteractive, largestContentfulPaint
    - Content metrics:
      - title, metaDescription, h1
      - wordCount, h1Count, h2Count, h3Count
      - imagesCount, imagesWithoutAlt
      - internalLinksCount, externalLinksCount
    - Technical metrics:
      - pageSize (in bytes)
      - scriptsCount, stylesheetsCount
      - formsCount, tablesCount
      - jsErrors, pa11yIssuesCount
    - Image data:
      - images: Array of {src, alt, width, height}
    - SEO details:
      - score, titleOptimization
      - metaDescriptionOptimization
      - contentQuality, internalLinking

### Report Generation

- SEO Report (seo_report.csv):
  - URL
  - Title presence and content
  - Meta description presence and content
  - H1 tag count
  - Image count and alt text usage
  - Internal/external link counts
  - Page size and word count

- Performance Analysis (performance_analysis.csv):
  - Load time
  - First paint timing
  - First contentful paint timing
  - Page size
  - Resource count

- SEO Scores (seo_scores.csv):
  - Overall score
  - Title optimization score
  - Meta description score
  - Content quality score
  - Link structure score

- Sitemaps:
  - virtual_sitemap.xml: Initial crawl results
  - final_sitemap.xml: Complete site structure

### Data Quality

- No direct data collection in report phase
- All data modifications happen before results.json
- Reports must be reproducible from results.json
- Data consistency checks between reports
- Validation of required fields
- Error handling for missing data

### Data Formatting

- Time measurements:
  - All time values in milliseconds
  - Round to nearest integer
  - Example: 105.79ms → 106ms

- Scores and metrics:
  - Two decimal places for all scores
  - Round integers for counts and sizes
  - Format rules:
    - Time values: Math.round()
    - Scores: Number(x.toFixed(2))
    - Counts: Math.round()
    - Sizes: Math.round()

- Report headers:
  - Include units in column headers
  - Example: "Load Time (ms)", "Page Size (bytes)"
  - Units by type:
    - Time: (ms)
    - Size: (bytes)
    - Scores: no units (0-100)
    - Counts: no units

### Error Handling

- Retry failed requests
- Validate data completeness
- Validate report data against results.json
- Log all errors with stack traces
- Consistent error object format

### Performance

- Async/await for I/O operations
- Efficient data structures
- Single source of truth (results.json)
- Minimal memory usage
- Caching of network requests

### Code Quality

- JSDoc documentation
- Consistent error handling patterns
- Input validation for edge cases
- Airbnb style guide compliance
- Proper type checking
- Comprehensive logging

### Testing Requirements

- Unit tests for core functions
- Integration tests for data flow
- Validation tests for output formats
- Error case coverage
- Report format validation

### Sample Data Fragment

```json
{
  "performanceAnalysis": [{
    "url": "https://example.com/page",
    "lastmod": "2025-01-16T15:30:45.892Z",
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
    "imagesWithoutAlt": 2,
    "internalLinksCount": 22,
    "title": "Page Title",
    "metaDescription": "Page description...",
    "pageSize": 43104,
    "pa11yIssuesCount": 5,
    "details": {
      "score": 79,
      "titleOptimization": 85,
      "metaDescriptionOptimization": 90,
      "contentQuality": 75,
      "internalLinking": 70
    }
  }]
}
```

## Core Features

### URL Processing

- Process sitemap URLs
- Handle relative/absolute URLs
- Validate URL formats

### Analysis

- Two-phase analysis:
  1. Data Collection (into results.json)
  2. Report Generation (from results.json)
- SEO metrics collection
- Performance metrics
- Accessibility testing
- Content analysis
- Link structure analysis

### Output Generation

- Generate all reports from results.json data
- No direct data collection during report generation
- Reports should reflect exact data from results.json
- Required reports:
  - SEO report (CSV): title, meta, counts from results.json
  - Performance analysis (CSV): metrics from results.json
  - SEO scores (CSV): scores from results.json details
  - Final sitemap (XML): URLs from results.json
- Results JSON (source of truth, complete data set)

## Technical Requirements

### Data Flow

1. Collect all data into results.json
2. Validate collected data completeness
3. Generate reports from results.json
4. Validate report data matches results.json

### Data Validation

- Ensure all required fields present in results.json
- Verify data types and ranges
- Check for missing or invalid values
- Compare report output against source data

### Error Handling

- Retry failed requests
- Validate data completeness
- Validate report data against results.json
- Log all errors

### Performance

- Async/await for I/O
- Efficient data structures
- Single source of truth (results.json)
- Minimal memory usage

### Output

- All reports must accurately reflect results.json
- Consistent data across reports
- Valid CSV/XML formats
- Detailed logging

### Data Formatting

- Time measurements:
  - All time values in milliseconds
  - Round to nearest integer (no decimals)
  - Example: 105.79ms → 106ms

- Scores and metrics:
  - Two decimal places for all scores
  - Round integers for counts and sizes
  - Format rules:
    - Time values: Math.round()
    - Scores: Number(x.toFixed(2))
    - Counts: Math.round()
    - Sizes: Math.round()
  - Examples:
    - SEO score: 79.45
    - Page size: 43104 bytes
    - Resource count: 15
    - Load time: 106ms

- Report headers:
  - Include units in column headers
  - Example: "Load Time (ms)", "Page Size (bytes)"
  - Units by type:
    - Time: (ms)
    - Size: (bytes)
    - Scores: no units (0-100)
    - Counts: no units

### Data Quality

- No direct data collection in report phase
- All data modifications happen before results.json
- Reports must be reproducible from results.json
- Data consistency checks between reports


Future Tasks

- Accessibility Report (accessibility_report.csv):
  - URL
  - Pa11y issues count
  - Issue types and severity
  - WCAG compliance levels
  - Accessibility score

- Image Optimization Report (image_optimization.csv):
  - URL
  - Images without alt text
  - Image dimensions
  - File sizes
  - Compression opportunities

- Link Analysis Report (link_analysis.csv):
  - URL
  - Broken links
  - Redirect chains
  - Nofollow links
  - Anchor text analysis

- Content Quality Report (content_quality.csv):
  - URL
  - Word count distribution
  - Readability scores
  - Keyword density
  - Duplicate content detection

- Security Report (security_report.csv):
  - URL
  - HTTPS usage
  - Security headers presence
  - Mixed content issues
  - Cookie security
