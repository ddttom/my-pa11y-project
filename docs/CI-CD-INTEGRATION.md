# CI/CD Integration Guide

This guide explains how to integrate Web Audit Suite into your CI/CD pipeline using GitHub Actions.

## GitHub Actions Workflow

The repository includes a pre-configured GitHub Action workflow at [`.github/workflows/quality-gate.yml`](../.github/workflows/quality-gate.yml) that runs Web Audit Suite as a quality gate.

### Features

- **Automated Quality Checks**: Runs on pull requests and pushes to main/develop branches
- **Manual Triggers**: Run audits on-demand with custom configuration
- **Multiple Threshold Profiles**: Choose between strict, CI, or relaxed standards
- **Artifact Storage**: Saves all audit results for 30 days
- **PR Comments**: Posts audit summary directly to pull requests
- **GitHub Summary**: Displays results in the Actions summary page
- **Failure Notifications**: Creates issues when quality gates fail on main branch

### Trigger Events

The workflow runs automatically on:

1. **Pull Requests** to `main` or `develop` branches
2. **Pushes** to `main` or `develop` branches
3. **Manual Dispatch** via GitHub Actions UI (workflow_dispatch)

### Configuration

#### Environment Variables

Set these as repository secrets or environment variables:

| Variable           | Description                          | Required | Default                             |
| ------------------ | ------------------------------------ | -------- | ----------------------------------- |
| `STAGING_URL`      | Staging site URL for automated runs  | No       | `https://example.com/sitemap.xml`   |
| `AUDIT_URL_LIMIT`  | Number of URLs to audit              | No       | `10`                                |

**Setting Environment Variables:**

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add `STAGING_URL` with your staging site URL
4. Add `AUDIT_URL_LIMIT` with desired URL count (optional)

#### Manual Workflow Dispatch

Run audits manually with custom configuration:

1. Go to Actions tab in GitHub
2. Select "Quality Gate" workflow
3. Click "Run workflow"
4. Configure options:
   - **Sitemap URL**: URL to audit
   - **URL Limit**: Number of URLs (-1 for all)
   - **Threshold Profile**: `ci`, `strict`, or `relaxed`

### Workflow Steps

The quality gate workflow performs these steps:

1. **Checkout & Setup**: Checks out code and sets up Node.js 20.x
2. **Install Dependencies**: Runs `npm ci` for clean install
3. **Run Linting**: Validates code and markdown formatting
4. **Determine Configuration**: Sets audit parameters based on trigger type
5. **Run Web Audit**: Executes audit with specified configuration
6. **Upload Results**: Saves all reports as downloadable artifacts
7. **Generate Summary**: Creates GitHub Actions summary page
8. **Comment on PR**: Posts results to pull request (if applicable)
9. **Check Status**: Fails workflow if audit fails quality thresholds
10. **Notify Failures**: Creates issue if quality gate fails on main branch

### Threshold Profiles

Three pre-configured profiles are available:

#### CI Profile (Default)

Balanced thresholds suitable for most CI/CD pipelines:

- Load time: < 3s pass, < 5s warn
- Accessibility errors: 0 pass, 2 warn
- SEO score: ≥ 75 pass, ≥ 60 warn

**Use when:** Running automated quality checks

#### Strict Profile

High-quality standards for production:

- Load time: < 1s pass, < 2s warn
- Accessibility errors: 0 pass, 0 warn
- SEO score: ≥ 90 pass, ≥ 80 warn

**Use when:** Validating production deployments

#### Relaxed Profile

Lenient standards for development:

- Load time: < 5s pass, < 8s warn
- Accessibility errors: 5 pass, 10 warn
- SEO score: ≥ 60 pass, ≥ 40 warn

**Use when:** Testing during active development

### Output Artifacts

Each workflow run generates downloadable artifacts:

**Artifact Name:** `audit-results-{run_number}`

**Contents:**

