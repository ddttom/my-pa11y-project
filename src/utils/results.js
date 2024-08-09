// src/utils/results.js

import fs from 'fs/promises';
import path from 'path';
import { formatCsv } from './csvFormatter.js';
import { generateReport } from './reportGenerator.js';
import { debug } from './debug.js';

export async function postProcessResults(results, outputDir) {
    const commonPa11yIssues = analyzeCommonPa11yIssues(results.pa11y);
    await saveCommonPa11yIssues(commonPa11yIssues, outputDir);
    results.pa11y = filterRepeatedPa11yIssues(results.pa11y, commonPa11yIssues);
}

export async function saveResults(results, outputDir, sitemapUrl) {
    console.info(`Saving results to: ${outputDir}`);
    debug('Results object keys:', Object.keys(results));

    const saveOperations = [
        { name: 'Pa11y results', func: savePa11yResults },
        { name: 'Internal links', func: saveInternalLinks },
        { name: 'Images without alt', func: saveImagesWithoutAlt },
        { name: 'Content analysis', func: saveContentAnalysis },
        { name: 'Orphaned URLs', func: saveOrphanedUrls },
        { name: 'SEO report', func: saveSeoReport },
        { name: 'SEO scores', func: saveSeoScores },
        { name: 'Performance analysis', func: savePerformanceAnalysis },
        { name: 'SEO scores summary', func: saveSeoScoresSummary }
    ];

    for (const operation of saveOperations) {
        try {
            debug(`Attempting to save ${operation.name}...`);
            let result;
            if (operation.name === 'Orphaned URLs') {
                result = await operation.func(results, outputDir);
            } else if (operation.name === 'SEO report') {
                result = await operation.func(results, outputDir, sitemapUrl);
            } else if (operation.name === 'Images without alt') {
                result = await operation.func(results.contentAnalysis, outputDir);
            } else {
                result = await operation.func(results, outputDir);
            }
            
            if (typeof result === 'number') {
                debug(`${operation.name}: ${result} items saved`);
            } else {
                debug(`${operation.name} saved successfully`);
            }
        } catch (error) {
            console.error(`Error saving ${operation.name}:`, error.message);
            console.error('Error stack:', error.stack);
        }
    }

    debug(`All results saved to ${outputDir}`);
}

async function savePa11yResults(results, outputDir) {
    await saveRawPa11yResult(results, outputDir);
    const pa11yCsv = formatCsv(flattenPa11yResults(results.pa11y), 
        ['url', 'type', 'code', 'message', 'context', 'selector', 'error']);
    await fs.writeFile(path.join(outputDir, 'pa11y_results.csv'), pa11yCsv);
    debug('Pa11y results saved');
}

function flattenPa11yResults(pa11yResults) {
    return pa11yResults.flatMap(result => 
        result.issues ? result.issues.map(issue => ({
            url: result.url,
            type: issue.type,
            code: issue.code,
            message: issue.message,
            context: issue.context,
            selector: issue.selector
        })) : [{ url: result.url, error: result.error }]
    );
}

async function saveInternalLinks(results, outputDir) {
    const internalLinksCsv = formatCsv(flattenInternalLinks(results.internalLinks), 
        ['source', 'target', 'anchorText', 'statusCode']);
    await fs.writeFile(path.join(outputDir, 'internal_links.csv'), internalLinksCsv);
    debug('Internal links results saved');
}

function flattenInternalLinks(internalLinks) {
    return internalLinks.flatMap(result => 
        result.checkedLinks ? result.checkedLinks.map(link => ({
            source: result.url,
            target: link.url,
            anchorText: link.text,
            statusCode: link.statusCode
        })) 
        : [{ source: result.url, error: result.error }]
    );
}

