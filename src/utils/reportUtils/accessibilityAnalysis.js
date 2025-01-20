import { createEmptyAnalysis } from './formatUtils.js';

/**
 * Analyze Pa11y accessibility test results
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

  issues.forEach(issue => {
    analysis.totalIssues++;
    
    // Count by severity
    analysis.bySeverity[issue.severity] = (analysis.bySeverity[issue.severity] || 0) + 1;
    
    // Count by WCAG level
    const wcagMatch = issue.code?.match(/WCAG2([A]{1,3})/);
    if (wcagMatch) {
      const level = wcagMatch[1];
      analysis.byLevel[level] = (analysis.byLevel[level] || 0) + 1;
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

    // Update score based on severity
    const severityWeights = {
      Critical: 5,
      Serious: 3,
      Moderate: 2,
      Minor: 1
    };
    analysis.score -= (severityWeights[issue.severity] || 1) * 2;
  });

  analysis.score = Math.max(0, analysis.score);
  return analysis;
}
