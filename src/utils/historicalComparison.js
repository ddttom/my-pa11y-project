import fs from 'fs/promises';
import path from 'path';

/**
 * Stores analysis results with timestamp for historical comparison
 * @param {Object} results - Current analysis results
 * @param {string} outputDir - Output directory
 * @returns {Promise<string>} Path to stored historical result
 */
export async function storeHistoricalResult(results, outputDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const historyDir = path.join(outputDir, 'history');

  // Create history directory if it doesn't exist
  await fs.mkdir(historyDir, { recursive: true });

  const historyFile = path.join(historyDir, `results-${timestamp}.json`);

  // Store results with metadata
  const historicalEntry = {
    timestamp: new Date().toISOString(),
    schemaVersion: results.schemaVersion || '1.0.0',
    results,
  };

  await fs.writeFile(historyFile, JSON.stringify(historicalEntry));
  global.auditcore.logger.info(`Stored historical result: ${historyFile}`);

  return historyFile;
}

/**
 * Loads all historical results from the history directory
 * @param {string} outputDir - Output directory
 * @returns {Promise<Array>} Array of historical results with timestamps
 */
export async function loadHistoricalResults(outputDir) {
  const historyDir = path.join(outputDir, 'history');

  try {
    const files = await fs.readdir(historyDir);
    const historyFiles = files
      .filter((f) => f.startsWith('results-') && f.endsWith('.json'))
      .sort(); // Chronological order by filename

    const historicalResults = [];

    for (const file of historyFiles) {
      try {
        const content = await fs.readFile(path.join(historyDir, file), 'utf-8');
        const entry = JSON.parse(content);
        historicalResults.push(entry);
      } catch (error) {
        global.auditcore.logger.warn(`Failed to load historical result ${file}:`, error.message);
      }
    }

    return historicalResults;
  } catch (error) {
    global.auditcore.logger.debug('No historical results found');
    return [];
  }
}

/**
 * Compares current results with most recent historical result
 * @param {Object} currentResults - Current analysis results
 * @param {string} outputDir - Output directory
 * @returns {Promise<Object|null>} Comparison object or null if no history
 */
export async function compareWithPrevious(currentResults, outputDir) {
  const historicalResults = await loadHistoricalResults(outputDir);

  if (historicalResults.length === 0) {
    return null;
  }

  // Get most recent previous result (excluding current run)
  const previousResult = historicalResults[historicalResults.length - 1];

  return compareResults(previousResult.results, currentResults);
}

/**
 * Compares two result sets and calculates differences
 * @param {Object} oldResults - Previous results
 * @param {Object} newResults - Current results
 * @returns {Object} Comparison with deltas
 */
export function compareResults(oldResults, newResults) {
  const comparison = {
    performance: comparePerformanceMetrics(
      oldResults.performanceAnalysis || [],
      newResults.performanceAnalysis || [],
    ),
    accessibility: compareAccessibilityMetrics(
      oldResults.pa11y || [],
      newResults.pa11y || [],
    ),
    seo: compareSeoMetrics(
      oldResults.seoScores || [],
      newResults.seoScores || [],
    ),
    content: compareContentMetrics(
      oldResults.contentAnalysis || [],
      newResults.contentAnalysis || [],
    ),
    llm: compareLLMMetrics(
      oldResults.llmMetrics || [],
      newResults.llmMetrics || [],
    ),
    urlCount: {
      old: (oldResults.urls || []).length,
      new: (newResults.urls || []).length,
      delta: (newResults.urls || []).length - (oldResults.urls || []).length,
    },
  };

  return comparison;
}

/**
 * Compares performance metrics between two result sets
 */
