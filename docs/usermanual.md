# SEO Audit Tool User Manual

## Overview

This tool performs comprehensive website analysis, generating detailed reports on SEO, performance, accessibility, and content quality metrics.

**Key Features:**
- **Recursive Site Crawling** (default): Automatically discovers and analyzes all same-domain URLs beyond the initial sitemap
- **Comprehensive Resource Tracking**: Inventories all resources (JavaScript, CSS, images, fonts, videos) across internal and external domains
- **Sitemap Gap Analysis**: Identifies URLs discovered during analysis that are missing from your sitemap
- **Dual Caching System**: Preserves both rendered and served HTML for comparison and debugging

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

# Disable recursive crawling (sitemap-only analysis)
npm start -- -s https://example.com/sitemap.xml --no-recursive

# Force complete fresh start (deletes all results and cache)
npm start -- --force-delete-cache -s https://example.com/sitemap.xml

# Test with small sample before full analysis
npm start -- -s https://example.com/sitemap.xml -l 10 -o test-results
# Review reports in test-results directory
# When satisfied, run full analysis:
npm start -- -s https://example.com/sitemap.xml -l -1 -o final-results

# Generate reports from existing results.json
npm start -- --cache-only -o reports-from-cache

# Include all language variants in analysis
npm start -- -s https://example.com/sitemap.xml --include-all-languages
  - By default, only processes /en and /us variants
  - Skips other language variants (e.g., /fr, /es)
  - Uses enhanced URL extraction logic with automatic detection
  - Centralized language variant checking in report generation
