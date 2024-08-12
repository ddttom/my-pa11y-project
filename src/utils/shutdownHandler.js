/* eslint-disable import/extensions */
/* eslint-disable no-console */
// src/utils/shutdownHandler.js

import { saveResults } from './results.js';
import { debug } from './debug.js';

let isShuttingDown = false;

export function setupShutdownHandler(outputDir, results) {
  process.on('SIGINT', async () => {
    if (isShuttingDown) {
      console.log('Forced exit');
      process.exit(1);
    }

    isShuttingDown = true;
    console.log('\nGraceful shutdown initiated...');

    try {
      debug('Attempting to save partial results...');
      await saveResults(results, outputDir);
      debug('Partial results saved successfully');
    } catch (error) {
      console.error('Error saving partial results:', error);
    }

    console.log('Shutdown complete. Exiting...');
    process.exit(0);
  });
}

export function checkIsShuttingDown() {
  return isShuttingDown;
}

export function setShuttingDown(value) {
  isShuttingDown = value;
}