function comparePerformanceMetrics(oldMetrics, newMetrics) {
  const oldAvg = calculateAverageMetrics(oldMetrics);
  const newAvg = calculateAverageMetrics(newMetrics);

  return {
    loadTime: {
      old: oldAvg.loadTime,
      new: newAvg.loadTime,
      delta: newAvg.loadTime - oldAvg.loadTime,
      percentChange: calculatePercentChange(oldAvg.loadTime, newAvg.loadTime),
    },
    largestContentfulPaint: {
      old: oldAvg.largestContentfulPaint,
      new: newAvg.largestContentfulPaint,
      delta: newAvg.largestContentfulPaint - oldAvg.largestContentfulPaint,
      percentChange: calculatePercentChange(oldAvg.largestContentfulPaint, newAvg.largestContentfulPaint),
    },
    firstContentfulPaint: {
      old: oldAvg.firstContentfulPaint,
      new: newAvg.firstContentfulPaint,
      delta: newAvg.firstContentfulPaint - oldAvg.firstContentfulPaint,
      percentChange: calculatePercentChange(oldAvg.firstContentfulPaint, newAvg.firstContentfulPaint),
    },
    cumulativeLayoutShift: {
      old: oldAvg.cumulativeLayoutShift,
      new: newAvg.cumulativeLayoutShift,
      delta: newAvg.cumulativeLayoutShift - oldAvg.cumulativeLayoutShift,
      percentChange: calculatePercentChange(oldAvg.cumulativeLayoutShift, newAvg.cumulativeLayoutShift),
    },
  };
}

/**
 * Compares accessibility metrics between two result sets
 */
function compareAccessibilityMetrics(oldMetrics, newMetrics) {
  const oldIssues = countAccessibilityIssues(oldMetrics);
  const newIssues = countAccessibilityIssues(newMetrics);

  return {
    totalIssues: {
      old: oldIssues.total,
      new: newIssues.total,
      delta: newIssues.total - oldIssues.total,
      percentChange: calculatePercentChange(oldIssues.total, newIssues.total),
    },
    errorCount: {
      old: oldIssues.errors,
      new: newIssues.errors,
      delta: newIssues.errors - oldIssues.errors,
    },
    warningCount: {
      old: oldIssues.warnings,
      new: newIssues.warnings,
      delta: newIssues.warnings - oldIssues.warnings,
    },
    noticeCount: {
      old: oldIssues.notices,
      new: newIssues.notices,
      delta: newIssues.notices - oldIssues.notices,
    },
  };
}

/**
 * Compares SEO metrics between two result sets
 */
function compareSeoMetrics(oldMetrics, newMetrics) {
  const oldAvg = calculateAverageSeoScore(oldMetrics);
  const newAvg = calculateAverageSeoScore(newMetrics);

  return {
    averageScore: {
      old: oldAvg,
      new: newAvg,
      delta: newAvg - oldAvg,
      percentChange: calculatePercentChange(oldAvg, newAvg),
    },
  };
}

/**
 * Compares content metrics between two result sets
 */
function compareContentMetrics(oldMetrics, newMetrics) {
  const oldAvg = calculateAverageContentMetrics(oldMetrics);
  const newAvg = calculateAverageContentMetrics(newMetrics);

  return {
    wordCount: {
      old: oldAvg.wordCount,
      new: newAvg.wordCount,
      delta: newAvg.wordCount - oldAvg.wordCount,
      percentChange: calculatePercentChange(oldAvg.wordCount, newAvg.wordCount),
    },
    headingCount: {
      old: oldAvg.headingCount,
      new: newAvg.headingCount,
      delta: newAvg.headingCount - oldAvg.headingCount,
    },
  };
}

/**
 * Compares LLM suitability metrics between two result sets
 */
function compareLLMMetrics(oldMetrics, newMetrics) {
  const oldAvg = calculateAverageLLMScore(oldMetrics);
  const newAvg = calculateAverageLLMScore(newMetrics);

  return {
    servedScore: {
      old: oldAvg.servedScore,
      new: newAvg.servedScore,
      delta: newAvg.servedScore - oldAvg.servedScore,
      percentChange: calculatePercentChange(oldAvg.servedScore, newAvg.servedScore),
    },
    renderedScore: {
      old: oldAvg.renderedScore,
      new: newAvg.renderedScore,
      delta: newAvg.renderedScore - oldAvg.renderedScore,
      percentChange: calculatePercentChange(oldAvg.renderedScore, newAvg.renderedScore),
    },
  };
}

