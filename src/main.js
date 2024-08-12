// src/main.js

import { validateAndPrepare } from './utils/setup.js';
import { getUrlsFromSitemap } from './utils/sitemap.js';
import { processUrl } from './utils/urlProcessor.js';
import { postProcessResults, saveResults } from './utils/results.js';
import { generateSitemap } from './utils/sitemapGenerator.js';
import { debug } from './utils/debug.js';
import { checkIsShuttingDown, setupShutdownHandler } from './utils/shutdownHandler.js';
import { fixUrl } from './utils/urlUtils.js';

export async function runTestsOnSitemap(sitemapUrl, outputDir, options, limit = -1) {
    console.log(`Starting process for sitemap or page: ${sitemapUrl}`);
    console.log(`Results will be saved to: ${outputDir}`);
    
    let results = initializeResults();
    setupShutdownHandler(outputDir, results);

    try {
        await validateAndPrepare(sitemapUrl, outputDir, options);
        const { validUrls, invalidUrls } = await getUrlsFromSitemap(sitemapUrl, limit);

        console.info(`Found ${validUrls.length} valid URL(s) and ${invalidUrls.length} invalid URL(s)`);

        // Process URLs
        for (let i = 0; i < validUrls.length; i++) {
            if (checkIsShuttingDown()) {
                console.log('Shutdown requested, stopping URL processing...');
                break;
            }
            const testUrl = fixUrl(validUrls[i].url);
            const lastmod = validUrls[i].lastmod;
            
            console.info(`Processing ${i + 1} of ${validUrls.length}: ${testUrl}`);
            await processUrl(testUrl, lastmod, i, validUrls.length, results, options);
        }

        if (!checkIsShuttingDown()) {
            await postProcessResults(results, outputDir);
        }

        if (!checkIsShuttingDown()) {
            await saveResults(results, outputDir, sitemapUrl);
        }

        // Generate sitemap
        if (!checkIsShuttingDown()) {
            const sitemapPath = await generateSitemap(results, outputDir, options);
            if (sitemapPath) {
                console.log('Sitemap generation summary:', sitemapPath);
            } else {
                console.log('No sitemap was generated due to lack of valid URLs.');
            }
        }

        return results;
    } catch (error) {
        console.error('Error in runTestsOnSitemap:', error);
        throw error;
    }
}

export function initializeResults() {
    return {
        pa11y: [],
        internalLinks: [],
        contentAnalysis: [],
        orphanedUrls: new Set(),
        urlMetrics: {
            total: 0,
            internal: 0,
            external: 0,
            internalIndexable: 0,
            internalNonIndexable: 0,
            nonAscii: 0,
            uppercase: 0,
            underscores: 0,
            containsSpace: 0,
            overLength: 0
        },
        responseCodeMetrics: {},
        titleMetrics: {
            missing: 0,
            duplicate: 0,
            tooLong: 0,
            tooShort: 0,
            pixelWidth: {}
        },
        metaDescriptionMetrics: {
            missing: 0,
            duplicate: 0,
            tooLong: 0,
            tooShort: 0,
            pixelWidth: {}
        },
        h1Metrics: {
            missing: 0,
            duplicate: 0,
            tooLong: 0,
            multiple: 0
        },
        h2Metrics: {
            missing: 0,
            duplicate: 0,
            tooLong: 0,
            multiple: 0,
            nonSequential: 0
        },
        imageMetrics: {
            total: 0,
            missingAlt: 0,
            missingAltAttribute: 0,
            altTextTooLong: 0
        },
        linkMetrics: {
            pagesWithoutInternalOutlinks: 0,
            pagesWithHighExternalOutlinks: 0,
            internalOutlinksWithoutAnchorText: 0,
            nonDescriptiveAnchorText: 0
        },
        securityMetrics: {
            httpUrls: 0,
            missingHstsHeader: 0,
            missingContentSecurityPolicy: 0,
            missingXFrameOptions: 0,
            missingXContentTypeOptions: 0
        },
        hreflangMetrics: {
            pagesWithHreflang: 0,
            missingReturnLinks: 0,
            incorrectLanguageCodes: 0
        },
        canonicalMetrics: {
            missing: 0,
            selfReferencing: 0,
            nonSelf: 0
        },
        contentMetrics: {
            lowContent: 0,
            duplicate: 0
        },
        seoScores: [],
        performanceAnalysis: []
    };
}
