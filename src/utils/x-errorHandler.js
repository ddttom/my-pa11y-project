/* eslint-disable import/prefer-default-export */
// errorHandler.js
export async function saveInvalidUrls(invalidUrls, outputDir) {
  if (invalidUrls.length > 0) {
    const invalidUrlsArray = invalidUrls.map((item) => ({
      url: item.url,
      lastmod: item.lastmod || 'N/A',
    }));
    const invalidUrlsCsv = formatCsv(invalidUrlsArray, ['url', 'lastmod']);
    const filePath = path.join(outputDir, 'invalid_urls.csv');
    try {
      await fs.writeFile(filePath, invalidUrlsCsv, 'utf8');
      console.log(`${invalidUrls.length} invalid URLs saved to ${filePath}`);
    } catch (error) {
      console.error('Error saving invalid URLs:', error);
    }
  } else {
    console.log('No invalid URLs found');
  }
}
