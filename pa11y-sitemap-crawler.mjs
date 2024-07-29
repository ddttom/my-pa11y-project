import fs from 'fs/promises';
import axios from 'axios';
import xml2js from 'xml2js';
import pa11y from 'pa11y';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { program } from 'commander';
import cheerio from 'cheerio';
import { URL } from 'url';
import { createObjectCsvWriter } from 'csv-writer';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

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
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
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
    const reportJson = JSON.parse(runnerResult.report);
    return {
        seo: reportJson.categories.seo,
        performance: reportJson.categories.performance,
        accessibility: reportJson.categories.accessibility,
        bestPractices: reportJson.categories['best-practices'],
        metrics: {
            fcp: reportJson.audits['first-contentful-paint'].numericValue,
            lcp: reportJson.audits['largest-contentful-paint'].numericValue,
            tti: reportJson.audits['interactive'].numericValue,
            tbt: reportJson.audits['total-blocking-time'].numericValue,
            cls: reportJson.audits['cumulative-layout-shift'].numericValue
        }
    };
}

async function analyzeContent(pageUrl) {
    try {
        const response = await axios.get(pageUrl);
        const $ = cheerio.load(response.data);

        const title = $('title').text();
        const metaDescription = $('meta[name="description"]').attr('content');
        const h1 = $('h1').first().text();
        const wordCount = $('body').text().trim().split(/\s+/).length;

        const headings = {};
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(h => {
            headings[h] = $(h).length;
        });

        // Simple keyword extraction (top 5 most frequent words)
        const words = $('body').text().toLowerCase().match(/\b\w+\b/g);
        const wordFrequency = {};
        words.forEach(word => {
            if (word.length > 3) {  // Ignore short words
                wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            }
        });
        const keywords = Object.entries(wordFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(entry => entry[0]);

        // Check for broken links
        const links = $('a').map((i, el) => $(el).attr('href')).get();
        const brokenLinks = [];
        for (const link of links) {
            try {
                if (!link) continue;
                const absoluteLink = new URL(link, pageUrl).href;
                const linkResponse = await axios.head(absoluteLink, { timeout: 5000 });
                if (linkResponse.status >= 400) {
                    brokenLinks.push({ url: absoluteLink, status: linkResponse.status });
                }
            } catch (error) {
                brokenLinks.push({ url: link, status: 'error' });
            }
        }

        // Mobile-friendliness checks
        const hasViewport = $('meta[name="viewport"]').length > 0;
        const smallFontSizes = $('*').filter((i, el) => {
            const fontSize = $(el).css('font-size');
            return fontSize && parseInt(fontSize) < 12;
        }).length;
        const smallTapTargets = $('a, button').filter((i, el) => {
            const width = $(el).width();
            const height = $(el).height();
            return (width && width < 48) || (height && height < 48);
        }).length;

        // Security checks
        const isHttps = pageUrl.startsWith('https');
        const securityHeaders = response.headers;
        const hasMixedContent = $('*').filter((i, el) => {
            const src = $(el).attr('src');
            return src && src.startsWith('http:');
        }).length > 0;

        // Internationalization
        const hreflangTags = $('link[rel="alternate"][hreflang]').length;
        const hasLanguageDeclaration = $('html[lang]').length > 0;

        // URL structure
        const urlParams = new URL(pageUrl).searchParams;
        const excessiveParams = urlParams.toString().split('&').length > 3;
        const longUrl = pageUrl.length > 100;

        // Content quality
        const thinContent = wordCount < 300;
        
        // Check for potential duplicate content
        const canonicalUrl = $('link[rel="canonical"]').attr('href');
        const potentialDuplicate = canonicalUrl && canonicalUrl !== pageUrl;

        // Image Optimization
        const images = $('img').map((i, el) => ({
            src: $(el).attr('src'),
            alt: $(el).attr('alt'),
            width: $(el).attr('width'),
            height: $(el).attr('height')
        })).get();

        const imagesWithoutAlt = images.filter(img => !img.alt).length;
        const imagesWithoutDimensions = images.filter(img => !img.width || !img.height).length;

        // JavaScript and CSS Analysis
        const renderBlockingResources = {
            css: $('link[rel="stylesheet"]').length,
            js: $('script[src]').not('[async]').not('[defer]').length
        };

        const inlineStyles = $('style').length;
        const inlineScripts = $('script:not([src])').length;

        // Canonicalization Issues
        const canonicalTag = $('link[rel="canonical"]').attr('href');
        const isCanonical = canonicalTag === pageUrl;
        const hasMultipleCanonicals = $('link[rel="canonical"]').length > 1;

        return {
            title,
            metaDescription,
            h1,
            wordCount,
            headings,
            keywords,
            brokenLinks,
            mobileFriendliness: {
                hasViewport,
                smallFontSizes,
                smallTapTargets
            },
            security: {
                isHttps,
                securityHeaders,
                hasMixedContent
            },
            internationalization: {
                hreflangTags,
                hasLanguageDeclaration
            },
            urlStructure: {
                excessiveParams,
                longUrl
            },
            contentQuality: {
                wordCount,
                thinContent,
                potentialDuplicate
            },
            imageOptimization: {
                totalImages: images.length,
                imagesWithoutAlt,
                imagesWithoutDimensions,
                images
            },
            resourceOptimization: {
                renderBlockingResources,
                inlineStyles,
                inlineScripts
            },
            canonicalization: {
                canonicalTag,
                isCanonical,
                hasMultipleCanonicals
            }
        };
    } catch (error) {
        console.error(`Error analyzing content of ${pageUrl}:`, error.message);
        return null;
    }
}

async function analyzeImageOptimization(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');

        const fileType = await fileTypeFromBuffer(buffer);
        const metadata = await sharp(buffer).metadata();

        const isOptimizedFormat = fileType && ['webp', 'avif'].includes(fileType.ext);
        const isLargeFile = buffer.length > 100 * 1024; // Over 100KB

        return {
            format: fileType ? fileType.ext : 'unknown',
            width: metadata.width,
            height: metadata.height,
            fileSize: buffer.length,
            isOptimizedFormat,
            isLargeFile
        };
    } catch (error) {
        console.error(`Error analyzing image: ${imageUrl}`, error.message);
        return null;
    }
}
async function generatePa11yReport(results, outputFile) {
    const csvWriter = createObjectCsvWriter({
        path: outputFile,
        header: [
            {id: 'url', title: 'URL'},
            {id: 'type', title: 'Type'},
            {id: 'code', title: 'Code'},
            {id: 'message', title: 'Message'},
            {id: 'context', title: 'Context'},
            {id: 'selector', title: 'Selector'}
        ]
    });

    const records = results.flatMap(result => 
        result.accessibility.map(issue => ({
            url: result.url,
            type: issue.type,
            code: issue.code,
            message: issue.message,
            context: issue.context,
            selector: issue.selector
        }))
    );

    await csvWriter.writeRecords(records);
    console.log(`Pa11y report saved to ${outputFile}`);
}

