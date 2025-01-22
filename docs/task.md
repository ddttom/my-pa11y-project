# Improve and implement the following URL validation requirements

The system must validate URLs to exclude two-letter country code suffixes (e.g., domain.org/ru, domain.org/fr) with exceptions for /us and /en paths. This validation must be implemented through a single, central utility function that existing code will call.

Key Requirements:

1. Create one central utility function that ALL URL validation must use
2. This function validates URLs against language codes
3. Only /us and /en paths are allowed
4. Existing code must remain unchanged
5. A command flag 'allow-all-languages' can bypass restrictions

The central function must be used for:

- URL parsing
- Site interpretation
- Analytics tracking
- Virtual routing
- Sitemap generation
- All report generation specified in docs/prd.md

Implementation Requirements:
Every implementation must provide complete, production-ready code. All code must include full error handling, logging, edge case management, and documentation. Never use placeholders, comments indicating "code remains same", or similar shortcuts.

Reference Implementation Pattern:

```javascript
/**
 * Validates URL language codes against allowed patterns
 * @param {string} url - The full URL to validate
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowAllLanguages - Flag to bypass language restrictions
 * @param {Object} options.logger - Logger instance for tracking validation
 * @returns {boolean} - True if URL is allowed, false if it should be blocked
 * @throws {ValidationError} - If URL is malformed or validation fails
 */
function validateLanguageUrl(url, options = { allowAllLanguages: false, logger: console }) {
    if (!url || typeof url !== 'string') {
        options.logger.error('Invalid URL format provided', { url });
        throw new ValidationError('Invalid URL format');
    }

    try {
        const urlPath = new URL(url).pathname;
        
        if (options.allowAllLanguages) {
            options.logger.info('All languages allowed, bypassing validation', { url });
            return true;
        }

        if (urlPath.match(/^\/(us|en)($|\/)/)) {
            options.logger.info('Allowed language path detected', { url, path: urlPath });
            return true;
        }

        if (urlPath.match(/^\/[a-z]{2}($|\/)/i)) {
            options.logger.warn('Blocked restricted language path', { url, path: urlPath });
            return false;
        }

        options.logger.info('URL passed language validation', { url });
        return true;
    } catch (error) {
        options.logger.error('URL validation failed', { url, error: error.message });
        throw new ValidationError(`URL validation failed: ${error.message}`);
    }
}

function integrateWithSiteCollection(url) {
    const logger = createLogger('site-collection');
    const config = loadConfiguration();
    
    try {
        const isAllowed = validateLanguageUrl(url, {
            allowAllLanguages: config.allowAllLanguages,
            logger: logger
        });

        if (!isAllowed) {
            logger.warn('URL blocked by language validation', { url });
            return {
                status: 'blocked',
                reason: 'language_restricted',
                url: url
            };
        }

        const result = processSiteCollection(url);
        logger.info('Site collection processed successfully', { url });
        return result;
    } catch (error) {
        logger.error('Site collection processing failed', {
            url,
            error: error.message,
            stack: error.stack
        });
        throw new ProcessingError(`Failed to process site collection: ${error.message}`);
    }
}

function generateSitemap(urls) {
    const logger = createLogger('sitemap-generator');
    const config = loadConfiguration();
    
    try {
        const allowedUrls = urls.filter(url => validateLanguageUrl(url, {
            allowAllLanguages: config.allowAllLanguages,
            logger: logger
        }));

        logger.info('Filtered URLs for sitemap', {
            total: urls.length,
            allowed: allowedUrls.length
        });

        return generateSitemapXml(allowedUrls);
    } catch (error) {
        logger.error('Sitemap generation failed', { error: error.message });
        throw new SitemapError(`Failed to generate sitemap: ${error.message}`);
    }
}
