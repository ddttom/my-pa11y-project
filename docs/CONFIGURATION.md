```markdown
# Configuration Guide

Complete guide to configuring the Web Audit Suite.

## Table of Contents

- [Configuration Methods](#configuration-methods)
- [CLI Options](#cli-options)
- [Environment Variables](#environment-variables)
- [Configuration Files](#configuration-files)
- [Constants Reference](#constants-reference)
- [Threshold Configuration](#threshold-configuration)
- [Examples](#examples)

## Configuration Methods

The Web Audit Suite supports three configuration methods, in order of precedence:

1. **CLI Arguments** (highest priority)
2. **Environment Variables** (medium priority)
3. **Default Values** (lowest priority)

## CLI Options

### Required Options

#### `-s, --sitemap <url>`

URL of the sitemap or webpage to process.

- **Type**: String (URL)
- **Required**: Yes (unless set via environment variable)
- **Example**: `npm start -- -s https://example.com/sitemap.xml`

### Output Options

#### `-o, --output <directory>`

Output directory for all generated reports and data.

- **Type**: String (path)
- **Default**: `results`
- **Example**: `npm start -- -o ./audit-results`
- **Environment**: `OUTPUT_DIR`

### URL Processing Options

#### `-c, --count <number>`

Limit number of URLs to process from sitemap.

- **Type**: Integer
- **Default**: `-1` (process all URLs)
- **Valid Values**: -1 or any positive integer
- **Example**: `npm start -- -c 10` (process first 10 URLs)

#### `-l, --limit <number>`

Limit number of URLs to test (similar to count, legacy option).

- **Type**: Integer
- **Default**: `-1` (test all URLs)
- **Example**: `npm start -- -l 20`

#### `--include-all-languages`

Include all language variants in analysis.

- **Type**: Boolean flag
- **Default**: `false` (only process /en and /us URLs)
- **Example**: `npm start -- --include-all-languages`

#### `--no-recursive`

Disable recursive crawling (only process sitemap URLs).

- **Type**: Boolean flag
- **Default**: `true` (recursive enabled)
- **Example**: `npm start -- --no-recursive`

### Cache Options

#### `--cache-only`

Use only cached data, do not fetch new data.

- **Type**: Boolean flag
- **Default**: `false`
- **Example**: `npm start -- --cache-only`

#### `--no-cache`

Disable caching completely, always fetch fresh data.

- **Type**: Boolean flag
- **Default**: `false` (caching enabled)
- **Example**: `npm start -- --no-cache`

#### `--force-delete-cache`

Force delete existing cache before starting.

- **Type**: Boolean flag
- **Default**: `false`
- **Example**: `npm start -- --force-delete-cache`

### Logging Options

#### `--log-level <level>`

Set the logging verbosity level.

- **Type**: String
- **Default**: `debug`
- **Valid Values**: `error`, `warn`, `info`, `debug`
- **Example**: `npm start -- --log-level info`
- **Environment**: `LOG_LEVEL`

### Enhanced Feature Options

#### `--enable-history`

Enable historical tracking for comparative analysis.

- **Type**: Boolean flag
- **Default**: `false`
- **Example**: `npm start -- --enable-history`
- **Creates**: `history/` directory with timestamped results

#### `--generate-dashboard`

Generate interactive HTML dashboard with charts.

- **Type**: Boolean flag
- **Default**: `false`
- **Example**: `npm start -- --generate-dashboard`
- **Output**: `dashboard.html`

#### `--generate-executive-summary`

Generate executive summary report.

- **Type**: Boolean flag
- **Default**: `false`
- **Example**: `npm start -- --generate-executive-summary`
- **Output**: `executive_summary.md` and `executive_summary.json`

#### `--thresholds <file>`

Path to custom thresholds configuration file.

