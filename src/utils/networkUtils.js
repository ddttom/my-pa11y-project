/**
 * Network utilities for handling HTTP requests with robust error handling
 * Includes retry mechanisms, Puppeteer fallback, and request throttling
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Helper functions
function isCloudflareChallenge(error) {
  return error.response?.status === 403 && 
         error.response?.headers['cf-ray'] && 
         error.response?.data?.includes('Cloudflare');
}

function isBlockedError(error) {
  return error.response?.status === 403 || // Forbidden
         error.response?.status === 429 || // Too Many Requests
         error.message.includes('blocked') ||
         error.message.includes('denied') ||
         error.message.includes('restricted') ||
         error.message.includes('rate limit') ||
         error.message.includes('captcha');
}

function isNetworkError(error) {
  const networkErrorCodes = [
    'ENOTFOUND', // DNS lookup failed
    'ECONNRESET', // Connection reset
    'ECONNREFUSED', // Connection refused
    'ETIMEDOUT', // Connection timed out
    'EHOSTUNREACH', // Host unreachable
    'ENETUNREACH', // Network unreachable
    'EAI_AGAIN' // Temporary DNS failure
  ];

  return networkErrorCodes.includes(error.code) ||
         error.message.includes('net::ERR_INTERNET_DISCONNECTED') ||
         error.message.includes('net::ERR_NETWORK_CHANGED') ||
         error.message.includes('net::ERR_CONNECTION_RESET') ||
         error.message.includes('net::ERR_CONNECTION_REFUSED') ||
         error.message.includes('net::ERR_CONNECTION_TIMED_OUT');
}

// Main functions
async function executePuppeteerOperation(operation, operationName, options = {}) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled'
      ],
      ...options
    });

    const page = await browser.newPage();
    
    // Randomize browser fingerprint
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3],
      });
    });

    // Set realistic headers and settings
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Referer': 'https://www.google.com/',
      'Connection': 'keep-alive'
    });

    // Randomize viewport and mouse movements
    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 1080 + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: false
    });

    // Add random delays to mimic human behavior
    const randomDelay = (min, max) => 
      new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

    // Execute the operation with random delays
    await randomDelay(500, 1500);
    const result = await operation(page);
    await randomDelay(500, 1500);

    return result;
  } catch (error) {
    global.auditcore.logger.error(`Puppeteer operation failed during ${operationName}:`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function handleCloudflareChallenge(operation, operationName) {
  try {
    global.auditcore.logger.info('Attempting to bypass Cloudflare challenge...');
    return await executePuppeteerOperation(operation, operationName, {
      headless: false, // Need visible browser for challenges
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled'
      ]
    });
  } catch (error) {
    global.auditcore.logger.error('Failed to bypass Cloudflare challenge:', error);
    throw new Error('Unable to bypass Cloudflare protection. Please try again later or skip this site.');
  }
}

async function executeNetworkOperation(operation, operationName) {
  let retryCount = 0;
  const maxRetries = 3;
  const baseDelay = 1000;

  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (isCloudflareChallenge(error)) {
        return await handleCloudflareChallenge(operation, operationName);
      }
      
      if (isBlockedError(error)) {
        retryCount++;
        if (retryCount >= maxRetries) {
          global.auditcore.logger.warn('Falling back to Puppeteer for blocked request');
          return await executePuppeteerOperation(operation, operationName);
        }

        const delay = baseDelay * Math.pow(2, retryCount);
        global.auditcore.logger.warn(`Blocked during ${operationName}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (isNetworkError(error)) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Network operation failed after ${maxRetries} attempts: ${error.message}`);
        }

        const delay = baseDelay * Math.pow(2, retryCount);
        global.auditcore.logger.warn(`Network error during ${operationName}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
}

// Export all functions
export {
  executeNetworkOperation,
  executePuppeteerOperation,
  isCloudflareChallenge,
  isBlockedError,
  isNetworkError
};
