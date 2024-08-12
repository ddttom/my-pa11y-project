// performanceAnalyzer.js

import puppeteer from 'puppeteer';
import { debug } from './debug.js';

export async function analyzePerformance(url) {
    let browser;
    try {
        browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url, {waitUntil: 'networkidle0', timeout: 60000});

        const performanceMetrics = await page.evaluate(() => {
            const timing = performance.timing;
            const paint = performance.getEntriesByType('paint');
            return {
                loadTime: timing.loadEventEnd - timing.navigationStart,
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: paint[0] ? paint[0].startTime : null,
                firstContentfulPaint: paint[1] ? paint[1].startTime : null
            };
        });

        debug(`Performance metrics collected for ${url}: ${JSON.stringify(performanceMetrics)}`);
        return performanceMetrics;
    } catch (error) {
        console.error(`Error analyzing performance for ${url}:`, error.message);
        return {
            loadTime: null,
            domContentLoaded: null,
            firstPaint: null,
            firstContentfulPaint: null
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
