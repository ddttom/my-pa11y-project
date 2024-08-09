// reportGenerator.js 

function generateReport(results, sitemapUrl) {
    const responseCategories = categorizeResponseCodes(results.responseCodeMetrics);
    const reportData = [
        ...generateHeader(),
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

    return stringify(roundedReportData)

}