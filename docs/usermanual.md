# Web Audit Suite User Manual

## Overview

Web Audit Suite is a comprehensive website analysis tool that generates detailed reports across multiple dimensions:

- **SEO Performance**: Title tags, meta descriptions, heading structure, structured data
- **Accessibility**: WCAG 2.1 compliance checking (A, AA, AAA levels)
- **Performance**: Load times, paint metrics, time to interactive, cumulative layout shift
- **Security**: HTTPS configuration, security headers (HSTS, CSP, X-Frame-Options)
- **Content Quality**: Content freshness, uniqueness, media richness, structure
- **LLM Suitability**: AI agent compatibility analysis for both served and rendered HTML
- **Technology Detection**: Automatic identification of CMS, frameworks, libraries, analytics tools, and CDNs
- **Base Domain Auto-Discovery**: Automatically includes homepage and `llms.txt` in analysis for comprehensive AI agent compatibility checks

## Getting Started

**Note:** Web Audit Suite is a commercial tool. Access to the repository requires a valid license. Contact <tom@allabout.network> for licensing information.

### Prerequisites

- Node.js version 20.0.0 or higher
- npm package manager
- Internet connection for web crawling
- Valid license agreement

### Installation

```bash
# Navigate to project directory (after receiving repository access)
cd web-audit-suite

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
npm start -- -s https://example.com/sitemap.xml -c 10

# Enable historical tracking and generate dashboard
npm start -- -s https://example.com/sitemap.xml --enable-history --generate-dashboard

# Generate executive summary
npm start -- -s https://example.com/sitemap.xml --generate-executive-summary

# Full analysis with all enhanced features
npm start -- -s https://example.com/sitemap.xml \
  --enable-history \
  --generate-dashboard \
  --generate-executive-summary

# Use custom thresholds
npm start -- -s https://example.com/sitemap.xml --thresholds ./custom-thresholds.json

# Regression detection with baseline
npm start -- -s https://example.com/sitemap.xml \
  --enable-history \
  --establish-baseline

# Pattern extraction from high-scoring pages
npm start -- -s https://example.com/sitemap.xml \
  --extract-patterns \
  --pattern-score-threshold 75

npm start -- -s https://example.com/sitemap.xml -l 10 -o test-results
# Review reports in test-results directory
# When satisfied, run full analysis:
npm start -- -s https://example.com/sitemap.xml -l -1 -o final-results

# Generate reports from existing results.json
npm start -- --cache-only -o reports-from-cache

# Include all language variants in analysis
npm start -- -s https://example.com/sitemap.xml --include-all-languages
```

## Configuration

The application accepts configuration via CLI arguments, environment variables, and a centralized default configuration file.

### Default Configuration

**Location**: `src/config/defaults.js` (see [Configuration Guide](CONFIGURATION.md))

This file contains all default settings including:

- Pa11y options (timeout, viewport, ignore rules)
- Performance thresholds
- Sitemap processing limits

Modify this file to change the baseline behavior of the application that applies when no CLI flags or environment variables are provided.

### Environment Variables

You can configure the application using a `.env` file or environment variables. This is prioritized over default settings but overridden by **explicit** CLI flags.
**Note**: Implicit default values from CLI flags are ignored to allow environment variables to take precedence. You must explicitly provide a flag in the command line for it to override a value set in `.env`.

**Supported Variables:**

- **Core**: `SITEMAP_URL`, `OUTPUT_DIR`, `LOG_LEVEL` (`debug`, `info`, `warn`, `error`)
- **Limits**: `LIMIT`, `COUNT`
- **Features (true/false)**:
  - `ENABLE_HISTORY`
  - `ESTABLISH_BASELINE`
  - `EXTRACT_PATTERNS`
  - `GENERATE_DASHBOARD`
  - `GENERATE_EXECUTIVE_SUMMARY`
  - `INCLUDE_ALL_LANGUAGES`
  - `NO_RECURSIVE`
  - `FORCE_SCRAPE` (default: `false`)
- **Pattern Extraction**: `PATTERN_SCORE_THRESHOLD` (default: 70)
- **Baseline**: `BASELINE_TIMESTAMP` (ISO timestamp)
- **Cache**: `CACHE_ONLY`, `NO_CACHE`, `FORCE_DELETE_CACHE`
- **Other**: `NO_PUPPETEER`, `THRESHOLDS_FILE`

