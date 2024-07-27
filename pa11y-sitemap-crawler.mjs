#!/usr/bin/env node

import fs from 'fs/promises';
import axios from 'axios';
import xml2js from 'xml2js';
import pa11y from 'pa11y';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { program } from 'commander';
import cheerio from 'cheerio';
import url from 'url';

let isShuttingDown = false;
let results = [];

const pa11yOptions = {
    timeout: 60000,
    wait: 2000,
    ignore: [
        'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2',
        'css-parsing-error',
        'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.A.EmptyNoId',
        'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail'
    ],
    viewport: {
        width: 1280,
        height: 1024
    },
    chromeLaunchConfig: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-gpu',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-extensions'
        ],
        ignoreHTTPSErrors: true
    }
};

const lighthouseOptions = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['seo'],
    chromeFlags: ['--headless']
};

async function fetchAndParseSitemap(url) {
    console.log(`Fetching sitemap from: ${url}`);
    try {
        const response = await axios.get(url);
        const parser = new xml2js.Parser();
        console.log('Parsing sitemap XML');
        return parser.parseStringPromise(response.data);
    } catch (error) {
        console.error(`Error fetching or parsing sitemap from ${url}:`, error.message);
        throw error;
    }
}

async function extractUrls(parsedXml) {
    if (parsedXml.sitemapindex) {
        console.log('Found a sitemap index. Processing nested sitemaps...');
        const sitemapUrls = parsedXml.sitemapindex.sitemap.map(sitemap => sitemap.loc[0]);
        let allUrls = [];
        for (const sitemapUrl of sitemapUrls) {
            if (isShuttingDown) break;
            console.log(`Processing nested sitemap: ${sitemapUrl}`);
            try {
                const nestedParsedXml = await fetchAndParseSitemap(sitemapUrl);
                const nestedUrls = await extractUrls(nestedParsedXml);
                allUrls = allUrls.concat(nestedUrls);
            } catch (error) {
                console.error(`Error processing nested sitemap ${sitemapUrl}:`, error.message);
            }
        }
        return allUrls;
    } else if (parsedXml.urlset) {
        console.log('Extracting URLs from sitemap');
        return parsedXml.urlset.url.map(url => url.loc[0]);
    } else {
        throw new Error('Unknown sitemap format');
    }
}

async function runLighthouse(testUrl, opts, config = null) {
    const chrome = await chromeLauncher.launch({chromeFlags: opts.chromeFlags});
    opts.port = chrome.port;
    const runnerResult = await lighthouse(testUrl, opts, config);
    await chrome.kill();
    return JSON.parse(runnerResult.report);
}

async function getInternalLinks(pageUrl, baseUrl) {
    try {
        const response = await axios.get(pageUrl);
        const $ = cheerio.load(response.data);
        const links = new Set();

        $('a').each((i, element) => {
            const href = $(element).attr('href');
            if (href) {
                const absoluteUrl = new URL(href, baseUrl).href;
                if (absoluteUrl.startsWith(baseUrl)) {
                    links.add(absoluteUrl);
                }
            }
        });

        return Array.from(links);
    } catch (error) {
        console.error(`Error fetching internal links from ${pageUrl}:`, error.message);
        return [];
    }
}

