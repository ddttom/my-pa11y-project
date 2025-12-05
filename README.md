# SEO Analysis Tool

A Node.js tool for analyzing website SEO and performance metrics with comprehensive accessibility testing.

The folder /docs, in the repo, contains prompts in .md format that are useful for extending this project

## Key Features

- **SEO Analysis**: Detailed SEO metrics and scoring
- **Performance Metrics**: Comprehensive page load analysis
- **Accessibility Testing**: WCAG 2.1 compliance checking with Pa11y integration
  - Detailed markdown reports for better readability
- **Content Quality**: Structure and freshness analysis
- **External Resources Tracking**: Complete inventory of all external dependencies
  - JavaScript, CSS, images, fonts, videos, and other media
  - Site-wide usage counts and frequency analysis
  - Sorted by usage to identify critical dependencies
- **Sitemap Gap Analysis**: Discover URLs missing from your sitemap
  - Automatically identifies same-domain URLs discovered during analysis
  - Tracks which pages aren't listed in your original sitemap
  - Generates perfected sitemap (v-sitemap.xml) including all discovered URLs
  - Helps improve search engine crawling and indexing
- **Automatic Cache Management**: .cache directory creation and management
  - **Rendered Page Caching**: Automatically saves rendered HTML for debugging
  - **Served Page Caching**: Automatically saves original served HTML for debugging
- **Robust Error Handling**: Network error recovery and retry mechanism
- **URL Processing Control**: Limit number of URLs processed using count parameter
- **Output Directory Preservation**: Existing output directory contents are preserved
- **Configurable Sampling**: Test with small samples before full analysis
- **Results File Detection**: Automatic detection of results.json for report generation
- **Iterative Testing**: Test reports with small samples, then run full analysis
- **Language Variant Filtering**: Skip non-English variants by default (only process /en and /us)
  - Enhanced URL extraction logic with automatic language variant detection
  - Centralized language variant checking in report generation

  ## Complete Website Analysis Tool: Business Guide

## What This Tool Does For You

Our comprehensive website analysis tool helps you understand and improve every aspect of your website's performance. Think of it as a complete health check-up for your website that shows you exactly where to make improvements.

## Key Benefits

### Search Engine Visibility (SEO)

Find out how well search engines can find and understand your website:

- How your pages appear in search results
- Whether your content is properly structured
- If your images are helping or hurting your search rankings
- How well your pages link together
- Whether you're following SEO best practices
- If social media platforms can properly share your content
- Whether search engines can understand your specialized content (like product details or events)

### User Experience

Understand how visitors experience your website:

- How quickly pages load on different devices
- When visitors can start interacting with your pages
- Whether content shifts around while loading (which frustrates users)
- How smoothly your site performs
- If your site works well on mobile devices
- Whether your navigation helps or confuses visitors

### Accessibility Compliance

Ensure your website works for everyone:

- Compliance with latest accessibility standards (WCAG 2.1)
- Detailed breakdown of accessibility issues by importance
- Clear instructions for fixing problems
- Guidance on manual checks needed
- Analysis of color contrast and readability
- Keyboard navigation assessment
- Screen reader compatibility

### Content Quality

Get deep insights into your content:

- How fresh and unique your content is
- Whether you're using the right amount of media (images, videos)
- If your content is properly structured
- How readable your content is
- Which keywords you're ranking for
- Content quality comparison across pages
- Duplicate content detection

### Image Optimization

Detailed analysis of your website's images:

- Whether images are slowing down your site
- If images look good on all devices
- Whether images have proper descriptions
- How well images are optimized
- Specific recommendations for improvement
- Impact on page loading speed

### Website Structure

Understand how your website fits together:

- How pages connect to each other
- Whether your navigation makes sense
- If you have broken links
- How deep visitors need to click
- Quality of your internal linking
- External link assessment

### External Resources Analysis

Track all external dependencies and third-party resources:

