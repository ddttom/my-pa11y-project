/* eslint-disable import/extensions */
// shutdownHandler.js

import path from 'path';
import fs from 'fs/promises';
import { saveFinalSitemap } from '../main.js';

let isShuttingDown = false;
let shutdownInProgress = false;

export function checkIsShuttingDown() {
  return isShuttingDown;
}

export function setupShutdownHandler(outputDir, results) {
  async function handleShutdown(signal) {
    if (shutdownInProgress) {
      global.auditcore.logger.warn('Forced exit requested during shutdown');
      process.exit(1);
    }

    isShuttingDown = true;
    shutdownInProgress = true;

    global.auditcore.logger.info(`\nReceived ${signal}. Saving current progress...`);

    try {
      // Ensure final directory exists
      const finalDir = path.join(outputDir, 'final');
      await fs.mkdir(finalDir, { recursive: true });

      // Save final sitemap with current results
      const finalSitemapPath = await saveFinalSitemap(results, finalDir);
      
      global.auditcore.logger.info('=== Shutdown Summary ===');
      global.auditcore.logger.info(`Final sitemap saved to: ${finalSitemapPath}`);
      if (results.urlMetrics) {
        global.auditcore.logger.info(`Total URLs processed: ${results.urlMetrics.total || 0}`);
        global.auditcore.logger.info(`Internal URLs found: ${results.urlMetrics.internal || 0}`);
      }
      global.auditcore.logger.info('=====================');
      
      global.auditcore.logger.info('Graceful shutdown completed.');
      process.exit(0);
    } catch (error) {
      global.auditcore.logger.error('Error during shutdown:', error);
      global.auditcore.logger.error('Error details:', error.stack);
      process.exit(1);
    }
  }

  // Handle SIGINT (Ctrl+C) and SIGTERM
  process.on('SIGINT', () => handleShutdown('SIGINT (Ctrl+C)'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    global.auditcore.logger.error('Uncaught exception:', error);
    handleShutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    global.auditcore.logger.error('Unhandled promise rejection:', reason);
    handleShutdown('UNHANDLED_REJECTION');
  });
}

export function setShuttingDown(value) {
  isShuttingDown = value;
}