Example `.env`:

```bash
SITEMAP_URL=https://example.com/sitemap.xml
LOG_LEVEL=info
ENABLE_HISTORY=true
ESTABLISH_BASELINE=true
EXTRACT_PATTERNS=true
PATTERN_SCORE_THRESHOLD=75
GENERATE_DASHBOARD=true
GENERATE_EXECUTIVE_SUMMARY=true
```

For detailed configuration documentation, see [Configuration Guide](CONFIGURATION.md).

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
- `--include-all-languages`: Include all language variants in analysis
  - Overrides default behavior of only processing /en and /us variants
  - Uses enhanced URL extraction logic with automatic detection

### robots.txt Compliance

- `--force-scrape`: Bypass robots.txt restrictions (use with caution)
  - Default: respect robots.txt directives
  - Can also be set via `FORCE_SCRAPE=true` in .env
  - When disabled (default), the tool will:
    - Fetch robots.txt before any crawling begins
    - Check compliance before processing each URL
    - Prompt user when a URL is blocked by robots.txt
    - Allow runtime override via interactive prompts

### Cache Control

- `--cache-only`: Use only cached data
- `--no-cache`: Disable caching
- `--force-delete-cache`: Clear cache and old reports (preserves history/ and baseline.json)

### Enhanced Features

- `--enable-history`: Enable historical tracking for comparative analysis
  - Stores timestamped results in `history/` directory
  - Enables comparison with previous runs
  - Tracks trends over time
- `--establish-baseline`: Establish current results as baseline for regression detection
  - Requires `--enable-history` flag
  - Creates `baseline.json` as reference point
  - Future runs will compare against this baseline
  - Optional: `--baseline-timestamp <timestamp>` to use specific historical result
- `--extract-patterns`: Extract successful patterns from high-scoring pages
  - Analyzes pages with scores ≥70/100 (configurable)
  - Generates `pattern_library.md` with working examples
  - Six categories: structured data, semantic HTML, forms, errors, state, llms.txt
  - Optional: `--pattern-score-threshold <number>` to adjust minimum score
- `--generate-dashboard`: Generate interactive HTML dashboard with charts
  - Visual analytics with embedded charts
  - Performance, accessibility, SEO, content, and LLM metrics
  - Historical trend charts (when history enabled)
  - Comparison tables and pass/fail summaries
- `--generate-executive-summary`: Generate executive summary report
  - Single-page overview with key insights
  - Generates both Markdown (`executive_summary.md`) and JSON formats
  - Key findings and actionable recommendations
  - Comparison with previous run (when history enabled)
- `--thresholds <file>`: Path to custom thresholds configuration (JSON)
  - Customize pass/fail criteria for all metrics
  - See [Configuration Guide](CONFIGURATION.md) for details

## robots.txt Compliance and Ethical Scraping

Web Audit Suite includes a comprehensive robots.txt compliance system to ensure ethical and respectful web scraping practices.

### How It Works

1. **Phase 0: robots.txt Fetching**
   - Before any URL crawling begins, the tool fetches robots.txt from the target site
   - Parses directives for the `WebAuditSuite/1.0` user agent and wildcard (`*`) rules
   - Logs a summary of discovered rules, user agents, and sitemaps

2. **Compliance Checking**
   - Before processing each URL, the tool checks if it's allowed by robots.txt
   - Implements the robots exclusion standard with:
     - Wildcard pattern matching (`*`)
     - End-of-path markers (`$`)
     - Longest-match-wins precedence
     - Allow rules take precedence over Disallow rules of equal specificity

3. **Interactive User Prompts**
   - When a URL is blocked by robots.txt, you'll see a prompt with these options:
     - `[y]` Scrape this URL only (override for single URL)
     - `[a]` Enable force-scrape mode (bypass all subsequent robots.txt checks)
     - `[n]` Skip this URL and continue
     - `[q]` Quit the analysis
   - The first blocked URL shows a detailed explanation
   - Subsequent blocks show abbreviated prompts

