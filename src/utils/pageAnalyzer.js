// pageAnalyzer.js 
import cheerio from 'cheerio';
import { runPa11yTest } from './pa11yRunner.js';
import { getInternalLinks } from './linkAnalyzer.js';
import { updateTitleMetrics, updateMetaDescriptionMetrics, updateHeadingMetrics, updateImageMetrics, updateLinkMetrics, updateSecurityMetrics, updateHreflangMetrics, updateCanonicalMetrics } from './metricsUpdater.js';

export async function analyzePageContent(testUrl, html, jsErrors, baseUrl, results, headers, pageData) {
    const $ = cheerio.load(html);
    
    updateTitleMetrics($, results);
    updateMetaDescriptionMetrics($, results);
    updateHeadingMetrics($, results);
    updateImageMetrics($, results);
    updateLinkMetrics($, baseUrl, results);
    updateSecurityMetrics(testUrl, headers, results);
    updateHreflangMetrics($, results);
    updateCanonicalMetrics($, testUrl, results);

    await runPa11yTest(testUrl, html, results);
    const internalLinks = await getInternalLinks(html, testUrl, baseUrl);
    updateInternalLinks(testUrl, internalLinks, results);
    
    const contentAnalysis = {
        url: testUrl,
        ...pageData,
        jsErrors: jsErrors
    };
    
    updateContentAnalysis(contentAnalysis, results);
}