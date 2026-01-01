import path from 'path';
import fs from 'fs/promises';

/**
 * Identifies same-domain URLs discovered during analysis that were not in original sitemap
 * @param {Object} results - Results object containing internalLinks and originalSitemapUrls
 * @returns {Array<string>} Array of discovered URLs not in original sitemap
 */
export function getDiscoveredUrls(results) {
  const originalUrls = new Set(results.originalSitemapUrls || []);
  const discoveredUrls = new Set();

  // Collect all discovered internal links
  if (results.internalLinks) {
    results.internalLinks.forEach((page) => {
      if (page.links && Array.isArray(page.links)) {
        page.links.forEach((link) => {
          if (link.url && !originalUrls.has(link.url)) {
            discoveredUrls.add(link.url);
          }
        });
      }
    });
  }

  return [...discoveredUrls].sort();
}

/**
 * Saves perfected sitemap including both original and discovered URLs
 * @param {Object} results - Results object
 * @param {string} outputDir - Output directory
 * @returns {Promise<string>} Path to perfected sitemap
 */
export async function savePerfectedSitemap(results, outputDir) {
  try {
    await fs.mkdir(outputDir, { recursive: true });

    const xml = ['<?xml version="1.0" encoding="UTF-8"?>'];
    xml.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    // Combine original + discovered URLs
    const originalUrls = new Set(results.originalSitemapUrls || []);
    const allUrls = new Set([...originalUrls]);

    // Add discovered internal links
    if (results.internalLinks) {
      results.internalLinks.forEach((page) => {
        if (page.url) allUrls.add(page.url);
        if (page.links && Array.isArray(page.links)) {
          page.links.forEach((link) => {
            if (link.url) allUrls.add(link.url);
          });
        }
      });
    }

    const sortedUrls = [...allUrls].sort();
    const discoveredCount = sortedUrls.filter((url) => !originalUrls.has(url)).length;

    global.auditcore.logger.info(`Saving perfected sitemap: ${sortedUrls.length} total URLs (${originalUrls.size} original + ${discoveredCount} discovered)`);

    sortedUrls.forEach((url) => {
      xml.push('  <url>');
      xml.push(`    <loc>${url}</loc>`);
      // Mark discovered URLs with comment
      if (!originalUrls.has(url)) {
        xml.push('    <!-- Discovered during analysis -->');
      }
      xml.push('  </url>');
    });

    xml.push('</urlset>');

    const perfectedSitemapPath = path.join(outputDir, 'v-sitemap.xml');
    await fs.writeFile(perfectedSitemapPath, xml.join('\n'));
    global.auditcore.logger.info(`Perfected sitemap saved to: ${perfectedSitemapPath}`);
    global.auditcore.logger.info(`Original: ${originalUrls.size}, Discovered: ${discoveredCount}, Total: ${sortedUrls.length}`);

    return perfectedSitemapPath;
  } catch (error) {
    global.auditcore.logger.error('Error saving perfected sitemap:', error);
    throw error;
  }
}