async function generateLighthouseReport(results, outputFile) {
    const csvWriter = createObjectCsvWriter({
        path: outputFile,
        header: [
            {id: 'url', title: 'URL'},
            {id: 'performance', title: 'Performance Score'},
            {id: 'accessibility', title: 'Accessibility Score'},
            {id: 'bestPractices', title: 'Best Practices Score'},
            {id: 'seo', title: 'SEO Score'},
            {id: 'fcp', title: 'First Contentful Paint'},
            {id: 'lcp', title: 'Largest Contentful Paint'},
            {id: 'tti', title: 'Time to Interactive'},
            {id: 'tbt', title: 'Total Blocking Time'},
            {id: 'cls', title: 'Cumulative Layout Shift'}
        ]
    });

    const records = results.map(result => ({
        url: result.url,
        performance: Math.round(result.lighthouse.performance.score * 100),
        accessibility: Math.round(result.lighthouse.accessibility.score * 100),
        bestPractices: Math.round(result.lighthouse.bestPractices.score * 100),
        seo: Math.round(result.lighthouse.seo.score * 100),
        fcp: result.lighthouse.metrics.fcp,
        lcp: result.lighthouse.metrics.lcp,
        tti: result.lighthouse.metrics.tti,
        tbt: result.lighthouse.metrics.tbt,
        cls: result.lighthouse.metrics.cls
    }));

    await csvWriter.writeRecords(records);
    console.log(`Lighthouse report saved to ${outputFile}`);
}

