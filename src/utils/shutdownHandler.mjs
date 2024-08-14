/* eslint-disable import/extensions */
// shutdownHandler.js

import { saveResults } from './results.mjs';

let isShuttingDown = false;

export function setupShutdownHandler(outputDir, results, logger) {
  process.on('SIGINT', async () => {
    if (isShuttingDown) {
      logger.warn('Forced exit');
      process.exit(1);
    }

    isShuttingDown = true;
    logger.info('Graceful shutdown initiated...');

    try {
      logger.debug('Attempting to save partial results...');
      await saveResults(results, outputDir, null, logger);
      logger.debug('Partial results saved successfully');
    } catch (error) {
      logger.error('Error saving partial results:', error);
    }

    logger.info('Shutdown complete. Exiting...');
    process.exit(0);
  });
}

export function checkIsShuttingDown() {
  return isShuttingDown;
}

export function setShuttingDown(value) {
  isShuttingDown = value;
}