async function saveImagesWithoutAlt(contentAnalysis, outputDir) {
    let imagesWithoutAlt = [];
    
    if (Array.isArray(contentAnalysis)) {
        imagesWithoutAlt = contentAnalysis.flatMap(page => page.imagesWithoutAlt || []);
    } else if (contentAnalysis && typeof contentAnalysis === 'object') {
        imagesWithoutAlt = contentAnalysis.imagesWithoutAlt || [];
    } else {
        console.warn('contentAnalysis is neither an array nor an object. No images without alt text will be saved.');
    }
    
    if (imagesWithoutAlt.length > 0) {
        const headers = ['url', 'src', 'location'];
        const formattedImagesWithoutAlt = imagesWithoutAlt.map(img => ({
            url: img.url,
            src: img.src,
            location: img.location || ''
        }));
        const imagesWithoutAltCsv = formatCsv(formattedImagesWithoutAlt, headers);
        
        try {
            const filePath = path.join(outputDir, 'images_without_alt.csv');
            await fs.writeFile(filePath, imagesWithoutAltCsv, 'utf8');
            console.log(`${imagesWithoutAlt.length} images without alt text saved to ${filePath}`);
        } catch (error) {
            console.error('Error saving images without alt text:', error);
        }
    } 

    return imagesWithoutAlt.length;
}

async function saveContentAnalysis(results, outputDir) {
    const contentAnalysisCsv = formatCsv(results.contentAnalysis, 
        ['url', 'wordCount', 'h1Count', 'imagesCount', 'internalLinksCount', 'externalLinksCount']);
    await fs.writeFile(path.join(outputDir, 'content_analysis.csv'), contentAnalysisCsv);
    debug('Content analysis saved');
}

async function saveOrphanedUrls(results, outputDir) {
    if (results.orphanedUrls && results.orphanedUrls.size > 0) {
        const orphanedUrlsArray = Array.from(results.orphanedUrls).map(url => ({ url }));
        const orphanedUrlsCsv = formatCsv(orphanedUrlsArray, ['url']);
        const filePath = path.join(outputDir, 'orphaned_urls.csv');
        try {
            await fs.writeFile(filePath, orphanedUrlsCsv, 'utf8');
            console.log(`${results.orphanedUrls.size} orphaned URLs saved to ${filePath}`);
            return results.orphanedUrls.size;
        } catch (error) {
            console.error('Error saving orphaned URLs:', error);
        }
    } else {
        console.log('No orphaned URLs found');
        return 0;
    }
}

async function saveSeoReport(results, outputDir, sitemapUrl) {
    const report = generateReport(results, sitemapUrl);
    await fs.writeFile(path.join(outputDir, 'seo_report.csv'), report);
    debug('SEO report saved');
}

async function saveSeoScores(results, outputDir) {
    debug('Attempting to save SEO scores...');
    if (!results.seoScores || !Array.isArray(results.seoScores)) {
        console.error('SEO scores are missing or not an array:', results.seoScores);
        return;
    }

    const seoScoresFormatted = results.seoScores.map(score => {
        if (!score || typeof score !== 'object') {
            console.error('Invalid score object:', score);
            return null;
        }

        const roundedScore = {
            url: score.url || '',
            score: typeof score.score === 'number' ? Number(score.score.toFixed(2)) : 'N/A',
        };

        if (score.details && typeof score.details === 'object') {
            for (const [key, value] of Object.entries(score.details)) {
                roundedScore[`details.${key}`] = typeof value === 'number' 
                    ? Number(value.toFixed(2)) 
                    : 'N/A';
            }
        }

        return roundedScore;
    }).filter(Boolean);

    const headers = ['url', 'score', 'details.titleOptimization', 'details.metaDescriptionOptimization',
        'details.urlStructure', 'details.h1Optimization', 'details.contentLength', 'details.internalLinking',
        'details.imageOptimization', 'details.pageSpeed', 'details.mobileOptimization', 'details.securityFactors',
        'details.structuredData', 'details.socialMediaTags'];

    const seoScoresCsv = formatCsv(seoScoresFormatted, headers);
    await fs.writeFile(path.join(outputDir, 'seo_scores.csv'), seoScoresCsv);
    debug('SEO scores saved successfully');
}

