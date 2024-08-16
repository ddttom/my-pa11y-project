# Pa11y Sitemap Crawler User Manual

## Table of Contents

- [Pa11y Sitemap Crawler User Manual](#pa11y-sitemap-crawler-user-manual)
  - [Table of Contents](#table-of-contents)
  - [1. Introduction](#1-introduction)
  - [2. Installation](#2-installation)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
  - [3. Basic Usage](#3-basic-usage)
  - [4. Advanced Options](#4-advanced-options)
  - [5. Output Interpretation](#5-output-interpretation)
    - [Key Metrics](#key-metrics)
  - [6. Customization](#6-customization)
  - [7. Troubleshooting](#7-troubleshooting)
  - [8. Best Practices](#8-best-practices)
  - [9. Frequently Asked Questions](#9-frequently-asked-questions)

## 1. Introduction

Pa11y Sitemap Crawler is a powerful tool designed to perform comprehensive website analysis, including accessibility testing, SEO evaluation, and content checks. By leveraging sitemaps, it efficiently crawls websites and provides valuable insights into their structure, accessibility, and SEO performance.

## 2. Installation

### Prerequisites

- Node.js (version 18 or later)
- npm (usually comes bundled with Node.js)

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/ddttom/my-pa11y-project.git
   ```

2. Navigate to the project directory:

   ```bash
   cd my-pa11y-project
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

## 3. Basic Usage

To run a basic crawl:

```bash
npm start -- -s <sitemap-url> -o <output-directory>
```

Example:

```bash
npm start -- -s https://example.com/sitemap.xml -o ./results
```

This command will crawl the sitemap at the specified URL and save results in the `./results` directory.

## 4. Advanced Options

- `-l, --limit <number>`: Limit the number of URLs to test (use -1 for no limit)
- `--no-puppeteer`: Bypass Puppeteer execution and use cached HTML
- `--cache-only`: Use only cached data, do not fetch new data
- `--no-cache`: Disable caching, always fetch fresh data
- `--force-delete-cache`: Force delete existing cache before starting
- `--debug`: Enable detailed logging for troubleshooting

Example with advanced options:

```bash
npm start -- -s https://example.com/sitemap.xml -o ./results -l 100 --no-puppeteer --debug
```

## 5. Output Interpretation

The tool generates several output files in the specified directory:

- `seo_report.csv`: Comprehensive SEO and accessibility findings
- `pa11y_results.csv`: Detailed accessibility test results
- `internal_links.csv`: Analysis of internal link structure
- `content_analysis.csv`: Content quality and metadata analysis
- `sitemap.xml`: Optimized sitemap based on crawl results

### Key Metrics

- Accessibility score: Higher is better (based on Pa11y results)
- SEO score: Higher is better (based on various SEO factors)
- Content quality: Evaluated based on word count, headings, and metadata
- Internal linking: Assesses the site's internal link structure

## 6. Customization

To customize Pa11y tests, modify the `pa11yOptions` object in `pa11y-sitemap-crawler.mjs`. Refer to the [Pa11y documentation](https://github.com/pa11y/pa11y#configuration) for available options.

Example customization:

```javascript
const pa11yOptions = {
  standard: 'WCAG2AA',
  timeout: 60000,
  wait: 1000,
  ignore: ['notice', 'warning'],
};
```

## 7. Troubleshooting

Common issues and solutions:

1. **Timeout errors**:
   - Increase the `timeout` value in Pa11y options
   - Check your internet connection
   - Verify the website's response time

2. **Memory issues**:
   - Increase Node.js memory limit: `NODE_OPTIONS=--max_old_space_size=4096 npm start ...`
   - Reduce the number of concurrent requests

3. **Invalid sitemap errors**:
   - Verify the sitemap URL is correct and accessible
   - Ensure the sitemap follows the [sitemap protocol](https://www.sitemaps.org/protocol.html)

4. **Unexpected results**:
   - Clear the cache using `--force-delete-cache`
   - Run with `--debug` for more detailed logs

## 8. Best Practices

1. Start with a small limit (-l option) to test the process before running a full crawl
2. Regularly clear the cache to ensure fresh data
3. Use `--no-puppeteer` for faster processing if dynamic content is not critical
4. Schedule regular crawls to track changes over time
5. Review and act on the accessibility and SEO recommendations provided in the reports

## 9. Frequently Asked Questions

1. **Q: How often should I run a crawl?**
   A: It depends on how frequently your site updates. For actively maintained sites, weekly or bi-weekly crawls are recommended.

2. **Q: Can I crawl multiple sitemaps?**
   A: Yes, run the tool multiple times with different sitemap URLs.

3. **Q: How can I exclude certain URLs from the crawl?**
   A: Currently, URL exclusion is not supported. Consider modifying your sitemap to exclude unwanted URLs.

4. **Q: What's the difference between `--no-cache` and `--force-delete-cache`?**
   A: `--no-cache` ignores existing cache for the current run, while `--force-delete-cache` permanently deletes the entire cache before starting.

5. **Q: Can I integrate this tool into my CI/CD pipeline?**
   A: Yes, you can incorporate it into your pipeline scripts. Use the CSV outputs for automated reporting and tracking.

For further assistance, please open an issue on the GitHub repository or contact the project maintainer.
