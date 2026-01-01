# Quick Start Guide

Get started with Web Audit Suite in 5 minutes.

## Prerequisites

- Node.js 20.0.0 or higher
- npm package manager
- Internet connection

## Installation

```bash
# Clone the repository (if you have access)
git clone <repository-url>
cd web-audit-suite

# Install dependencies
npm install
```

## Basic Usage

### 1. Simple Analysis (10 URLs)

Test with a small sample first:

```bash
npm start -- -s https://example.com/sitemap.xml -c 10
```

**Output**: Results in `results/` directory

### 2. Full Analysis

Once satisfied, run the full analysis:

```bash
npm start -- -s https://example.com/sitemap.xml
```

### 3. With Dashboard

Generate visual reports:

```bash
npm start -- -s https://example.com/sitemap.xml --generate-dashboard
```

**Output**: Open `results/dashboard.html` in your browser

### 4. With All Features

Enable historical tracking and executive summary:

```bash
npm start -- -s https://example.com/sitemap.xml \
  --enable-history \
  --generate-dashboard \
  --generate-executive-summary
```

**Output**:

- `results/dashboard.html` - Interactive dashboard
- `results/executive_summary.md` - Executive summary
- `results/history/` - Historical data for comparison

## Understanding the Reports

### Key Files

After running, check these files in the `results/` directory:

1. **dashboard.html** - Start here! Visual overview with charts
2. **executive_summary.md** - High-level findings and recommendations
3. **seo_report.csv** - Page-by-page SEO metrics
4. **performance_analysis.csv** - Performance data
5. **accessibility_report.csv** - WCAG compliance issues
6. **wcag_report.md** - Human-readable accessibility report

### Quick Interpretation

**Dashboard Colors**:

- 🟢 **Green** - Pass (Excellent)
- 🟡 **Yellow** - Warn (Needs attention)
- 🔴 **Red** - Fail (Critical)

## Common Scenarios

### Scenario 1: Check Site Health

```bash
npm start -- -s https://mysite.com/sitemap.xml \
  --generate-dashboard \
  --generate-executive-summary
```

**Review**: `executive_summary.md` for quick health check

### Scenario 2: Track Improvements Over Time

```bash
# First run (baseline)
npm start -- -s https://mysite.com/sitemap.xml --enable-history --generate-dashboard

# After making improvements
npm start -- -s https://mysite.com/sitemap.xml --enable-history --generate-dashboard
```

**Review**: Dashboard shows comparison with previous run

### Scenario 3: Custom Quality Standards

```bash
# Use provided examples or create your own
npm start -- -s https://mysite.com/sitemap.xml \
  --thresholds ./examples/strict-thresholds.json \
  --generate-dashboard
```

**Review**: Dashboard uses your custom thresholds for pass/fail

### Scenario 4: CI/CD Quality Gate

```bash
npm start -- -s $DEPLOYMENT_URL \
  --thresholds ./examples/ci-thresholds.json \
  --generate-executive-summary \
  --log-level warn
```

**Review**: Exit code (0 = pass, 1 = fail)

**GitHub Actions**: See [CI/CD Integration Guide](docs/CI-CD-INTEGRATION.md) for automated quality gates

## Configuration

### Environment Variables (Optional)

Create `.env` file:

```bash
# Copy example
cp .env.example .env

# Edit values
nano .env
```

Example `.env`:

```bash
LOG_LEVEL=info
OUTPUT_DIR=my-results
```

### Custom Thresholds (Optional)

```bash
# Copy example
cp custom-thresholds.example.json my-thresholds.json

# Edit values
nano my-thresholds.json

# Use it
npm start -- -s https://mysite.com/sitemap.xml --thresholds ./my-thresholds.json
```

## Troubleshooting

### Issue: "Cannot find module"

**Solution**: Run `npm install`

### Issue: "ECONNREFUSED" or timeout

**Solution**: Check internet connection and site availability

### Issue: "Permission denied"

**Solution**: Check output directory write permissions

### Issue: Charts not showing in dashboard

**Solution**: Ensure `chart.js` and `chartjs-node-canvas` are installed:

```bash
npm install chart.js chartjs-node-canvas
```

### Issue: Validation errors

**Solution**: Check your configuration:

```bash
# Verify sitemap URL is valid
# Verify thresholds file is valid JSON
# Check log output for specific errors
```

## Next Steps

### Learn More

- [User Manual](docs/usermanual.md) - Complete user documentation
- [Configuration Guide](docs/CONFIGURATION.md) - Detailed configuration reference
- [Features Overview](docs/FEATURES.md) - All available features
- [Example Thresholds](examples/README.md) - Threshold configuration examples

### Advanced Usage

1. **Historical Tracking**:
   - Run with `--enable-history` regularly
   - Track trends over time
   - Measure impact of changes

2. **Custom Thresholds**:
   - Start with `examples/` directory
   - Create environment-specific thresholds
   - Adjust based on your requirements

3. **CI/CD Integration**:
   - Use `examples/ci-thresholds.json`
   - Configure in your CI pipeline
   - Fail builds on quality violations

4. **Docker Deployment**:
   - See [Configuration Guide](docs/CONFIGURATION.md#docker-deployment)
   - Use environment variables
   - Mount results volume

## Support

For issues or questions:

1. Check documentation in `docs/` directory
2. Review example configurations in `examples/`
3. Check CHANGELOG.md for recent changes
4. Review error logs in `results/error.log`

## Quick Reference

### Common Commands

```bash
# Basic analysis
npm start -- -s <url>

# With dashboard
npm start -- -s <url> --generate-dashboard

# With history
npm start -- -s <url> --enable-history --generate-dashboard

# With custom thresholds
npm start -- -s <url> --thresholds ./my-thresholds.json

# Limit URLs (testing)
npm start -- -s <url> -c 10

# Different output directory
npm start -- -s <url> -o custom-results

# Quiet mode (less logging)
npm start -- -s <url> --log-level warn
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `-s, --sitemap <url>` | Sitemap or page URL (required) |
| `-o, --output <dir>` | Output directory (default: results) |
| `-c, --count <n>` | Limit URLs to process (-1 = all) |
| `--enable-history` | Enable historical tracking |
| `--generate-dashboard` | Generate HTML dashboard |
| `--generate-executive-summary` | Generate executive summary |
| `--thresholds <file>` | Custom thresholds JSON file |
| `--log-level <level>` | error, warn, info, debug |
| `--no-cache` | Disable caching |
| `--cache-only` | Use only cached data |

### Output Files

| File | Description |
|------|-------------|
| `dashboard.html` | Interactive visual dashboard |
| `executive_summary.md` | Executive summary report |
| `seo_report.csv` | Page-by-page SEO metrics |
| `performance_analysis.csv` | Performance metrics |
| `accessibility_report.csv` | WCAG compliance data |
| `wcag_report.md` | Accessibility report |
| `results.json` | Complete raw data |

## Tips

1. **Start Small**: Use `-c 10` to test with 10 URLs first
2. **Use Dashboard**: Always generate dashboard for visual overview
3. **Track History**: Enable `--enable-history` for trend tracking
4. **Custom Thresholds**: Use examples as starting point
5. **Review Logs**: Check `error.log` if issues occur
6. **Cache Smart**: Use `--cache-only` to regenerate reports quickly
7. **Test First**: Test configurations on staging before production

Happy auditing! 🚀
