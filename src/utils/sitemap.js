// sitemap.js 

import { fetchAndParseSitemap, extractUrls } from './sitemapParser.js';
import { isValidUrl } from './urlUtils.js';

export async function getUrlsFromSitemap(sitemapUrl, limit) {
    const parsedContent = await fetchAndParseSitemap(sitemapUrl);
    const urlsWithDates = await extractUrls(parsedContent);

    const validUrls = [];
    const invalidUrls = [];

    urlsWithDates.forEach(item => {
        if (isValidUrl(item.url)) {
            validUrls.push(item);
        } else {
            invalidUrls.push(item);
        }
    });

    return {
        validUrls: limit === -1 ? validUrls : validUrls.slice(0, limit),
        invalidUrls
    };
}