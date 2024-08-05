import { create } from 'xmlbuilder2';
import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

async function generateSitemap(results, outputDir, baseUrl, options = {}) {
    // Input validation
    if (!results || !results.contentAnalysis || !Array.isArray(results.contentAnalysis)) {
        throw new Error('Invalid results object');
    }
    if (!outputDir || typeof outputDir !== 'string') {
        throw new Error('Invalid output directory');
    }
    if (!baseUrl || typeof baseUrl !== 'string') {
        throw new Error('Invalid base URL');
    }

    // Default options
    const defaultOptions = {
        maxUrlsPerFile: 50000,
        priorityFactors: {
            contentLength: 0.1,
            internalLinks: 0.1,
            importantCategory: 0.1,
            userEngagement: 0.1
        },
        longFormContentThreshold: 1000
    };

    // Merge provided options with defaults
    const finalOptions = { ...defaultOptions, ...options };

    const maxInternalLinks = results.maxInternalLinks || 1;  // Prevent division by zero

    // Split content analysis into chunks if necessary
    const chunks = [];
    for (let i = 0; i < results.contentAnalysis.length; i += finalOptions.maxUrlsPerFile) {
        chunks.push(results.contentAnalysis.slice(i, i + finalOptions.maxUrlsPerFile));
    }

    // Create a CSV writer for image data
    const csvWriter = createObjectCsvWriter({
        path: path.join(outputDir, 'pages_with_images.csv'),
        header: [
            {id: 'pageUrl', title: 'Page URL'},
            {id: 'imageUrl', title: 'Image URL'},
            {id: 'altText', title: 'Alt Text'}
        ]
    });

    let imageData = [];

    for (let i = 0; i < chunks.length; i++) {
        const root = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('urlset', {
                xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
                'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1'
            });

        chunks[i].forEach(page => {
            const url = root.ele('url');
            url.ele('loc').txt(page.url);
            
            if (page.lastModifiedDate && page.lastModifiedDate !== 'Unknown') {
                url.ele('lastmod').txt(new Date(page.lastModifiedDate).toISOString());
            } else {
                url.ele('lastmod').txt(new Date().toISOString());
            }

            // Set changefreq based on freshnessStatus
            let changefreq;
            switch(page.freshnessStatus) {
                case 'Very Fresh':
                    changefreq = 'daily';
                    break;
                case 'Fresh':
                    changefreq = 'weekly';
                    break;
                case 'Moderately Fresh':
                    changefreq = 'monthly';
                    break;
                default:
                    changefreq = 'yearly';
            }
            url.ele('changefreq').txt(changefreq);

            // Enhanced priority calculation
            let priority = 0.5; // Default priority

            // URL structure
            if (page.url === baseUrl || page.url === baseUrl + '/') {
                priority = 1.0;
            } else if (page.url.split('/').length - baseUrl.split('/').length === 1) {
                priority = 0.8;
            }

            // Content length
            if (page.wordCount > finalOptions.longFormContentThreshold) {
                priority += finalOptions.priorityFactors.contentLength;
            }

            // Internal links
            if (page.internalLinksCount) {
                priority += finalOptions.priorityFactors.internalLinks * (page.internalLinksCount / maxInternalLinks);
            }

            // Important category (if implemented)
            if (page.isImportantCategory) {
                priority += finalOptions.priorityFactors.importantCategory;
            }

            // User engagement (if implemented)
            if (page.engagementScore) {
                priority += finalOptions.priorityFactors.userEngagement * page.engagementScore;
            }

            // Ensure priority is between 0.0 and 1.0
            priority = Math.max(0.0, Math.min(1.0, priority));

            url.ele('priority').txt(priority.toFixed(1));

            // Add image information if available
            if (page.images && page.images.length > 0) {
                page.images.forEach(image => {
                    const imgEle = url.ele('image:image');
                    const imageUrl = new URL(image.src, page.url).href;
                    imgEle.ele('image:loc').txt(imageUrl);
                    if (image.alt) {
                        imgEle.ele('image:title').txt(image.alt);
                    }

                    // Add image data to CSV
                    imageData.push({
                        pageUrl: page.url,
                        imageUrl: imageUrl,
                        altText: image.alt || ''
                    });
                });
            }
        });

        const xml = root.end({ prettyPrint: true });

        try {
            const filename = chunks.length > 1 ? `sitemap-${i + 1}.xml` : 'sitemap.xml';
            await fs.writeFile(path.join(outputDir, filename), xml);
            console.log(`Sitemap file ${filename} generated successfully`);
        } catch (error) {
            console.error(`Error writing sitemap file ${i + 1}:`, error);
        }
    }

    // Write image data to CSV file
    try {
        await csvWriter.writeRecords(imageData);
        console.log('CSV file with image data generated successfully');
    } catch (error) {
        console.error('Error writing CSV file:', error);
    }

    // If we have multiple sitemap files, create a sitemap index
    if (chunks.length > 1) {
        const indexRoot = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('sitemapindex', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

        for (let i = 0; i < chunks.length; i++) {
            const sitemap = indexRoot.ele('sitemap');
            sitemap.ele('loc').txt(`${baseUrl}/sitemap-${i + 1}.xml`);
            sitemap.ele('lastmod').txt(new Date().toISOString());
        }

        const indexXml = indexRoot.end({ prettyPrint: true });

        try {
            await fs.writeFile(path.join(outputDir, 'sitemap-index.xml'), indexXml);
            console.log('Sitemap index file generated successfully');
        } catch (error) {
            console.error('Error writing sitemap index file:', error);
        }
    }
}

export { generateSitemap };