4. **Force-Scrape Mode**
   - Can be enabled at startup via `--force-scrape` flag or `FORCE_SCRAPE=true` in .env
   - Can be enabled mid-session by selecting `[a]` when prompted
   - When enabled, all robots.txt checks are bypassed
   - State changes are prominently logged

### Example Scenarios

#### Scenario 1: Site allows scraping

```bash
$ npm start -- -s https://example.com/sitemap.xml

✓ robots.txt compliance ENABLED (default)
Phase 0: Fetching robots.txt for compliance checking...
✓ robots.txt fetched and parsed successfully
robots.txt summary:
  - User agents declared: 2 (*, GPTBot)
  - Total rules: 5
  - Sitemaps: 1
```

#### Scenario 2: Site blocks some URLs

```bash
Phase 2: Processing URLs...

⚠️  robots.txt RESTRICTION DETECTED

The URL is blocked by robots.txt:
  URL: https://example.com/admin/dashboard
  Rule: /admin

Options:
  [y] Scrape this URL anyway (override for this URL only)
  [a] Scrape all URLs (enable force-scrape mode for remainder of session)
  [n] Skip this URL and continue
  [q] Quit the analysis

Your choice (y/a/n/q): n
✓ Skipping this URL
```

#### Scenario 3: Enabling force-scrape mode mid-session

```bash
Your choice (y/a/n/q): a
✓ Force-scrape mode ENABLED - all robots.txt restrictions will be bypassed
   This setting will persist for the remainder of this session

⚠️  User enabled force-scrape mode - robots.txt restrictions will be bypassed for remainder of session
```

#### Scenario 4: Using force-scrape from startup

```bash
$ npm start -- -s https://example.com/sitemap.xml --force-scrape

⚠️  WARNING: robots.txt COMPLIANCE DISABLED
    Force scrape mode is ENABLED
    This bypasses robots.txt restrictions and may violate site policies
    Use with caution and only with explicit permission
✓  Force-scrape mode enabled via --force-scrape flag
```

### Best Practices

1. **Respect robots.txt by default**: Don't use `--force-scrape` unless you have explicit permission
2. **Review robots.txt first**: Check what's restricted before starting analysis
3. **Use selective overrides**: If only a few URLs are blocked, use `[y]` to override individually
4. **Get permission**: For sites with strict robots.txt, contact the site owner before enabling force-scrape
5. **Monitor logs**: The tool logs all compliance checks and state changes for audit trails

### Related Reports

The tool also generates quality analysis reports for robots.txt and llms.txt files:

- `robots_txt_quality.csv`: Quality score and analysis of robots.txt for AI agent compatibility
- `llms_txt_quality.csv`: Quality score and analysis of llms.txt for AI agent guidance
- `ai_files_summary.md`: Human-readable summary of both files

See the AI File Quality Reports section below for details.

## Generated Reports

### Core Reports

#### SEO Report (seo_report.csv)

Basic SEO metrics for each page including title, meta description, heading structure, image and link counts, and content length.

**Fields:**

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

#### Performance Report (performance_analysis.csv)

Page loading speed metrics and Core Web Vitals measurements.

**Fields:**

- URL
- Load Time (ms)
- First Paint (ms)
- First Contentful Paint (ms)
- Largest Contentful Paint (ms)
- Time to Interactive (ms)
- Total Blocking Time (ms)
- Cumulative Layout Shift

#### SEO Scores Report (seo_scores.csv)

Detailed SEO scoring with subscores for different aspects.

**Fields:**

- URL
- Overall SEO Score
- Title Optimization Score
- Meta Description Score
- Content Quality Score
- Link Structure Score
- Technical SEO Score

#### Accessibility Report (accessibility_report.csv)

WCAG 2.1 compliance analysis with issues categorized by severity and guideline level.

**Fields:**

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

#### WCAG Markdown Report (wcag_report.md)

Human-readable accessibility report with path-by-path organization, unique issues with occurrence counts, detailed descriptions, and remediation suggestions.

### Enhanced Reports

#### Image Optimization Report (image_optimization.csv)

Image metrics, alt text quality analysis, and compression suggestions.

**Fields:**

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

#### Link Analysis Report (link_analysis.csv)

Internal/external link structure, navigation analysis, and link quality metrics.

**Fields:**

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

