/* eslint-disable import/extensions */
/* eslint-disable import/prefer-default-export */
// linkAnalyzer.toJSON()

import cheerio from 'cheerio';

import { fixUrl } from './urlUtils.js';

export async function getInternalLinks(html, pageUrl, baseUrl) {
  const $ = cheerio.load(html);
  const links = new Set();

  $('a').each((i, element) => {
    const href = $(element).attr('href');
    if (href) {
      const absoluteUrl = new URL(href, pageUrl).href;
      if (absoluteUrl.startsWith(baseUrl)) {
        links.add(fixUrl(absoluteUrl));
      }
    }
  });

  return Array.from(links);
}
