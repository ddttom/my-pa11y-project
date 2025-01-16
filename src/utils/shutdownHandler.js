import { generateReports } from './reports.js';

let isShuttingDown = false;
let currentResults = null;

export function setupShutdownHandler() {
  async function handleShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    global.auditcore.logger.info(`\nReceived ${signal} signal. Saving data before exit...`);

    try {
      if (currentResults || global.auditcore.results) {
        const results = currentResults || global.auditcore.results;
        await generateReports(results, [], global.auditcore.options.output);
        global.auditcore.logger.info('All data saved successfully');
      } else {
        global.auditcore.logger.warn('No results to save during shutdown');
      }
    } catch (error) {
      global.auditcore.logger.error('Error saving data during shutdown:', error);
    }

    // Exit after a brief delay to allow logs to be written
    setTimeout(() => process.exit(0), 100);
  }

  // Handle various termination signals
  process.on('SIGINT', () => handleShutdown('SIGINT')); // Ctrl+C
  process.on('SIGTERM', () => handleShutdown('SIGTERM')); // Kill
  process.on('uncaughtException', (error) => {
    global.auditcore.logger.error('Uncaught exception:', error);
    handleShutdown('UNCAUGHT_EXCEPTION');
  });
  process.on('unhandledRejection', (reason) => {
    global.auditcore.logger.error('Unhandled rejection:', reason);
    handleShutdown('UNHANDLED_REJECTION');
  });
}

export function updateCurrentResults(results) {
  currentResults = results;
}

export function isProcessShuttingDown() {
  return isShuttingDown;
}