- **Type**: String (path to JSON file)
- **Default**: Uses built-in thresholds
- **Example**: `npm start -- --thresholds ./custom-thresholds.json`
- **See**: [Threshold Configuration](#threshold-configuration)

## Environment Variables

Environment variables can be set in a `.env` file or directly in the shell.

### Available Environment Variables

#### `NODE_ENV`

Application environment mode.

- **Values**: `development`, `production`, `test`
- **Default**: `development`
- **Usage**: `NODE_ENV=production npm start`

#### `LOG_LEVEL`

Logging level (equivalent to `--log-level`).

- **Values**: `error`, `warn`, `info`, `debug`
- **Default**: `debug`
- **Usage**: `LOG_LEVEL=info npm start`

#### `OUTPUT_DIR`

Output directory (equivalent to `--output`).

- **Default**: `results`
- **Usage**: `OUTPUT_DIR=./my-results npm start`

#### `SITEMAP_URL`

Default sitemap URL (equivalent to `--sitemap`).

- **Usage**: `SITEMAP_URL=https://example.com/sitemap.xml npm start`

#### `CACHE_DIR`

Cache directory location.

- **Default**: `.cache`
- **Usage**: `CACHE_DIR=./custom-cache npm start`

#### `MAX_RETRIES`

Maximum number of retry attempts for failed requests.

- **Default**: `3`
- **Usage**: `MAX_RETRIES=5 npm start`

#### `TIMEOUT`

Default timeout for operations (milliseconds).

- **Default**: `120000` (2 minutes)
- **Usage**: `TIMEOUT=180000 npm start`

### Using .env File

Create a `.env` file in the project root:

```bash
NODE_ENV=production
LOG_LEVEL=info
OUTPUT_DIR=production-results
SITEMAP_URL=https://mysite.com/sitemap.xml
MAX_RETRIES=5
```

Then run:

```bash
npm start
```

## Configuration Files

### Custom Thresholds File

Create a JSON file to customize pass/fail thresholds for different metrics.

**Format**: JSON object with nested threshold definitions

**Location**: Anywhere (specify with `--thresholds` flag)

**Schema**:

```json
{
  "performance": {
    "loadTime": {
      "pass": 3000,
      "warn": 5000
    },
    "lcp": {
      "pass": 2500,
      "warn": 4000
    },
    "fcp": {
      "pass": 1800,
      "warn": 3000
    },
    "cls": {
      "pass": 0.1,
      "warn": 0.25
    },
    "tti": {
      "pass": 3800,
      "warn": 7300
    }
  },
  "accessibility": {
    "maxErrors": {
      "pass": 0,
      "warn": 5
    },
    "maxWarnings": {
      "pass": 10,
      "warn": 30
    },
    "maxTotalIssues": {
      "pass": 20,
      "warn": 50
    }
  },
  "seo": {
    "minScore": {
      "pass": 80,
      "warn": 60
    },
    "minTitleLength": {
      "pass": 30,
      "warn": 20
    },
    "maxTitleLength": {
      "pass": 60,
      "warn": 70
    },
    "minMetaDescLength": {
      "pass": 70,
      "warn": 50
    },
    "maxMetaDescLength": {
      "pass": 155,
      "warn": 170
    }
  },
  "content": {
    "minWordCount": {
      "pass": 300,
      "warn": 150
    },
    "minHeadings": {
      "pass": 3,
      "warn": 1
    }
  },
  "llm": {
    "minServedScore": {
      "pass": 70,
      "warn": 50
    },
    "minRenderedScore": {
      "pass": 60,
      "warn": 40
    }
  }
}
```

**Threshold Levels**:

- **pass**: Metric meets excellent standards
- **warn**: Metric needs attention but not critical

**Rules**:

- For **performance** metrics (times): warn ≥ pass (more time allowed)
- For **accessibility** counts: warn ≥ pass (more issues allowed)
- For **scores** (SEO, LLM): warn ≤ pass (lower score allowed)

## Constants Reference

All constants are defined in `src/config/constants.js`.

### Timeouts

| Constant | Value | Description |
|----------|-------|-------------|
| `PA11Y` | 60000 | Pa11y test timeout (ms) |
| `PA11Y_WAIT` | 2000 | Wait before Pa11y analysis (ms) |
| `PERFORMANCE` | 60000 | Performance analysis timeout (ms) |
| `INITIAL_BACKOFF` | 1000 | Initial retry backoff (ms) |

### Content Thresholds

| Constant | Value | Description |
|----------|-------|-------------|
| `LOW_WORD_COUNT` | 300 | Minimum words for quality content |
| `MIN_HEADINGS` | 3 | Minimum heading count |
| `HIGH_EXTERNAL_LINKS` | 100 | Threshold for excessive external links |

### SEO Thresholds

| Constant | Value | Description |
|----------|-------|-------------|
| `TITLE_MIN_LENGTH` | 30 | Minimum title tag length |
| `TITLE_MAX_LENGTH` | 60 | Maximum title tag length |
| `META_DESC_MIN_LENGTH` | 70 | Minimum meta description length |
| `META_DESC_MAX_LENGTH` | 155 | Maximum meta description length |

### Performance Thresholds

| Metric | Excellent | Good | Fair |
|--------|-----------|------|------|
| Load Time | <1000ms | <2000ms | <3000ms |
| LCP | <2500ms | <4000ms | >4000ms |
| FCP | <1500ms | <2500ms | <4000ms |
| CLS | <0.1 | <0.25 | >0.25 |

### LLM Scoring

| Metric | Points | Category |
|--------|--------|----------|
| Semantic HTML (main) | 10 | Essential (Served) |
| Semantic HTML (nav) | 5 | Essential (Served) |
| Standard Form Field | 2 | Essential (Served) |
| JSON-LD Schema | 10 | Essential (Served) |
| llms.txt | 10 | Essential (Served) |
| Explicit State Attribute | 10 | Essential (Rendered) |
| Agent Visible Control | 5 | Essential (Rendered) |

## Threshold Configuration

### Default Thresholds

The system includes sensible defaults based on industry standards:

- **Performance**: Based on Core Web Vitals
- **Accessibility**: WCAG 2.1 compliance
- **SEO**: Google best practices
- **LLM**: "Invisible Users" patterns

### Custom Thresholds

Create custom thresholds for your specific requirements:

```json
{
  "performance": {
    "loadTime": { "pass": 2000, "warn": 4000 }
  },
  "seo": {
    "minScore": { "pass": 85, "warn": 70 }
  }
}
```

Save as `custom-thresholds.json` and use:

```bash
npm start -- --thresholds ./custom-thresholds.json
```

### Validation

The system validates all threshold configurations:

- Type checking (numbers for metrics, objects for structure)
- Range checking (e.g., CLS must be 0-1)
- Logical consistency (warn ≥ pass for most metrics)

Invalid configurations will generate clear error messages.

## Examples

### Basic Development Workflow

```bash
# Test with 10 URLs
npm start -- -s https://example.com/sitemap.xml -c 10

# Review results, then run full analysis
npm start -- -s https://example.com/sitemap.xml
```

### Production Monitoring

```bash
# Set up environment
export NODE_ENV=production
export LOG_LEVEL=info
export OUTPUT_DIR=/var/audit-results

# Run with history tracking
npm start -- \
  -s https://production.example.com/sitemap.xml \
  --enable-history \
  --generate-dashboard \
  --generate-executive-summary
```

### Custom Quality Standards

```bash
# Create strict thresholds
cat > strict-thresholds.json << EOF
{
  "performance": {
    "loadTime": { "pass": 1000, "warn": 2000 }
  },
  "accessibility": {
    "maxErrors": { "pass": 0, "warn": 0 }
  },
  "seo": {
    "minScore": { "pass": 90, "warn": 80 }
  }
}
EOF

# Run with custom thresholds
npm start -- \
  -s https://example.com/sitemap.xml \
  --thresholds ./strict-thresholds.json \
  --generate-dashboard
```

### CI/CD Integration

For comprehensive CI/CD integration documentation, see [CI/CD Integration Guide](CI-CD-INTEGRATION.md).

**Quick Example:**

```bash
#!/bin/bash
# ci-audit.sh

# Set environment
export NODE_ENV=production
export LOG_LEVEL=warn
export OUTPUT_DIR=./ci-results

# Run audit
npm start -- \
  -s $SITEMAP_URL \
  -c 10 \
  --generate-executive-summary \
  --thresholds ./examples/ci-thresholds.json

# Check exit code
if [ $? -ne 0 ]; then
  echo "Quality gate failed"
  exit 1
fi
```

**GitHub Actions:**

A pre-configured workflow is available at `.github/workflows/quality-gate.yml`. See [CI/CD Integration Guide](CI-CD-INTEGRATION.md) for details.

### Docker Deployment

```dockerfile
# Dockerfile
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

```bash
# Run in Docker
docker run -v $(pwd)/results:/app/results \
  -e SITEMAP_URL=https://example.com/sitemap.xml \
  web-audit-suite
```

## Configuration Priority

When the same option is specified in multiple places:

1. **CLI flags** (highest) - Always wins
2. **Environment variables** (medium) - Used if no CLI flag
3. **Default values** (lowest) - Used if neither above set

Example:

```bash
# Both LOG_LEVEL env and --log-level flag are set
export LOG_LEVEL=info
npm start -- --log-level debug

# Result: Uses 'debug' (CLI takes precedence)
```

## Validation

All configuration is validated before use:

- **Type validation**: Ensures correct data types
- **Range validation**: Checks numeric bounds
- **Format validation**: Validates URLs, paths, etc.
- **Logical validation**: Ensures thresholds make sense

Validation errors will be displayed before the audit starts, preventing wasted processing time.

## Best Practices

1. **Use environment variables for deployment** - Easier to manage across environments
2. **Use CLI flags for one-off runs** - Quick testing and experimentation
3. **Store custom thresholds in version control** - Track quality standards over time
4. **Start with small counts** - Test configuration before full runs
5. **Enable history for production** - Track changes over time
6. **Use strict logging in production** - Reduce log volume
7. **Create environment-specific threshold files** - Different standards for dev/staging/prod

```
