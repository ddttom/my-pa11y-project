import fs from 'fs/promises';
import path from 'path';

/**
 * Generates an executive summary report with high-level insights
 * @param {Object} results - Analysis results
 * @param {string} outputDir - Output directory
 * @param {Object} comparison - Optional comparison with previous run
 */
export async function generateExecutiveSummary(results, outputDir, comparison = null) {
  try {
    global.auditcore.logger.info('Generating executive summary report...');

    const summary = buildExecutiveSummary(results, comparison);

    // Generate both markdown and JSON formats
    const mdPath = path.join(outputDir, 'executive_summary.md');
    const jsonPath = path.join(outputDir, 'executive_summary.json');

    await fs.writeFile(mdPath, generateMarkdownSummary(summary));
    await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2));

    global.auditcore.logger.info('Executive summary report generated successfully');
  } catch (error) {
    global.auditcore.logger.error('Error generating executive summary:', error);
    throw error;
  }
}

/**
 * Builds the executive summary data structure
 */
function buildExecutiveSummary(results, comparison) {
  const summary = {
    generatedAt: new Date().toISOString(),
    site: extractSiteName(results),
    overview: buildOverview(results),
    performance: buildPerformanceSummary(results, comparison?.performance),
    accessibility: buildAccessibilitySummary(results, comparison?.accessibility),
    seo: buildSeoSummary(results, comparison?.seo),
    content: buildContentSummary(results, comparison?.content),
    llmSuitability: buildLLMSummary(results, comparison?.llm),
    keyFindings: buildKeyFindings(results),
    recommendations: buildRecommendations(results),
    comparison: comparison ? buildComparisonSummary(comparison) : null,
  };

  return summary;
}

/**
 * Extract site name from results
 */
function extractSiteName(results) {
  if (results.urls && results.urls.length > 0) {
    try {
      const url = new URL(results.urls[0].url);
      return url.hostname;
    } catch {
      return 'Unknown Site';
    }
  }
  return 'Unknown Site';
}

/**
 * Build overview section
 */
function buildOverview(results) {
  return {
    totalPages: (results.urls || []).length,
    analysisDate: new Date().toISOString().split('T')[0],
    schemaVersion: results.schemaVersion || '1.0.0',
  };
}

/**
 * Build performance summary
 */
function buildPerformanceSummary(results, comparisonData) {
  const metrics = results.performanceAnalysis || [];

  if (metrics.length === 0) {
    return { status: 'No data', score: 0 };
  }

  const avgLoadTime = average(metrics.map((m) => m.loadTime || 0));
  const avgLCP = average(metrics.map((m) => m.largestContentfulPaint || 0));
  const avgFCP = average(metrics.map((m) => m.firstContentfulPaint || 0));
  const avgCLS = average(metrics.map((m) => m.cumulativeLayoutShift || 0));

  // Score based on thresholds
  let score = 0;
  if (avgLoadTime < 1000) score += 25;
  else if (avgLoadTime < 2000) score += 20;
  else if (avgLoadTime < 3000) score += 15;

  if (avgLCP < 2500) score += 25;
  else if (avgLCP < 4000) score += 15;

  if (avgFCP < 1800) score += 25;
  else if (avgFCP < 3000) score += 15;

  if (avgCLS < 0.1) score += 25;
  else if (avgCLS < 0.25) score += 15;

  const status = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 25 ? 'Fair' : 'Needs Improvement';

  const summary = {
    status,
    score,
    averageLoadTime: Math.round(avgLoadTime),
    averageLCP: Math.round(avgLCP),
    averageFCP: Math.round(avgFCP),
    averageCLS: avgCLS.toFixed(3),
  };

  if (comparisonData) {
    summary.trend = {
      loadTime: comparisonData.loadTime.percentChange,
      lcp: comparisonData.largestContentfulPaint.percentChange,
    };
  }

  return summary;
}

/**
 * Build accessibility summary
 */