/**
 * Helper: Calculate average performance metrics
 */
function calculateAverageMetrics(metrics) {
  if (!metrics || metrics.length === 0) {
    return {
      loadTime: 0, largestContentfulPaint: 0, firstContentfulPaint: 0, cumulativeLayoutShift: 0,
    };
  }

  const sum = metrics.reduce((acc, m) => ({
    loadTime: acc.loadTime + (m.loadTime || 0),
    largestContentfulPaint: acc.largestContentfulPaint + (m.largestContentfulPaint || 0),
    firstContentfulPaint: acc.firstContentfulPaint + (m.firstContentfulPaint || 0),
    cumulativeLayoutShift: acc.cumulativeLayoutShift + (m.cumulativeLayoutShift || 0),
  }), {
    loadTime: 0, largestContentfulPaint: 0, firstContentfulPaint: 0, cumulativeLayoutShift: 0,
  });

  return {
    loadTime: sum.loadTime / metrics.length,
    largestContentfulPaint: sum.largestContentfulPaint / metrics.length,
    firstContentfulPaint: sum.firstContentfulPaint / metrics.length,
    cumulativeLayoutShift: sum.cumulativeLayoutShift / metrics.length,
  };
}

/**
 * Helper: Count accessibility issues by type
 */
function countAccessibilityIssues(metrics) {
  let errors = 0; let warnings = 0; let
    notices = 0;

  metrics.forEach((m) => {
    if (m.issues) {
      m.issues.forEach((issue) => {
        if (issue.type === 'error') errors++;
        else if (issue.type === 'warning') warnings++;
        else if (issue.type === 'notice') notices++;
      });
    }
  });

  return {
    total: errors + warnings + notices, errors, warnings, notices,
  };
}

/**
 * Helper: Calculate average SEO score
 */
function calculateAverageSeoScore(metrics) {
  if (!metrics || metrics.length === 0) return 0;
  const sum = metrics.reduce((acc, m) => acc + (m.totalScore || 0), 0);
  return sum / metrics.length;
}

/**
 * Helper: Calculate average content metrics
 */
function calculateAverageContentMetrics(metrics) {
  if (!metrics || metrics.length === 0) {
    return { wordCount: 0, headingCount: 0 };
  }

  const sum = metrics.reduce((acc, m) => ({
    wordCount: acc.wordCount + (m.wordCount || 0),
    headingCount: acc.headingCount + (m.headingCount || 0),
  }), { wordCount: 0, headingCount: 0 });

  return {
    wordCount: sum.wordCount / metrics.length,
    headingCount: sum.headingCount / metrics.length,
  };
}

/**
 * Helper: Calculate average LLM score
 */
function calculateAverageLLMScore(metrics) {
  if (!metrics || metrics.length === 0) {
    return { servedScore: 0, renderedScore: 0 };
  }

  const sum = metrics.reduce((acc, m) => ({
    servedScore: acc.servedScore + (m.servedScore || 0),
    renderedScore: acc.renderedScore + (m.renderedScore || 0),
  }), { servedScore: 0, renderedScore: 0 });

  return {
    servedScore: sum.servedScore / metrics.length,
    renderedScore: sum.renderedScore / metrics.length,
  };
}

/**
 * Helper: Calculate percent change
 */
