// pa11y-options.js

const pa11yOptions = {
    timeout: 60000,
    wait: 2000,
    ignore: [
        'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2',
        'css-parsing-error',
        'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.A.EmptyNoId'
    ],
    viewport: {
        width: 1280,
        height: 1024
    },
    chromeLaunchConfig: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-gpu',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-extensions'
        ],
        ignoreHTTPSErrors: true
    }
};

const sitemapOptions = {
    maxUrlsPerFile: 50000,
    excludePatterns: [],
    compress: true,
    customChangeFreq: null,
    customPriority: null,
    includeLastmod: true,
    includeChangefreq: true,
    includePriority: true,
    addStylesheet: false,
    robotsTxtPath: null,
};

export { pa11yOptions, sitemapOptions };