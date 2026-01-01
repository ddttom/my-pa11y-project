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

  await fs.writeFile(historyFile, JSON.stringify(historicalEntry, null, 2));
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
