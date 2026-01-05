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

### Regression Detection

Automated quality gate enforcement with baseline comparison.

**Enable with**: `--enable-history` and `--establish-baseline`

**Features**:

- **Baseline Establishment**: Mark specific results as reference points
- **Severity Classification**: Critical (>30%), Warning (>15%), Info
- **Comprehensive Checks**:
  - Performance regressions (load time, LCP, FCP, CLS)
  - Accessibility regressions (error count increases)
  - SEO score drops
  - LLM compatibility decreases
  - URL count changes
- **Actionable Reports**: Markdown reports with immediate and short-term actions
- **CI/CD Ready**: Automatic build failure on critical regressions
- **Alerting**: Console warnings for regressions with severity levels

**Output Files**:

- `baseline.json` - Established baseline for comparison
- `regression_report.md` - Detailed regression analysis with recommendations

**Use Cases**:

- Prevent quality regressions in production
- CI/CD quality gates
- Automated deployment validation
- Performance monitoring over releases
- Accessibility compliance maintenance

**Example Workflow**:

```bash
# Establish baseline on main branch
npm start -- -s https://production.com/sitemap.xml \
  --enable-history \
  --establish-baseline

# Future runs detect regressions
npm start -- -s https://production.com/sitemap.xml --enable-history
# Output: 🚨 CRITICAL REGRESSIONS DETECTED: 2 critical issue(s) found
```

### Pattern Extraction

Learn from high-scoring pages to identify successful implementations.

**Enable with**: `--extract-patterns`

**Features**:

- **High-Scoring Page Analysis**: Identifies pages scoring ≥70/100 (configurable)
- **Six Pattern Categories**:
  - Structured Data (JSON-LD, Schema.org)
  - Semantic HTML (main, nav, header, article, section)
  - Form Patterns (standard field naming, autocomplete)
  - Error Handling (persistent errors, aria-live)
  - State Management (data attributes for validation, loading)
  - llms.txt Implementation
- **Real-World Examples**: Up to 5 working examples per category
- **Priority & Effort Levels**: Critical/High priority, Low/Moderate effort
- **Implementation Recommendations**: Actionable guidance for each pattern

**Configuration**:

- `--pattern-score-threshold <number>`: Minimum score (default: 70)

**Output Files**:

- `pattern_library.md` - Comprehensive pattern library with examples

**Use Cases**:

- Learn from successful implementations
- Identify working patterns in production
- Guide new feature development
- Training and documentation
- Best practice identification

**Example Workflow**:

```bash
# Extract patterns from high-scoring pages
npm start -- -s https://example.com/sitemap.xml \
  --extract-patterns \
  --pattern-score-threshold 75

# Output: ✅ Pattern extraction complete: 15 high-scoring pages analyzed
```

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

**Location**: `src/config/defaults.js`

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

Production-ready automation for continuous quality monitoring.

**Comprehensive Guide**: See [.github/CI_CD_INTEGRATION.md](../.github/CI_CD_INTEGRATION.md)

**GitHub Actions Template**: [.github/workflows/audit-ci.yml.template](../.github/workflows/audit-ci.yml.template)

**Features**:

- **Automated Audits**: Run on push, PR, or manual dispatch
- **Baseline Management**: Automatic baseline caching and restoration
- **Regression Detection**: Fail builds on critical regressions
- **PR Commenting**: Automatic comments with metrics and status
- **Artifact Management**: Upload reports for review
- **Multi-Environment**: Support for staging and production
- **Scheduled Runs**: Nightly or weekly audits
- **Notification Integration**: Slack, email, etc.

**Supported Platforms**:

- **GitHub Actions**: Full workflow template provided
- **GitLab CI**: Example `.gitlab-ci.yml` configuration
- **Jenkins**: Example `Jenkinsfile` pipeline

**Quick Start (GitHub Actions)**:

```bash
# Copy workflow template
cp .github/workflows/audit-ci.yml.template .github/workflows/audit-ci.yml

# Set repository secrets
# AUDIT_SITE_URL: https://staging.example.com

# Update repository reference in workflow
# Push to enable automated audits
git add .github/workflows/audit-ci.yml
git commit -m "Add Web Audit Suite CI integration"
git push
```

**Baseline Management in CI**:

```yaml
# GitHub Actions - Establish baseline on main branch
- name: Establish Baseline
  if: github.ref == 'refs/heads/main'
  run: |
    npm start -- \
      -s $SITE_URL \
      --enable-history \
      --establish-baseline

# Save baseline to cache
- name: Save Baseline
  uses: actions/cache@v3
  with:
    path: results/baseline.json
    key: audit-baseline-${{ github.ref_name }}
```

**Exit Codes**:

- `0` - Success, no critical regressions
- `1` - Failure (critical regressions or processing errors)

**Example CI Script**:

```bash
#!/bin/bash
export NODE_ENV=production
export LOG_LEVEL=warn

npm start -- \
  -s $SITEMAP_URL \
  --enable-history \
  --generate-executive-summary \
  --thresholds ./ci-thresholds.json

# Check for critical regressions
if grep -q "🚨 CRITICAL REGRESSIONS DETECTED" audit.log; then
  echo "Critical regressions detected - failing build"
  cat results/regression_report.md
  exit 1
fi
```

**Use Cases**:

- Automated quality gates for PRs
- Prevent regressions before deployment
- Continuous monitoring of production sites
- Scheduled site health checks
- Multi-environment testing (staging, production)
- Deployment validation

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