- Comprehensive inventory of all external resources (JavaScript, CSS, images, fonts, videos, etc.)
- Site-wide usage counts for each external resource
- Identify most frequently used external dependencies
- Detect potential single points of failure
- Monitor third-party resource usage across your site
- Support for CDN and external service auditing

### Sitemap Gap Detection

Discover and fix missing URLs in your sitemap:

- Automatically tracks all same-domain URLs found during page analysis
- Compares discovered URLs against your original sitemap
- Identifies pages that exist but aren't in your sitemap
- Shows how many pages link to each discovered URL
- Generates a perfected sitemap including all discovered URLs
- Helps ensure complete search engine coverage

## Reports You'll Receive

### 1. SEO Performance Report

Shows how well search engines can understand your site:

- Page titles and descriptions
- Content structure
- Image optimization
- Link analysis
- Technical SEO factors

### 2. User Experience Report

Measures how visitors interact with your site:

- Page speed metrics
- Interactive timing
- Visual stability
- Performance scores
- User experience metrics

### 3. Accessibility Compliance Report

Three formats for different needs:

- Executive summary of compliance
- Detailed issue breakdown
- Step-by-step fixing guide

### 4. Content Quality Report

Evaluates your content effectiveness:

- Content freshness
- Engagement potential
- Media usage
- Quality scores
- Improvement recommendations

### 5. Technical Health Report

Combines key technical metrics:

- Loading speed
- Mobile friendliness
- Technical errors
- Server performance
- Security indicators

### 6. External Resources Report

Comprehensive analysis of third-party dependencies:

- Complete inventory of external JavaScript, CSS, images, fonts, and media files
- Site-wide usage frequency for each resource
- Resource type breakdown (JavaScript, CSS, images, fonts, videos, audio, iframes)
- Sorted by usage count to identify critical dependencies
- Helps assess third-party service impact

### 7. Missing Sitemap URLs Report

Identifies content gaps in your sitemap:

- Lists same-domain URLs discovered during analysis but not in original sitemap
- Shows how many pages link to each discovered URL
- Helps identify orphaned or undiscovered pages
- Enables sitemap improvement for better SEO
- Generates perfected sitemap (v-sitemap.xml) with all URLs included

## Making the Most of Your Reports

### Priority Guidelines

Focus on issues in this order:

1. Critical technical problems
2. Major accessibility issues
3. Significant SEO problems
4. Performance improvements
5. Content enhancements

### Regular Monitoring

We recommend:

- Monthly full site analysis
- Weekly checks of key pages
- Immediate analysis after major updates
- Quarterly trend review

### Action Planning

For each report:

1. Review executive summaries
2. Identify critical issues
3. Create prioritized task lists
4. Assign responsibilities
5. Set improvement targets

## Support and Next Steps

Your technical team can:

- Schedule regular analyses
- Set up custom reports
- Configure analysis parameters
- Handle any technical issues
- Implement recommended changes

## Future Capabilities

The tool is continuously improving to add:

- Advanced content analysis
- Deeper user behavior insights
- More detailed performance metrics
- Additional report types
- Real-time monitoring capabilities

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

### Troubleshooting

#### Missing Rendered or Served Files

If you don't see new files in `.cache/rendered` or `.cache/served`, the script might be using existing results. Delete `results/results.json` to force a fresh run:

```bash
rm results/results.json
npm start
```

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

- `external_resources_report.csv`: External resource inventory
  - Resource URL
  - Resource Type (javascript, css, image, font, video, audio, iframe, other)
  - Total Count (site-wide usage frequency)
  - Sorted by count (most used resources first)

- `missing_sitemap_urls.csv`: Discovered URLs not in original sitemap
  - Discovered URL (same-domain URLs found during analysis)
  - Found On Pages Count (number of pages linking to this URL)
  - Helps identify sitemap gaps and orphaned pages

- `v-sitemap.xml`: Perfected sitemap
  - Includes all original sitemap URLs
  - Plus all discovered same-domain URLs
  - Marks discovered URLs with XML comments
  - Ready to submit to search engines

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
