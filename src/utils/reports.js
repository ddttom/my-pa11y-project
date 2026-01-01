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
} from './reportUtils/reportGenerators.js';
import {
  generateGeneralLLMReport,
  generateFrontendLLMReport,
  generateBackendLLMReport,
} from './reportUtils/llmReports.js';
import { generateExecutiveSummary } from './reportUtils/executiveSummary.js';
import { generateDashboard } from './reportUtils/dashboardGenerator.js';
import { compareWithPrevious, generateTrendData } from './historicalComparison.js';

/**
 * Main function to generate all reports
 */
export async function generateReports(results, urls, outputDir) {
  try {
    if (!results) {
      throw new Error('Invalid results structure');
    }

    global.auditcore.logger.info('Starting report generation');

    // Generate standard reports
    await generateSeoReport(results, outputDir);
    await generatePerformanceReport(results, outputDir);
    await generateSeoScores(results, outputDir);
    await generateAccessibilityReport(results, outputDir);
    await generateImageOptimizationReport(results, outputDir);
    await generateLinkAnalysisReport(results, outputDir);
    await generateContentQualityReport(results, outputDir);
    await generateSecurityReport(results, outputDir);
    await generateGeneralLLMReport(results, outputDir);
    await generateFrontendLLMReport(results, outputDir);
    await generateBackendLLMReport(results, outputDir);

    // Check if enhanced features are enabled
    const { options } = global.auditcore;
    let comparison = null;
    let trendData = null;

    // Generate comparison with previous run if historical tracking is enabled
    if (options.enableHistory) {
      try {
        comparison = await compareWithPrevious(results, outputDir);
        if (comparison) {
          global.auditcore.logger.info('Generated comparison with previous run');
        }
      } catch (error) {
        global.auditcore.logger.warn('Could not generate comparison:', error.message);
      }

      // Generate trend data from historical runs
      try {
        trendData = await generateTrendData(outputDir);
        if (trendData) {
          global.auditcore.logger.info(`Generated trend data from ${trendData.timestamps.length} historical runs`);
        }
      } catch (error) {
        global.auditcore.logger.warn('Could not generate trend data:', error.message);
      }
    }

    // Generate executive summary if enabled
    if (options.generateExecutiveSummary) {
      try {
        await generateExecutiveSummary(results, outputDir, comparison);
        global.auditcore.logger.info('Executive summary generated');
      } catch (error) {
        global.auditcore.logger.error('Error generating executive summary:', error);
      }
    }

    // Generate HTML dashboard if enabled
    if (options.generateDashboard) {
      try {
        await generateDashboard(results, outputDir, comparison, trendData);
        global.auditcore.logger.info('HTML dashboard generated');
      } catch (error) {
        global.auditcore.logger.error('Error generating dashboard:', error);
      }
    }

    // Save complete results as JSON
    await fs.writeFile(
      path.join(outputDir, 'results.json'),
      JSON.stringify(results, null, 2),
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
  generateGeneralLLMReport,
  generateFrontendLLMReport,
  generateBackendLLMReport,
};
