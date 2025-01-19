// accessibilityReport.js

import { writeFile } from 'fs/promises';
import path from 'path';

/**
 * Formats date as YYYY-MM-DD_HH-mm-ss
 */
function formatTimestamp(date) {
  const pad = num => num.toString().padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

/**
 * Generates accessibility report CSV content
 */
function generateAccessibilityReportContent(results) {
  const headers = [
    'URL',
    'Pa11y Issues Count',
    'Critical Issues',
    'Serious Issues',
    'Moderate Issues',
    'Minor Issues',
    'WCAG A Issues',
    'WCAG AA Issues',
    'WCAG AAA Issues',
    'Accessibility Score'
  ].join(',');

  const rows = results.pa11y.map(result => {
    const analysis = result.analysis || {
      bySeverity: {},
      byWCAGLevel: {}
    };

    // Calculate accessibility score (100 - (critical * 5 + serious * 3 + moderate * 2 + minor))
    const critical = analysis.bySeverity.Critical || 0;
    const serious = analysis.bySeverity.Serious || 0;
    const moderate = analysis.bySeverity.Moderate || 0;
    const minor = analysis.bySeverity.Minor || 0;
    const score = Math.max(0, 100 - (critical * 5 + serious * 3 + moderate * 2 + minor));

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
      score.toFixed(2)
    ].join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Generates and saves accessibility report
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
 * Generates detailed accessibility issues report
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
      'Remediation'
    ].join(',');

    const rows = results.pa11y.flatMap(result => 
      result.issues?.map(issue => [
        result.url,
        issue.code,
        issue.message,
        issue.context,
        issue.severity,
        issue.wcagLevel,
        issue.remediation
      ].join(',')) || []
    );

    const content = [headers, ...rows].join('\n');
    await writeFile(reportPath, content);
    
    global.auditcore.logger.info(`Detailed accessibility report generated at: ${reportPath}`);
    return reportPath;
  } catch (error) {
    global.auditcore.logger.error('Error generating detailed accessibility report:', error);
    throw error;
  }
}