async function generateInternalLinksReport(results, outputFile) {
    const csvWriter = createObjectCsvWriter({
        path: outputFile,
        header: [
            {id: 'sourceUrl', title: 'Source URL'},
            {id: 'targetUrl', title: 'Target URL'}
        ]
    });

    const records = results.flatMap(result => 
        result.contentAnalysis.brokenLinks.map(link => ({
            sourceUrl: result.url,
            targetUrl: link.url
        }))
    );

    await csvWriter.writeRecords(records);
    console.log(`Internal links report saved to ${outputFile}`);
}

async function generateContentAnalysisReport(results, outputFile) {
    const csvWriter = createObjectCsvWriter({
        path: outputFile,
        header: [
            {id: 'url', title: 'URL'},
            {id: 'title', title: 'Title'},
            {id: 'metaDescription', title: 'Meta Description'},
            {id: 'h1', title: 'H1'},
            {id: 'wordCount', title: 'Word Count'},
            {id: 'keywords', title: 'Top Keywords'}
        ]
    });

    const records = results.map(result => ({
        url: result.url,
        title: result.contentAnalysis.title,
        metaDescription: result.contentAnalysis.metaDescription,
        h1: result.contentAnalysis.h1,
        wordCount: result.contentAnalysis.wordCount,
        keywords: result.contentAnalysis.keywords.join(', ')
    }));

    await csvWriter.writeRecords(records);
    console.log(`Content analysis report saved to ${outputFile}`);
}