#### Content Quality Report (content_quality.csv)

Content analysis including freshness, uniqueness, and media richness.

**Fields:**

- URL
- Word Count
- Content Freshness Score
- Content Uniqueness Score
- Grammar Score
- Media Richness Score
- Top Keywords
- Overall Content Score

#### Security Report (security_report.csv)

Security headers analysis and HTTPS configuration.

**Fields:**

- URL
- HTTPS Status
- HSTS Header
- CSP Header
- X-Frame-Options
- X-Content-Type-Options
- Security Score
- Recommendations

### LLM Suitability Reports

These reports evaluate website compatibility with AI agents based on patterns from "The Invisible Users" book.

#### General LLM Suitability Report (llm_general_suitability.csv)

Overall AI-friendliness scores showing both served HTML (works for all agents) and rendered HTML (works for browser agents).

**Fields:**

- URL
- HTML Source (served/rendered)
- Served HTML Score (All Agents)
- Rendered HTML Score (Browser Agents)
- Has `<main>`
- Has `<nav>`
- Standard Form Fields %
- Has Schema.org
- Essential Issues Count
- Nice-to-Have Issues Count
- Top Essential Issue
- Top Recommendation

**Scoring:**

- **Served Score (0-100)**: Works for CLI agents, server-based agents, and browser agents
  - 30 points: Semantic HTML structure
  - 40 points: Form field naming and labels
  - 20 points: Schema.org structured data
  - 10 points: Proper table markup
- **Rendered Score (0-100)**: Adds bonus points for browser agents
  - Base served score + up to 30 bonus points for dynamic features

#### Frontend LLM Suitability Report (llm_frontend_suitability.csv)

Frontend-specific patterns separated into served (form patterns, semantic HTML) and rendered (dynamic state, persistent errors).

**Fields:**

- URL
- HTML Source (served/rendered)
- Served Score (All Agents)
- Form Count
- Standard Fields %
- Fields With Labels %
- Semantic Elements Count
- Rendered Score (Browser Agents)
- Explicit State Elements
- Persistent Errors
- Validation State Elements
- Essential Issues
- Key Recommendations

**Key Metrics:**

- **ESSENTIAL_SERVED**: Semantic HTML, form field naming, labels
- **ESSENTIAL_RENDERED**: Dynamic state attributes, persistent error messages
- **NICE_TO_HAVE**: Button explanations, auth state visibility

#### Backend LLM Suitability Report (llm_backend_suitability.csv)

Backend/server-side patterns focusing on served HTML only (HTTP codes, headers, structured data).

**Fields:**

- URL
- Backend Score (0-100)
- HTTP Status Code
- Status Code Appropriate
- HTTPS
- HSTS Header
- CSP Header
- X-Frame-Options
- Schema.org Structured Data
- JSON-LD Scripts
- Essential Issues
- Key Recommendations

**Scoring:**

- 30 points: Correct HTTP status codes
- 40 points: Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- 30 points: Schema.org structured data

### Understanding LLM Scores

**Two HTML States:**

1. **SERVED HTML** (Static): What CLI agents and server-based agents see
   - No JavaScript execution
   - Essential for all agents
   - Focus: Semantic HTML, form names, structured data

2. **RENDERED HTML** (Dynamic): What browser-based agents see
   - After JavaScript execution
   - Additional features for browser agents
   - Focus: Dynamic state, persistent errors, validation feedback

**Importance Levels:**

- **ESSENTIAL_SERVED**: Critical for all agents (heavily weighted)
- **ESSENTIAL_RENDERED**: Critical for browser agents (moderately weighted)
- **NICE_TO_HAVE**: Helpful but not critical (lightly weighted)

## Output Files

All files are generated in the output directory (default: `results/`):

### Data Files

- `results.json` - Complete raw data (single source of truth)
- `summary.json` - High-level site-wide metrics

### CSV Reports

- `seo_report.csv`
- `performance_analysis.csv`
- `seo_scores.csv`
- `accessibility_report.csv`
- `image_optimization.csv`
- `link_analysis.csv`
- `content_quality.csv`
- `security_report.csv`
- `llm_general_suitability.csv`
- `llm_frontend_suitability.csv`
- `llm_backend_suitability.csv`

### Markdown Reports