async function runTestsOnSitemap(sitemapUrl, outputFile, limit = -1) {
    try {
        console.log(`Starting process for sitemap: ${sitemapUrl}`);
        console.log(`Results will be saved to: ${outputFile}`);

        const parsedXml = await fetchAndParseSitemap(sitemapUrl);
        console.log('Sitemap fetched and parsed successfully');

        const urls = await extractUrls(parsedXml);
        console.log(`Found ${urls.length} URLs in sitemap`);

        const urlsToTest = limit === -1 ? urls : urls.slice(0, limit);
        const totalTests = urlsToTest.length;
        console.log(`Testing ${totalTests} URLs${limit === -1 ? ' (all URLs)' : ''}`);

        const baseUrl = new URL(urlsToTest[0]).origin;
        const sitemapUrls = new Set(urls);
        const orphanedUrls = new Set();

        for (let i = 0; i < urlsToTest.length; i++) {
            if (isShuttingDown) break;
            const testUrl = urlsToTest[i];
            console.log(`Testing: ${testUrl}`);
            try {
                const pa11yResult = await pa11y(testUrl, pa11yOptions);
                const lighthouseResult = await runLighthouse(testUrl, lighthouseOptions);
                const internalLinks = await getInternalLinks(testUrl, baseUrl);

                internalLinks.forEach(link => {
                    if (!sitemapUrls.has(link)) {
                        orphanedUrls.add(link);
                    }
                });

                results.push({
                    url: testUrl,
                    accessibility: pa11yResult.issues,
                    seo: lighthouseResult.categories.seo,
                    internalLinks,
                });
                console.log(`Completed testing: ${testUrl} (${i + 1}/${totalTests})`);
            } catch (error) {
                console.error(`Error testing ${testUrl}:`, error.message);
                results.push({ url: testUrl, error: error.message });
            }
            await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1 second between requests
        }

        results.push({ orphanedUrls: Array.from(orphanedUrls) });
        await saveResults(results, outputFile);
        return results;
    } catch (error) {
        console.error('Error in runTestsOnSitemap:', error.message);
    }
}
function formatResults(results) {
    let output = 'Pa11y Accessibility, SEO, and Internal Link Test Results\n';
    output += '======================================================\n\n';

    let totalAccessibilityIssues = 0;
    let accessibilityIssuesByType = {};
    let accessibilityIssuesBySeverity = {};
    let totalSEOScore = 0;
    let orphanedUrls = [];

    results.forEach((result, index) => {
        if (result.orphanedUrls) {
            orphanedUrls = result.orphanedUrls;
            return;
        }

        output += `URL ${index + 1}: ${result.url}\n`;
        output += '-'.repeat(result.url.length + 8) + '\n';

        if (result.error) {
            output += `Error: ${result.error}\n`;
        } else {
            // Accessibility results
            if (result.accessibility && result.accessibility.length === 0) {
                output += 'No accessibility issues found.\n';
            } else if (result.accessibility) {
                output += `Accessibility issues found: ${result.accessibility.length}\n\n`;
                result.accessibility.forEach((issue, issueIndex) => {
                    output += `Issue ${issueIndex + 1}:\n`;
                    output += `  Type: ${issue.type}\n`;
                    output += `  Code: ${issue.code}\n`;
                    output += `  Message: ${issue.message}\n`;
                    output += `  Context: ${issue.context}\n`;
                    output += `  Selector: ${issue.selector}\n\n`;

                    totalAccessibilityIssues++;
                    accessibilityIssuesByType[issue.type] = (accessibilityIssuesByType[issue.type] || 0) + 1;
                    accessibilityIssuesBySeverity[issue.typeCode] = (accessibilityIssuesBySeverity[issue.typeCode] || 0) + 1;
                });
            } else {
                output += 'No accessibility data available.\n';
            }

            // SEO results
            if (result.seo && result.seo.score !== undefined) {
                output += 'SEO Results:\n';
                output += `  Score: ${Math.round(result.seo.score * 100)}%\n`;
                totalSEOScore += result.seo.score;

                if (result.seo.auditRefs) {
                    result.seo.auditRefs.forEach(audit => {
                        const auditResult = result.seo.audits && result.seo.audits[audit.id];
                        if (auditResult && auditResult.score !== undefined && auditResult.score !== 1) {
                            output += `  ${auditResult.title}: ${auditResult.description}\n`;
                        }
                    });
                }
            } else {
                output += 'No SEO data available.\n';
            }

            // Internal links
            if (result.internalLinks) {
                output += `\nInternal Links: ${result.internalLinks.length}\n`;
            } else {
                output += '\nNo internal links data available.\n';
            }
        }
        output += '\n';
    });

    // Add summary section
    output += 'Summary of Results\n';
    output += '===================\n\n';

    output += 'Accessibility Summary:\n';
    output += `Total accessibility issues found: ${totalAccessibilityIssues}\n\n`;

    output += 'Accessibility Issues by Type:\n';
    for (let type in accessibilityIssuesByType) {
        output += `  ${type}: ${accessibilityIssuesByType[type]}\n`;
    }
    output += '\n';

    output += 'Accessibility Issues by Severity:\n';
    for (let severity in accessibilityIssuesBySeverity) {
        output += `  ${severity}: ${accessibilityIssuesBySeverity[severity]}\n`;
    }
    output += '\n';

    const validSEOResults = results.filter(r => r.seo && r.seo.score !== undefined).length;
    if (validSEOResults > 0) {
        output += 'SEO Summary:\n';
        output += `Average SEO score: ${Math.round((totalSEOScore / validSEOResults) * 100)}%\n\n`;
    } else {
        output += 'SEO Summary: No valid SEO data available.\n\n';
    }

    output += 'Orphaned URLs:\n';
    orphanedUrls.forEach(url => {
        output += `  ${url}\n`;
    });
    output += '\n';

    output += `Total URLs in sitemap: ${results.length - 1}\n`;
    output += `Total orphaned URLs: ${orphanedUrls.length}\n`;

    return output;
}
async function saveResults(results, outputFile) {
    try {
        const formattedResults = formatResults(results);
        await fs.writeFile(outputFile, formattedResults);
        console.log(`Results saved to ${outputFile}`);
    } catch (error) {
        console.error(`Error writing to file ${outputFile}:`, error.message);
    }
}

function setupShutdownHandler(outputFile) {
    process.on('SIGINT', async () => {
        console.log('\nGraceful shutdown initiated...');
        isShuttingDown = true;

        // Wait a moment to allow the current operation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Saving partial results...');
        await saveResults(results, outputFile);

        console.log('Shutdown complete. Exiting...');
        process.exit(0);
    });
}

// Set up command-line interface
program
    .version('1.0.0')
    .description('Run pa11y accessibility, Lighthouse SEO tests, and internal link checks on all URLs in a sitemap')
    .requiredOption('-s, --sitemap <url>', 'URL of the sitemap to process')
    .option('-o, --output <file>', 'Output file for results', 'pa11y-seo-results.txt')
    .option('-l, --limit <number>', 'Limit the number of URLs to test. Use -1 to test all URLs.', parseInt, 10)
    .parse(process.argv);

const options = program.opts();

// Set up the shutdown handler
setupShutdownHandler(options.output);

// Run the main function
runTestsOnSitemap(options.sitemap, options.output, options.limit);
