/* eslint-disable import/extensions */
// setup.js

import fs from 'fs/promises';
import { ensureCacheDir } from './caching.mjs';

async function createDirectories(outputDir, options) {
  await fs.mkdir(outputDir, { recursive: true });
  await ensureCacheDir(options, auditcore.logger);
}

// eslint-disable-next-line import/prefer-default-export
export async function validateAndPrepare(sitemapUrl, outputDir, options) {
  if (!sitemapUrl) {
    throw new Error('No sitemap URL or HTML file provided.');
  }

  await createDirectories(outputDir, options);
}