async function savePerformanceAnalysis(results, outputDir) {
    debug('Attempting to save performance analysis...');
    if (!results.performanceAnalysis || !Array.isArray(results.performanceAnalysis) || results.performanceAnalysis.length === 0) {
        console.warn('Performance analysis data is missing or empty.');
        return 0;
    }

    const getPerformanceComment = (metric, value) => {
        if (value === null || value === undefined) return 'N/A';
        const thresholds = {
            loadTime: { excellent: 1000, good: 2000, fair: 3000 },
            domContentLoaded: { excellent: 500, good: 1000, fair: 2000 },
            firstPaint: { excellent: 1000, good: 2000, fair: 3000 },
            firstContentfulPaint: { excellent: 1500, good: 2500, fair: 4000 }
        };

        if (value <= thresholds[metric].excellent) return 'Excellent';
        if (value <= thresholds[metric].good) return 'Good';
        if (value <= thresholds[metric].fair) return 'Fair';
        return 'Needs Improvement';
    };

    const roundedPerformanceAnalysis = results.performanceAnalysis.map(entry => ({
        url: entry.url,
        loadTime: entry.loadTime !== null && entry.loadTime !== undefined ? Number(entry.loadTime.toFixed(2)) : null,
        loadTimeComment: getPerformanceComment('loadTime', entry.loadTime),
        domContentLoaded: entry.domContentLoaded !== null && entry.domContentLoaded !== undefined ? Number(entry.domContentLoaded.toFixed(2)) : null,
        domContentLoadedComment: getPerformanceComment('domContentLoaded', entry.domContentLoaded),
        firstPaint: entry.firstPaint !== null && entry.firstPaint !== undefined ? Number(entry.firstPaint.toFixed(2)) : null,
        firstPaintComment: getPerformanceComment('firstPaint', entry.firstPaint),
        firstContentfulPaint: entry.firstContentfulPaint !== null && entry.firstContentfulPaint !== undefined ? Number(entry.firstContentfulPaint.toFixed(2)) : null,
        firstContentfulPaintComment: getPerformanceComment('firstContentfulPaint', entry.firstContentfulPaint)
    }));

    const csvData = [
        ['url', 'loadTime', 'loadTimeComment', 'domContentLoaded', 'domContentLoadedComment', 
         'firstPaint', 'firstPaintComment', 'firstContentfulPaint', 'firstContentfulPaintComment'],
        ...roundedPerformanceAnalysis.map(entry => [
            entry.url,
            entry.loadTime,
            entry.loadTimeComment,
            entry.domContentLoaded,
            entry.domContentLoadedComment,
            entry.firstPaint,
            entry.firstPaintComment,
            entry.firstContentfulPaint,
            entry.firstContentfulPaintComment
        ])
    ];

    try {
        const performanceAnalysisCsv = formatCsv(csvData);
        await fs.writeFile(path.join(outputDir, 'performance_analysis.csv'), performanceAnalysisCsv);
        debug('Performance analysis saved with comments');
        return roundedPerformanceAnalysis.length;
    } catch (error) {
        console.error('Error saving performance analysis:', error);
        return 0;
    }
}

