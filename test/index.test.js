/* eslint-disable node/no-extraneous-import */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import fs from 'fs/promises';
import { runTestsOnSitemap } from '../src/main.js';
import { getUrlsFromSitemap } from '../src/utils/sitemap.js';
import { analyzePageContent } from '../src/utils/pageAnalyzer.js';
import { runPa11yWithRetry } from '../src/utils/pa11yRunner.js';

// Mock the global auditcore object
global.auditcore = {
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  options: {
    sitemap: 'https://example.com/sitemap.xml',
    output: 'test-results',
    limit: 10,
    cacheOnly: false,
    cache: true,
    puppeteer: true,
    forceDeleteCache: false,
    logLevel: 'info',
  },
};

// Mock external dependencies
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));
jest.mock('../src/utils/sitemap.js', () => ({
  getUrlsFromSitemap: jest.fn(),
}));
jest.mock('../src/utils/pageAnalyzer.js', () => ({
  analyzePageContent: jest.fn(),
}));
jest.mock('../src/utils/pa11yRunner.js', () => ({
  runPa11yWithRetry: jest.fn(),
}));

describe('Pa11y Sitemap Crawler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('runTestsOnSitemap should process sitemap URLs', async () => {
    const mockUrls = [
      { url: 'https://example.com/page1' },
      { url: 'https://example.com/page2' },
    ];
    getUrlsFromSitemap.mockResolvedValue({ validUrls: mockUrls });
    analyzePageContent.mockResolvedValue({});
    runPa11yWithRetry.mockResolvedValue({ issues: [] });

    await runTestsOnSitemap();

    expect(getUrlsFromSitemap).toHaveBeenCalledWith('https://example.com/sitemap.xml', 10);
    expect(analyzePageContent).toHaveBeenCalledTimes(2);
    expect(runPa11yWithRetry).toHaveBeenCalledTimes(2);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  test('getUrlsFromSitemap should return valid and invalid URLs', async () => {
    const mockSitemapContent = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
          <loc>https://example.com/page1</loc>
        </url>
        <url>
          <loc>https://example.com/page2</loc>
        </url>
        <url>
          <loc>invalid-url</loc>
        </url>
      </urlset>
    `;
    fs.readFile.mockResolvedValue(mockSitemapContent);

    const result = await getUrlsFromSitemap('https://example.com/sitemap.xml');

    expect(result.validUrls).toHaveLength(2);
    expect(result.invalidUrls).toHaveLength(1);
  });

  test('analyzePageContent should process page content correctly', async () => {
    const mockHtml = '<html><body><h1>Test Page</h1></body></html>';
    const mockTestUrl = 'https://example.com/test';
    const mockBaseUrl = 'https://example.com';

    const result = await analyzePageContent({
      testUrl: mockTestUrl,
      html: mockHtml,
      baseUrl: mockBaseUrl,
      results: {},
      headers: {},
      pageData: {},
    });

    expect(result).toBeDefined();
    expect(result.url).toBe(mockTestUrl);
  });

  test('runPa11yWithRetry should retry on failure', async () => {
    runPa11yWithRetry
      .mockRejectedValueOnce(new Error('Pa11y error'))
      .mockResolvedValueOnce({ issues: [] });

    const result = await runPa11yWithRetry('https://example.com', {});

    expect(runPa11yWithRetry).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ issues: [] });
  });
});