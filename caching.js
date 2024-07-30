import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), '.cache');

function generateCacheKey(url) {
    return crypto.createHash('md5').update(url).digest('hex');
}

async function ensureCacheDir() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating cache directory:', error);
        throw error;
    }
}

async function getCachedHtml(url) {
    const cacheKey = generateCacheKey(url);
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.html`);
    try {
        return await fs.readFile(cachePath, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Error reading cache for ${url}:`, error);
        }
        return null;
    }
}

async function setCachedHtml(url, html) {
    const cacheKey = generateCacheKey(url);
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.html`);
    try {
        await fs.writeFile(cachePath, html);
    } catch (error) {
        console.error(`Error writing cache for ${url}:`, error);
        throw error;
    }
}

export { ensureCacheDir, getCachedHtml, setCachedHtml };