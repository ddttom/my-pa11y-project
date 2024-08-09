// metricsUpdater.js 

export function updateUrlMetrics(testUrl, baseUrl, html, statusCode, results) {
    results.urlMetrics.total++;
    if (testUrl.startsWith(baseUrl)) {
        results.urlMetrics.internal++;
        // Check if URL is indexable (this is a simplified check)
        if (!html.includes('noindex') && statusCode === 200) {
            results.urlMetrics.internalIndexable++;
        } else {
            results.urlMetrics.internalNonIndexable++;
        }
    } else {
        results.urlMetrics.external++;
    }

    // Check for non-ASCII characters, uppercase, underscores, spaces, and length
    if (/[^\x00-\x7F]/.test(testUrl)) results.urlMetrics.nonAscii++;
    if (/[A-Z]/.test(testUrl)) results.urlMetrics.uppercase++;
    if (testUrl.includes('_')) results.urlMetrics.underscores++;
    if (testUrl.includes(' ')) results.urlMetrics.containsSpace++;
    if (testUrl.length > 115) results.urlMetrics.overLength++;
}

// Update response code metrics
export function updateResponseCodeMetrics(statusCode, results) {
    results.responseCodeMetrics[statusCode] = (results.responseCodeMetrics[statusCode] || 0) + 1;
}
