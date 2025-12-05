import fs from 'fs/promises';
import path from 'path';
import {
  generateSeoReport,
  generatePerformanceReport,
  generateSeoScores,
  generateAccessibilityReport,
  generateImageOptimizationReport,
  generateLinkAnalysisReport,
  generateContentQualityReport,
  generateSecurityReport,
  generateSpecificUrlReport,
  generateExternalResourcesReport
} from './reportUtils/reportGenerators.js';

/**
 * Main function to generate all reports
 */
export async function generateReports(results, urls, outputDir) {
  try {
    if (!results) {
      throw new Error('Invalid results structure');
    }

    global.auditcore.logger.info('Starting report generation');

    await generateSeoReport(results, outputDir);
    await generatePerformanceReport(results, outputDir);
    await generateSeoScores(results, outputDir);
    await generateAccessibilityReport(results, outputDir);
    await generateImageOptimizationReport(results, outputDir);
    await generateLinkAnalysisReport(results, outputDir);
    await generateContentQualityReport(results, outputDir);
    await generateSecurityReport(results, outputDir);
    await generateSpecificUrlReport(results, outputDir);
    await generateExternalResourcesReport(results, outputDir);

    // Save complete results as JSON
    await fs.writeFile(
      path.join(outputDir, 'results.json'),
      JSON.stringify(results, null, 2)
    );

    global.auditcore.logger.info('All reports generated successfully');
  } catch (error) {
    global.auditcore.logger.error('Error generating reports:', error);
    throw error;
  }
}

export {
  generateSeoReport,
  generatePerformanceReport,
  generateSeoScores,
  generateAccessibilityReport,
  generateImageOptimizationReport,
  generateLinkAnalysisReport,
  generateContentQualityReport,
  generateSecurityReport,
  generateExternalResourcesReport
};