function buildAccessibilitySummary(results, comparisonData) {
  const metrics = results.pa11y || [];

  let totalIssues = 0;
  let errors = 0;
  let warnings = 0;
  let notices = 0;

  metrics.forEach((m) => {
    if (m.issues) {
      m.issues.forEach((issue) => {
        totalIssues++;
        if (issue.type === 'error') errors++;
        else if (issue.type === 'warning') warnings++;
        else if (issue.type === 'notice') notices++;
      });
    }
  });

  // Score: 100 points, deduct based on issues
  let score = 100;
  score -= errors * 5; // -5 per error
  score -= warnings * 2; // -2 per warning
  score -= notices * 0.5; // -0.5 per notice
  score = Math.max(0, score);

  const status = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Critical';

  const summary = {
    status,
    score: Math.round(score),
    totalIssues,
    errors,
    warnings,
    notices,
    averageIssuesPerPage: metrics.length > 0 ? (totalIssues / metrics.length).toFixed(1) : 0,
  };

  if (comparisonData) {
    summary.trend = {
      totalIssues: comparisonData.totalIssues.delta,
      percentChange: comparisonData.totalIssues.percentChange,
    };
  }

  return summary;
}

/**
 * Build SEO summary
 */
function buildSeoSummary(results, comparisonData) {
  const metrics = results.seoScores || [];

  if (metrics.length === 0) {
    return { status: 'No data', score: 0 };
  }

  const avgScore = average(metrics.map((m) => m.totalScore || 0));
  const status = avgScore >= 90 ? 'Excellent' : avgScore >= 80 ? 'Very Good' : avgScore >= 70 ? 'Good' : avgScore >= 60 ? 'Fair' : 'Needs Improvement';

  const summary = {
    status,
    score: Math.round(avgScore),
    pagesAnalyzed: metrics.length,
  };

  if (comparisonData) {
    summary.trend = {
      score: comparisonData.averageScore.delta,
      percentChange: comparisonData.averageScore.percentChange,
    };
  }

  return summary;
}

/**
 * Build content summary
 */
function buildContentSummary(results, comparisonData) {
  const metrics = results.contentAnalysis || [];

  if (metrics.length === 0) {
    return { status: 'No data' };
  }

  const avgWordCount = average(metrics.map((m) => m.wordCount || 0));
  const avgHeadings = average(metrics.map((m) => m.headingCount || 0));
  const pagesWithLowContent = metrics.filter((m) => (m.wordCount || 0) < 300).length;

  const summary = {
    averageWordCount: Math.round(avgWordCount),
    averageHeadings: avgHeadings.toFixed(1),
    pagesWithLowContent,
    lowContentPercentage: ((pagesWithLowContent / metrics.length) * 100).toFixed(1),
  };

  if (comparisonData) {
    summary.trend = {
      wordCount: comparisonData.wordCount.percentChange,
    };
  }

  return summary;
}

/**
 * Build LLM suitability summary
 */
function buildLLMSummary(results, comparisonData) {
  const metrics = results.llmMetrics || [];

  if (metrics.length === 0) {
    return { status: 'No data', servedScore: 0, renderedScore: 0 };
  }

  const avgServedScore = average(metrics.map((m) => m.servedScore || 0));
  const avgRenderedScore = average(metrics.map((m) => m.renderedScore || 0));

  const status = avgServedScore >= 70 ? 'Good' : avgServedScore >= 50 ? 'Fair' : 'Needs Improvement';

  const summary = {
    status,
    servedScore: Math.round(avgServedScore),
    renderedScore: Math.round(avgRenderedScore),
    pagesWithLLMsTxt: metrics.filter((m) => m.hasLlmsTxt).length,
  };

  if (comparisonData) {
    summary.trend = {
      servedScore: comparisonData.servedScore.percentChange,
      renderedScore: comparisonData.renderedScore.percentChange,
    };
  }

  return summary;
}

/**
 * Build key findings section
 */
