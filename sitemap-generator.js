import { create } from 'xmlbuilder2';
import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

async function generateSitemap(results, outputDir, baseUrl, options = {}) {
    if (!results || !results.contentAnalysis || !Array.isArray(results.contentAnalysis)) {
        throw new Error('Invalid results object');
    }
    if (!outputDir || typeof outputDir !== 'string') {
        throw new Error('Invalid output directory');
    }
    if (!baseUrl || typeof baseUrl !== 'string') {
        throw new Error('Invalid base URL');
    }

    const maxUrlsPerFile = options.maxUrlsPerFile || 50000;

    // Split content analysis into chunks if necessary
    const chunks = [];
    for (let i = 0; i < results.contentAnalysis.length; i += maxUrlsPerFile) {
        chunks.push(results.contentAnalysis.slice(i, i + maxUrlsPerFile));
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
            .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

        chunks[i].forEach(page => {
            const url = root.ele('url');
            url.ele('loc').txt(page.url);
            
            if (page.lastModifiedDate && page.lastModifiedDate !== 'Unknown') {
                url.ele('lastmod').txt(new Date(page.lastModifiedDate).toISOString());
            }

            // Add image information to CSV
            if (page.images && page.images.length > 0) {
                page.images.forEach(image => {
                    imageData.push({
                        pageUrl: page.url,
                        imageUrl: new URL(image.src, page.url).href,
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