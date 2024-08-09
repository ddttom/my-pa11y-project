// urlProcessor.js 

import { getOrRenderData } from './caching.js';
import { analyzePageContent } from './pageAnalyzer.js';
import { updateUrlMetrics, updateResponseCodeMetrics } from './metricsUpdater.js';
import { analyzePerformance } from './performanceAnalyzer.js';
import { calculateSeoScore } from './seoScoring.js';

export async function processUrl(testUrl, lastmod, index, totalTests, results, options) {
    try {
        let data = await getOrRenderData(testUrl, options);
        
        if (data.error) {
            console.warn(`Error retrieving data for ${testUrl}: ${data.error}`);
            return;
        }

        const { html, jsErrors, statusCode, headers, pageData } = data;

        updateUrlMetrics(testUrl, options.baseUrl, html, statusCode, results);
        updateResponseCodeMetrics(statusCode, results);

        if (statusCode === 200) {
            await analyzePageContent(testUrl, html, jsErrors, options.baseUrl, results, headers, pageData);
            
            const performanceMetrics = await analyzePerformance(testUrl);
            results.performanceAnalysis.push({ url: testUrl, lastmod, ...performanceMetrics });

            const seoScore = calculateSeoScore({ ...pageData, performanceMetrics });
            results.seoScores.push({ url: testUrl, lastmod, ...seoScore });
        }
    } catch (error) {
        console.error(`Error processing ${testUrl}:`, error);
    }
}