async function generateScanSummary(results, outputFile) {
    let summary = 'Scan Summary\n';
    summary += '=============\n\n';

    const totalPages = results.length;
    const htmlPages = results.filter(r => r.contentAnalysis);
    const htmlPagesCount = htmlPages.length;

    // Site Information
    summary += `Site Crawled\t${results[0].url.split('/').slice(0, 3).join('/')}\n`;
    summary += `Date\t${new Date().toLocaleDateString()}\n`;
    summary += `Time\t${new Date().toLocaleTimeString()}\n\n`;

    // URL Summary
    summary += 'Summary\tURLs\t% of Total\tTotal URLs\tTotal URLs Description\n';
    summary += `Total URLs Encountered\t${totalPages}\t100.00%\t${totalPages}\tURLs Encountered\n`;
    summary += `Total URLs Crawled\t${totalPages}\t100.00%\t${totalPages}\tURLs Encountered\n`;
    summary += `Total Internal URLs\t${totalPages}\t100.00%\t${totalPages}\tURLs Displayed\n`;
    summary += `Total Internal Indexable URLs\t${htmlPagesCount}\t${((htmlPagesCount / totalPages) * 100).toFixed(2)}%\t${totalPages}\tURLs Displayed\n`;

    // Accessibility Summary
    const accessibilityIssues = results.reduce((sum, r) => sum + r.accessibility.length, 0);
    summary += '\nAccessibility: ';
    summary += `A total of ${accessibilityIssues} accessibility issues were identified across ${totalPages} URLs. `;
    summary += 'These issues are categorized as errors and pose significant barriers to users who rely on screen readers or keyboard navigation.\n';

    // SEO Summary
    const averageSeoScore = results.reduce((sum, r) => sum + r.lighthouse.seo.score, 0) / totalPages;
    summary += `\nSEO: The website maintains an average SEO score of ${(averageSeoScore * 100).toFixed(2)}%.\n`;

    // Performance Summary
    const averagePerformanceScore = results.reduce((sum, r) => sum + r.lighthouse.performance.score, 0) / totalPages;
    summary += `\nPerformance: The website has an average performance score of ${(averagePerformanceScore * 100).toFixed(2)}%.\n`;

    // Image Optimization Summary
    const totalImages = results.reduce((sum, r) => sum + r.contentAnalysis.imageOptimization.totalImages, 0);
    const imagesWithoutAlt = results.reduce((sum, r) => sum + r.contentAnalysis.imageOptimization.imagesWithoutAlt, 0);
    const imagesWithoutDimensions = results.reduce((sum, r) => sum + r.contentAnalysis.imageOptimization.imagesWithoutDimensions, 0);
    summary += '\nImage Optimization:\n';
    summary += `Total Images: ${totalImages}\n`;
    summary += `Images Without Alt Text: ${imagesWithoutAlt} (${((imagesWithoutAlt / totalImages) * 100).toFixed(2)}%)\n`;
    summary += `Images Without Dimensions: ${imagesWithoutDimensions} (${((imagesWithoutDimensions / totalImages) * 100).toFixed(2)}%)\n`;

    // JavaScript and CSS Summary
    const totalRenderBlockingResources = results.reduce((sum, r) => sum + r.contentAnalysis.resourceOptimization.renderBlockingResources.css + r.contentAnalysis.resourceOptimization.renderBlockingResources.js, 0);
    summary += '\nJavaScript and CSS:\n';
    summary += `Total Render-Blocking Resources: ${totalRenderBlockingResources}\n`;

    // Canonicalization Summary
    const pagesWithCanonical = results.filter(r => r.contentAnalysis.canonicalization.canonicalTag).length;
    const pagesWithMultipleCanonicals = results.filter(r => r.contentAnalysis.canonicalization.hasMultipleCanonicals).length;
    summary += '\nCanonicalization:\n';
    summary += `Pages with Canonical Tags: ${pagesWithCanonical} (${((pagesWithCanonical / htmlPagesCount) * 100).toFixed(2)}%)\n`;
    summary += `Pages with Multiple Canonical Tags: ${pagesWithMultipleCanonicals} (${((pagesWithMultipleCanonicals / htmlPagesCount) * 100).toFixed(2)}%)\n`;

    // Broken Links Summary
    const pagesWithBrokenLinks = results.filter(r => r.contentAnalysis.brokenLinks.length > 0).length;
    const totalBrokenLinks = results.reduce((sum, r) => sum + r.contentAnalysis.brokenLinks.length, 0);
    summary += '\nBroken Links:\n';
    summary += `Pages with Broken Links: ${pagesWithBrokenLinks} (${((pagesWithBrokenLinks / totalPages) * 100).toFixed(2)}%)\n`;
    summary += `Total Broken Links: ${totalBrokenLinks}\n`;

    // Write the summary to a file
    await fs.writeFile(outputFile, summary);
    console.log(`Scan summary saved to ${outputFile}`);
}