- `dashboard.html` - Interactive visual dashboard
- `executive_summary.md` - High-level summary
- `executive_summary.json` - Machine-readable summary
- `seo_report.csv` - SEO analysis
- `performance_analysis.csv` - Performance metrics
- `accessibility_report.csv` - WCAG compliance
- `wcag_report.md` - Accessibility report
- `security_report.csv` - Security headers
- `content_quality.csv` - Content analysis
- `llm_general_suitability.csv` - LLM compatibility
- `results.json` - Complete raw data
- All other generated reports

**Retention:** 30 days

### Usage Examples

#### Example 1: Pull Request Quality Gate

```yaml
# Automatically runs when PR is created/updated
# Uses CI threshold profile
# Comments results on PR
```

**Workflow:**

1. Developer creates PR
2. Quality gate runs automatically
3. Results posted as PR comment
4. Review results before merging

#### Example 2: Production Deployment Validation

```yaml
# Manual workflow dispatch
# Inputs:
#   sitemap_url: https://production.example.com/sitemap.xml
#   url_limit: -1 (all URLs)
#   threshold_profile: strict
```

**Workflow:**

1. Navigate to Actions → Quality Gate
2. Click "Run workflow"
3. Enter production URL
4. Set limit to -1 (all pages)
5. Select "strict" profile
6. Review results before deployment

#### Example 3: Scheduled Weekly Audits

Add to `.github/workflows/quality-gate.yml`:

```yaml
on:
  schedule:
    - cron: '0 0 * * 1'  # Every Monday at midnight UTC
```

**Workflow:**

1. Runs automatically every Monday
2. Uses default configuration
3. Results saved as artifacts
4. Creates issue if quality degrades

### Interpreting Results

#### GitHub Actions Summary

The workflow creates a summary page showing:

- Overall pass/fail status
- Key findings by category
- Recommendations for improvement
- Links to detailed reports

**Access:** Actions → Select run → Summary tab

#### Pull Request Comments

For PR triggers, a comment is posted with:

- Executive summary
- Pass/fail status per category
- Link to download full results
- Audit configuration details

#### Downloaded Artifacts

Download full results to:

1. Open the dashboard.html in browser
2. Review executive_summary.md for high-level overview
3. Analyze specific CSV reports for detailed metrics
4. Check results.json for raw data

### Customization

#### Custom Threshold Files

Create custom threshold configurations:

```bash
# Create custom file
cp examples/ci-thresholds.json .github/workflows/custom-thresholds.json

# Edit thresholds
# Commit to repository

# Update workflow to use it
--thresholds "./.github/workflows/custom-thresholds.json"
```

#### Additional Workflow Triggers

Add more trigger events to `.github/workflows/quality-gate.yml`:

```yaml
on:
  # Existing triggers...
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
  workflow_call:  # Allow calling from other workflows
    inputs:
      sitemap_url:
        required: true
        type: string
```

#### Conditional Execution

Run only when relevant files change:

```yaml
on:
  pull_request:
    branches: [ main ]
    paths:
      - 'src/**'
      - 'public/**'
      - '**.html'
      - '**.css'
      - '**.js'
```

#### Notification Channels

Add Slack/Teams notifications:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Quality gate failed on ${{ github.ref }}"
      }
```

### Best Practices

#### 1. Start with Limited URLs

Test with small URL counts first:

```yaml
url_limit: 10  # Test with 10 pages initially
```

Gradually increase as confidence grows.

#### 2. Use Appropriate Profiles

- **Development branches**: relaxed
- **Pull requests**: ci
- **Production**: strict

#### 3. Review Historical Trends

Enable historical tracking:

```bash
--enable-history
```

Compare results across runs to identify trends.

#### 4. Set Meaningful Thresholds

Customize thresholds based on:

- Current site performance
- Business requirements
- Compliance needs
- User expectations

#### 5. Act on Failures

When quality gate fails:

1. Download and review reports
2. Identify critical issues
3. Fix before merging/deploying
4. Re-run to verify fixes

#### 6. Monitor Artifact Storage

Artifacts are retained for 30 days. Download important results for long-term storage.

#### 7. Cache Dependencies

The workflow uses npm caching for faster runs:

```yaml
cache: 'npm'  # Already configured
```

## Other CI/CD Platforms

### GitLab CI

Example `.gitlab-ci.yml`:

```yaml
stages:
  - quality

