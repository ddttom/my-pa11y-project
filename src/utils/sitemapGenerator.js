// src/utils/sitemapGenerator.js

import fs from 'fs/promises';
import path from 'path';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { debug } from './debug.js';

const gzipPromise = promisify(gzip);

// Default sitemap options
const defaultSitemapOptions = {
    hostname: '',
    maxUrlsPerFile: 50000,
    compress: true,
    includeLastmod: true,
    includeChangefreq: true,
    includePriority: true,
    robotsTxtPath: 'robots.txt',
};

export async function generateSitemap(results, outputDir, baseUrl, customOptions = {}) {
    const options = { ...defaultSitemapOptions, ...customOptions, hostname: baseUrl };
    debug('Generating sitemap with options:', options);

    const urls = extractUrlsFromResults(results);
    debug(`Extracted ${urls.length} URLs for sitemap generation`);

    const sitemapFiles = [];
    for (let i = 0; i < urls.length; i += options.maxUrlsPerFile) {
        const batch = urls.slice(i, i + options.maxUrlsPerFile);
        const sitemapStream = new SitemapStream({ hostname: options.hostname });
        
        batch.forEach(url => {
            const sitemapEntry = {
                url: url.loc,
                changefreq: url.changefreq,
                priority: url.priority,
            };
            if (options.includeLastmod && url.lastmod) {
                sitemapEntry.lastmod = new Date(url.lastmod).toISOString();
            }
            sitemapStream.write(sitemapEntry);
        });

        sitemapStream.end();

        let sitemapData = await streamToPromise(sitemapStream);
        
        if (options.compress) {
            sitemapData = await gzipPromise(sitemapData);
        }

        const fileName = `sitemap${sitemapFiles.length + 1}${options.compress ? '.xml.gz' : '.xml'}`;
        const filePath = path.join(outputDir, fileName);
        await fs.writeFile(filePath, sitemapData);
        sitemapFiles.push(fileName);

        debug(`Generated sitemap file: ${fileName}`);
    }

    if (sitemapFiles.length > 1) {
        await generateSitemapIndex(sitemapFiles, options, outputDir);
    }

    await updateRobotsTxt(options.robotsTxtPath, sitemapFiles, baseUrl);

    return {
        sitemapFiles,
        totalUrls: urls.length,
    };
}

function extractUrlsFromResults(results) {
    // Extract URLs from various parts of the results object
    const urls = new Set();

    // Extract from internalLinks
    if (results.internalLinks) {
        results.internalLinks.forEach(link => {
            if (link.url) urls.add({ loc: link.url });
        });
    }

    // Extract from contentAnalysis
    if (results.contentAnalysis) {
        results.contentAnalysis.forEach(page => {
            if (page.url) urls.add({ 
                loc: page.url,
                lastmod: page.lastmod,
                changefreq: calculateChangeFreq(page),
                priority: calculatePriority(page)
            });
        });
    }

    // Extract from seoScores
    if (results.seoScores) {
        results.seoScores.forEach(score => {
            if (score.url) urls.add({ 
                loc: score.url,
                priority: score.score / 100 // Use SEO score as priority
            });
        });
    }

    return Array.from(urls);
}

function calculateChangeFreq(page) {
    // Logic to determine change frequency based on content type or update frequency
    // This is a placeholder implementation
    if (page.contentType === 'blog' || page.contentType === 'news') {
        return 'daily';
    } else if (page.contentType === 'product') {
        return 'weekly';
    }
    return 'monthly';
}

function calculatePriority(page) {
    // Logic to determine priority based on page importance
    // This is a placeholder implementation
    if (page.isHomepage) {
        return 1.0;
    } else if (page.depth === 1) {
        return 0.8;
    } else if (page.depth === 2) {
        return 0.6;
    }
    return 0.5;
}

async function generateSitemapIndex(sitemapFiles, options, outputDir) {
    const sitemapIndex = new SitemapStream({ hostname: options.hostname });
    
    sitemapFiles.forEach(file => {
        sitemapIndex.write({ url: `${options.hostname}/${file}` });
    });

    sitemapIndex.end();

    const sitemapIndexData = await streamToPromise(sitemapIndex);
    const indexFileName = options.compress ? 'sitemap-index.xml.gz' : 'sitemap-index.xml';
    const indexFilePath = path.join(outputDir, indexFileName);

    if (options.compress) {
        const compressedData = await gzipPromise(sitemapIndexData);
        await fs.writeFile(indexFilePath, compressedData);
    } else {
        await fs.writeFile(indexFilePath, sitemapIndexData);
    }

    debug(`Generated sitemap index: ${indexFileName}`);
}

async function updateRobotsTxt(robotsTxtPath, sitemapFiles, baseUrl) {
    try {
        let robotsTxtContent = await fs.readFile(robotsTxtPath, 'utf-8');
        
        // Remove existing Sitemap directives
        robotsTxtContent = robotsTxtContent.replace(/^Sitemap:.*$/gm, '');

        // Add new Sitemap directives
        if (sitemapFiles.length === 1) {
            robotsTxtContent += `\nSitemap: ${baseUrl}/${sitemapFiles[0]}`;
        } else {
            robotsTxtContent += `\nSitemap: ${baseUrl}/sitemap-index.xml`;
        }

        await fs.writeFile(robotsTxtPath, robotsTxtContent.trim() + '\n');
        debug('Updated robots.txt with sitemap information');
    } catch (error) {
        console.error('Error updating robots.txt:', error);
    }
}

export { generateSitemap };