```

## Command Line Options

### Required Options

- `-s, --sitemap <url>`: URL of sitemap or webpage to analyze
  - Accepts sitemap XML or webpage URL
  - Default: "https://example.com/sitemap.xml"

### Optional Settings

- `-o, --output <directory>`: Output directory for results (default: "results")
  - Preserves existing contents if directory exists
  - Creates directory if it doesn't exist
- `-l, --limit <number>`: Maximum URLs to process (-1 for all)
- `-c, --count <number>`: Limit number of files to include in both passes (-1 for infinite)
- `--log-level <level>`: Set logging detail (error, warn, info, debug)
- `--no-recursive`: Disable automatic URL discovery (default: recursive mode enabled)
  - When disabled, only analyzes URLs from the initial sitemap
  - Use this for faster analysis when complete site coverage is not needed
- `--include-all-languages`: Include all language variants in analysis
  - Overrides default behavior of only processing /en and /us variants
  - Uses enhanced URL extraction logic with automatic detection
  - Centralized language variant checking in report generation

### Cache Control

- `--cache-only`: Use only cached data
- `--no-cache`: Disable caching
- `--force-delete-cache`: Delete entire results directory (including cache and all reports) before starting
  - Ensures complete fresh start with no stale data
  - Removes all CSV reports, results.json, and cached HTML files

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
- Interactive timing
- Cumulative layout shift
- Total blocking time

Fields:

- URL
- Load Time (ms)
- First Paint (ms)
- First Contentful Paint (ms)
- Largest Contentful Paint (ms)
- Time to Interactive (ms)
- Total Blocking Time (ms)
- Cumulative Layout Shift

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

### All Resources Report (all_resources_report.csv)

- Comprehensive inventory of ALL resources across the entire site
- Tracks both internal (same-domain) and external resources
- Shows usage count across all analyzed pages
- Sorted by usage frequency (most-used resources first)
- Helps identify critical dependencies and potential single points of failure

Resource Types Tracked:

- JavaScript files
- CSS stylesheets
- Images (PNG, JPG, SVG, etc.)
- Fonts (WOFF, WOFF2, TTF, etc.)
- Videos (MP4, WebM, etc.)
- Audio files
- Iframes
- Other resource types

Fields:

- Resource URL
- Resource Type (javascript, css, image, font, video, audio, iframe, other)
- Total Count (number of pages referencing this resource)

### Missing Sitemap URLs Report (missing_sitemap_urls.csv)

- Identifies URLs discovered during page analysis that are not in the original sitemap
- Shows reference count (how many pages link to each discovered URL)
- Helps identify sitemap gaps and potentially orphaned pages
- Sorted by reference count (most-referenced URLs first)
- Essential for improving sitemap completeness and SEO coverage

Fields:

- Discovered URL
- Reference Count (number of pages linking to this URL)
- First Discovered On (source page that first linked to this URL)

### LLM Readability Report (llm_readability_report.csv)

- Analyzes how well each page's HTML structure supports LLM content extraction
- Evaluates semantic HTML usage, content organization, metadata quality, and text extractability
- Provides overall score (0-100) and four component scores
- Helps optimize pages for AI-powered tools, search engines, and assistive technologies
- Sorted by overall score (highest quality pages first)

**Scoring Components:**

1. **Structural Clarity Score** (0-100)
   - Semantic HTML element usage (article, section, main, header, footer)
   - Proper heading hierarchy (h1-h6)
   - Presence of main content container elements

2. **Content Organization Score** (0-100)
   - Paragraph count and quality
   - List usage (ul, ol)
   - Table and code block structure
   - Appropriate content length (not too sparse or bloated)

3. **Metadata Quality Score** (0-100)
   - Structured data presence (JSON-LD, Microdata)
   - OpenGraph tags completeness
   - Meta description quality

4. **Text Extractability Score** (0-100)
   - Text-to-markup ratio
   - Hidden content ratio
   - Overall DOM complexity

Fields:

- URL
- Overall LLM Readability Score (0-100)
- Structural Clarity Score (0-100)
- Content Organization Score (0-100)
- Metadata Quality Score (0-100)
- Text Extractability Score (0-100)
- Semantic HTML Usage (percentage)
- Heading Hierarchy Quality (score)
- Has Main Content (boolean)
- Has Structured Data (boolean)
- Text to Markup Ratio
- Hidden Content Ratio (percentage)
- Paragraph Count
- List Count
- Table Count
- Code Block Count
- Total Elements

**Interpreting Scores:**

- **90-100**: Excellent LLM readability, optimal structure
- **70-89**: Good readability, minor improvements possible
- **50-69**: Moderate readability, significant improvements recommended
- **Below 50**: Poor readability, major structural improvements needed

### Perfected Sitemap (v-sitemap.xml)

- XML sitemap file combining original sitemap URLs with all discovered URLs
- Includes all URLs from initial sitemap
- Adds discovered URLs not in original sitemap
- Discovered URLs marked with XML comment: `<!-- Discovered during analysis -->`
- Valid XML format ready for submission to search engines
- Ensures complete site coverage in search engine indexing

Usage:

1. Review the file to verify discovered URLs are legitimate
2. Submit to Google Search Console and other search engines
3. Use as your new canonical sitemap for complete site coverage

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

The tool maintains a dual-layer cache system to improve performance and enable debugging:

### Cache Structure

- **Cache location**: `.cache` directory (automatically created if missing)
- **Rendered Cache** (`.cache/rendered/`):
  - Contains HTML after JavaScript execution
  - Generated by Puppeteer browser rendering
  - Represents the DOM as users see it
  - Also contains browser console logs (`.log` files)
- **Served Cache** (`.cache/served/`):
  - Contains original HTML as received from server
  - Before JavaScript execution
  - Useful for comparing server-side vs. client-side rendering
- **Cache naming**: MD5 hash of URLs for consistent file identification
- **Cache format**: HTML files for page content, `.log` files for console output

### Purpose of Dual Cache

The dual cache structure allows you to:
- Compare rendered vs. served HTML for debugging
- Identify JavaScript-driven content changes
- Analyze server-side vs. client-side rendering differences
- Debug SEO issues related to JavaScript rendering
- Review browser console output for client-side JavaScript debugging

### Console Log Capture

For every page rendered with Puppeteer, the tool automatically captures ALL browser console output:

**What's Captured:**
- All console message types: `log`, `warn`, `error`, `info`, `debug`, etc.
- Timestamps for each message
- Complete message text as it appears in the browser console

**Storage Location:**
- Saved to: `.cache/rendered/{cache-key}.log`
- Same MD5 cache key as the corresponding HTML file for easy pairing
- Example: If HTML is `a1b2c3d4.html`, console log is `a1b2c3d4.log`

**Format:**
```
[2025-12-07T10:30:45.123Z] [LOG] Page loaded successfully
[2025-12-07T10:30:45.456Z] [WARN] Deprecated API usage detected
[2025-12-07T10:30:45.789Z] [ERROR] Failed to load resource
```

**Empty Console:**
- If no console output is captured, the file contains: `// No console output captured`

**Use Cases:**
- Debug client-side JavaScript errors
- Identify console warnings and deprecation notices
- Track application flow and logging patterns
- Analyze third-party script behavior
- Troubleshoot runtime issues across multiple pages

### Cache Control Options

- `--cache-only`: Use only cached data (no network requests)
- `--no-cache`: Disable caching (fetch everything fresh)
- `--force-delete-cache`: Delete entire results directory including cache and all reports before starting

## Recursive Crawling

By default, the tool performs **recursive site crawling** to ensure complete coverage of your website. This goes beyond just analyzing URLs in your sitemap.

### How It Works

1. **Initial URLs**: Starts with URLs from your sitemap or initial webpage
2. **Link Discovery**: Extracts all same-domain links from each analyzed page
3. **Queue Processing**: Adds discovered URLs to a processing queue
4. **Continuation**: Continues analyzing new pages until no new URLs are found
5. **URL Normalization**: Automatically normalizes URLs to prevent duplicate processing

### URL Normalization

The tool implements two-stage URL normalization to ensure each unique page is analyzed only once:

**Normalization Rules:**
- Strips hash fragments: `https://example.com/page#section` → `https://example.com/page`
- Removes query parameters: `https://example.com/page?ref=twitter` → `https://example.com/page`
- Skips self-references: URLs pointing to the current page are not added to queue
- Deduplicates: Tracks processed URLs to prevent re-analysis