async function saveSeoScoresSummary(results, outputDir) {
    debug('Attempting to save SEO scores summary...');
    debug('Results object keys:', Object.keys(results));

    if (!results.seoScores || !Array.isArray(results.seoScores) || results.seoScores.length === 0) {
        console.warn('seoScores is missing, not an array, or empty.');
        
        // Save diagnostic information
        const diagnosticInfo = JSON.stringify(results, null, 2);
        await fs.writeFile(path.join(outputDir, 'seo_scores_diagnostic.json'), diagnosticInfo);
        debug('Diagnostic information saved to seo_scores_diagnostic.json');
        
        return;
    }

    debug(`Found ${results.seoScores.length} SEO scores to process.`);

    const getScoreComment = (score) => {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Good';
        if (score >= 70) return 'Fair';
        if (score >= 60) return 'Needs Improvement';
        return 'Poor';
    };

    const sumScores = results.seoScores.reduce((sum, score, index) => {
        if (score && typeof score === 'object') {
            sum.totalScore += score.score || 0;
            if (score.details && typeof score.details === 'object') {
                for (const [key, value] of Object.entries(score.details)) {
                    sum.details[key] = (sum.details[key] || 0) + (value || 0);
                }
            }
        } else {
            console.warn(`Invalid score object at index ${index}:`, score);
        }
        return sum;
    }, { totalScore: 0, details: {} });

    debug('Score summation completed.');

    const urlCount = results.seoScores.length;
    const averageScores = {
        overallScore: sumScores.totalScore / urlCount,
        details: {}
    };

    for (const [key, value] of Object.entries(sumScores.details)) {
        averageScores.details[key] = value / urlCount;
    }

    debug('Average scores calculated.');

    const summaryData = [
        ['Metric', 'Average Score', 'Comment']
    ];

    const addMetricToSummary = (metricName, score) => {
        const formattedScore = (score * 100).toFixed(2);
        summaryData.push([
            metricName,
            formattedScore,
            getScoreComment(parseFloat(formattedScore))
        ]);
    };

    addMetricToSummary('Overall SEO Score', averageScores.overallScore / 100);

    const detailKeys = [
        'titleOptimization', 'metaDescriptionOptimization', 'urlStructure', 'h1Optimization',
        'contentLength', 'internalLinking', 'imageOptimization', 'pageSpeed', 'mobileOptimization',
        'securityFactors', 'structuredData', 'socialMediaTags'
    ];

    for (const key of detailKeys) {
        if (averageScores.details[key] !== undefined) {
            addMetricToSummary(
                key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                averageScores.details[key]
            );
        } else {
            console.warn(`Detail key '${key}' not found in average scores.`);
        }
    }

    debug('Summary data prepared.');
    debug('Summary data:', summaryData);

    try {
        const seoScoresSummaryCsv = formatCsv(summaryData);
        await fs.writeFile(path.join(outputDir, 'seo_scores_summary.csv'), seoScoresSummaryCsv);
        debug('SEO scores summary saved successfully');
    } catch (error) {
        console.error('Error while formatting or saving SEO scores summary:', error);
        console.error('Error stack:', error.stack);
    }
}

async function saveRawPa11yResult(results, outputDir) {
    try {
        const filename = 'pa11y_raw_results.json';
        const filePath = path.join(outputDir, filename);
        const pa11yResults = results.pa11y.map(result => ({
            url: result.url,
            issues: result.issues
        }));
        await fs.writeFile(filePath, JSON.stringify(pa11yResults, null, 2));
        debug(`Raw pa11y results saved to ${filePath}`);
    } catch (error) {
        console.error('Error saving raw pa11y results:', error.message);
    }
}

function analyzeCommonPa11yIssues(pa11yResults) {
    const issueCounts = {};
    for (const result of pa11yResults) {
        if (result.issues) {
            for (const issue of result.issues) {
                const issueKey = `${issue.code}-${issue.message}`;
                issueCounts[issueKey] = (issueCounts[issueKey] || 0) + 1;
            }
        }
    }

    const commonIssues = Object.entries(issueCounts)
        .filter(([key, count]) => count > 1)
        .map(([key, count]) => ({ code: key.split('-')[0], message: key.split('-')[1], count }));

    return commonIssues;
}

async function saveCommonPa11yIssues(commonIssues, outputDir) {
    if (commonIssues.length > 0) {
        const csvData = formatCsv(commonIssues, ['code', 'message', 'count']);
        await fs.writeFile(path.join(outputDir, 'common_pa11y_issues.csv'), csvData);
        debug('Common Pa11y issues saved');
    } else {
        debug('No common Pa11y issues found');
    }
}

function filterRepeatedPa11yIssues(pa11yResults, commonIssues) {
    const commonIssueKeys = new Set(commonIssues.map(issue => `${issue.code}-${issue.message}`));
    return pa11yResults.map(result => {
        if (result.issues) {
            result.issues = result.issues.filter(issue => !commonIssueKeys.has(`${issue.code}-${issue.message}`));
        }
        return result;
    });
}

export { saveResults, postProcessResults };