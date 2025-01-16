import path from 'path';
import fs from 'fs/promises';

export async function saveFinalSitemap(results, outputDir) {
  try {
    // Create final directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    
    const xml = ['<?xml version="1.0" encoding="UTF-8"?>'];
    xml.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    
    // Create a Set of all unique valid URLs
    const uniqueUrls = new Set();
    
    // Add URLs from initial scan
    if (results.urlMetrics && results.urlMetrics.internal > 0) {
      results.internalLinks.forEach(link => {
        if (link.url) uniqueUrls.add(link.url);
        if (link.links) {
          link.links.forEach(subLink => {
            if (subLink.url) uniqueUrls.add(subLink.url);
          });
        }
      });
    }

    // Add URLs from internal_links.csv data
    if (results.internalLinks) {
      results.internalLinks.forEach(page => {
        if (page.url) uniqueUrls.add(page.url);
        if (page.links && Array.isArray(page.links)) {
          page.links.forEach(link => {
            if (link.url) uniqueUrls.add(link.url);
          });
        }
      });
    }

    // Sort and format URLs
    const sortedUrls = [...uniqueUrls].sort();
    
    // Log stats
    global.auditcore.logger.info(`Saving ${sortedUrls.length} URLs to final sitemap...`);

    sortedUrls.forEach(url => {
      xml.push('  <url>');
      xml.push(`    <loc>${url}</loc>`);
      xml.push('  </url>');
    });
    
    xml.push('</urlset>');
    
    const finalSitemapPath = path.join(outputDir, 'final_sitemap.xml');
    await fs.writeFile(finalSitemapPath, xml.join('\n'));
    global.auditcore.logger.info(`Final sitemap saved to: ${finalSitemapPath}`);
    global.auditcore.logger.info(`Total unique URLs in final sitemap: ${sortedUrls.length}`);
    return finalSitemapPath;
  } catch (error) {
    global.auditcore.logger.error('Error saving final sitemap:', error);
    throw error;
  }
} 
