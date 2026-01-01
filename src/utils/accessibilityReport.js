/**
 * Accessibility report generation utilities
 * Includes CSV report generation for accessibility findings and WCAG compliance
 */

import { writeFile } from 'fs/promises';
import path from 'path';
import { generateWCAGComplianceSummary } from './reportUtils/accessibilityAnalysis.js';

/**
 * Formats date as YYYY-MM-DD_HH-mm-ss for report filenames
 * @param {Date} date - Date to format
 * @returns {String} - Formatted timestamp string
 */
function formatTimestamp(date) {
  const pad = (num) => num.toString().padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

/**
 * Generates markdown content for WCAG issues report
 * @param {Object} results - Analysis results object
 * @param {String} sectionName - Name of the section being analyzed
 * @returns {String} - Markdown content string
 */
function generateWCAGMarkdownContent(results, sectionName = 'Initial Accessibility Analysis') {
  const issueMap = new Map();

  // Process all issues and group by URL and issue code
  results.pa11y.forEach((result) => {
    result.issues?.forEach((issue) => {
      const key = `${result.url}|${issue.code}`;
      if (!issueMap.has(key)) {
        issueMap.set(key, {
          url: result.url,
          code: issue.code,
          message: issue.message,
          context: issue.context,
          severity: issue.severity,
          wcagLevel: issue.wcagLevel,
          guideline: issue.guideline || 'N/A',
          guidelineDescription: issue.guidelineDescription || 'N/A',
          remediation: issue.remediation || 'N/A',
          requiresManualCheck: issue.requiresManualCheck ? 'Yes' : 'No',
          count: 0,
        });
      }
      issueMap.get(key).count++;
    });
  });

  // Generate markdown content dynamically
  let content = '# Accessibility Report - WCAG Issues by Path\n\n';
  content += `## Section: ${sectionName}\n\n`;

  // Group by URL
  const urlMap = new Map();
  issueMap.forEach((issue) => {
    const { url } = issue;
    if (!urlMap.has(url)) {
      urlMap.set(url, []);
    }
    urlMap.get(url).push(issue);
  });

  // Add issues for each URL
  urlMap.forEach((issues, url) => {
    content += `### Path: ${url}\n`;
    issues.forEach((issue) => {
      content += `- **Issue Code**: ${issue.code}\n`;
      content += `  - **Description**: ${issue.message}\n`;
      content += `  - **Context**: ${issue.context}\n`;
      content += `  - **Severity**: ${issue.severity}\n`;
      content += `  - **WCAG Level**: ${issue.wcagLevel}\n`;
      content += `  - **Guideline**: ${issue.guideline}\n`;
      content += `  - **Guideline Description**: ${issue.guidelineDescription}\n`;
      content += `  - **Remediation**: ${issue.remediation}\n`;
      content += `  - **Manual Check Required**: ${issue.requiresManualCheck}\n`;
      content += `  - **Count**: ${issue.count}\n\n`;
    });
  });

  return content;
}

/**
 * Generates accessibility report CSV content with enhanced WCAG 2.1 compliance
 * @param {Object} results - Analysis results object
 * @returns {String} - CSV content string
 *
 * Features:
 * - Summary of accessibility issues by severity
 * - WCAG compliance percentages
 * - Required manual checks count
 * - Remediation suggestions count
 * - Accessibility scoring
 */
function generateAccessibilityReportContent(results) {
  const headers = [
    'URL',
    'Total Issues',
    'Critical Issues',
    'Serious Issues',
    'Moderate Issues',
    'Minor Issues',
    'WCAG A Issues',
    'WCAG AA Issues',
    'WCAG AAA Issues',
    'WCAG 2.1 Compliance',
    'Required Manual Checks',
    'Remediation Suggestions',
    'Accessibility Score',
  ].join(',');

  const rows = results.pa11y.map((result) => {
    const analysis = result.analysis || {
      bySeverity: {},
      byWCAGLevel: {},
      byGuideline: {},
      requiredManualChecks: [],
      remediationSuggestions: [],
    };

    // Calculate accessibility score
    const critical = analysis.bySeverity.Critical || 0;
    const serious = analysis.bySeverity.Serious || 0;
    const moderate = analysis.bySeverity.Moderate || 0;
    const minor = analysis.bySeverity.Minor || 0;
    const score = Math.max(0, 100 - (critical * 5 + serious * 3 + moderate * 2 + minor));

    // Calculate WCAG 2.1 compliance percentage
    const totalGuidelines = Object.keys(analysis.byGuideline).length;
    const compliantGuidelines = Object.values(analysis.byGuideline).filter((count) => count === 0).length;
    const compliancePercentage = totalGuidelines > 0
      ? ((compliantGuidelines / totalGuidelines) * 100).toFixed(2) : '100.00';

    return [
      result.url,
      result.issues?.length || 0,
      critical,
      serious,
      moderate,
      minor,
      analysis.byWCAGLevel.A || 0,
      analysis.byWCAGLevel.AA || 0,
      analysis.byWCAGLevel.AAA || 0,
      compliancePercentage,
      analysis.requiredManualChecks.length,
      analysis.remediationSuggestions.length,
      score.toFixed(2),
    ].join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Generates and saves accessibility report
 * @param {Object} results - Analysis results object
 * @param {String} outputDir - Directory to save report
 * @returns {Promise<String>} - Path to generated report
 */
export async function generateAccessibilityReport(results, outputDir) {
  try {
    const timestamp = formatTimestamp(new Date());
    const reportPath = path.join(outputDir, `accessibility_report_${timestamp}.csv`);

    const content = generateAccessibilityReportContent(results);
    await writeFile(reportPath, content);

    global.auditcore.logger.info(`Accessibility report generated at: ${reportPath}`);
    return reportPath;
  } catch (error) {
    global.auditcore.logger.error('Error generating accessibility report:', error);
    throw error;
  }
}

/**
 * Generates and saves WCAG issues markdown report
 * @param {Object} results - Analysis results object
 * @param {String} outputDir - Directory to save report
 * @param {String} sectionName - Name of the section being analyzed
 * @returns {Promise<String>} - Path to generated report
 */
export async function generateWCAGMarkdownReport(results, outputDir, sectionName = 'Initial Accessibility Analysis') {
  try {
    const timestamp = formatTimestamp(new Date());
    const reportPath = path.join(outputDir, `wcag_report_${timestamp}.md`);
    const content = generateWCAGMarkdownContent(results, sectionName);
    await writeFile(reportPath, content);

    global.auditcore.logger.info(`WCAG markdown report generated at: ${reportPath}`);
    return reportPath;
  } catch (error) {
    global.auditcore.logger.error('Error generating WCAG markdown report:', error);
    throw error;
  }
}

/**
 * Generates detailed accessibility issues report with WCAG 2.1 guideline details
 * @param {Object} results - Analysis results object
 * @param {String} outputDir - Directory to save report
 * @returns {Promise<String>} - Path to generated report
 *
 * Features:
 * - Detailed issue information
 * - WCAG guideline mapping
 * - Remediation suggestions
 * - Manual check requirements
 */
export async function generateDetailedAccessibilityReport(results, outputDir) {
  try {
    const timestamp = formatTimestamp(new Date());
    const reportPath = path.join(outputDir, `detailed_accessibility_report_${timestamp}.csv`);

    const headers = [
      'URL',
      'Issue Code',
      'Description',
      'Context',
      'Severity',
      'WCAG Level',
      'WCAG 2.1 Guideline',
      'Guideline Description',
      'Remediation',
      'Manual Check Required',
    ].join(',');

    const rows = results.pa11y.flatMap((result) => result.issues?.map((issue) => [
      result.url,
      issue.code,
      issue.message,
      issue.context,
      issue.severity,
      issue.wcagLevel,
      issue.guideline || 'N/A',
      issue.guidelineDescription || 'N/A',
      issue.remediation || 'N/A',
      issue.requiresManualCheck ? 'Yes' : 'No',
    ].join(',')) || []);

    const content = [headers, ...rows].join('\n');
    await writeFile(reportPath, content);

    global.auditcore.logger.info(`Detailed accessibility report generated at: ${reportPath}`);
    return reportPath;
  } catch (error) {
    global.auditcore.logger.error('Error generating detailed accessibility report:', error);
    throw error;
  }
}

/**
 * Generates WCAG 2.1 compliance summary report
 * @param {Object} results - Analysis results object
 * @param {String} outputDir - Directory to save report
 * @returns {Promise<String>} - Path to generated report
 *
 * Features:
 * - Guideline compliance status
 * - Issues per guideline
 * - Required manual checks
 * - Compliance statistics
 */
export async function generateWCAGComplianceReport(results, outputDir) {
  try {
    const timestamp = formatTimestamp(new Date());
    const reportPath = path.join(outputDir, `wcag_compliance_report_${timestamp}.csv`);

    const summary = generateWCAGComplianceSummary(results);

    const headers = [
      'Guideline',
      'Description',
      'Issues Found',
      'Compliance Status',
      'Required Manual Checks',
    ].join(',');

    const rows = summary.guidelineDetails.map((detail) => [
      detail.guideline,
      detail.description,
      detail.issues,
      detail.compliant ? 'Compliant' : 'Non-Compliant',
      detail.requiredChecks.join('; '),
    ].join(','));

    const content = [headers, ...rows].join('\n');
    await writeFile(reportPath, content);

    global.auditcore.logger.info(`WCAG compliance report generated at: ${reportPath}`);
    return reportPath;
  } catch (error) {
    global.auditcore.logger.error('Error generating WCAG compliance report:', error);
    throw error;
  }
}