async function generateIssuesToFixReport(results, outputFile) {
    const csvWriter = createObjectCsvWriter({
        path: outputFile,
        header: [
            {id: 'issue', title: 'Issue'},
            {id: 'count', title: 'Count'},
            {id: 'percentage', title: 'Percentage'},
            {id: 'howToFix', title: 'How to Fix'}
        ]
    });

    const totalPages = results.length;
    const issues = [
        {
            issue: 'Missing Meta Descriptions',
            count: results.filter(r => !r.contentAnalysis.metaDescription).length,
            howToFix: 'Add unique, descriptive meta descriptions (150-160 characters) to each page.'
        },
        {
            issue: 'Missing or Empty H1 Tags',
            count: results.filter(r => !r.contentAnalysis.h1).length,
            howToFix: 'Ensure each page has a single, descriptive H1 tag that accurately represents the page content.'
        },
        {
            issue: 'Images Missing Alt Text',
            count: results.reduce((sum, r) => sum + r.contentAnalysis.imageOptimization.imagesWithoutAlt, 0),
            howToFix: 'Add descriptive alt text to all images, ensuring they accurately describe the image content.'
        },
        {
            issue: 'Slow Page Load Times',
            count: results.filter(r => r.lighthouse.performance.score < 0.5).length,
            howToFix: 'Optimize images, minify CSS/JS, leverage browser caching, and use a CDN to improve load times.'
        },
        {
            issue: 'Low Word Count Pages',
            count: results.filter(r => r.contentAnalysis.wordCount < 300).length,
            howToFix: 'Add more high-quality, relevant content to pages with less than 300 words.'
        },
        {
            issue: 'Missing Canonical Tags',
            count: results.filter(r => !r.contentAnalysis.canonicalization.canonicalTag).length,
            howToFix: 'Add canonical tags to all pages to prevent duplicate content issues.'
        },
        {
            issue: 'Non-HTTPS Pages',
            count: results.filter(r => !r.contentAnalysis.security.isHttps).length,
            howToFix: 'Migrate all HTTP pages to HTTPS to ensure secure connections.'
        },
        {
            issue: 'Render-Blocking Resources',
            count: results.filter(r => r.contentAnalysis.resourceOptimization.renderBlockingResources.css + r.contentAnalysis.resourceOptimization.renderBlockingResources.js > 0).length,
            howToFix: 'Minimize render-blocking resources by inlining critical CSS/JS and deferring or asyncing non-critical resources.'
        },
        {
            issue: 'Pages with Multiple Canonical Tags',
            count: results.filter(r => r.contentAnalysis.canonicalization.hasMultipleCanonicals).length,
            howToFix: 'Ensure each page has only one canonical tag pointing to the preferred version of the page.'
        },
        {
            issue: 'Broken Links',
            count: results.filter(r => r.contentAnalysis.brokenLinks.length > 0).length,
            howToFix: 'Identify and fix or remove all broken links to improve user experience and crawlability.'
        }
    ];

    const records = issues.map(issue => ({
        ...issue,
        percentage: ((issue.count / totalPages) * 100).toFixed(2) + '%'
    }));

    await csvWriter.writeRecords(records);
    console.log(`Issues to Fix report saved to ${outputFile}`);
}

async function generateImageOptimizationReport(results, outputFile) {
    const csvWriter = createObjectCsvWriter({
        path: outputFile,
        header: [
            {id: 'pageUrl', title: 'Page URL'},
            {id: 'imageUrl', title: 'Image URL'},
            {id: 'altText', title: 'Alt Text'},
            {id: 'format', title: 'Format'},
            {id: 'width', title: 'Width'},
            {id: 'height', title: 'Height'},
            {id: 'fileSize', title: 'File Size (KB)'},
            {id: 'isOptimizedFormat', title: 'Optimized Format'},
            {id: 'isLargeFile', title: 'Large File'}
        ]
    });

    const records = [];

    for (const result of results) {
        for (const image of result.contentAnalysis.imageOptimization.images) {
            const imageAnalysis = await analyzeImageOptimization(image.src);
            if (imageAnalysis) {
                records.push({
                    pageUrl: result.url,
                    imageUrl: image.src,
                    altText: image.alt || 'Missing',
                    format: imageAnalysis.format,
                    width: imageAnalysis.width,
                    height: imageAnalysis.height,
                    fileSize: (imageAnalysis.fileSize / 1024).toFixed(2),
                    isOptimizedFormat: imageAnalysis.isOptimizedFormat ? 'Yes' : 'No',
                    isLargeFile: imageAnalysis.isLargeFile ? 'Yes' : 'No'
                });
            }
        }
    }

    await csvWriter.writeRecords(records);
    console.log(`Image Optimization report saved to ${outputFile}`);
}