web-audit:
  stage: quality
  image: node:20
  script:
    - npm ci
    - npm start -- -s $STAGING_URL -c 10 --thresholds ./examples/ci-thresholds.json --generate-executive-summary
  artifacts:
    paths:
      - results/
    expire_in: 30 days
  only:
    - merge_requests
    - main
```

### Jenkins

Example `Jenkinsfile`:

```groovy
pipeline {
    agent {
        docker {
            image 'node:20'
        }
    }
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Quality Gate') {
            steps {
                sh '''
                    npm start -- \
                        -s ${STAGING_URL} \
                        -c 10 \
                        --thresholds ./examples/ci-thresholds.json \
                        --generate-dashboard \
                        --generate-executive-summary
                '''
            }
        }
        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'results/**/*', fingerprint: true
                publishHTML([
                    reportDir: 'results',
                    reportFiles: 'dashboard.html',
                    reportName: 'Web Audit Dashboard'
                ])
            }
        }
    }
}
```

### Azure Pipelines

Example `azure-pipelines.yml`:

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '20.x'

- script: npm ci
  displayName: 'Install dependencies'

- script: |
    npm start -- \
      -s $(STAGING_URL) \
      -c 10 \
      --thresholds ./examples/ci-thresholds.json \
      --generate-dashboard \
      --generate-executive-summary
  displayName: 'Run web audit'

- task: PublishPipelineArtifact@1
  inputs:
    targetPath: 'results'
    artifactName: 'audit-results'
```

### CircleCI

Example `.circleci/config.yml`:

```yaml
version: 2.1

jobs:
  quality-gate:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-dependencies-{{ checksum "package.json" }}
      - run: npm ci
      - run:
          name: Run web audit
          command: |
            npm start -- \
              -s ${STAGING_URL} \
              -c 10 \
              --thresholds ./examples/ci-thresholds.json \
              --generate-dashboard \
              --generate-executive-summary
      - store_artifacts:
          path: results
          destination: audit-results

workflows:
  version: 2
  quality-checks:
    jobs:
      - quality-gate:
          filters:
            branches:
              only:
                - main
                - develop
```

## Troubleshooting

### Workflow Fails Immediately

**Issue:** Workflow fails during setup

**Solutions:**

- Verify Node.js version is 20.x or higher
- Check npm ci completes successfully
- Ensure all dependencies are in package.json

### Audit Times Out

**Issue:** Audit step exceeds time limit

**Solutions:**

- Reduce URL limit: `-c 10` instead of `-c -1`
- Increase timeout in workflow:

  ```yaml
  timeout-minutes: 30  # Default is 360 (6 hours)
  ```

- Check if target site is accessible from GitHub runners

### Artifacts Not Uploaded

**Issue:** No artifacts available for download

**Solutions:**

- Verify `results/` directory is created
- Check `continue-on-error: true` is set on audit step
- Ensure upload step has `if: always()`

### PR Comments Not Posted

**Issue:** No comment on pull request

**Solutions:**

- Verify workflow has `pull_request` trigger
- Check `GITHUB_TOKEN` has write permissions
- Ensure `actions/github-script@v7` step runs

### Quality Gate Fails Unexpectedly

**Issue:** Audit fails when it should pass

**Solutions:**

- Review threshold configuration
- Check if using correct threshold profile
- Download artifacts and review detailed reports
- Verify site is accessible during audit

## Support

For CI/CD integration issues:

1. Review [Configuration Guide](CONFIGURATION.md)
2. Check [GitHub Actions documentation](https://docs.github.com/actions)
3. Examine workflow logs in Actions tab
4. Download artifacts to review detailed results
