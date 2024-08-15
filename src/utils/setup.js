/* eslint-disable import/extensions */
// setup.js

import fs from 'fs/promises';
import { ensureCacheDir } from './caching.js';

async function createDirectories(outputDir, options) {
  await fs.mkdir(outputDir, { recursive: true });
  await ensureCacheDir(options);
}

// eslint-disable-next-line import/prefer-default-export
export async function validateAndPrepare(sitemapUrl, outputDir, options) {
  if (!sitemapUrl) {
    throw new Error('No sitemap URL or HTML file provided.');
  }

  await createDirectories(outputDir, options);
}