function buildKeyFindings(results) {
  const findings = [];

  // Performance findings
  const perfMetrics = results.performanceAnalysis || [];
  if (perfMetrics.length > 0) {
    const avgLoadTime = average(perfMetrics.map((m) => m.loadTime || 0));
    if (avgLoadTime > 3000) {
      findings.push({
        category: 'Performance',
        severity: 'High',
        finding: `Average load time of ${Math.round(avgLoadTime)}ms exceeds recommended threshold of 3000ms`,
      });
    }
  }

  // Accessibility findings
  const a11yMetrics = results.pa11y || [];
  let criticalErrors = 0;
  a11yMetrics.forEach((m) => {
    if (m.issues) {
      criticalErrors += m.issues.filter((i) => i.type === 'error').length;
    }
  });
  if (criticalErrors > 0) {
    findings.push({
      category: 'Accessibility',
      severity: 'Critical',
      finding: `${criticalErrors} critical accessibility errors found across site`,
    });
  }

  // SEO findings
  const seoMetrics = results.seoScores || [];
  if (seoMetrics.length > 0) {
    const avgScore = average(seoMetrics.map((m) => m.totalScore || 0));
    if (avgScore < 70) {
      findings.push({
        category: 'SEO',
        severity: 'Medium',
        finding: `Average SEO score of ${Math.round(avgScore)} is below recommended threshold of 70`,
      });
    }
  }

  // Content findings
  const contentMetrics = results.contentAnalysis || [];
  const lowContentPages = contentMetrics.filter((m) => (m.wordCount || 0) < 300).length;
  if (lowContentPages > contentMetrics.length * 0.2) {
    findings.push({
      category: 'Content',
      severity: 'Medium',
      finding: `${lowContentPages} pages (${((lowContentPages / contentMetrics.length) * 100).toFixed(0)}%) have insufficient content (<300 words)`,
    });
  }

  // LLM findings
  const llmMetrics = results.llmMetrics || [];
  const pagesWithoutLLMsTxt = llmMetrics.filter((m) => !m.hasLlmsTxt).length;
  if (pagesWithoutLLMsTxt === llmMetrics.length && llmMetrics.length > 0) {
    findings.push({
      category: 'LLM Suitability',
      severity: 'Low',
      finding: 'No llms.txt file detected - consider adding for better AI agent compatibility',
    });
  }

  return findings;
}

/**
 * Build recommendations section
 */
function buildRecommendations(results) {
  const recommendations = [];

  // Performance recommendations
  const perfMetrics = results.performanceAnalysis || [];
  if (perfMetrics.length > 0) {
    const avgLCP = average(perfMetrics.map((m) => m.largestContentfulPaint || 0));
    if (avgLCP > 2500) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        recommendation: 'Optimize Largest Contentful Paint by optimizing images and reducing render-blocking resources',
      });
    }
  }

  // Accessibility recommendations
  const a11yMetrics = results.pa11y || [];
  let hasErrors = false;
  a11yMetrics.forEach((m) => {
    if (m.issues && m.issues.some((i) => i.type === 'error')) {
      hasErrors = true;
    }
  });
  if (hasErrors) {
    recommendations.push({
      category: 'Accessibility',
      priority: 'Critical',
      recommendation: 'Address critical WCAG errors immediately to ensure site accessibility for all users',
    });
  }

  // SEO recommendations
  const seoMetrics = results.seoScores || [];
  const pagesWithoutMeta = seoMetrics.filter((m) => !m.metaDescription || m.metaDescription.length === 0).length;
  if (pagesWithoutMeta > 0) {
    recommendations.push({
      category: 'SEO',
      priority: 'Medium',
      recommendation: `Add meta descriptions to ${pagesWithoutMeta} pages to improve search engine visibility`,
    });
  }

  // Content recommendations
  const contentMetrics = results.contentAnalysis || [];
  const lowContentPages = contentMetrics.filter((m) => (m.wordCount || 0) < 300).length;
  if (lowContentPages > 0) {
    recommendations.push({
      category: 'Content',
      priority: 'Medium',
      recommendation: `Expand content on ${lowContentPages} pages to improve SEO and user experience`,
    });
  }

  // LLM recommendations
  const llmMetrics = results.llmMetrics || [];
  const avgServedScore = average(llmMetrics.map((m) => m.servedScore || 0));
  if (avgServedScore < 50) {
    recommendations.push({
      category: 'LLM Suitability',
      priority: 'Low',
      recommendation: 'Improve semantic HTML structure and add structured data for better AI agent compatibility',
    });
  }

  return recommendations;
}

