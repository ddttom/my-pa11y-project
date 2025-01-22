# SEO Audit Tool User Manual

## Overview

This tool performs comprehensive website analysis, generating detailed reports on SEO, performance, accessibility, content quality, and security metrics.

## Getting Started

### Prerequisites

- Node.js version 20.0.0 or higher
- npm package manager
- Internet connection for web crawling

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd my-pa11y-project

# Install dependencies
npm install
```

## Basic Usage

```bash
# Basic analysis with default options
npm start -- -s https://example.com/sitemap.xml

# Analysis with custom output directory
npm start -- -s https://example.com/sitemap.xml -o custom-results

# Limit the number of URLs to analyze
npm start -- -s https://example.com/sitemap.xml -l 10

# Limit number of files to include in both passes
npm start -- -s https://example.com/sitemap.xml -c 50

# Test with small sample before full analysis
npm start -- -s https://example.com/sitemap.xml -l 10 -o test-results
# Review reports in test-results directory
# When satisfied, run full analysis:
npm start -- -s https://example.com/sitemap.xml -l -1 -o final-results

# Generate reports from existing results.json
npm start -- --cache-only -o reports-from-cache

# Include all language variants in analysis
npm start -- -s https://example.com/sitemap.xml --include-all-languages
```

## Command Line Options

### Required Options

- `-s, --sitemap <url>`: URL of sitemap or webpage to analyze
  - Accepts sitemap XML or webpage URL
  - Default: "<https://allabout.network/blogs/ddt/edge-delivery-services-knowledge-hub>"

### Optional Settings

- `-o, --output <directory>`: Output directory for results (default: "results")
  - Preserves existing contents if directory exists
  - Creates directory if it doesn't exist
- `-l, --limit <number>`: Maximum URLs to process (-1 for all)
- `-c, --count <number>`: Limit number of files to include in both passes (-1 for infinite)
- `--log-level <level>`: Set logging detail (error, warn, info, debug)
- `--include-all-languages`: Include all language variants in analysis (default: only /en and /us)

### Cache Control

- `--cache-only`: Use only cached data
- `--no-cache`: Disable caching
- `--force-delete-cache`: Clear cache before starting

## Generated Reports

### SEO Report (seo_report.csv)

- Basic SEO metrics for each page
- Title and meta description analysis
- Heading structure
- Image and link counts
- Content length metrics

Fields:

- URL
- Title
- Description
- H1 Count
- Image Count
- Images Without Alt
- Internal Links
- External Links
- Page Size
- Word Count
- Title Length
- Description Length
- Has Structured Data
- Has Social Tags
- Last Modified

### Performance Report (performance_analysis.csv)

- Loading speed metrics
- Paint timing measurements
- Resource usage statistics

Fields:

- URL
- Load Time (ms)
- First Paint (ms)
- First Contentful Paint (ms)
- Largest Contentful Paint (ms)
- Time to Interactive (ms)
- Speed Index
- Total Blocking Time (ms)
- Cumulative Layout Shift
- Resource Count
- Resource Size (KB)

### Accessibility Report (accessibility_report.csv)

- WCAG 2.1 compliance analysis
- Issues by severity level and guideline
- Required manual checks
- Remediation suggestions

Fields:

- URL
- Total Issues
- Critical Issues
- Serious Issues
- Moderate Issues
- Minor Issues
- WCAG A Issues
- WCAG AA Issues
- WCAG AAA Issues
- WCAG 2.1 Compliance Percentage
- Missing ARIA Labels
- Contrast Ratio Issues
- Keyboard Navigation Issues
- Required Manual Checks
- Remediation Suggestions

### WCAG Markdown Report (wcag_report.md)

- Human-readable accessibility report
- Path-by-path organization of issues
- Unique WCAG issues with occurrence counts
- Detailed issue descriptions
- Remediation suggestions
- Required manual checks
- WCAG guideline mapping

### Image Optimization Report (image_optimization.csv)

- Image metrics and recommendations
- Alt text quality analysis
- Compression suggestions

Fields:

- Page URL
- Image URL
- File Size (KB)
- Dimensions
- Format
- Alt Text
- Alt Text Quality Score
- Is Responsive
- Lazy Loaded
- Compression Level
- Optimization Score
- Recommendations

### Link Analysis Report (link_analysis.csv)

- Internal/external link structure
- Navigation analysis
- Link quality metrics

Fields:

- Source URL
- Target URL
- Link Text
- Link Type
- Follow Type
- HTTP Status
- Redirect Chain
- Content Type
- In Navigation
- Link Depth
- Link Quality Score

### Content Quality Report (content_quality.csv)

- Content analysis metrics
- Content freshness and uniqueness
- Media richness analysis

Fields:

- URL
- Word Count
- Content Freshness Score
- Content Uniqueness Score
- Grammar Score
- Media Richness Score
- Top Keywords
- Overall Content Score

### Security Report (security_report.csv)

- Security implementation analysis
- Vulnerability detection
- SSL certificate details

Fields:

- URL
- HTTPS Implementation
- Security Headers
- Mixed Content Issues
- Cookie Security
- Content Security Policy
- XSS Protection
- SSL Certificate Details
- Vulnerabilities Found
- Overall Security Score

## Log Files

- `combined.log`: Complete activity log
  - All processing steps
  - Information messages
  - Warning messages
  
- `error.log`: Error-only log file
  - Processing errors
  - Connection issues
  - Validation failures

## Cache Management

The tool maintains a cache to improve performance:

- Cache location: `.cache` directory (automatically created if missing)
- Cache format: JSON files
- Cache naming: MD5 hash of URLs

### Cache Control Options

- `--cache-only`: Use only cached data
- `--no-cache`: Disable caching
- `--force-delete-cache`: Clear existing cache

## Network Error Handling

The tool includes robust network error handling that:

1. Automatically detects network-related errors
2. Provides clear console messages about the issue
3. Allows retrying after fixing the problem
4. Handles both regular network requests and browser operations

### Network Error Types

- DNS failures
- Connection timeouts
- Host unreachable errors
- Browser network errors
- SSL/TLS handshake failures
- Rate limiting errors

### Retry Mechanism

When a network error occurs:

1. The tool will pause and display error details
2. You'll be prompted to retry after fixing the issue
3. The tool will automatically retry up to 3 times
4. You can cancel the operation if needed

### Example Network Error Flow

```bash
[ERROR] Network error: Could not connect to example.com
Reason: ETIMEDOUT
Would you like to retry? (yes/no): yes
Retrying connection... (attempt 1/3)
```

## Troubleshooting

### Common Issues

Connection Timeouts

```bash
Error: ETIMEDOUT
```

Solution: Check internet connection and try again

Invalid URLs

```bash
Error: Invalid URL format
```

Solution: Ensure URL includes protocol (http:// or https://)

Memory Issues

```bash
JavaScript heap out of memory
```

Solution: Reduce number of URLs using -l or -c options

### Error Messages

- `Invalid sitemap format`: Check if URL points to valid sitemap
- `Failed to parse HTML`: Check if URL returns valid HTML
- `Network error`: Check internet connection
- `Permission denied`: Check directory permissions

## Best Practices

1. Start Small
   - Test with few URLs first
   - Use -l or -c options to limit processing

2. Monitor Logs
   - Check error.log for issues
   - Use --log-level debug for details

3. Regular Cache Cleanup
   - Use --force-delete-cache periodically
   - Clear cache if behavior seems incorrect

4. Handle Network Issues
   - Check internet connection before starting
   - Use retry mechanism when network errors occur
   - Monitor network stability during long runs

## Support

For issues and questions:

- Check error logs first
- Verify input parameters
- Check documentation
- Submit issue with full error details
