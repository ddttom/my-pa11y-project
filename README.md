# Pa11y Sitemap Crawler

This project is a comprehensive web crawler that performs accessibility testing, SEO analysis, and various other checks on websites using their sitemap. It combines the power of Pa11y for accessibility testing with custom implementations for SEO and content analysis.  Created by Tom Cranstoun Aug 2024

## Features

- Crawls websites based on their sitemap
- Performs accessibility testing using Pa11y
- Analyzes SEO factors such as titles, meta descriptions, headings, and more
- Checks for common web security headers
- Analyzes internal and external links
- Performs image analysis including alt text checks
- Generates a comprehensive report of all findings

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v18 or later)
- npm (usually comes with Node.js)

## Installation

1. Clone this repository:

   ``` js
   git clone https://github.com/ddttom/my-pa11y-ptoject.git
   ```

2. Navigate to the project directory:

   ``` js
   cd my-pa11y-project
   ```

3. Install the dependencies:

   ``` js
   npm install
   ```

## Usage

To run the Pa11y Sitemap Crawler, use the following command:

``` js
node pa11y-sitemap-crawler.mjs -s <sitemap-url> -o <output-directory> [-l <limit>]
```

Where:

- `<sitemap-url>` is the URL of the sitemap you want to crawl
- `<output-directory>` is the directory where you want to save the results
- `<limit>` (optional) is the maximum number of URLs to test. Use -1 for no limit.

Example:

``` js
node pa11y-sitemap-crawler.mjs -s https://example.com/sitemap.xml -o ./results
```

This will crawl the sitemap at <https://example.com/sitemap.xml>, test up to 100 URLs, and save the results in the ./results directory.

## Output

The script generates several output files in the specified output directory:

- `seo_report.csv`: A comprehensive report of all SEO and accessibility findings
- `pa11y_results.csv`: Detailed Pa11y accessibility test results
- `internal_links.csv`: Analysis of internal links
- `content_analysis.csv`: Content analysis results
- Other CSV files with various metrics and analyses
- `sitemap.xml`: the ideal sitemap for the crawled site. you can re-crawl using this to include orphaned links

## Cache Rules

If you pull a new pa11y project, remember to clear your '.cache' folder. When sites are updated remember to clear your cache. occasionally clear cache

## Configuration

You can modify the `pa11yOptions` object in `pa11y-sitemap-crawler.mjs` to customize the Pa11y tests. Refer to the [Pa11y documentation](https://github.com/pa11y/pa11y#configuration) for available options.

## Contributing

Contributions to the Pa11y Sitemap Crawler are welcome. Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Pa11y](https://pa11y.org/) for providing the accessibility testing engine
- [Cheerio](https://cheerio.js.org/) for HTML parsing
- [Commander.js](https://github.com/tj/commander.js/) for command-line interface

## parameters

Sitemap URL (-s, --sitemap <url>)

Required option
Specifies the URL of the sitemap to process

Output Directory (-o, --output <directory>)

Required option
Defines where the tool should save its results

Limit (-l, --limit <number>)

Optional, defaults to -1 (process all URLs)
Restricts the number of URLs the tool will process

No Puppeteer (--no-puppeteer)

Optional flag
Skips using Puppeteer for rendering pages
Uses cached HTML if available
Can speed up processing but may miss dynamic content

Cache Only (--cache-only)

Optional flag
Uses only data from the cache
Won't fetch any new data from the web
Useful for quick re-analysis of previously crawled sites

No Cache (--no-cache)

Optional flag
Disables caching entirely
Always fetches fresh data from the web
Ensures the most up-to-date information but may slow down processing

Force Delete Cache (--force-delete-cache)

Optional flag
Deletes any existing cache before starting the crawl
Ensures a completely fresh start
Useful if you suspect the cache might be corrupted or outdated

Debug Mode (--debug)

Optional flag
Enables more detailed logs about the tool's operations
Particularly useful when troubleshooting issues

Note: Multiple options can be combined in a single command to customize the tool's behavior for each crawl session.

 ```js
 npm start -- -s https://allabout.network/sitemap.xml -o results --force-delete-cache --debug  
```
