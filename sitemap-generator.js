import { create } from 'xmlbuilder2';
import fs from 'fs/promises';
import path from 'path';

async function generateSitemap(results, outputDir, baseUrl) {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('urlset', {
            xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
            'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1'
        });

    results.contentAnalysis.forEach(page => {
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

        // Set priority based on URL structure and content
        let priority;
        if (page.url === baseUrl || page.url === baseUrl + '/') {
            priority = '1.0';
        } else if (page.url.split('/').length - baseUrl.split('/').length === 1) {
            priority = '0.8';
        } else if (page.wordCount > 1000) {
            priority = '0.7';
        } else {
            priority = '0.5';
        }
        url.ele('priority').txt(priority);

        // Add image information if available
        if (page.images && page.images.length > 0) {
            page.images.forEach(image => {
                const imgEle = url.ele('image:image');
                imgEle.ele('image:loc').txt(new URL(image.src, page.url).href);
                if (image.alt) {
                    imgEle.ele('image:title').txt(image.alt);
                }
            });
        }
    });

    const xml = root.end({ prettyPrint: true });

    try {
        await fs.writeFile(path.join(outputDir, 'sitemap.xml'), xml);
        console.log('Sitemap generated successfully');
    } catch (error) {
        console.error('Error writing sitemap:', error);
    }
}



export { generateSitemap };