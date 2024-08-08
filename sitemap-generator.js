import { create } from 'xmlbuilder2';
import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import zlib from 'zlib';
import { promisify } from 'util';
import { URL } from 'url';

const gzip = promisify(zlib.gzip);

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

    const {
        maxUrlsPerFile = 50000,
        excludePatterns = [],
        compress = false,
        customChangeFreq,
        customPriority,
        includeLastmod = true,
        includeChangefreq = true,
        includePriority = true,
        addStylesheet = false,
        robotsTxtPath,
    } = options;

    // Filter and prepare URLs
    let allUrls = [...results.contentAnalysis]
        .filter(page => !excludePatterns.some(pattern => page.url.includes(pattern)))
        .map(page => ({
            ...page,
            url: new URL(page.url, baseUrl).href // Ensure full URLs
        }));

    // Add orphaned URLs if they exist
    if (results.orphanedUrls && results.orphanedUrls instanceof Set) {
        allUrls = allUrls.concat([...results.orphanedUrls]
            .filter(url => !excludePatterns.some(pattern => url.includes(pattern)))
            .map(url => ({ url: new URL(url, baseUrl).href }))
        );
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
    let sitemapFiles = [];

    for (let i = 0; i < chunks.length; i++) {
        const root = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('urlset', { 
                xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
                'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1',
                'xmlns:xhtml': 'http://www.w3.org/1999/xhtml'
            });

        if (addStylesheet) {
            root.ins('xml-stylesheet', 'type="text/xsl" href="/sitemap.xsl"');
        }

        chunks[i].forEach(page => {
            const url = root.ele('url');
            url.ele('loc').txt(page.url);
            
            if (includeLastmod) {
                const lastmod = page.lastModified || page.lastModifiedDate;
                if (lastmod && lastmod !== 'Unknown') {
                    url.ele('lastmod').txt(new Date(lastmod).toISOString());
                }
            }

            if (includeChangefreq) {
                const changefreq = customChangeFreq ? customChangeFreq(page) : determineChangeFrequency(page);
                url.ele('changefreq').txt(changefreq);
            }

            if (includePriority) {
                const priority = customPriority ? customPriority(page) : calculatePriority(page);
                url.ele('priority').txt(priority.toFixed(1));
            }

            // Add alternative language versions
            if (page.alternateLanguageUrls) {
                Object.entries(page.alternateLanguageUrls).forEach(([lang, url]) => {
                    url.ele('xhtml:link', {
                        rel: 'alternate',
                        hreflang: lang,
                        href: url
                    });
                });
            }

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
            const filePath = path.join(outputDir, filename);
            await fs.writeFile(filePath, xml);
            console.log(`Sitemap file ${filename} generated successfully`);

            if (compress) {
                const gzippedXml = await gzip(xml);
                const gzipFilePath = `${filePath}.gz`;
                await fs.writeFile(gzipFilePath, gzippedXml);
                console.log(`Compressed sitemap file ${filename}.gz generated successfully`);
            }

            sitemapFiles.push(filename);
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
    if (sitemapFiles.length > 1) {
        const indexRoot = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('sitemapindex', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

        sitemapFiles.forEach(filename => {
            const sitemap = indexRoot.ele('sitemap');
            sitemap.ele('loc').txt(`${baseUrl}/${filename}`);
            sitemap.ele('lastmod').txt(new Date().toISOString());
        });

        const indexXml = indexRoot.end({ prettyPrint: true });

        try {
            const indexPath = path.join(outputDir, 'sitemap-index.xml');
            await fs.writeFile(indexPath, indexXml);
            console.log('Sitemap index file generated successfully');

            if (compress) {
                const gzippedIndexXml = await gzip(indexXml);
                await fs.writeFile(`${indexPath}.gz`, gzippedIndexXml);
                console.log('Compressed sitemap index file generated successfully');
            }
        } catch (error) {
            console.error('Error writing sitemap index file:', error);
        }
    }

    // Update robots.txt if path provided
    if (robotsTxtPath) {
        try {
            let robotsTxt = await fs.readFile(robotsTxtPath, 'utf-8');
            const sitemapUrl = `${baseUrl}/${sitemapFiles.length > 1 ? 'sitemap-index.xml' : 'sitemap.xml'}`;
            if (!robotsTxt.includes(sitemapUrl)) {
                robotsTxt += `\nSitemap: ${sitemapUrl}`;
                await fs.writeFile(robotsTxtPath, robotsTxt);
                console.log('robots.txt updated with sitemap URL');
            }
        } catch (error) {
            console.error('Error updating robots.txt:', error);
        }
    }

    // Generate summary report
    const summary = {
        totalUrls: allUrls.length,
        sitemapFiles: sitemapFiles.length,
        imageCount: imageData.length,
    };
    console.log('Sitemap Generation Summary:', summary);

    return summary;
}

function determineChangeFrequency(page) {
    if (page.url.includes('/blog/') || page.url.includes('/news/')) {
        return 'daily';
    } else if (page.url.includes('/product/')) {
        return 'weekly';
    } else {
        return 'monthly';
    }
}

function calculatePriority(page) {
    if (page.url === '/') {
        return 1.0;
    } else if (page.url.split('/').length === 2) {
        return 0.8;
    } else {
        return 0.6;
    }
}

export { generateSitemap };