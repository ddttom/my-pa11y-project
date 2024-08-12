/* eslint-disable import/prefer-default-export */
/* eslint-disable import/extensions */
// pa11yRunner

import pa11y from 'pa11y';

import { pa11yOptions } from '../config/options.js';

export async function runPa11yTest(testUrl, html, results) {
  try {
    const pa11yResult = await pa11y(testUrl, { ...pa11yOptions, html });
    results.pa11y.push({ url: testUrl, issues: pa11yResult.issues });
  } catch (error) {
    console.error(`Error running pa11y test for ${testUrl}:`, error.message);
    results.pa11y.push({ url: testUrl, error: error.message });
  }
}
