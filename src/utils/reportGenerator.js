// src/utils/reportGenerator.js

import { formatCsv } from './csvFormatter.js';
import { debug } from './debug.js';

export function generateReport(results, sitemapUrl) {
    debug('Generating SEO report');
    const responseCategories = categorizeResponseCodes(results.responseCodeMetrics);
    const reportData = [
        ...generateHeader(sitemapUrl),
        ...generateSummary(results, responseCategories),
        ...generateUrlAnalysis(results),
        ...generatePageTitleAnalysis(results),
        ...generateMetaDescriptionAnalysis(results),
        ...generateHeadingAnalysis(results),
        ...generateImageAnalysis(results),
        ...generateLinkAnalysis(results),
        ...generateSecurityAnalysis(results),
        ...generateHreflangAnalysis(results),
        ...generateCanonicalAnalysis(results),
        ...generateContentAnalysis(results),
        ...generateOrphanedUrlsAnalysis(results),
        ...generatePa11yAnalysis(results),
        ...generateJavaScriptErrorsAnalysis(results),
        ...generateSeoScoreAnalysis(results),
        ...generatePerformanceAnalysis(results)
    ];

    

    // Round all numeric values in the report to 2 decimal places
    const roundedReportData = reportData.map(row => 
        row.map(cell => 
            typeof cell === 'number' ? Number(cell.toFixed(2)) : cell
        )
    );

    return formatCsv(roundedReportData);
}

function generateHeader(sitemapUrl) {
    return [
        ['SEO Analysis Report'],
        ['Date', new Date().toLocaleDateString()],
        ['Time', new Date().toLocaleTimeString()],
        ['Sitemap URL', sitemapUrl],
        []  // Empty row for spacing
    ];
}

function generateSummary(results, responseCategories) {
    return [
        ['Summary', 'Count'],
        ['Total URLs', results.urlMetrics.total],
        ['Internal URLs', results.urlMetrics.internal],
        ['External URLs', results.urlMetrics.external],
        ['Indexable URLs', results.urlMetrics.internalIndexable],
        ['Non-Indexable URLs', results.urlMetrics.internalNonIndexable],
        [],
        ['Response Codes', 'Count'],
        ['2xx (Success)', responseCategories['2xx']],
        ['3xx (Redirection)', responseCategories['3xx']],
        ['4xx (Client Error)', responseCategories['4xx']],
        ['5xx (Server Error)', responseCategories['5xx']],
        []
    ];
}

function generateUrlAnalysis(results) {
    return [
        ['URL Analysis', 'Count'],
        ['URLs with non-ASCII characters', results.urlMetrics.nonAscii],
        ['URLs with uppercase characters', results.urlMetrics.uppercase],
        ['URLs with underscores', results.urlMetrics.underscores],
        ['URLs with spaces', results.urlMetrics.containsSpace],
        ['URLs over 115 characters', results.urlMetrics.overLength],
        []
    ];
}

function generatePageTitleAnalysis(results) {
    return [
        ['Page Title Analysis', 'Count'],
        ['Missing titles', results.titleMetrics.missing],
        ['Duplicate titles', results.titleMetrics.duplicate],
        ['Titles over 60 characters', results.titleMetrics.tooLong],
        ['Titles under 30 characters', results.titleMetrics.tooShort],
        []
    ];
}

function generateMetaDescriptionAnalysis(results) {
    return [
        ['Meta Description Analysis', 'Count'],
        ['Missing meta descriptions', results.metaDescriptionMetrics.missing],
        ['Duplicate meta descriptions', results.metaDescriptionMetrics.duplicate],
        ['Meta descriptions over 155 characters', results.metaDescriptionMetrics.tooLong],
        ['Meta descriptions under 70 characters', results.metaDescriptionMetrics.tooShort],
        []
    ];
}

function generateHeadingAnalysis(results) {
    return [
        ['Heading Analysis', 'Count'],
        ['Missing H1', results.h1Metrics.missing],
        ['Multiple H1s', results.h1Metrics.multiple],
        ['H1s over 70 characters', results.h1Metrics.tooLong],
        ['Missing H2', results.h2Metrics.missing],
        ['Non-sequential H2s', results.h2Metrics.nonSequential],
        []
    ];
}

function generateImageAnalysis(results) {
    return [
        ['Image Analysis', 'Count'],
        ['Total images', results.imageMetrics.total],
        ['Images missing alt text', results.imageMetrics.missingAlt],
        ['Images with empty alt attribute', results.imageMetrics.missingAltAttribute],
        ['Images with alt text over 100 characters', results.imageMetrics.altTextTooLong],
        []
    ];
}