**Why This Matters:**
- Prevents wasted resources analyzing the same content multiple times
- Keeps discovered URL lists clean and meaningful
- Ensures accurate sitemap generation without duplicates
- Reduces overall processing time

### When to Use Recursive Mode

**Use recursive mode (default):**
- Complete site audits requiring full coverage
- Finding pages missing from your sitemap
- Building comprehensive resource inventory
- Discovering orphaned or hard-to-find pages
- SEO audits requiring complete site analysis

**Disable with `--no-recursive`:**
- Analyzing only specific URLs from your sitemap
- Testing with a known, controlled list of URLs
- Faster analysis when complete coverage is not needed
- Reducing processing time for large sites

### Console Progress Tracking

During recursive crawling, you'll see progress messages like:

```
Processing URL 15 (23 URLs in queue)...
Processing URL 16 (22 URLs in queue)...
Recursive crawling complete. Processed 50 total URLs.
```

This shows:
- Current URL being processed
- Number of discovered URLs waiting in queue
- Final count when crawling completes

### Performance Considerations

- **Processing Time**: Recursive mode takes longer as it analyzes more pages
- **Resource Usage**: More pages means more memory and network bandwidth
- **Queue Growth**: Queue can grow significantly for large, well-connected sites
- **Limit Options**: Use `-l` or `-c` flags to limit scope during testing

### Example Usage

```bash
# Full recursive site crawl (default)
npm start -- -s https://example.com/sitemap.xml

# Sitemap-only analysis (no recursion)
npm start -- -s https://example.com/sitemap.xml --no-recursive

# Limited recursive crawl for testing
npm start -- -s https://example.com/sitemap.xml -l 50

# Complete fresh recursive analysis
npm start -- --force-delete-cache -s https://example.com/sitemap.xml
```

### Generated Outputs

Recursive crawling produces additional insights:

1. **missing_sitemap_urls.csv**: URLs discovered but not in your sitemap
2. **v-sitemap.xml**: Perfected sitemap with all discovered URLs
3. **all_resources_report.csv**: Complete resource inventory across all pages

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

Unexpected Number of URLs Processed

```
Processed 500 URLs when only 50 were expected
```

Solution: Recursive mode is enabled by default. Use `--no-recursive` to analyze only sitemap URLs

Duplicate URL Warnings

```
URL already processed, skipping...
```

Explanation: This is normal behavior. The tool normalizes URLs by stripping hash fragments and query parameters to prevent duplicate processing

### Error Messages

- `Invalid sitemap format`: Check if URL points to valid sitemap
- `Failed to parse HTML`: Check if URL returns valid HTML
- `Network error`: Check internet connection
- `Permission denied`: Check directory permissions

### Missing Rendered or Served Files

If you don't see new files in `.cache/rendered` or `.cache/served`, the script might be using existing results. Delete `results/results.json` to force a fresh run:

```bash
rm results/results.json
npm start
```

## Best Practices

1. Start Small
   - Test with few URLs first using `-l 10` or `-c 10`
   - Use `--no-recursive` for initial testing to limit scope
   - Review test results before running full analysis
   - Consider memory and time constraints for large sites

2. Choose the Right Crawling Mode
   - **Use recursive mode (default)** for:
     - Complete site audits
     - SEO comprehensive analysis
     - Finding orphaned pages
     - Building complete sitemaps
   - **Use `--no-recursive`** for:
     - Quick sitemap validation
     - Testing specific pages
     - Faster analysis cycles
     - Limited scope audits

3. Monitor Logs
   - Check `error.log` for issues
   - Use `--log-level debug` for detailed troubleshooting
   - Review `combined.log` for complete activity history
   - Watch console output for queue progress during recursive crawling

4. Regular Cache Cleanup
   - Use `--force-delete-cache` for complete fresh starts
   - Clear cache if behavior seems incorrect or outdated
   - Delete `results/results.json` to force re-analysis
   - Clean up old results directories periodically

5. Handle Network Issues
   - Check internet connection before starting
   - Use retry mechanism when network errors occur
   - Monitor network stability during long runs
   - Consider rate limiting for large site crawls

6. Leverage Generated Reports
   - **missing_sitemap_urls.csv**: Review for SEO improvements, add missing URLs to sitemap
   - **all_resources_report.csv**: Identify critical dependencies and potential single points of failure
   - **v-sitemap.xml**: Submit to search engines for complete site indexing
   - **accessibility_report.csv**: Prioritize fixes by severity level
   - **performance_analysis.csv**: Focus on pages with high load times

7. Optimize Resource Usage
   - Use `-l` flag to limit URLs during development/testing
   - Monitor memory usage on large sites (1000+ pages)
   - Consider running analysis during off-peak hours
   - Process sites in batches if needed for very large sites

## Support

For issues and questions:

- Check error logs first
- Verify input parameters
- Check documentation
- Submit issue with full error details