function calculatePercentChange(oldValue, newValue) {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Generates a trend report across multiple historical results
 * @param {string} outputDir - Output directory
 * @returns {Promise<Object>} Trend data
 */
export async function generateTrendData(outputDir) {
  const historicalResults = await loadHistoricalResults(outputDir);

  if (historicalResults.length < 2) {
    return null;
  }

  const trendData = {
    timestamps: historicalResults.map((r) => r.timestamp),
    performance: {
      loadTime: historicalResults.map((r) => {
        const metrics = r.results.performanceAnalysis || [];
        return calculateAverageMetrics(metrics).loadTime;
      }),
      lcp: historicalResults.map((r) => {
        const metrics = r.results.performanceAnalysis || [];
        return calculateAverageMetrics(metrics).largestContentfulPaint;
      }),
      fcp: historicalResults.map((r) => {
        const metrics = r.results.performanceAnalysis || [];
        return calculateAverageMetrics(metrics).firstContentfulPaint;
      }),
      cls: historicalResults.map((r) => {
        const metrics = r.results.performanceAnalysis || [];
        return calculateAverageMetrics(metrics).cumulativeLayoutShift;
      }),
    },
    accessibility: {
      totalIssues: historicalResults.map((r) => {
        const metrics = r.results.pa11y || [];
        return countAccessibilityIssues(metrics).total;
      }),
      errors: historicalResults.map((r) => {
        const metrics = r.results.pa11y || [];
        return countAccessibilityIssues(metrics).errors;
      }),
    },
    seo: {
      averageScore: historicalResults.map((r) => {
        const metrics = r.results.seoScores || [];
        return calculateAverageSeoScore(metrics);
      }),
    },
    llm: {
      servedScore: historicalResults.map((r) => {
        const metrics = r.results.llmMetrics || [];
        return calculateAverageLLMScore(metrics).servedScore;
      }),
      renderedScore: historicalResults.map((r) => {
        const metrics = r.results.llmMetrics || [];
        return calculateAverageLLMScore(metrics).renderedScore;
      }),
    },
    urlCount: historicalResults.map((r) => (r.results.urls || []).length),
  };

  return trendData;
}

/**
 * Establishes a baseline from a historical result
 * @param {string} outputDir - Output directory
 * @param {string} [timestamp] - Optional timestamp of result to use as baseline (defaults to latest)
 * @returns {Promise<string>} Path to baseline file
 */
export async function establishBaseline(outputDir, timestamp = null) {
  const historicalResults = await loadHistoricalResults(outputDir);

  if (historicalResults.length === 0) {
    throw new Error('No historical results found to establish baseline');
  }

  let baselineResult;
  if (timestamp) {
    baselineResult = historicalResults.find((r) => r.timestamp === timestamp);
    if (!baselineResult) {
      throw new Error(`No historical result found with timestamp: ${timestamp}`);
    }
  } else {
    baselineResult = historicalResults[historicalResults.length - 1];
  }

  const baselineFile = path.join(outputDir, 'baseline.json');
  await fs.writeFile(baselineFile, JSON.stringify(baselineResult));

  global.auditcore.logger.info(`Established baseline from ${baselineResult.timestamp}`);
  return baselineFile;
}

/**
 * Loads the baseline result
 * @param {string} outputDir - Output directory
 * @returns {Promise<Object|null>} Baseline result or null if not found
 */
export async function loadBaseline(outputDir) {
  const baselineFile = path.join(outputDir, 'baseline.json');

  try {
    const content = await fs.readFile(baselineFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    global.auditcore.logger.debug('No baseline found');
    return null;
  }
}

/**
 * Detects regressions by comparing current results against baseline
 * @param {Object} currentResults - Current analysis results
 * @param {string} outputDir - Output directory
 * @returns {Promise<Object>} Regression analysis with severity classification
 */
export async function detectRegressions(currentResults, outputDir) {
  const baseline = await loadBaseline(outputDir);

  if (!baseline) {
    return {
      hasBaseline: false,
      message: 'No baseline established. Run with --establish-baseline to set a baseline.',
      regressions: [],
    };
  }

  const comparison = compareResults(baseline.results, currentResults);
  const regressions = [];

  // Performance regressions
  checkPerformanceRegressions(comparison.performance, regressions);

  // Accessibility regressions
  checkAccessibilityRegressions(comparison.accessibility, regressions);

  // SEO regressions
  checkSeoRegressions(comparison.seo, regressions);

  // LLM suitability regressions
  checkLLMRegressions(comparison.llm, regressions);

  // URL count changes
  checkUrlCountChanges(comparison.urlCount, regressions);

  return {
    hasBaseline: true,
    baselineTimestamp: baseline.timestamp,
    currentTimestamp: new Date().toISOString(),
    regressions,
    hasCriticalRegressions: regressions.some((r) => r.severity === 'critical'),
    hasWarningRegressions: regressions.some((r) => r.severity === 'warning'),
  };
}

/**
 * Check for performance regressions
 */
function checkPerformanceRegressions(perfComparison, regressions) {
  const thresholds = {
    loadTime: { critical: 30, warning: 15 },
    largestContentfulPaint: { critical: 30, warning: 15 },
    firstContentfulPaint: { critical: 30, warning: 15 },
    cumulativeLayoutShift: { critical: 50, warning: 25 },
  };

  Object.entries(perfComparison).forEach(([metric, data]) => {
    if (data.percentChange > thresholds[metric].critical) {
      regressions.push({
        category: 'Performance',
        metric,
        severity: 'critical',
        oldValue: data.old.toFixed(2),
        newValue: data.new.toFixed(2),
        delta: data.delta.toFixed(2),
        percentChange: data.percentChange.toFixed(1),
        message: `${metric} increased by ${data.percentChange.toFixed(1)}% (${data.old.toFixed(2)}ms → ${data.new.toFixed(2)}ms)`,
      });
    } else if (data.percentChange > thresholds[metric].warning) {
      regressions.push({
        category: 'Performance',
        metric,
        severity: 'warning',
        oldValue: data.old.toFixed(2),
        newValue: data.new.toFixed(2),
        delta: data.delta.toFixed(2),
        percentChange: data.percentChange.toFixed(1),
        message: `${metric} increased by ${data.percentChange.toFixed(1)}% (${data.old.toFixed(2)}ms → ${data.new.toFixed(2)}ms)`,
      });
    }
  });
}

/**
 * Check for accessibility regressions
 */
function checkAccessibilityRegressions(a11yComparison, regressions) {
  const { totalIssues, errorCount } = a11yComparison;

  if (errorCount.delta > 0) {
    regressions.push({
      category: 'Accessibility',
      metric: 'errorCount',
      severity: 'critical',
      oldValue: errorCount.old,
      newValue: errorCount.new,
      delta: errorCount.delta,
      message: `Accessibility errors increased from ${errorCount.old} to ${errorCount.new} (+${errorCount.delta})`,
    });
  }

  if (totalIssues.delta > 10) {
    regressions.push({
      category: 'Accessibility',
      metric: 'totalIssues',
      severity: 'warning',
      oldValue: totalIssues.old,
      newValue: totalIssues.new,
      delta: totalIssues.delta,
      percentChange: totalIssues.percentChange.toFixed(1),
      message: `Total accessibility issues increased by ${totalIssues.percentChange.toFixed(1)}% (${totalIssues.old} → ${totalIssues.new})`,
    });
  }
}

/**
 * Check for SEO regressions
 */
function checkSeoRegressions(seoComparison, regressions) {
  const { averageScore } = seoComparison;

  if (averageScore.percentChange < -10) {
    regressions.push({
      category: 'SEO',
      metric: 'averageScore',
      severity: 'critical',
      oldValue: averageScore.old.toFixed(1),
      newValue: averageScore.new.toFixed(1),
      delta: averageScore.delta.toFixed(1),
      percentChange: averageScore.percentChange.toFixed(1),
      message: `SEO score decreased by ${Math.abs(averageScore.percentChange).toFixed(1)}% (${averageScore.old.toFixed(1)} → ${averageScore.new.toFixed(1)})`,
    });
  } else if (averageScore.percentChange < -5) {
    regressions.push({
      category: 'SEO',
      metric: 'averageScore',
      severity: 'warning',
      oldValue: averageScore.old.toFixed(1),
      newValue: averageScore.new.toFixed(1),
      delta: averageScore.delta.toFixed(1),
      percentChange: averageScore.percentChange.toFixed(1),
      message: `SEO score decreased by ${Math.abs(averageScore.percentChange).toFixed(1)}% (${averageScore.old.toFixed(1)} → ${averageScore.new.toFixed(1)})`,
    });
  }
}

/**
 * Check for LLM suitability regressions
 */
function checkLLMRegressions(llmComparison, regressions) {
  const { servedScore, renderedScore } = llmComparison;

  if (servedScore.percentChange < -10) {
    regressions.push({
      category: 'LLM Suitability',
      metric: 'servedScore',
      severity: 'critical',
      oldValue: servedScore.old.toFixed(1),
      newValue: servedScore.new.toFixed(1),
      delta: servedScore.delta.toFixed(1),
      percentChange: servedScore.percentChange.toFixed(1),
      message: `LLM served score decreased by ${Math.abs(servedScore.percentChange).toFixed(1)}% (${servedScore.old.toFixed(1)} → ${servedScore.new.toFixed(1)})`,
    });
  } else if (servedScore.percentChange < -5) {
    regressions.push({
      category: 'LLM Suitability',
      metric: 'servedScore',
      severity: 'warning',
      oldValue: servedScore.old.toFixed(1),
      newValue: servedScore.new.toFixed(1),
      delta: servedScore.delta.toFixed(1),
      percentChange: servedScore.percentChange.toFixed(1),
      message: `LLM served score decreased by ${Math.abs(servedScore.percentChange).toFixed(1)}% (${servedScore.old.toFixed(1)} → ${servedScore.new.toFixed(1)})`,
    });
  }

  if (renderedScore.percentChange < -10) {
    regressions.push({
      category: 'LLM Suitability',
      metric: 'renderedScore',
      severity: 'warning',
      oldValue: renderedScore.old.toFixed(1),
      newValue: renderedScore.new.toFixed(1),
      delta: renderedScore.delta.toFixed(1),
      percentChange: renderedScore.percentChange.toFixed(1),
      message: `LLM rendered score decreased by ${Math.abs(renderedScore.percentChange).toFixed(1)}% (${renderedScore.old.toFixed(1)} → ${renderedScore.new.toFixed(1)})`,
    });
  }
}

/**
 * Check for URL count changes
 */
function checkUrlCountChanges(urlCountComparison, regressions) {
  const { old: oldCount, new: newCount, delta } = urlCountComparison;

  if (Math.abs(delta) > oldCount * 0.2) {
    regressions.push({
      category: 'Site Structure',
      metric: 'urlCount',
      severity: 'info',
      oldValue: oldCount,
      newValue: newCount,
      delta,
      message: `URL count changed significantly from ${oldCount} to ${newCount} (${delta > 0 ? '+' : ''}${delta})`,
    });
  }
}

/**
 * Generates a regression report
 * @param {Object} regressionAnalysis - Regression analysis from detectRegressions()
 * @param {string} outputDir - Output directory
 * @returns {Promise<string>} Path to regression report
 */
export async function generateRegressionReport(regressionAnalysis, outputDir) {
  const reportPath = path.join(outputDir, 'regression_report.md');

  if (!regressionAnalysis.hasBaseline) {
    const content = `# Regression Report

${regressionAnalysis.message}

To establish a baseline, run the audit with historical tracking enabled and then use the \`--establish-baseline\` option.
`;
    await fs.writeFile(reportPath, content);
    return reportPath;
  }

  const {
    baselineTimestamp, currentTimestamp, regressions, hasCriticalRegressions, hasWarningRegressions,
  } = regressionAnalysis;

  let content = `# Regression Report

**Baseline**: ${new Date(baselineTimestamp).toLocaleString()}
**Current**: ${new Date(currentTimestamp).toLocaleString()}

`;

  // Summary section
  content += '## Summary\n\n';

  if (regressions.length === 0) {
    content += '✅ **No regressions detected** - All metrics are stable or improved compared to baseline.\n\n';
  } else {
    const criticalCount = regressions.filter((r) => r.severity === 'critical').length;
    const warningCount = regressions.filter((r) => r.severity === 'warning').length;
    const infoCount = regressions.filter((r) => r.severity === 'info').length;

    content += `**Total Regressions**: ${regressions.length}\n`;
    if (criticalCount > 0) content += `- 🚨 **Critical**: ${criticalCount}\n`;
    if (warningCount > 0) content += `- ⚠️ **Warning**: ${warningCount}\n`;
    if (infoCount > 0) content += `- ℹ️ **Info**: ${infoCount}\n`;
    content += '\n';

    if (hasCriticalRegressions) {
      content += '🚨 **Action Required**: Critical regressions detected. Immediate attention needed.\n\n';
    } else if (hasWarningRegressions) {
      content += '⚠️ **Review Recommended**: Warning-level regressions detected. Review and address soon.\n\n';
    }
  }

  // Critical regressions
  const criticalRegressions = regressions.filter((r) => r.severity === 'critical');
  if (criticalRegressions.length > 0) {
    content += '## 🚨 Critical Regressions\n\n';
    content += 'These require immediate attention:\n\n';

    criticalRegressions.forEach((regression) => {
      content += `### ${regression.category}: ${regression.metric}\n\n`;
      content += `${regression.message}\n\n`;
      content += '- **Severity**: Critical\n';
      content += `- **Old Value**: ${regression.oldValue}\n`;
      content += `- **New Value**: ${regression.newValue}\n`;
      content += `- **Change**: ${regression.delta}`;
      if (regression.percentChange) {
        content += ` (${regression.percentChange}%)`;
      }
      content += '\n\n';
    });
  }

  // Warning regressions
  const warningRegressions = regressions.filter((r) => r.severity === 'warning');
  if (warningRegressions.length > 0) {
    content += '## ⚠️ Warning Regressions\n\n';
    content += 'These should be reviewed and addressed:\n\n';

    warningRegressions.forEach((regression) => {
      content += `### ${regression.category}: ${regression.metric}\n\n`;
      content += `${regression.message}\n\n`;
      content += '- **Severity**: Warning\n';
      content += `- **Old Value**: ${regression.oldValue}\n`;
      content += `- **New Value**: ${regression.newValue}\n`;
      content += `- **Change**: ${regression.delta}`;
      if (regression.percentChange) {
        content += ` (${regression.percentChange}%)`;
      }
      content += '\n\n';
    });
  }

  // Info regressions
  const infoRegressions = regressions.filter((r) => r.severity === 'info');
  if (infoRegressions.length > 0) {
    content += '## ℹ️ Informational Changes\n\n';
    content += 'These are notable changes but may not require action:\n\n';

    infoRegressions.forEach((regression) => {
      content += `### ${regression.category}: ${regression.metric}\n\n`;
      content += `${regression.message}\n\n`;
      content += '- **Severity**: Info\n';
      content += `- **Old Value**: ${regression.oldValue}\n`;
      content += `- **New Value**: ${regression.newValue}\n`;
      content += `- **Change**: ${regression.delta}\n\n`;
    });
  }

  // Recommendations section
  if (regressions.length > 0) {
    content += '## Recommended Actions\n\n';

    if (hasCriticalRegressions) {
      content += '### Immediate Actions\n\n';
      content += '1. Review the critical regressions above\n';
      content += '2. Identify the changes that caused these regressions\n';
      content += '3. Implement fixes or rollback problematic changes\n';
      content += '4. Re-run the audit to verify fixes\n\n';
    }

    if (hasWarningRegressions) {
      content += '### Short-Term Actions\n\n';
      content += '1. Schedule time to investigate warning-level regressions\n';
      content += '2. Determine if changes are intentional or need correction\n';
      content += '3. Plan fixes for unintentional regressions\n';
      content += '4. Update baseline if changes are intentional improvements elsewhere\n\n';
    }

    content += '### General Recommendations\n\n';
    content += '1. Run audits regularly to catch regressions early\n';
    content += '2. Establish baselines after major releases\n';
    content += '3. Integrate regression detection into CI/CD pipeline\n';
    content += '4. Set up alerts for critical regressions\n\n';
  }

  await fs.writeFile(reportPath, content);
  global.auditcore.logger.info(`Generated regression report: ${reportPath}`);

  return reportPath;
}
