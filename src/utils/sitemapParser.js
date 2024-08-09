// src/utils/sitemapParser.js

import axios from 'axios';
import xml2js from 'xml2js';
import { URL } from 'url';
import { debug } from './debug.js';
import fs from 'fs/promises';

const axiosInstance = axios.create({
    headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
});

export async function fetchAndParseSitemap(sitemapPath) {
    debug(`Fetching content from: ${sitemapPath}`);
    try {
        let content;
        if (isUrl(sitemapPath)) {
            const response = await axiosInstance.get(sitemapPath);
            content = response.data;
        } else {
            content = await fs.readFile(sitemapPath, 'utf8');
        }
        
        debug('Content fetched successfully');
        
        // Check if the content is XML or HTML
        if (content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html')) {
            debug('Found HTML content instead of sitemap');
            return { html: content, url: sitemapPath };
        } else {
            debug('Parsing sitemap XML');
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(content);
            debug('Sitemap parsed successfully');
            return { xml: result };
        }
    } catch (error) {
        console.error(`Error fetching or parsing content from ${sitemapPath}:`, error.message);
        throw error;
    }
}

export async function extractUrls(parsedContent) {
    if (parsedContent.html) {
        debug('Extracting URL from HTML content');
        return [{ url: fixUrl(parsedContent.url), lastmod: null }];
    } else if (parsedContent.xml) {
        if (parsedContent.xml.sitemapindex) {
            debug('Found a sitemap index. Processing nested sitemaps...');
            const sitemapUrls = parsedContent.xml.sitemapindex.sitemap.map(sitemap => ({
                url: fixUrl(sitemap.loc?.[0] || ''),
                lastmod: sitemap.lastmod?.[0] || null
            }));
            let allUrls = [];
            for (const sitemapUrl of sitemapUrls) {
                if (global.isShuttingDown) break;
                if (!sitemapUrl.url) continue;
                debug(`Processing nested sitemap: ${sitemapUrl.url}`);
                try {
                    const nestedParsedContent = await fetchAndParseSitemap(sitemapUrl.url);
                    const nestedUrls = await extractUrls(nestedParsedContent);
                    allUrls = allUrls.concat(nestedUrls);
                } catch (error) {
                    console.error(`Error processing nested sitemap ${sitemapUrl.url}:`, error.message);
                }
            }
            return allUrls;
        } else if (parsedContent.xml.urlset) {
            debug('Extracting URLs from sitemap');
            return parsedContent.xml.urlset.url.map(url => ({
                url: fixUrl(url.loc?.[0] || ''),
                lastmod: url.lastmod?.[0] || null,
                changefreq: url.changefreq?.[0] || null,
                priority: url.priority?.[0] || null
            })).filter(item => item.url);
        } else {
            throw new Error('Unknown sitemap format');
        }
    } else {
        throw new Error('Invalid parsed content');
    }
}

function isUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function fixUrl(url) {
    if (!url) return '';
    return url.replace(/([^:]\/)\/+/g, "$1");
}