async function runTestsOnSitemap(sitemapUrl, outputPrefix, limit = -1) {
    try {
        console.log(`Starting process for sitemap: ${sitemapUrl}`);
        console.log(`Results will be saved to: ${outputPrefix}_*.csv`);

        const parsedXml = await fetchAndParseSitemap(sitemapUrl);
        console.log('Sitemap fetched and parsed successfully');

        const urls = await extractUrls(parsedXml);
        console.log(`Found ${urls.length} URLs in sitemap`);

        const urlsToTest = limit === -1 ? urls : urls.slice(0, limit);
        const totalTests = urlsToTest.length;
        console.log(`Testing ${totalTests} URLs${limit === -1 ? ' (all URLs)' : ''}`);

        for (let i = 0; i < urlsToTest.length; i++) {
            if (isShuttingDown) break;
            const testUrl = urlsToTest[i];
            console.log(`Testing: ${testUrl}`);
            try {
                const pa11yResult = await pa11y(testUrl, pa11yOptions);
                const lighthouseResult = await runLighthouse(testUrl, lighthouseOptions);
                const contentAnalysis = await analyzeContent(testUrl);

                results.push({
                    url: testUrl,
                    accessibility: pa11yResult.issues,
                    lighthouse: lighthouseResult,
                    contentAnalysis
                });
                console.log(`Completed testing: ${testUrl} (${i + 1}/${totalTests})`);
            } catch (error) {
                console.error(`Error testing ${testUrl}:`, error.message);
                results.push({ url: testUrl, error: error.message });
            }
            await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1 second between requests
        }

        // Generate reports
        await generatePa11yReport(results, `${outputPrefix}_pa11y.csv`);
        await generateLighthouseReport(results, `${outputPrefix}_lighthouse.csv`);
        await generateInternalLinksReport(results, `${outputPrefix}_internal_links.csv`);
        await generateContentAnalysisReport(results, `${outputPrefix}_content_analysis.csv`);
        await generateScanSummary(results, `${outputPrefix}_scan_summary.txt`);
        await generateIssuesToFixReport(results, `${outputPrefix}_issues_to_fix.csv`);
        await generateImageOptimizationReport(results, `${outputPrefix}_image_optimization.csv`);

        return results;
    } catch (error) {
        console.error('Error in runTestsOnSitemap:', error.message);
    }
}

function setupShutdownHandler(outputPrefix) {
    process.on('SIGINT', async () => {
        console.log('\nGraceful shutdown initiated...');
        isShuttingDown = true;

        // Wait a moment to allow the current operation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Saving partial results...');
        await generateScanSummary(results, `${outputPrefix}_partial_scan_summary.txt`);
        await generateIssuesToFixReport(results, `${outputPrefix}_partial_issues_to_fix.csv`);

        console.log('Shutdown complete. Exiting...');
        process.exit(0);
    });
}

// Set up command-line interface
program
    .version('1.0.0')
    .description('Run pa11y accessibility, Lighthouse SEO tests, and content analysis on all URLs in a sitemap')
    .requiredOption('-s, --sitemap <url>', 'URL of the sitemap to process')
    .option('-o, --output <prefix>', 'Output prefix for result files', 'site_analysis')
    .option('-l, --limit <number>', 'Limit the number of URLs to test. Use -1 to test all URLs.', parseInt, -1)
    .parse(process.argv);

const options = program.opts();

// Set up the shutdown handler
setupShutdownHandler(options.output);

// Run the main function
runTestsOnSitemap(options.sitemap, options.output, options.limit);