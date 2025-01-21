import axios from 'axios';
import puppeteer from 'puppeteer';

/**
 * Execute a network operation with enhanced error handling
 */
export async function executeNetworkOperation(operation, operationName) {
  let retryCount = 0;
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second base delay

  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (isBlockedError(error)) {
        retryCount++;
        if (retryCount >= maxRetries) {
          // Fallback to Puppeteer for blocked requests
          global.auditcore.logger.warn('Falling back to Puppeteer for blocked request');
          return await executePuppeteerOperation(operation, operationName);
        }

        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        global.auditcore.logger.warn(`Blocked during ${operationName}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (isNetworkError(error)) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Network operation failed after ${maxRetries} attempts: ${error.message}`);
        }

        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        global.auditcore.logger.warn(`Network error during ${operationName}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
}

/**
 * Execute a browser-based network operation using Puppeteer
 */
export async function executePuppeteerOperation(operation, operationName) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set realistic browser headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Referer': 'https://www.google.com/',
      'Connection': 'keep-alive'
    });

    // Execute the operation in the browser context
    const result = await operation(page);
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

/**
 * Execute a browser-based network operation with enhanced error handling
 */
export async function executeBrowserNetworkOperation(operation, operationName) {
  let retryCount = 0;
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second base delay

  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (isBlockedError(error)) {
        retryCount++;
        if (retryCount >= maxRetries) {
          // Fallback to Puppeteer for blocked requests
          global.auditcore.logger.warn('Falling back to Puppeteer for blocked request');
          return await executePuppeteerOperation(operation, operationName);
        }

        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        global.auditcore.logger.warn(`Browser blocked during ${operationName}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (isNetworkError(error)) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Browser network operation failed after ${maxRetries} attempts: ${error.message}`);
        }

        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        global.auditcore.logger.warn(`Browser network error during ${operationName}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
}

/**
 * Check if an error is network-related
 */
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

/**
 * Check if an error indicates the request was blocked
 */
function isBlockedError(error) {
  return error.response?.status === 403 || // Forbidden
         error.response?.status === 429 || // Too Many Requests
         error.message.includes('blocked') ||
         error.message.includes('denied') ||
         error.message.includes('restricted') ||
         error.message.includes('rate limit') ||
         error.message.includes('captcha');
}

/**
 * Create axios instance with default headers and throttling
 */
export function createAxiosInstance() {
  const instance = axios.create({
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    }
  });

  // Add request throttling
  instance.interceptors.request.use(async config => {
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between requests
    return config;
  });

  return instance;
}
