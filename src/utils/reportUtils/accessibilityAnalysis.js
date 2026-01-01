/**
 * Accessibility analysis utilities for processing Pa11y test results
 * Includes WCAG compliance checking, issue categorization, and reporting
 */

import {
  createEmptyAnalysis,
  mapIssueToGuideline,
  getGuidelineDescription,
  getRequiredManualChecks,
} from './formatUtils.js';

/**
 * Analyzes Pa11y accessibility test results with enhanced WCAG 2.1 compliance
 * @param {Object} page - Page object containing Pa11y results
 * @returns {Object} - Analysis object with categorized results
 *
 * Features:
 * - WCAG 2.1 compliance checking
 * - Issue severity categorization
 * - Manual checks identification
 * - Remediation suggestions
 * - Accessibility scoring
 */
export function analyzePa11yResults(page) {
  const analysis = createEmptyAnalysis();

  // Exit early if page or issues are missing
  if (!page || !page.issues) {
    global.auditcore.logger.debug('No Pa11y issues found for page');
    return analysis;
  }

  global.auditcore.logger.debug(`Analyzing ${page.issues.length} Pa11y issues`);

  // Ensure issues is an array
  const issues = Array.isArray(page.issues) ? page.issues : [];

  issues.forEach((issue) => {
    analysis.totalIssues++;

    // Count by severity
    analysis.bySeverity[issue.severity] = (analysis.bySeverity[issue.severity] || 0) + 1;

    // Count by WCAG level
    const wcagMatch = issue.code?.match(/WCAG2([A]{1,3})/);
    if (wcagMatch) {
      const level = wcagMatch[1];
      analysis.byLevel[level] = (analysis.byLevel[level] || 0) + 1;
    }

    // Count by WCAG 2.1 guideline
    const guideline = mapIssueToGuideline(issue);
    if (guideline) {
      analysis.byGuideline[guideline] = (analysis.byGuideline[guideline] || 0) + 1;

      // Add required manual checks for this guideline
      const manualChecks = getRequiredManualChecks(guideline);
      manualChecks.forEach((check) => {
        if (!analysis.requiredManualChecks.includes(check)) {
          analysis.requiredManualChecks.push(check);
        }
      });
    }

    // Count specific types of issues
    if (issue.code?.includes('ARIA')) {
      analysis.ariaIssues++;
    }
    if (issue.code?.includes('Contrast')) {
      analysis.contrastIssues++;
    }
    if (issue.code?.toLowerCase().includes('keyboard')) {
      analysis.keyboardIssues++;
    }

    // Add remediation suggestions
    if (issue.remediation && !analysis.remediationSuggestions.includes(issue.remediation)) {
      analysis.remediationSuggestions.push(issue.remediation);
    }

    // Update score based on severity
    const severityWeights = {
      Critical: 5,
      Serious: 3,
      Moderate: 2,
      Minor: 1,
    };
    analysis.score -= (severityWeights[issue.severity] || 1) * 2;
  });

  // Add manual checks that need to be performed
  analysis.manualChecks = analysis.requiredManualChecks
    .filter((check) => !analysis.remediationSuggestions.includes(check));

  analysis.score = Math.max(0, analysis.score);
  return analysis;
}

/**
 * Generates WCAG 2.1 compliance summary
 * @param {Object} analysis - Analysis object from analyzePa11yResults
 * @returns {Object} - WCAG compliance summary
 *
 * Features:
 * - Guideline compliance status
 * - Detailed guideline information
 * - Required manual checks
 * - Compliance statistics
 */
export function generateWCAGComplianceSummary(analysis) {
  const summary = {
    totalGuidelines: Object.keys(analysis.byGuideline).length,
    compliantGuidelines: 0,
    nonCompliantGuidelines: 0,
    guidelineDetails: [],
  };

  Object.entries(analysis.byGuideline).forEach(([guideline, count]) => {
    const isCompliant = count === 0;
    if (isCompliant) {
      summary.compliantGuidelines++;
    } else {
      summary.nonCompliantGuidelines++;
    }

    summary.guidelineDetails.push({
      guideline,
      description: getGuidelineDescription(guideline),
      issues: count,
      compliant: isCompliant,
      requiredChecks: getRequiredManualChecks(guideline),
    });
  });

  return summary;
}
