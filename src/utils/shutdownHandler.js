/* eslint-disable import/extensions */
// shutdownHandler.js

import { saveResults } from './results.js';

let isShuttingDown = false;

export function setupShutdownHandler(outputDir, results) {
  process.on('SIGINT', async () => {
    if (isShuttingDown) {
      global.auditcore.logger.warn('Forced exit');
      process.exit(1);
    }

    isShuttingDown = true;
    global.auditcore.logger.info('Graceful shutdown initiated...');

    try {
      global.auditcore.logger.debug('Attempting to save partial results...');
      await saveResults(results, outputDir, null);
      global.auditcore.logger.debug('Partial results saved successfully');
    } catch (error) {
      global.auditcore.logger.error('Error saving partial results:', error);
    }

    global.auditcore.logger.info('Shutdown complete. Exiting...');
    process.exit(0);
  });
}

export function checkIsShuttingDown() {
  return isShuttingDown;
}

export function setShuttingDown(value) {
  isShuttingDown = value;
}
