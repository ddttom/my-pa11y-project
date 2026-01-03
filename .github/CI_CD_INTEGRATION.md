# CI/CD Integration Guide

This guide explains how to integrate Web Audit Suite into your CI/CD pipeline to automatically detect quality regressions.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Setup](#github-actions-setup)
- [GitLab CI Setup](#gitlab-ci-setup)
- [Jenkins Setup](#jenkins-setup)
- [Configuration Options](#configuration-options)
- [Interpreting Results](#interpreting-results)
- [Troubleshooting](#troubleshooting)

## Overview

Integrating Web Audit Suite into CI/CD provides:

- **Automated Quality Gates**: Block merges that introduce regressions
- **Regression Detection**: Compare against baseline to catch quality drops
- **PR Comments**: Automatic feedback on pull requests
- **Historical Tracking**: Track quality metrics over time
- **Pattern Extraction**: Learn from high-scoring pages

### What Gets Checked

- **Accessibility**: WCAG 2.1 compliance (critical errors block builds)
- **Performance**: Load time, LCP, FCP, CLS regressions
- **SEO**: Score drops, missing metadata
- **LLM Suitability**: AI agent compatibility regressions
- **Security**: Missing or degraded security headers

## GitHub Actions Setup

### Quick Start

1. **Copy the template workflow**:
   ```bash
   cp .github/workflows/audit-ci.yml.template .github/workflows/audit-ci.yml
   ```

2. **Set required secrets** in GitHub repository settings (Settings → Secrets and variables → Actions):
   ```
   AUDIT_SITE_URL: https://staging.example.com
   ```

3. **Update repository reference** in workflow file:
   ```yaml
   with:
     repository: your-org/my-pa11y-project # Update this line
   ```

4. **Commit and push**:
   ```bash
   git add .github/workflows/audit-ci.yml
   git commit -m "Add Web Audit Suite CI integration"
   git push
   ```

### Establishing a Baseline

On your main branch, establish a baseline for regression detection:

```bash
# Manually trigger workflow with baseline establishment
gh workflow run audit-ci.yml -f establish_baseline=true
```

Or set up automatic baseline establishment on main branch commits (already configured in template).

### Customizing Thresholds

Edit the workflow to adjust when builds should fail:

```yaml
# Example: Fail only on critical accessibility errors
- name: Check accessibility threshold
  run: |
    ERRORS=$(jq '.overview.accessibility.criticalErrors' results/executive_summary.json)
    if [ "$ERRORS" -gt 0 ]; then
      echo "::error::$ERRORS critical accessibility errors found"
      exit 1
    fi
```

### Example PR Comment

The workflow automatically posts comments on pull requests:

```markdown
## 🤖 Web Audit Suite Report

✅ **No Critical Issues**

### Summary Metrics
- **Performance**: 1250ms avg load time
- **Accessibility**: 85/100 avg score
- **SEO**: 78/100 avg score
- **LLM Served**: 72/100 (all agents)
- **LLM Rendered**: 68/100 (browser agents)

### Regression Analysis
✅ **No regressions detected** - All metrics stable or improved

### Full Reports
- [Download Audit Reports](...)
- [View Executive Summary](...)
```

## GitLab CI Setup

### `.gitlab-ci.yml`

```yaml
stages:
  - audit

audit:
  stage: audit
  image: node:20
  cache:
    paths:
      - node_modules/
      - results/baseline.json
      - results/history/
    policy: pull-push
  before_script:
    - npm ci
    - mkdir -p results
  script:
    # Restore baseline if on main branch
    - |
      if [ "$CI_COMMIT_BRANCH" == "main" ]; then
        ESTABLISH_BASELINE="--establish-baseline"
      else
        ESTABLISH_BASELINE=""
      fi

    # Run audit
    - |
      npm start -- \
        -s $AUDIT_SITE_URL \
        -o results \
        -c 50 \
        --enable-history \
        --generate-dashboard \
        --generate-executive-summary \
        $ESTABLISH_BASELINE

    # Check for critical regressions
    - |
      if grep -q "🚨 CRITICAL REGRESSIONS DETECTED" results/*.log 2>/dev/null; then
        echo "Critical regressions detected"
        cat results/regression_report.md
        exit 1
      fi

  artifacts:
    when: always
    paths:
      - results/
    expire_in: 30 days
    reports:
      junit: results/junit-report.xml # If you add JUnit export

  only:
    - merge_requests
    - main
    - develop
```

### GitLab Variables

Set in Settings → CI/CD → Variables:

```
AUDIT_SITE_URL: https://staging.example.com
```

## Jenkins Setup

### Jenkinsfile

```groovy
pipeline {
    agent {
        docker {
            image 'node:20'
        }
    }

    environment {
        AUDIT_SITE_URL = credentials('audit-site-url')
    }

    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
                sh 'mkdir -p results'
            }
        }

        stage('Restore Baseline') {
            when {
                branch 'main'
            }
            steps {
                // Restore baseline from artifact storage
                copyArtifacts(
                    projectName: env.JOB_NAME,
                    filter: 'results/baseline.json',
                    optional: true
                )
            }
        }

        stage('Run Audit') {
            steps {
                script {
                    def establishBaseline = env.BRANCH_NAME == 'main' ? '--establish-baseline' : ''

                    sh """
                        npm start -- \\
                            -s \$AUDIT_SITE_URL \\
                            -o results \\
                            -c 50 \\
                            --enable-history \\
                            --generate-dashboard \\
                            --generate-executive-summary \\
                            \$establishBaseline
                    """
                }
            }
        }

        stage('Check Regressions') {
            steps {
                script {
                    def regressionReport = readFile('results/regression_report.md')

                    if (regressionReport.contains('🚨 CRITICAL REGRESSIONS')) {
                        error('Critical regressions detected. See regression_report.md')
                    }
                }
            }
        }

        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'results/**/*', allowEmptyArchive: false
                publishHTML([
                    reportDir: 'results',
                    reportFiles: 'dashboard.html',
                    reportName: 'Audit Dashboard'
                ])
            }
        }
    }

    post {
        always {
            // Clean up
            cleanWs()
        }
    }
}
```

### Jenkins Credentials

Add in Jenkins → Credentials:

```
ID: audit-site-url
Type: Secret text
Value: https://staging.example.com
```

## Configuration Options

### Environment Variables

Set these in your CI environment:

```bash
# Required
AUDIT_SITE_URL=https://staging.example.com

# Optional
FORCE_SCRAPE=false                    # Bypass robots.txt
AUDIT_URL_LIMIT=50                    # Number of URLs to test
AUDIT_LOG_LEVEL=info                  # Logging verbosity
PATTERN_SCORE_THRESHOLD=70            # Min score for pattern extraction
```

### Command Line Flags

Customize the audit command:

```bash
npm start -- \
  -s $AUDIT_SITE_URL \
  -o results \
  -c 50 \                            # Limit to 50 URLs
  --enable-history \                  # Track historical results
  --generate-dashboard \              # Generate HTML dashboard
  --generate-executive-summary \      # Generate summary report
  --extract-patterns \                # Extract successful patterns
  --pattern-score-threshold 70 \      # Pattern extraction threshold
  --establish-baseline                # Set current as baseline (main only)
```

### Failure Thresholds

Define when builds should fail:

#### Critical Accessibility Errors (Recommended)

```bash
# Fail if any critical accessibility errors
CRITICAL_ERRORS=$(jq '.overview.accessibility.criticalErrors' results/executive_summary.json)
if [ "$CRITICAL_ERRORS" -gt 0 ]; then
  exit 1
fi
```

#### Performance Regression

```bash
# Fail if performance degrades >30%
if grep -q "Performance.*critical" results/regression_report.md; then
  exit 1
fi
```

#### LLM Score Drop

```bash
# Fail if LLM served score drops >10 points
BASELINE_SCORE=$(jq '.baseline.llmServedScore' results/regression_report.json 2>/dev/null || echo "0")
CURRENT_SCORE=$(jq '.current.llmServedScore' results/regression_report.json 2>/dev/null || echo "0")
DELTA=$((BASELINE_SCORE - CURRENT_SCORE))

if [ "$DELTA" -gt 10 ]; then
  echo "LLM score dropped by $DELTA points"
  exit 1
fi
```

#### Combined Threshold

```bash
# Fail on any critical regression
if grep -q "🚨 CRITICAL REGRESSIONS DETECTED" audit.log; then
  exit 1
fi
```

## Interpreting Results

### Exit Codes

- `0`: Success, no regressions
- `1`: Failure (critical regressions or errors)

### Regression Report

The `regression_report.md` file contains:

- **Summary**: Count of critical/warning/info regressions
- **Critical Regressions**: Require immediate attention
- **Warning Regressions**: Should be reviewed
- **Info Changes**: Notable but may not require action
- **Recommended Actions**: What to do next

### Dashboard

The `dashboard.html` provides visual trends:

- Performance metrics over time
- Accessibility score trends
- LLM compatibility evolution
- Regression history

### Pattern Library

The `pattern_library.md` shows:

- Successful patterns from high-scoring pages
- Working examples to learn from
- Implementation recommendations

## Troubleshooting

### Build Times Out

**Problem**: Audit takes too long

**Solution**: Reduce URL count or increase timeout

```yaml
timeout-minutes: 120  # Increase timeout
```

```bash
npm start -- -c 20  # Reduce URLs tested
```

### Baseline Not Found

**Problem**: "No baseline established" in regression report

**Solution**: Establish baseline on main branch

```bash
# Manual
npm start -- -s $URL --enable-history --establish-baseline

# GitHub Actions
gh workflow run audit-ci.yml -f establish_baseline=true
```

### Critical Regressions Always Fail

**Problem**: Every build fails with critical regressions

**Solution**: Review and adjust thresholds, or fix actual issues

```bash
# View regression report locally
npm start -- -s $URL --enable-history
cat results/regression_report.md
```

### Out of Memory

**Problem**: Node.js heap out of memory

**Solution**: Increase Node.js memory limit

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm start -- ...
```

Or in CI:

```yaml
env:
  NODE_OPTIONS: --max-old-space-size=4096
```

### Cache Issues

**Problem**: Baseline not persisting between runs

**Solution**: Check cache configuration

**GitHub Actions**:
```yaml
- uses: actions/cache@v3
  with:
    path: results/baseline.json
    key: audit-baseline-${{ github.ref_name }}
```

**GitLab CI**:
```yaml
cache:
  key: $CI_COMMIT_REF_SLUG
  paths:
    - results/baseline.json
```

## Advanced Configuration

### Scheduled Audits

Run audits on a schedule (nightly, weekly):

**GitHub Actions**:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

**GitLab CI**:
```yaml
audit:
  only:
    - schedules
```

### Multiple Environments

Audit staging and production separately:

```yaml
audit-staging:
  script:
    - npm start -- -s https://staging.example.com ...

audit-production:
  script:
    - npm start -- -s https://example.com ...
  only:
    - main
```

### Slack Notifications

Send regression alerts to Slack:

```bash
if grep -q "🚨 CRITICAL REGRESSIONS" audit.log; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Critical regressions detected in audit"}' \
    $SLACK_WEBHOOK_URL
fi
```

## Best Practices

1. **Establish Baseline**: Always establish a baseline on your main branch
2. **Regular Audits**: Run audits on every PR and main branch commit
3. **Fail Fast**: Configure critical thresholds to block problematic changes
4. **Archive Reports**: Keep audit reports for at least 30 days
5. **Review Patterns**: Regularly check pattern library for improvements
6. **Update Baseline**: Re-establish baseline after intentional major changes
7. **Monitor Trends**: Use dashboard to track quality over time

## Support

- **Documentation**: See [README.md](../README.md)
- **Issues**: Report bugs at repository issues page
- **Examples**: See `.github/workflows/audit-ci.yml.template`

---

**Version**: 1.0.0
**Last Updated**: 2026-01-03
