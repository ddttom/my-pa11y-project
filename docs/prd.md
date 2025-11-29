# Product Requirements Document

## Overview

A Node.js tool for comprehensive website analysis, including SEO, performance, accessibility, and content quality metrics.

## Core Features

### URL Processing

- Process sitemap URLs
- Handle relative/absolute URLs  
- Validate URL formats
- URL normalization and caching
- Handle redirects and errors
- Automatic .cache directory creation during initialization
- Rendered Page Caching: Automatically saves rendered HTML for debugging
- Limit number of URLs processed using count parameter
- Preserve existing output directory contents
- Results file detection and report generation
- Configurable sampling limits for testing
- Language variant filtering (skip non-English variants by default)
  - Enhanced URL extraction logic with automatic detection
  - Centralized language variant checking in report generation
  - Default: Skip 2-character language variants (e.g., /ar, /fr)
  - Only process /en and /us variants by default
  - Override with --include-all-languages flag
  - Helper function in reportGenerators.js for consistent checks
  - Updated report generation functions to use new filtering logic

### Analysis Features

#### SEO Analysis

- Title and meta description evaluation
- Heading structure analysis  
- URL structure analysis
- Internal/external link analysis
- Image alt text validation
- Structured data validation
- Social media tag verification

#### Performance Analysis

- Load time measurement
- First paint timing
- First contentful paint
- Largest contentful paint  
- Time to interactive
- Total blocking time
- Cumulative layout shift

#### Accessibility Analysis

- WCAG 2.1 compliance checking across all levels (A, AA, AAA)
- Automated accessibility testing with Pa11y integration
- Issue categorization by severity and impact  
- Remediation suggestions for identified issues
- Required manual checks tracking
- Detailed WCAG guideline mapping
- Markdown report generation for better readability

#### Content Analysis

- Word count metrics  
- Heading structure validation
- Content freshness evaluation
- Media richness scoring
- Duplicate content detection

#### Link Analysis

- Internal/external link validation
- Dead link detection  
- Redirect chain analysis
- Link depth calculation
- Navigation structure analysis
- Anchor text evaluation
- Link quality scoring

### Report Generation

#### SEO Report (seo_report.csv)

- URL
- Title presence and content  
- Meta description analysis
- H1 tag count
- Image count and alt text
- Internal/external link counts  
- Page size and word count

#### Performance Report (performance_analysis.csv)

- Load time metrics
- Paint timing metrics  
- Interactive timing
- Cumulative layout shift
- Total blocking time

#### Accessibility Report (accessibility_report.csv)

- URL of analyzed page
- Total number of accessibility issues  
- Breakdown by WCAG guideline violations
- Issue severity levels (Critical, Serious, Moderate, Minor)
- Automated test results
- Required manual checks list
- WCAG 2.1 compliance percentage
- Remediation suggestions

#### WCAG Markdown Report (wcag_report.md)

- Path-by-path organization of issues
- Unique WCAG issues with occurrence counts
- Detailed issue descriptions
- Remediation suggestions
- Required manual checks
- WCAG guideline mapping
- Human-readable format for better accessibility review

#### Image Report (image_optimization.csv)

- Image dimensions
- File sizes  
- Alt text quality
- Responsive image implementation
- Lazy loading status
- Compression recommendations
- Optimization scores

#### Link Report (link_analysis.csv)

- Source and target URLs
- Link types  
- HTTP status
- Redirect chains
- Navigation context
- Link depth
- Link quality scores

#### Content Report (content_quality.csv)

- Word count
- Heading structure  
- Content freshness
- Media richness
- Overall quality score

### Data Quality

- Single source of truth (results.json)
- Consistent data formatting
- Validation of required fields
- Error handling for missing data
- Data consistency checks
- Complete error logging
- Results file detection for report generation
- Configurable sampling limits for testing
- Preserved output directory contents
- Automatic results.json validation

### Performance Requirements

- Asynchronous processing
- Efficient data structures
- Memory usage optimization
- Request rate limiting
- Caching support
- Parallel processing where possible
- Automatic cache directory management
- Preserved output directory contents
- Configurable sampling limits

### Code Quality

- Modern JavaScript (ES modules)
- Comprehensive error handling
- Detailed logging
- JSDoc documentation
- Consistent code style
- Input validation
- Type checking

### Testing Requirements

- Unit tests for core functions
- Integration tests for workflows
- Performance benchmarks
- Error case coverage
- Data validation tests
- Sampling limit testing
- Results file detection testing

## Technical Requirements

### Supported Node.js Version

- Node.js >= 20.0.0

### Dependencies

- csv-writer (report generation)
- Pa11y (accessibility testing)
- Winston (logging)
- Commander (CLI)
- Cheerio (HTML parsing)
- Axios (HTTP requests)
- Puppeteer (Cloudflare bypass)

### File Organization

```terminal
project/
├── docs/           # Documentation
├── src/           # Source code
│   ├── main.js    # Main logic
│   └── utils/     # Utilities
├── tests/         # Test files
├── results/       # Generated reports
├── logs/          # Log files
└── .cache/        # Cache directory
    └── rendered/  # Saved rendered HTML files
```

### Error Handling

- Comprehensive error catching
- Detailed error logging
- Recovery mechanisms
- User-friendly error messages
- Error tracking and reporting
- Network error handling with:
  - Automatic error detection and classification
  - Retry mechanism with user confirmation
  - Browser-specific network error handling
  - Maximum retry attempts (3 by default)
  - Clear console messages about network issues
  - Support for both regular and browser network operations
  - Cloudflare challenge detection and bypass capability

### Logging

- Multiple log levels
- Separate error logs
- Activity tracking
- Performance monitoring
- Debug information
- Network error logging with:
  - Error type classification
  - Retry attempt tracking
  - User interaction logging
  - Browser-specific error details
  - Cloudflare challenge attempts and outcomes

## Future Enhancements

- Enhanced content analysis
- Natural language processing
- Performance optimization
- Additional report types
- Advanced network monitoring
- Real-time network status reporting
- Automated network issue resolution
