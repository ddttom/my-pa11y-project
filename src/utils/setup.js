// setup.js 
import fs from 'fs/promises';
import path from 'path';
import { ensureCacheDir } from './caching.js';

export async function validateAndPrepare(sitemapUrl, outputDir, options) {
    if (!sitemapUrl) {
        throw new Error('No sitemap URL or HTML file provided.');
    }

    await createDirectories(outputDir, options);
}

async function createDirectories(outputDir, options) {
    await fs.mkdir(outputDir, { recursive: true });
    await ensureCacheDir(options);
}