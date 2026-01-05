/**
 * Browser Pool for managing Puppeteer browser instances
 * Reuses browser instances across multiple operations for performance
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

class BrowserPool {
  constructor(options = {}) {
    this.poolSize = options.poolSize || 3;
    this.launchOptions = options.launchOptions || {};
    this.browsers = [];
    this.availableBrowsers = [];
    this.waitQueue = [];
    this.isShuttingDown = false;

    global.auditcore.logger.info(`Browser pool initialized with size: ${this.poolSize}`);
  }

  /**
   * Initialize the browser pool by launching browsers
   */
  async initialize() {
    global.auditcore.logger.info('Initializing browser pool...');
    const launchPromises = [];

    for (let i = 0; i < this.poolSize; i++) {
      launchPromises.push(this._createBrowser(i));
    }

    await Promise.all(launchPromises);
    global.auditcore.logger.info(`Browser pool ready with ${this.browsers.length} browsers`);
  }

  /**
   * Create a new browser instance
   * @private
   */
  async _createBrowser(index) {
    try {
      global.auditcore.logger.debug(`Launching browser ${index}...`);
      const browser = await puppeteer.launch(this.launchOptions);

      const browserObj = {
        id: index,
        instance: browser,
        inUse: false,
        pagesCreated: 0,
      };

      this.browsers.push(browserObj);
      this.availableBrowsers.push(browserObj);

      global.auditcore.logger.debug(`Browser ${index} launched successfully`);
      return browserObj;
    } catch (error) {
      global.auditcore.logger.error(`Error launching browser ${index}:`, error);
      throw error;
    }
  }

  /**
   * Acquire a browser from the pool
   * @returns {Promise<Object>} Browser object with instance
   */
  async acquire() {
    if (this.isShuttingDown) {
      throw new Error('Browser pool is shutting down');
    }

    // If there's an available browser, return it immediately
    if (this.availableBrowsers.length > 0) {
      const browserObj = this.availableBrowsers.shift();
      browserObj.inUse = true;
      global.auditcore.logger.debug(`Browser ${browserObj.id} acquired (${this.availableBrowsers.length} available)`);
      return browserObj;
    }

    // Otherwise, wait for a browser to become available
    global.auditcore.logger.debug('No browsers available, waiting...');
    return new Promise((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  /**
   * Release a browser back to the pool
   * @param {Object} browserObj - Browser object to release
   */
  async release(browserObj) {
    if (!browserObj || this.isShuttingDown) {
      return;
    }

    browserObj.inUse = false;
    browserObj.pagesCreated++;

    // Check if we should restart the browser (after many pages to prevent memory leaks)
    if (browserObj.pagesCreated > 50) {
      global.auditcore.logger.debug(`Browser ${browserObj.id} has created ${browserObj.pagesCreated} pages, restarting...`);
      await this._restartBrowser(browserObj);
    }

    // If there's a waiting request, fulfill it
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift();
      browserObj.inUse = true;
      global.auditcore.logger.debug(`Browser ${browserObj.id} assigned to waiting request`);
      resolve(browserObj);
    } else {
      // Return to available pool
      this.availableBrowsers.push(browserObj);
      global.auditcore.logger.debug(`Browser ${browserObj.id} released (${this.availableBrowsers.length} available)`);
    }
  }

  /**
   * Restart a browser instance
   * @private
   */
  async _restartBrowser(browserObj) {
    try {
      global.auditcore.logger.debug(`Closing browser ${browserObj.id}...`);
      await browserObj.instance.close();

      global.auditcore.logger.debug(`Relaunching browser ${browserObj.id}...`);
      const newBrowser = await puppeteer.launch(this.launchOptions);
      browserObj.instance = newBrowser;
      browserObj.pagesCreated = 0;

      global.auditcore.logger.debug(`Browser ${browserObj.id} restarted successfully`);
    } catch (error) {
      global.auditcore.logger.error(`Error restarting browser ${browserObj.id}:`, error);
      throw error;
    }
  }

  /**
   * Execute an operation with a browser from the pool
   * @param {Function} operation - Async function that receives browser instance
   * @returns {Promise<any>} Result of the operation
   */
  async execute(operation) {
    let browserObj;
    try {
      browserObj = await this.acquire();
      const result = await operation(browserObj.instance);
      return result;
    } finally {
      if (browserObj) {
        await this.release(browserObj);
      }
    }
  }

  /**
   * Shutdown the browser pool
   */
  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    global.auditcore.logger.info('Shutting down browser pool...');

    // Reject all waiting requests
    while (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift();
      resolve(null);
    }

    // Close all browsers
    const closePromises = this.browsers.map(async (browserObj) => {
      try {
        if (browserObj.instance) {
          await browserObj.instance.close();
          global.auditcore.logger.debug(`Browser ${browserObj.id} closed`);
        }
      } catch (error) {
        global.auditcore.logger.error(`Error closing browser ${browserObj.id}:`, error);
      }
    });

    await Promise.all(closePromises);
    this.browsers = [];
    this.availableBrowsers = [];

    global.auditcore.logger.info('Browser pool shutdown complete');
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      poolSize: this.poolSize,
      totalBrowsers: this.browsers.length,
      availableBrowsers: this.availableBrowsers.length,
      busyBrowsers: this.browsers.filter((b) => b.inUse).length,
      waitingRequests: this.waitQueue.length,
      isShuttingDown: this.isShuttingDown,
    };
  }
}

export default BrowserPool;
