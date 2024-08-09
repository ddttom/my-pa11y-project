// shutdownHandler.js 
function setupShutdownHandler(outputDir) {
    process.on('SIGINT', async () => {
        debug('\nGraceful shutdown initiated...');
        isShuttingDown = true;

        // Wait a moment to allow the current operation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        debug('Saving partial results...');
        await saveResults(results, outputDir);

        console.info('Shutdown complete. Exiting...');
        process.exit(0);
    });
}
