# Web Audit Suite - Features Overview

Complete guide to all features available in the Web Audit Suite.

## Table of Contents

- [Core Analysis Features](#core-analysis-features)
- [Enhanced Reporting Features](#enhanced-reporting-features)
- [Configuration Features](#configuration-features)
- [Integration Features](#integration-features)

## Core Analysis Features

### SEO Analysis

Comprehensive SEO metrics and scoring across multiple dimensions:

- **Title Optimization**: Length, presence, uniqueness
- **Meta Descriptions**: Length, presence, quality
- **Heading Structure**: H1-H6 hierarchy and organization
- **Content Analysis**: Word count, readability, keyword density
- **Link Structure**: Internal and external link quality
- **Structured Data**: Schema.org JSON-LD detection and validation
- **Social Tags**: Open Graph and Twitter Card detection
- **Technical SEO**: URL structure, canonicalization, redirects

**Reports Generated**:

- `seo_report.csv` - Page-level SEO metrics
- `seo_scores.csv` - Detailed SEO scoring

### Performance Analysis

Core Web Vitals and performance metrics:

- **Load Time**: Page load completion time
- **First Paint (FP)**: Time to first pixel render
- **First Contentful Paint (FCP)**: Time to first content render
- **Largest Contentful Paint (LCP)**: Time to largest content element
- **Time to Interactive (TTI)**: Time until page is fully interactive
- **Total Blocking Time (TBT)**: Sum of blocking time
- **Cumulative Layout Shift (CLS)**: Visual stability metric

**Thresholds**:

- Excellent: LCP < 2500ms, FCP < 1500ms, CLS < 0.1
- Good: LCP < 4000ms, FCP < 2500ms, CLS < 0.25
- Needs Improvement: Above good thresholds

**Reports Generated**:

- `performance_analysis.csv` - Detailed performance metrics

### Accessibility Testing

WCAG 2.1 compliance testing with Pa11y integration:

- **Compliance Levels**: A, AA, AAA
- **Issue Categorization**: Error, Warning, Notice
- **Severity Classification**: Critical, Serious, Moderate, Minor
- **WCAG Guidelines**: All Principles (Perceivable, Operable, Understandable, Robust)
- **Remediation Guidance**: Detailed fix suggestions

**Reports Generated**:

- `accessibility_report.csv` - Structured accessibility data
- `wcag_report.md` - Human-readable accessibility report with remediation guidance

### Security Analysis

Security headers and HTTPS configuration analysis:

- **HTTPS Detection**: Protocol validation
- **HSTS**: HTTP Strict Transport Security
- **CSP**: Content Security Policy
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME type sniffing protection
- **Referrer-Policy**: Referrer information control

**Reports Generated**:

- `security_report.csv` - Security headers analysis

### Content Quality Analysis

Content structure and quality metrics:

- **Word Count**: Content length analysis
- **Heading Count**: H1-H6 distribution
- **Paragraph Count**: Content structure
- **List Usage**: Ordered and unordered lists
- **Media Richness**: Image and video presence
- **Content Freshness**: Last modified dates

**Reports Generated**:

- `content_quality.csv` - Content metrics

### Image Analysis

Image optimization and alt text analysis:

- **Image Count**: Total images per page
- **Alt Text Coverage**: Images with/without alt attributes
- **Alt Text Quality**: Descriptive vs generic alt text
- **Image Sizes**: File size analysis
- **Format Detection**: Image format identification
- **Loading Performance**: Image load time impact

**Reports Generated**:

- `image_optimization.csv` - Image analysis and optimization recommendations

### Link Analysis

Internal and external link structure:

- **Internal Links**: Count and quality
- **External Links**: Count and domains
- **Broken Links**: Detection of 404s and errors
- **Link Text Quality**: Descriptive vs generic
- **Navigation Structure**: Site hierarchy analysis

**Reports Generated**:

- `link_analysis.csv` - Link structure and quality

### LLM Suitability Analysis

AI agent compatibility analysis based on "The Invisible Users" patterns:

#### Two HTML States

1. **Served HTML** (Static) - For all agents
   - Semantic HTML structure
   - Form field naming conventions
   - Schema.org structured data
   - llms.txt file presence
   - HTTP status codes
   - Security headers

2. **Rendered HTML** (Dynamic) - For browser agents
   - Explicit state attributes
   - Agent visibility control
   - Persistent error messages
   - Dynamic validation feedback

#### Scoring Categories

- **ESSENTIAL_SERVED** (70 points max): Critical for all agents
- **ESSENTIAL_RENDERED** (30 points max): Critical for browser agents
- **NICE_TO_HAVE** (bonus points): Helpful but not critical

**Reports Generated**:

- `llm_general_suitability.csv` - Overall AI agent compatibility
- `llm_frontend_suitability.csv` - Frontend-specific patterns
- `llm_backend_suitability.csv` - Backend/server-side patterns

## Enhanced Reporting Features

### Historical Comparison

Track website changes over time with comparative analysis.

**Enable with**: `--enable-history`

**Features**:

- Stores timestamped results in `history/` directory
- Compares current run with previous runs
- Calculates percentage changes for all metrics
- Identifies improvements and regressions
- Generates trend data for visualization

**Use Cases**:

- Track performance improvements over time
- Monitor accessibility compliance trends
- Measure impact of SEO optimizations
- Validate deployment changes

### Executive Summary

Single-page overview with key insights and actionable recommendations.

**Enable with**: `--generate-executive-summary`

**Features**:

- Overall status across all categories (Performance, Accessibility, SEO, LLM)
- Key findings highlighting critical issues
- Actionable recommendations prioritized by severity
- Pass/fail status based on configurable thresholds
- Comparison with previous run (when history enabled)
- Both Markdown and JSON formats

**Output Files**:

- `executive_summary.md` - Human-readable format
- `executive_summary.json` - Machine-readable format for automation

**Use Cases**:

- Quick status overview for stakeholders
- CI/CD quality gate decisions
- Management reporting
- Automated quality checks

### Interactive Dashboard

HTML dashboard with visual analytics and embedded charts.

**Enable with**: `--generate-dashboard`

**Features**:

- **Performance Charts**: Bar charts for load time, LCP, FCP, TTI
- **Accessibility Charts**: Pie chart for issue breakdown
- **SEO Charts**: Distribution chart for score ranges
- **Content Charts**: Bar charts for content metrics
- **LLM Charts**: Comparison of served vs rendered scores
- **Trend Charts**: Line charts showing historical trends (when history enabled)
- **Comparison Tables**: Changes between runs
- **Pass/Fail Tables**: Color-coded status summaries

**Output File**:

- `dashboard.html` - Self-contained HTML file with embedded PNG charts

**Use Cases**:

- Visual presentations
- Team collaboration
- Trend visualization
- Progress tracking

### Configurable Thresholds

Customize pass/fail criteria for all metrics.

**Enable with**: `--thresholds <file>`

**Supported Categories**:

- **Performance**: Load time, LCP, FCP, CLS, TTI
- **Accessibility**: Max errors, max warnings, max total issues
- **SEO**: Min score, title length, meta description length
- **Content**: Min word count, min headings
- **LLM**: Min served score, min rendered score

**Threshold Levels**:

- **Pass**: Meets excellent standards
- **Warn**: Needs attention but not critical

**Example Configuration**:

```json
{
  "performance": {
    "loadTime": { "pass": 2000, "warn": 4000 },
    "lcp": { "pass": 2000, "warn": 3500 }
  },
  "accessibility": {
    "maxErrors": { "pass": 0, "warn": 3 }
  },
  "seo": {
    "minScore": { "pass": 85, "warn": 70 }
  }
}
```

**Use Cases**:

- Custom quality standards for different projects
- Stricter criteria for production sites
- Relaxed criteria for development environments
- Industry-specific compliance requirements

## Configuration Features

### Constants System

Centralized constants for all magic numbers and configuration values.

**Location**: `src/config/constants.js`

**Categories**:

- HTTP status codes
- Timeouts and retry configuration
- Performance thresholds
- SEO limits
- LLM scoring values
- Colors and styling
- File names and paths
- Regex patterns

**Benefits**:

- Single source of truth
- Easy to modify thresholds
- Clear documentation of values
- Prevents magic number proliferation

### Configuration Validation

Type-safe configuration with schema validation.

**Location**: `src/config/validation.js`

**Features**:

- Type checking (string, number, boolean, object)
- Range validation (min/max values)
- Format validation (URLs, paths)
- Custom validation functions
- Threshold consistency checks
- Input sanitization
- Clear error messages

**Validates**:

- CLI options
- Environment variables
- Threshold configurations
- All user inputs

### Environment Variable Support

Flexible configuration via environment variables.

**Location**: `src/config/env.js`

**Supported Variables**:

- `NODE_ENV` - Application environment
- `LOG_LEVEL` - Logging verbosity
- `OUTPUT_DIR` - Output directory
- `SITEMAP_URL` - Default sitemap URL
- `CACHE_DIR` - Cache directory
- `MAX_RETRIES` - Maximum retry attempts
- `TIMEOUT` - Default timeout

**Configuration Priority**:

1. CLI flags (highest)
2. Environment variables (medium)
3. Default values (lowest)

**`.env` File Support**:

```bash
NODE_ENV=production
LOG_LEVEL=info
OUTPUT_DIR=production-results
MAX_RETRIES=5
```

**Use Cases**:

- Docker deployments
- CI/CD pipelines
- Multi-environment setups
- Configuration management

### Comprehensive Documentation

Complete configuration reference and guides.

**Documentation Files**:

- `docs/CONFIGURATION.md` - Complete configuration guide
  - All CLI options with examples
  - Environment variable reference
  - Threshold configuration schema
  - Constants reference tables
  - Best practices
  - CI/CD examples
  - Docker deployment examples

- `README.md` - Quick start and overview
- `CLAUDE.md` - Developer guidance
- `docs/usermanual.md` - User-facing documentation

## Integration Features

### CI/CD Integration

Perfect for automated quality checks:

**Exit Codes**:

- `0` - Success
- `1` - Failure (validation errors, processing errors)

**Example CI Script**:

```bash
#!/bin/bash
export NODE_ENV=production
export LOG_LEVEL=warn

npm start -- \
  -s $SITEMAP_URL \
  --generate-executive-summary \
  --thresholds ./ci-thresholds.json

if [ $? -ne 0 ]; then
  echo "Audit failed"
  exit 1
fi

# Parse results and fail if critical issues
node scripts/check-results.js results/executive_summary.json
```

### Docker Support

Container-ready with environment variable configuration:

**Dockerfile Example**:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV OUTPUT_DIR=/app/results

CMD ["npm", "start"]
```

**Run in Docker**:

```bash
docker run -v $(pwd)/results:/app/results \
  -e SITEMAP_URL=https://example.com/sitemap.xml \
  -e GENERATE_DASHBOARD=true \
  web-audit-suite
```

### JSON Output

Machine-readable formats for automation:

- `results.json` - Complete raw data
- `summary.json` - High-level metrics
- `executive_summary.json` - Executive summary
- `history/results-*.json` - Historical data

**Use Cases**:

- Automated quality checks
- Data pipeline integration
- Custom reporting tools
- Trend analysis

### Language Variant Filtering

Control which language variants to analyze:

**Default Behavior**: Only process `/en` and `/us` URLs

**Override with**: `--include-all-languages`

**Benefits**:

- Avoids duplicate content analysis
- Faster processing times
- More focused reports
- Cost savings for multilingual sites

### Resume Capability

Resume interrupted analyses:

**How it Works**:

- Detects existing `results.json`
- Skips data collection phase
- Regenerates reports from cached data

**Use Cases**:

- Report regeneration with different thresholds
- Recovery from interruptions
- Testing report layouts

### Caching System

Improve performance with intelligent caching:

**Cache Locations**:

- `.cache/rendered/` - Rendered HTML cache
- `.cache/served/` - Served HTML cache

**Cache Options**:

- `--cache-only` - Use only cached data
- `--no-cache` - Disable caching
- `--force-delete-cache` - Clear cache before starting

**Cache TTL**: 15 minutes self-cleaning

## Feature Combinations

### Recommended Combinations

#### Development Workflow

```bash
# Quick test with 10 URLs
npm start -- -s https://example.com/sitemap.xml -c 10

# Full analysis with dashboard
npm start -- -s https://example.com/sitemap.xml --generate-dashboard
```

#### Production Monitoring

```bash
npm start -- \
  -s https://production.example.com/sitemap.xml \
  --enable-history \
  --generate-dashboard \
  --generate-executive-summary \
  --thresholds ./production-thresholds.json
```

#### CI/CD Quality Gate

```bash
npm start -- \
  -s $SITEMAP_URL \
  --generate-executive-summary \
  --thresholds ./ci-thresholds.json \
  --no-recursive \
  --log-level warn
```

#### Custom Quality Standards

```bash
npm start -- \
  -s https://example.com/sitemap.xml \
  --thresholds ./strict-thresholds.json \
  --generate-dashboard \
  --enable-history
```

## Feature Roadmap

Future features under consideration:

- Lighthouse integration
- Visual regression testing
- Progressive Web App analysis
- Mobile-specific testing
- Custom plugin system
- API endpoint for remote execution
- Real-time monitoring mode
- Scheduled analysis
- Alert system for threshold violations
- Multi-site comparison