/**
 * Build comparison summary
 */
function buildComparisonSummary(comparison) {
  const improvements = [];
  const regressions = [];

  // Check performance changes
  if (comparison.performance) {
    if (comparison.performance.loadTime.percentChange < -5) {
      improvements.push(`Load time improved by ${Math.abs(comparison.performance.loadTime.percentChange).toFixed(1)}%`);
    } else if (comparison.performance.loadTime.percentChange > 5) {
      regressions.push(`Load time regressed by ${comparison.performance.loadTime.percentChange.toFixed(1)}%`);
    }
  }

  // Check accessibility changes
  if (comparison.accessibility) {
    if (comparison.accessibility.totalIssues.delta < 0) {
      improvements.push(`Accessibility issues reduced by ${Math.abs(comparison.accessibility.totalIssues.delta)}`);
    } else if (comparison.accessibility.totalIssues.delta > 0) {
      regressions.push(`Accessibility issues increased by ${comparison.accessibility.totalIssues.delta}`);
    }
  }

  // Check SEO changes
  if (comparison.seo) {
    if (comparison.seo.averageScore.delta > 2) {
      improvements.push(`SEO score improved by ${comparison.seo.averageScore.delta.toFixed(1)} points`);
    } else if (comparison.seo.averageScore.delta < -2) {
      regressions.push(`SEO score decreased by ${Math.abs(comparison.seo.averageScore.delta).toFixed(1)} points`);
    }
  }

  return {
    improvements,
    regressions,
    urlCountChange: comparison.urlCount.delta,
  };
}

/**
 * Generate markdown format of the summary
 */