function generateLinkAnalysis(results) {
    return [
        ['Link Analysis', 'Count'],
        ['Pages without internal links', results.linkMetrics.pagesWithoutInternalOutlinks],
        ['Pages with high number of external links', results.linkMetrics.pagesWithHighExternalOutlinks],
        ['Internal links without anchor text', results.linkMetrics.internalOutlinksWithoutAnchorText],
        ['Non-descriptive anchor text', results.linkMetrics.nonDescriptiveAnchorText],
        []
    ];
}

function generateSecurityAnalysis(results) {
    return [
        ['Security Analysis', 'Count'],
        ['HTTP URLs (non-secure)', results.securityMetrics.httpUrls],
        ['Missing HSTS header', results.securityMetrics.missingHstsHeader],
        ['Missing Content Security Policy', results.securityMetrics.missingContentSecurityPolicy],
        ['Missing X-Frame-Options header', results.securityMetrics.missingXFrameOptions],
        ['Missing X-Content-Type-Options header', results.securityMetrics.missingXContentTypeOptions],
        []
    ];
}

function generateHreflangAnalysis(results) {
    return [
        ['Hreflang Analysis', 'Count'],
        ['Pages with hreflang', results.hreflangMetrics.pagesWithHreflang],
        ['Missing return links', results.hreflangMetrics.missingReturnLinks],
        ['Incorrect language codes', results.hreflangMetrics.incorrectLanguageCodes],
        []
    ];
}

function generateCanonicalAnalysis(results) {
    return [
        ['Canonical Analysis', 'Count'],
        ['Pages with canonical tags', results.canonicalMetrics.selfReferencing + results.canonicalMetrics.nonSelf],
        ['Self-referencing canonicals', results.canonicalMetrics.selfReferencing],
        ['Non-self canonicals', results.canonicalMetrics.nonSelf],
        ['Missing canonical tags', results.canonicalMetrics.missing],
        []
    ];
}

function generateContentAnalysis(results) {
    return [
        ['Content Analysis', 'Count'],
        ['Low content pages', results.contentMetrics.lowContent],
        ['Duplicate content pages', results.contentMetrics.duplicate],
        []
    ];
}

function generateOrphanedUrlsAnalysis(results) {
    return [
        ['Orphaned URLs Analysis', 'Count'],
        ['Orphaned URLs', results.orphanedUrls ? results.orphanedUrls.size : 0],
        []
    ];
}

function generatePa11yAnalysis(results) {
    const totalIssues = results.pa11y.reduce((sum, result) => sum + (result.issues ? result.issues.length : 0), 0);
    return [
        ['Accessibility Analysis', 'Count'],
        ['Total Pa11y issues', totalIssues],
        []
    ];
}

function generateJavaScriptErrorsAnalysis(results) {
    const pagesWithJsErrors = results.contentAnalysis.filter(page => page.jsErrors && page.jsErrors.length > 0).length;
    return [
        ['JavaScript Errors Analysis', 'Count'],
        ['Pages with JavaScript errors', pagesWithJsErrors],
        []
    ];
}

function generateSeoScoreAnalysis(results) {
    const averageScore = results.seoScores.reduce((sum, score) => sum + score.score, 0) / results.seoScores.length;
    return [
        ['SEO Score Analysis', 'Score'],
        ['Average SEO Score', averageScore.toFixed(2)],
        []
    ];
}

function generatePerformanceAnalysis(results) {
    const avgLoadTime = results.performanceAnalysis.reduce((sum, perf) => sum + perf.loadTime, 0) / results.performanceAnalysis.length;
    return [
        ['Performance Analysis', 'Time (ms)'],
        ['Average Load Time', avgLoadTime.toFixed(2)],
        []
    ];
}

function categorizeResponseCodes(responseCodeMetrics) {
    const categories = {
        '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0
    };
    
    for (const [code, count] of Object.entries(responseCodeMetrics)) {
        const codeNum = parseInt(code);
        if (codeNum >= 200 && codeNum < 300) categories['2xx'] += count;
        else if (codeNum >= 300 && codeNum < 400) categories['3xx'] += count;
        else if (codeNum >= 400 && codeNum < 500) categories['4xx'] += count;
        else if (codeNum >= 500 && codeNum < 600) categories['5xx'] += count;
    }
    
    return categories;
}