- `wcag_report.md` - Human-readable accessibility report

### Enhanced Reports (Optional)

Generated when corresponding CLI flags are used:

- `executive_summary.md` - Executive summary report (--generate-executive-summary)
  - Overall status across all categories
  - Technology stack detection (CMS, frameworks, libraries, analytics, CDNs)
  - Key findings and recommendations
  - Pass/fail status with configurable thresholds
  - Comparison with previous run (if history enabled)

- `executive_summary.json` - Machine-readable executive summary
  - Structured data format for automation
  - Integration-ready format

- `dashboard.html` - Interactive HTML dashboard (--generate-dashboard)
  - Visual analytics with embedded charts
  - Performance, accessibility, SEO, content, and LLM metrics
  - Historical trend charts (if multiple runs tracked)
  - Comparison tables showing changes over time
  - Pass/fail summary tables

- `regression_report.md` - Regression analysis report (--enable-history)
  - Automatic when baseline exists
  - Critical regressions (>30% degradation)
  - Warning regressions (>15% degradation)
  - Info changes (notable differences)
  - Actionable recommendations with immediate and short-term actions
  - Performance, accessibility, SEO, and LLM metrics tracking

- `pattern_library.md` - Pattern library report (--extract-patterns)
  - Successful patterns from high-scoring pages (≥70/100)
  - Six pattern categories with real-world examples
  - Priority and effort levels for each pattern
  - Implementation recommendations
  - Examples: structured data, semantic HTML, forms, error handling, state management, llms.txt

### Historical Data

Created when `--enable-history` is used:

- `history/` directory - Timestamped historical results
  - `results-<timestamp>.json` - Complete results from each run
  - Enables comparative analysis and trend tracking

- `baseline.json` - Established baseline (--establish-baseline)
  - Reference point for regression detection
  - Created from current or historical result
  - Used for future comparisons to detect quality changes

### Sitemaps

- `virtual_sitemap.xml` - Initial crawl results
- `final_sitemap.xml` - Complete discovered URLs

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

- Cache location: `{outputDir}/.cache/` directory (automatically created)
- Cache subdirectories: `rendered/`, `served/`, `screenshots/`
- Cache format: JSON files and HTML snapshots
- Cache naming: MD5 hash of URLs

### Cache Control Options

- `--cache-only`: Use only cached data
- `--no-cache`: Disable caching
- `--force-delete-cache`: Clear cache and old reports while preserving historical data

**Important**: The `--force-delete-cache` flag intelligently clears:

- ✅ Cache directory (`.cache/`) - Rendered HTML, served HTML, screenshots
- ✅ Old report files - CSVs, JSON reports, markdown files, logs
- ✅ **PRESERVES** `history/` directory - Historical tracking data for trend analysis
- ✅ **PRESERVES** `baseline.json` - Regression detection baseline

This ensures you can clear stale cache without losing valuable historical tracking or regression baselines needed for CI/CD pipelines and quality monitoring.

## Network Error Handling

The tool includes robust network error handling:

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
- Cloudflare challenges (automatic bypass attempt)

### Retry Mechanism

When a network error occurs:

1. The tool pauses and displays error details
2. You're prompted to retry after fixing the issue
3. Automatic retry up to 3 times
4. You can cancel the operation if needed

### Example Network Error Flow

```bash
[ERROR] Network error: Could not connect to example.com
Reason: ETIMEDOUT
Would you like to retry? (yes/no): yes
Retrying connection... (attempt 1/3)
```

## Language Variant Filtering

By default, the tool skips non-English language variants to avoid duplicate content analysis:

- **Processed by default**: `/en`, `/us`
- **Skipped by default**: `/fr`, `/es`, `/de`, etc.
- **Override**: Use `--include-all-languages` flag

This filtering applies to:

- URL extraction from sitemaps
- Report generation
- Content analysis

## Base Domain Auto-Discovery

The tool automatically ensures comprehensive AI agent compatibility analysis by adding priority URLs to the processing queue:

### Automatic URL Addition

When analyzing any website, the tool automatically adds:

1. **Base Domain URL** (e.g., `https://example.com/`)
   - Ensures homepage is always analyzed
   - Critical for overall site assessment
   - Works even when passing a sitemap URL or specific page URL