function generateMarkdownSummary(summary) {
  let md = '# Executive Summary\n\n';
  md += `**Site:** ${summary.site}\n`;
  md += `**Generated:** ${new Date(summary.generatedAt).toLocaleString()}\n`;
  md += `**Pages Analyzed:** ${summary.overview.totalPages}\n\n`;

  md += '---\n\n';

  // Overview
  md += '## Overall Status\n\n';
  md += '| Category | Status | Score |\n';
  md += '|----------|--------|-------|\n';
  md += `| Performance | ${summary.performance.status} | ${summary.performance.score}/100 |\n`;
  md += `| Accessibility | ${summary.accessibility.status} | ${summary.accessibility.score}/100 |\n`;
  md += `| SEO | ${summary.seo.status} | ${summary.seo.score}/100 |\n`;
  md += `| LLM Suitability | ${summary.llmSuitability.status} | ${summary.llmSuitability.servedScore}/100 |\n\n`;

  // Performance details
  md += '## Performance\n\n';
  md += `- **Status:** ${summary.performance.status}\n`;
  md += `- **Average Load Time:** ${summary.performance.averageLoadTime}ms\n`;
  md += `- **Average LCP:** ${summary.performance.averageLCP}ms\n`;
  md += `- **Average FCP:** ${summary.performance.averageFCP}ms\n`;
  md += `- **Average CLS:** ${summary.performance.averageCLS}\n`;
  if (summary.performance.trend) {
    md += `- **Trend:** ${summary.performance.trend.loadTime > 0 ? '📈' : '📉'} ${summary.performance.trend.loadTime.toFixed(1)}% change in load time\n`;
  }
  md += '\n';

  // Accessibility details
  md += '## Accessibility\n\n';
  md += `- **Status:** ${summary.accessibility.status}\n`;
  md += `- **Total Issues:** ${summary.accessibility.totalIssues}\n`;
  md += `- **Errors:** ${summary.accessibility.errors}\n`;
  md += `- **Warnings:** ${summary.accessibility.warnings}\n`;
  md += `- **Notices:** ${summary.accessibility.notices}\n`;
  md += `- **Average Issues Per Page:** ${summary.accessibility.averageIssuesPerPage}\n`;
  if (summary.accessibility.trend) {
    md += `- **Trend:** ${summary.accessibility.trend.totalIssues < 0 ? '✅' : '⚠️'} ${summary.accessibility.trend.totalIssues} issues (${summary.accessibility.trend.percentChange.toFixed(1)}%)\n`;
  }
  md += '\n';

  // SEO details
  md += '## SEO\n\n';
  md += `- **Status:** ${summary.seo.status}\n`;
  md += `- **Average Score:** ${summary.seo.score}/100\n`;
  md += `- **Pages Analyzed:** ${summary.seo.pagesAnalyzed}\n`;
  if (summary.seo.trend) {
    md += `- **Trend:** ${summary.seo.trend.score > 0 ? '📈' : '📉'} ${summary.seo.trend.score.toFixed(1)} points (${summary.seo.trend.percentChange.toFixed(1)}%)\n`;
  }
  md += '\n';

  // Content details
  md += '## Content Quality\n\n';
  md += `- **Average Word Count:** ${summary.content.averageWordCount}\n`;
  md += `- **Average Headings:** ${summary.content.averageHeadings}\n`;
  md += `- **Pages with Low Content:** ${summary.content.pagesWithLowContent} (${summary.content.lowContentPercentage}%)\n`;
  if (summary.content.trend) {
    md += `- **Trend:** ${summary.content.trend.wordCount > 0 ? '📈' : '📉'} ${summary.content.trend.wordCount.toFixed(1)}% change in word count\n`;
  }
  md += '\n';

  // LLM Suitability details
  md += '## LLM Agent Suitability\n\n';
  md += `- **Status:** ${summary.llmSuitability.status}\n`;
  md += `- **Served Score:** ${summary.llmSuitability.servedScore}/100\n`;
  md += `- **Rendered Score:** ${summary.llmSuitability.renderedScore}/100\n`;
  md += `- **Pages with llms.txt:** ${summary.llmSuitability.pagesWithLLMsTxt}\n`;
  if (summary.llmSuitability.trend) {
    md += `- **Trend (Served):** ${summary.llmSuitability.trend.servedScore > 0 ? '📈' : '📉'} ${summary.llmSuitability.trend.servedScore.toFixed(1)}%\n`;
  }
  md += '\n';

  // Key findings
  if (summary.keyFindings.length > 0) {
    md += '## Key Findings\n\n';
    summary.keyFindings.forEach((finding, i) => {
      const icon = finding.severity === 'Critical' ? '🔴' : finding.severity === 'High' ? '🟠' : finding.severity === 'Medium' ? '🟡' : '🔵';
      md += `${i + 1}. ${icon} **${finding.category}** (${finding.severity}): ${finding.finding}\n`;
    });
    md += '\n';
  }

  // Recommendations
  if (summary.recommendations.length > 0) {
    md += '## Recommendations\n\n';
    summary.recommendations.forEach((rec, i) => {
      const icon = rec.priority === 'Critical' ? '🔴' : rec.priority === 'High' ? '🟠' : rec.priority === 'Medium' ? '🟡' : '🔵';
      md += `${i + 1}. ${icon} **${rec.category}** (${rec.priority}): ${rec.recommendation}\n`;
    });
    md += '\n';
  }

  // Comparison summary
  if (summary.comparison) {
    md += '## Comparison with Previous Run\n\n';
    if (summary.comparison.improvements.length > 0) {
      md += '### ✅ Improvements\n\n';
      summary.comparison.improvements.forEach((imp) => {
        md += `- ${imp}\n`;
      });
      md += '\n';
    }
    if (summary.comparison.regressions.length > 0) {
      md += '### ⚠️ Regressions\n\n';
      summary.comparison.regressions.forEach((reg) => {
        md += `- ${reg}\n`;
      });
      md += '\n';
    }
    if (summary.comparison.urlCountChange !== 0) {
      md += `**URL Count Change:** ${summary.comparison.urlCountChange > 0 ? '+' : ''}${summary.comparison.urlCountChange} pages\n\n`;
    }
  }

  md += '---\n\n';
  md += `*Generated by Web Audit Suite v${summary.overview.schemaVersion}*\n`;

  return md;
}

/**
 * Helper: Calculate average of array
 */
function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}
