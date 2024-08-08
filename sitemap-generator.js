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

    // Combine contentAnalysis and orphanedUrls
    let allUrls = [...results.contentAnalysis];

    // Add orphaned URLs if they exist
    if (results.orphanedUrls && results.orphanedUrls instanceof Set) {
        allUrls = allUrls.concat([...results.orphanedUrls].map(url => ({ url })));
    }

    // Split all URLs into chunks if necessary
    const chunks = [];
    for (let i = 0; i < allUrls.length; i += maxUrlsPerFile) {
        chunks.push(allUrls.slice(i, i + maxUrlsPerFile));
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
            
            // Use lastModified if available, fallback to lastModifiedDate
            const lastmod = page.lastModified || page.lastModifiedDate;
            if (lastmod && lastmod !== 'Unknown') {
                url.ele('lastmod').txt(new Date(lastmod).toISOString());
            }

            const changefreq = page.changeFrequency || determineChangeFrequency(page);
            url.ele('changefreq').txt(changefreq);

            const priority = page.priority || calculatePriority(page);
            url.ele('priority').txt(priority.toFixed(1));

            // Add image information to sitemap and CSV
            if (page.images && page.images.length > 0) {
                page.images.forEach(image => {
                    const imageUrl = new URL(image.src, page.url).href;
                    url.ele('image:image')
                       .ele('image:loc').txt(imageUrl).up()
                       .ele('image:title').txt(image.alt || '').up();
                    
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

function determineChangeFrequency(page) {
    // This is a simple example. You might want to implement more sophisticated logic.
    if (page.url.includes('/blog/') || page.url.includes('/news/')) {
        return 'daily';
    } else if (page.url.includes('/product/')) {
        return 'weekly';
    } else {
        return 'monthly';
    }
}

function calculatePriority(page) {
    // This is a simple example. You might want to implement more sophisticated logic.
    if (page.url === '/') {
        return 1.0;
    } else if (page.url.split('/').length === 2) {
        return 0.8;
    } else {
        return 0.6;
    }
}

export { generateSitemap };