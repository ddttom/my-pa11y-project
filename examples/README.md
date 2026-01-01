# Threshold Configuration Examples

This directory contains example threshold configuration files for different use cases.

## Available Examples

### 1. Strict Thresholds (`strict-thresholds.json`)

**Use Case**: High-quality production sites, enterprise applications, critical business sites

**Characteristics**:

- Very fast performance requirements (< 1s load time for pass)
- Zero accessibility errors tolerance
- High SEO standards (90+ score for pass)
- Substantial content requirements (500+ words)
- High LLM suitability expectations

**Best For**:

- E-commerce sites
- Financial services
- Healthcare portals
- Government websites
- Sites with strict compliance requirements

**Usage**:

```bash
npm start -- -s https://example.com/sitemap.xml \
  --thresholds ./examples/strict-thresholds.json \
  --generate-dashboard
```

### 2. Relaxed Thresholds (`relaxed-thresholds.json`)

**Use Case**: Development environments, staging sites, internal tools, prototypes

**Characteristics**:

- Lenient performance requirements (< 5s load time for pass)
- Some accessibility errors allowed (up to 5 for pass)
- Lower SEO standards (60+ score for pass)
- Minimal content requirements (150+ words)
- Basic LLM suitability

**Best For**:

- Development/staging environments
- Internal applications
- Proof-of-concept projects
- Early-stage products
- Non-critical sites

**Usage**:

```bash
npm start -- -s https://dev.example.com/sitemap.xml \
  --thresholds ./examples/relaxed-thresholds.json
```

### 3. CI/CD Thresholds (`ci-thresholds.json`)

**Use Case**: Continuous Integration/Continuous Deployment pipelines, automated quality gates

**Characteristics**:

- Balanced performance requirements (< 3s load time for pass)
- Minimal accessibility errors (0 for pass, 2 for warn)
- Moderate SEO standards (75+ score for pass)
- Reasonable content requirements (300+ words)
- Good LLM suitability

**Best For**:

- CI/CD quality gates
- Pull request checks
- Pre-deployment validation
- Automated testing
- Release validation

**Usage**:

```bash
# In CI/CD pipeline
export SITEMAP_URL=$DEPLOYMENT_URL

npm start -- -s $SITEMAP_URL \
  --thresholds ./examples/ci-thresholds.json \
  --generate-executive-summary \
  --log-level warn

# Check results and fail build if critical issues
if [ $? -ne 0 ]; then
  echo "Quality gate failed"
  exit 1
fi
```

## Creating Custom Thresholds

### Step 1: Copy the Example

```bash
cp custom-thresholds.example.json my-thresholds.json
```

### Step 2: Modify Values

Edit `my-thresholds.json` and adjust threshold values based on your requirements.

### Step 3: Use Your Thresholds

```bash
npm start -- -s https://example.com/sitemap.xml \
  --thresholds ./my-thresholds.json \
  --generate-dashboard
```

## Understanding Threshold Levels

Each metric has two threshold levels:

### Pass Level

Indicates the metric meets **excellent** standards. Pages meeting this threshold are considered optimal.

### Warn Level

Indicates the metric needs **attention** but is not critical. Pages in this range should be improved but won't fail quality gates.

### Fail (Implicit)

Any metric exceeding the warn threshold is considered **failing** and requires immediate attention.

## Threshold Rules

### Performance Metrics

For time-based metrics (load time, LCP, FCP, TTI):

- **Lower is better**
- `warn` threshold must be **greater than or equal to** `pass` threshold
- Example: `{ "pass": 2000, "warn": 4000 }` means:
  - ≤ 2000ms = Pass (Excellent)
  - 2001-4000ms = Warn (Needs attention)
  - > 4000ms = Fail (Critical)

### Accessibility Metrics

For issue counts (errors, warnings, total issues):

- **Lower is better**
- `warn` threshold must be **greater than or equal to** `pass` threshold
- Example: `{ "pass": 0, "warn": 5 }` means:
  - 0 issues = Pass (Excellent)
  - 1-5 issues = Warn (Needs attention)
  - > 5 issues = Fail (Critical)

### Score Metrics (SEO, LLM)

For scores (0-100 scale):

- **Higher is better**
- `warn` threshold must be **less than or equal to** `pass` threshold
- Example: `{ "pass": 80, "warn": 60 }` means:
  - ≥ 80 = Pass (Excellent)
  - 60-79 = Warn (Needs attention)
  - < 60 = Fail (Critical)

## Validation

All threshold configurations are validated when loaded:

- **Type Checking**: Ensures values are numbers
- **Range Checking**: Validates values are within acceptable ranges
- **Logical Consistency**: Verifies pass/warn relationships are correct
- **Required Fields**: Checks all necessary thresholds are present

Invalid configurations will generate clear error messages before the audit starts.

## Best Practices

### 1. Start with Defaults

Use the default thresholds first to understand your baseline:

```bash
npm start -- -s https://example.com/sitemap.xml --generate-dashboard
```

### 2. Analyze Results

Review the dashboard and identify areas that need adjustment.

### 3. Customize Gradually

Create custom thresholds based on your baseline, starting with the most critical metrics.

### 4. Test with Small Samples

Test your custom thresholds on a few pages first:

```bash
npm start -- -s https://example.com/sitemap.xml -c 10 \
  --thresholds ./my-thresholds.json
```

### 5. Document Your Choices

Add comments to your threshold file explaining why you chose specific values.

### 6. Version Control

Store threshold files in version control to track changes over time.

### 7. Different Files for Different Environments

Use different threshold files for different environments:

```bash
# Development
--thresholds ./thresholds/dev.json

# Staging
--thresholds ./thresholds/staging.json

# Production
--thresholds ./thresholds/production.json
```

## Example Workflow

### Production Deployment Checklist

```bash
# 1. Run with strict thresholds
npm start -- \
  -s https://production.example.com/sitemap.xml \
  --thresholds ./examples/strict-thresholds.json \
  --enable-history \
  --generate-dashboard \
  --generate-executive-summary

# 2. Review dashboard.html

# 3. Check executive summary for critical issues

# 4. If pass, proceed with deployment
# 5. If fail, fix issues and retest
```

### CI/CD Integration

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm ci

      - name: Run Web Audit
        run: |
          npm start -- \
            -s ${{ secrets.STAGING_URL }} \
            --thresholds ./examples/ci-thresholds.json \
            --generate-executive-summary

      - name: Upload Results
        uses: actions/upload-artifact@v2
        with:
          name: audit-results
          path: results/
```

## Troubleshooting

### Threshold Too Strict

**Problem**: All pages failing a specific metric

**Solution**: Gradually increase the warn threshold until you achieve a reasonable pass rate, then work on improvements.

### Threshold Too Lenient

**Problem**: Poor quality pages passing

**Solution**: Decrease thresholds incrementally while monitoring the impact on your pass rate.

### Inconsistent Results

**Problem**: Same page sometimes passes, sometimes fails

**Solution**: This may indicate performance variability. Consider:

- Running multiple tests and averaging results
- Using more conservative thresholds
- Investigating server/network issues

## Support

For questions or issues with threshold configuration:

1. Check the [Configuration Guide](../docs/CONFIGURATION.md)
2. Review the [Features Documentation](../docs/FEATURES.md)
3. Examine your results in `dashboard.html`
4. Adjust thresholds based on your specific requirements