2. **llms.txt URL** (e.g., `https://example.com/llms.txt`)
   - Checks for AI agent guidance file (see [llmstxt.org](https://llmstxt.org/))
   - Essential for LLM suitability scoring
   - Worth 10 points in served score (ESSENTIAL_SERVED metric)

### Priority Processing

- Both URLs are inserted at the **beginning** of the processing queue
- Guarantees analysis even with strict count limits (e.g., `-c 10`)
- No configuration required - works automatically

### Example Behavior

```bash
# Even when limiting to 10 URLs, base domain and llms.txt are included
npm start -- -s https://example.com/sitemap.xml -c 10

# Output includes:
# 1. https://example.com/ (base domain - added automatically)
# 2. https://example.com/llms.txt (added automatically)
# 3-10. First 8 URLs from sitemap
```

### Benefits

- **Complete Coverage**: Never miss homepage analysis
- **AI Compatibility**: Always checks for llms.txt guidance file
- **Flexible Input**: Works with sitemap URLs, page URLs, or any valid URL
- **Zero Configuration**: Automatic detection and addition

## Technology Detection

The tool automatically detects web technologies, frameworks, and libraries used on the homepage. This information is included in the executive summary report when using the `--generate-executive-summary` flag.

### What's Detected

**Content Management Systems:**

- Adobe Experience Manager Edge Delivery Services (EDS)
- WordPress
- Drupal
- Shopify
- Wix
- Webflow
- Squarespace
- Joomla

**JavaScript Frameworks:**

- React
- Vue.js
- Angular
- Svelte
- Next.js
- Nuxt.js

**JavaScript Libraries:**

- jQuery
- Lodash
- Moment.js
- D3.js
- Chart.js
- GSAP
- Alpine.js
- HTMX
- Three.js

**Analytics & Tracking:**

- Google Analytics
- Adobe Analytics
- Matomo
- Hotjar
- Mixpanel
- Segment

**Content Delivery Networks:**

- Cloudflare CDN
- Akamai
- Fastly
- Amazon CloudFront

### Detection Process

1. **Automatic Analysis**: The tool analyzes JavaScript resources loaded on the homepage
2. **Pattern Matching**: Detects technologies based on URL patterns (e.g., `cdn.example.com/jquery.js`)
3. **Confidence Levels**: Each detection includes a confidence rating (high or medium)
4. **Executive Summary Integration**: Results appear in the Technology Stack section

### Adobe EDS Detection

Adobe Edge Delivery Services is detected via multiple specific patterns:

- `scripts/aem.js` file presence
- `.hlx.page` or `.hlx.live` domains
- `franklin` references in URLs
- `/clientlibs/` directory usage
- `/libs/granite/` or `/libs/cq/` paths

Confidence is "high" if `aem.js` or `.hlx` domains are found, otherwise "medium".

### Example Output

The executive summary includes a Technology Stack section:

```markdown
## Technology Stack

**Content Management System:**

- ✅ Adobe Experience Manager Edge Delivery Services (high confidence)

**JavaScript Frameworks:** React, Vue.js

**JavaScript Libraries:** jQuery, D3.js

**Analytics & Tracking:** Google Analytics

**Content Delivery Networks:** Cloudflare

*Detected from 247 resources on https://example.com/*
```

### Technology Detection Benefits

- **Technology Inventory**: Understand what technologies power the site
- **Dependency Tracking**: Identify critical third-party dependencies
- **Architecture Insights**: See frameworks and libraries in use
- **Migration Planning**: Know what needs to be replaced during migrations

## Troubleshooting

### Common Issues

#### Connection Timeouts

```bash
Error: ETIMEDOUT
```

Solution: Check internet connection and try again

#### Invalid URLs

```bash
Error: Invalid URL format
```

Solution: Ensure URL includes protocol (http:// or https://)

#### Memory Issues

```bash
JavaScript heap out of memory
```

Solution: Reduce number of URLs using `-l` or `-c` options

#### Cloudflare Protection

```bash
Error: Cloudflare challenge detected
```

Solution: Tool will automatically attempt bypass using stealth mode

### Error Messages

- `Invalid sitemap format`: Check if URL points to valid sitemap
- `Failed to parse HTML`: Check if URL returns valid HTML
- `Network error`: Check internet connection
- `Permission denied`: Check directory permissions
- `Pa11y timeout`: Large pages may need longer timeout (adjust `pa11y.timeout` in `src/config/defaults.js`)

## Best Practices

### 1. Start Small

Test with few URLs first using `-l` or `-c` options:

```bash
# Test with 10 URLs
npm start -- -s https://example.com/sitemap.xml -l 10 -o test
```

### 2. Iterative Testing

1. Run small sample (10-20 pages)
2. Review reports for correctness
3. Adjust configuration if needed
4. Run full analysis

### 3. Monitor Logs

- Check `error.log` for issues
- Use `--log-level debug` for detailed troubleshooting
- **Note**: Startup parameters are always printed to the terminal regardless of log level for verification.
- Watch for patterns in failures

### 4. Regular Cache Cleanup

Clear cache periodically to ensure fresh data:

```bash
npm start -- -s <url> --force-delete-cache
```

### 5. Handle Network Issues

- Check internet connection before starting
- Use retry mechanism when network errors occur
- Monitor network stability during long runs
- Consider rate limiting for large sites

### 6. Optimize for Large Sites

For sites with >500 pages:

- Use `-c` to limit concurrent processing
- Consider running analysis in batches
- Monitor memory usage
- Use `--cache-only` for report regeneration

### 7. Understand LLM Scores

- **Served Score**: Most important (works for all agents)
- **Essential Issues**: Fix these first
- **Nice-to-Have Issues**: Lower priority
- Browser agents get higher rendered scores

## Workflow Examples

### Basic Site Audit

```bash
# Full analysis of a website
npm start -- -s https://example.com/sitemap.xml -o example-audit
```

### Iterative Testing

```bash
# Step 1: Test with small sample
npm start -- -s https://example.com/sitemap.xml -l 10 -o test

# Step 2: Review reports in test/ directory

# Step 3: Run full analysis
npm start -- -s https://example.com/sitemap.xml -o full-audit
```

### Resume from Cache

```bash
# Step 1: Initial analysis (may be interrupted)
npm start -- -s https://example.com/sitemap.xml -o results

# Step 2: Resume using cache
npm start -- --cache-only -o results
```

### Compare Language Variants

```bash
# Analyze only English pages (default)
npm start -- -s https://example.com/sitemap.xml -o english-only

# Analyze all language variants
npm start -- -s https://example.com/sitemap.xml --include-all-languages -o all-languages
```

## Reading LLM Reports

### Interpreting Scores

#### Served HTML Score (0-100)

- **80-100**: Excellent - Works well for all AI agents
- **60-79**: Good - Minor improvements needed
- **40-59**: Fair - Several essential issues to fix
- **0-39**: Poor - Major issues preventing AI agent compatibility

#### Rendered HTML Score (0-100)

- **80-100**: Excellent - Works well for browser-based agents
- **60-79**: Good - Some dynamic features could improve
- **40-59**: Fair - Essential rendered features missing
- **0-39**: Poor - Significant issues for browser agents

### Priority Framework

1. **Fix Essential_Served Issues First**
   - Add `<main>` and `<nav>` elements
   - Use standard form field names
   - Add Schema.org structured data
   - Fix HTTP status codes

2. **Fix Essential_Rendered Issues Second**
   - Add explicit state attributes for dynamic content
   - Implement persistent error messages
   - Add validation state indicators

3. **Consider Nice-to-Have Features Last**
   - Add data attributes to tables
   - Add button disabled explanations
   - Add auth state attributes

## Advanced Features

### Regression Detection

Automated quality gate enforcement to prevent quality regressions.

**Setup:**

```bash
# Step 1: Enable history and establish baseline on main branch
npm start -- -s https://production.com/sitemap.xml \
  --enable-history \
  --establish-baseline

# Step 2: Future runs automatically detect regressions
npm start -- -s https://production.com/sitemap.xml --enable-history
```

**Features:**

- **Baseline Establishment**: Mark current or historical results as reference point
- **Automatic Detection**: Compare all runs against baseline
- **Severity Classification**:
  - Critical (🚨): >30% degradation - fails builds in CI/CD
  - Warning (⚠️): >15% degradation - requires review
  - Info (ℹ️): Notable changes worth reviewing
- **Comprehensive Checks**:
  - Performance: Load time, LCP, FCP, CLS
  - Accessibility: Error count increases
  - SEO: Score drops
  - LLM: Compatibility score decreases
  - URL Count: Significant changes

**Output:**

The `regression_report.md` file contains:

- Summary of regressions by severity
- Critical regressions requiring immediate action
- Warning regressions to review
- Info changes for awareness
- Immediate action recommendations
- Short-term improvement suggestions

**Console Output:**

```bash
🚨 CRITICAL REGRESSIONS DETECTED: 2 critical issue(s) found
Review regression_report.md for details
```

**Use Cases:**

- CI/CD quality gates
- Prevent production regressions
- Deployment validation
- Performance monitoring across releases

### Pattern Extraction

Learn from successful implementations by extracting patterns from high-scoring pages.

**Setup:**

```bash
# Extract patterns from pages scoring ≥70/100
npm start -- -s https://example.com/sitemap.xml \
  --extract-patterns \
  --pattern-score-threshold 70
```

**Features:**

- **High-Scoring Analysis**: Identifies pages with excellent AI agent compatibility
- **Six Pattern Categories**:
  1. **Structured Data**: JSON-LD, Schema.org implementations
  2. **Semantic HTML**: Proper use of main, nav, header, article, section
  3. **Form Patterns**: Standard field naming, autocomplete attributes
  4. **Error Handling**: Persistent error messages, aria-live
  5. **State Management**: Validation state, loading state, agent visibility
  6. **llms.txt**: AI agent guidance file implementations
- **Real-World Examples**: Up to 5 working examples per category
- **Priority & Effort Levels**: Critical/High priority, Low/Moderate effort
- **Actionable Recommendations**: Implementation guidance for each pattern

**Output:**

The `pattern_library.md` file contains:

- Pattern name and description
- Priority and effort assessment
- Real-world examples from your site
- Implementation recommendations
- Expected impact on scores

**Console Output:**

```bash
✅ Pattern extraction complete: 15 high-scoring pages analyzed
Pattern library saved to pattern_library.md
```

**Use Cases:**

- Learn from successful pages on your own site
- Identify working patterns in production
- Guide development of new features
- Create internal best practices documentation
- Training and knowledge sharing

### CI/CD Integration

Automate quality checks in your development pipeline.

**Quick Start:**

```bash
# Copy GitHub Actions workflow template
cp .github/workflows/audit-ci.yml.template .github/workflows/audit-ci.yml

# Configure secrets in GitHub (Settings → Secrets → Actions)
AUDIT_SITE_URL: https://staging.example.com

# Update repository reference and commit
git add .github/workflows/audit-ci.yml
git commit -m "Add Web Audit Suite CI integration"
git push
```

**Features:**

- **Automated Runs**: On push, PR, or manual trigger
- **Baseline Management**: Automatic caching and restoration
- **Regression Detection**: Fail builds on critical regressions
- **PR Comments**: Automatic feedback on pull requests
- **Artifact Management**: Download reports for review
- **Multi-Environment**: Separate configs for staging/production

**Supported Platforms:**

- GitHub Actions (full template provided)
- GitLab CI (example configuration)
- Jenkins (example Jenkinsfile)

**Documentation:**

See [.github/CI_CD_INTEGRATION.md](../.github/CI_CD_INTEGRATION.md) for complete setup guide including:

- Step-by-step instructions
- Configuration options
- Failure thresholds
- Troubleshooting
- Best practices
- Advanced scenarios (scheduled runs, multiple environments, notifications)

**Use Cases:**

- Quality gates for pull requests
- Automated deployment validation
- Continuous production monitoring
- Performance regression prevention
- Accessibility compliance tracking

## Support

For issues and questions:

1. Check error logs first (`error.log`)
2. Verify input parameters
3. Review this documentation
4. Check TODO.md for known issues
5. Submit issue with:
   - Full error message
   - Command used
   - URL being analyzed
   - Node.js version
   - Relevant log excerpts

## Version Information

- Node.js: >= 20.0.0
- Package Version: 1.0.0
- Last Updated: January 2026
