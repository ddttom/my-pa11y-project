import fs from 'fs/promises';
import path from 'path';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { generateTrendData } from '../historicalComparison.js';
import { passFailThresholds } from '../../config/options.js';

/**
 * Generates an interactive HTML dashboard with embedded charts
 * @param {Object} results - Analysis results
 * @param {string} outputDir - Output directory
 * @param {Object} comparison - Optional comparison data
 * @param {Object} trendData - Optional trend data from historical runs
 */
export async function generateDashboard(results, outputDir, comparison = null, trendData = null) {
  try {
    global.auditcore.logger.info('Generating HTML dashboard...');

    // Generate chart images
    const charts = await generateCharts(results, trendData);

    // Build HTML dashboard
    const html = buildDashboardHTML(results, comparison, charts, trendData);

    // Write dashboard to file
    const dashboardPath = path.join(outputDir, 'dashboard.html');
    await fs.writeFile(dashboardPath, html);

    global.auditcore.logger.info(`Dashboard generated: ${dashboardPath}`);
  } catch (error) {
    global.auditcore.logger.error('Error generating dashboard:', error);
    throw error;
  }
}

/**
 * Generates chart images using Chart.js
 */
async function generateCharts(results, trendData) {
  const width = 800;
  const height = 400;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });

  const charts = {};

  try {
    // Performance overview chart
    charts.performance = await generatePerformanceChart(chartJSNodeCanvas, results);

    // Accessibility issues chart
    charts.accessibility = await generateAccessibilityChart(chartJSNodeCanvas, results);

    // SEO score distribution chart
    charts.seoDistribution = await generateSeoDistributionChart(chartJSNodeCanvas, results);

    // Content metrics chart
    charts.content = await generateContentChart(chartJSNodeCanvas, results);

    // LLM suitability chart
    charts.llm = await generateLLMChart(chartJSNodeCanvas, results);

    // Trend charts if historical data available
    if (trendData && trendData.timestamps.length >= 2) {
      charts.performanceTrend = await generatePerformanceTrendChart(chartJSNodeCanvas, trendData);
      charts.accessibilityTrend = await generateAccessibilityTrendChart(chartJSNodeCanvas, trendData);
    }
  } catch (error) {
    global.auditcore.logger.warn('Error generating some charts:', error.message);
  }

  return charts;
}

/**
 * Generate performance metrics chart
 */
async function generatePerformanceChart(canvas, results) {
  const metrics = results.performanceAnalysis || [];

  if (metrics.length === 0) return null;

  const avgLoadTime = average(metrics.map(m => m.loadTime || 0));
  const avgLCP = average(metrics.map(m => m.largestContentfulPaint || 0));
  const avgFCP = average(metrics.map(m => m.firstContentfulPaint || 0));
  const avgTTI = average(metrics.map(m => m.timeToInteractive || 0));

  const configuration = {
    type: 'bar',
    data: {
      labels: ['Load Time', 'LCP', 'FCP', 'TTI'],
      datasets: [{
        label: 'Performance Metrics (ms)',
        data: [avgLoadTime, avgLCP, avgFCP, avgTTI],
        backgroundColor: [
          getStatusColor(avgLoadTime, passFailThresholds.performance.loadTime),
          getStatusColor(avgLCP, passFailThresholds.performance.lcp),
          getStatusColor(avgFCP, passFailThresholds.performance.fcp),
          getStatusColor(avgTTI, passFailThresholds.performance.tti)
        ]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Performance Metrics Overview',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Milliseconds'
          }
        }
      }
    }
  };

  const buffer = await canvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generate accessibility issues chart
 */
async function generateAccessibilityChart(canvas, results) {
  const metrics = results.pa11y || [];

  if (metrics.length === 0) return null;

  let errors = 0, warnings = 0, notices = 0;
  metrics.forEach(m => {
    if (m.issues) {
      m.issues.forEach(issue => {
        if (issue.type === 'error') errors++;
        else if (issue.type === 'warning') warnings++;
        else if (issue.type === 'notice') notices++;
      });
    }
  });

  const configuration = {
    type: 'pie',
    data: {
      labels: ['Errors', 'Warnings', 'Notices'],
      datasets: [{
        data: [errors, warnings, notices],
        backgroundColor: ['#dc3545', '#ffc107', '#17a2b8']
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Accessibility Issues Breakdown',
          font: { size: 16 }
        },
        legend: {
          position: 'bottom'
        }
      }
    }
  };

  const buffer = await canvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generate SEO score distribution chart
 */
async function generateSeoDistributionChart(canvas, results) {
  const metrics = results.seoScores || [];

  if (metrics.length === 0) return null;

  // Group by score ranges
  const ranges = {
    '90-100': 0,
    '80-89': 0,
    '70-79': 0,
    '60-69': 0,
    '<60': 0
  };

  metrics.forEach(m => {
    const score = m.totalScore || 0;
    if (score >= 90) ranges['90-100']++;
    else if (score >= 80) ranges['80-89']++;
    else if (score >= 70) ranges['70-79']++;
    else if (score >= 60) ranges['60-69']++;
    else ranges['<60']++;
  });

  const configuration = {
    type: 'bar',
    data: {
      labels: Object.keys(ranges),
      datasets: [{
        label: 'Number of Pages',
        data: Object.values(ranges),
        backgroundColor: ['#28a745', '#5cb85c', '#f0ad4e', '#ec971f', '#d9534f']
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'SEO Score Distribution',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Pages'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Score Range'
          }
        }
      }
    }
  };

  const buffer = await canvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generate content metrics chart
 */
async function generateContentChart(canvas, results) {
  const metrics = results.contentAnalysis || [];

  if (metrics.length === 0) return null;

  const avgWordCount = average(metrics.map(m => m.wordCount || 0));
  const avgHeadings = average(metrics.map(m => m.headingCount || 0));
  const avgParagraphs = average(metrics.map(m => m.paragraphCount || 0));

  const configuration = {
    type: 'bar',
    data: {
      labels: ['Avg Word Count', 'Avg Headings', 'Avg Paragraphs'],
      datasets: [{
        label: 'Content Metrics',
        data: [avgWordCount, avgHeadings, avgParagraphs],
        backgroundColor: ['#007bff', '#6610f2', '#6f42c1']
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Content Quality Metrics',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };

  const buffer = await canvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generate LLM suitability chart
 */
async function generateLLMChart(canvas, results) {
  const metrics = results.llmMetrics || [];

  if (metrics.length === 0) return null;

  const avgServedScore = average(metrics.map(m => m.servedScore || 0));
  const avgRenderedScore = average(metrics.map(m => m.renderedScore || 0));

  const configuration = {
    type: 'bar',
    data: {
      labels: ['Served Score', 'Rendered Score'],
      datasets: [{
        label: 'LLM Suitability Score',
        data: [avgServedScore, avgRenderedScore],
        backgroundColor: [
          getStatusColor(avgServedScore, passFailThresholds.llm.minServedScore, true),
          getStatusColor(avgRenderedScore, passFailThresholds.llm.minRenderedScore, true)
        ]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'AI Agent Compatibility Scores',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Score (0-100)'
          }
        }
      }
    }
  };

  const buffer = await canvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generate performance trend chart
 */
async function generatePerformanceTrendChart(canvas, trendData) {
  const labels = trendData.timestamps.map(t => new Date(t).toLocaleDateString());

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Load Time (ms)',
          data: trendData.performance.loadTime,
          borderColor: '#007bff',
          fill: false
        },
        {
          label: 'LCP (ms)',
          data: trendData.performance.lcp,
          borderColor: '#28a745',
          fill: false
        },
        {
          label: 'FCP (ms)',
          data: trendData.performance.fcp,
          borderColor: '#ffc107',
          fill: false
        }
      ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Performance Metrics Trend',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Milliseconds'
          }
        }
      }
    }
  };

  const buffer = await canvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generate accessibility trend chart
 */
async function generateAccessibilityTrendChart(canvas, trendData) {
  const labels = trendData.timestamps.map(t => new Date(t).toLocaleDateString());

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Issues',
          data: trendData.accessibility.totalIssues,
          borderColor: '#dc3545',
          fill: false
        },
        {
          label: 'Errors',
          data: trendData.accessibility.errors,
          borderColor: '#bd2130',
          fill: false
        }
      ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Accessibility Issues Trend',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Issue Count'
          }
        }
      }
    }
  };

  const buffer = await canvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Build the complete HTML dashboard
 */
function buildDashboardHTML(results, comparison, charts, trendData) {
  const siteName = extractSiteName(results);
  const timestamp = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Audit Dashboard - ${siteName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f7fa;
      color: #2c3e50;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 1.2em;
      opacity: 0.9;
    }
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      border-radius: 10px;
      padding: 25px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .card-header {
      font-size: 1.2em;
      font-weight: 600;
      margin-bottom: 15px;
      color: #2c3e50;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 12px 0;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 5px;
    }
    .metric-label {
      font-weight: 500;
    }
    .metric-value {
      font-size: 1.3em;
      font-weight: 700;
    }
    .status-excellent { color: #28a745; }
    .status-good { color: #5cb85c; }
    .status-fair { color: #ffc107; }
    .status-poor { color: #dc3545; }
    .chart-container {
      background: white;
      border-radius: 10px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .chart-container img {
      width: 100%;
      height: auto;
      border-radius: 5px;
    }
    .comparison-section {
      background: white;
      border-radius: 10px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .trend-up { color: #28a745; }
    .trend-down { color: #dc3545; }
    .trend-neutral { color: #6c757d; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #495057;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .badge-pass { background: #d4edda; color: #155724; }
    .badge-warn { background: #fff3cd; color: #856404; }
    .badge-fail { background: #f8d7da; color: #721c24; }
    footer {
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-size: 0.9em;
    }
    .section-title {
      font-size: 1.8em;
      margin: 30px 0 20px 0;
      color: #2c3e50;
      border-left: 4px solid #667eea;
      padding-left: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Web Audit Dashboard</h1>
      <div class="subtitle">${siteName}</div>
      <div style="margin-top: 10px; opacity: 0.8;">Generated: ${new Date(timestamp).toLocaleString()}</div>
    </header>

    ${buildOverviewSection(results)}
    ${buildChartsSection(charts, trendData)}
    ${comparison ? buildComparisonSection(comparison) : ''}
    ${buildDetailedMetricsSection(results)}

    <footer>
      Generated by Web Audit Suite | ${new Date().getFullYear()}
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Build overview section
 */
function buildOverviewSection(results) {
  const perf = calculatePerformanceOverview(results);
  const a11y = calculateAccessibilityOverview(results);
  const seo = calculateSeoOverview(results);
  const llm = calculateLLMOverview(results);

  return `
    <h2 class="section-title">Overview</h2>
    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">Performance</div>
        <div class="metric">
          <span class="metric-label">Status</span>
          <span class="metric-value ${getStatusClass(perf.status)}">${perf.status}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Load Time</span>
          <span class="metric-value">${perf.avgLoadTime}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg LCP</span>
          <span class="metric-value">${perf.avgLCP}ms</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">Accessibility</div>
        <div class="metric">
          <span class="metric-label">Status</span>
          <span class="metric-value ${getStatusClass(a11y.status)}">${a11y.status}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Total Issues</span>
          <span class="metric-value">${a11y.totalIssues}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Errors</span>
          <span class="metric-value status-poor">${a11y.errors}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">SEO</div>
        <div class="metric">
          <span class="metric-label">Status</span>
          <span class="metric-value ${getStatusClass(seo.status)}">${seo.status}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Score</span>
          <span class="metric-value">${seo.avgScore}/100</span>
        </div>
        <div class="metric">
          <span class="metric-label">Pages</span>
          <span class="metric-value">${seo.pageCount}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">LLM Suitability</div>
        <div class="metric">
          <span class="metric-label">Status</span>
          <span class="metric-value ${getStatusClass(llm.status)}">${llm.status}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Served Score</span>
          <span class="metric-value">${llm.servedScore}/100</span>
        </div>
        <div class="metric">
          <span class="metric-label">Rendered Score</span>
          <span class="metric-value">${llm.renderedScore}/100</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Build charts section
 */
function buildChartsSection(charts, trendData) {
  let html = '<h2 class="section-title">Visual Analytics</h2>';

  if (charts.performance) {
    html += `<div class="chart-container"><img src="${charts.performance}" alt="Performance Chart"></div>`;
  }

  if (charts.accessibility) {
    html += `<div class="chart-container"><img src="${charts.accessibility}" alt="Accessibility Chart"></div>`;
  }

  if (charts.seoDistribution) {
    html += `<div class="chart-container"><img src="${charts.seoDistribution}" alt="SEO Distribution Chart"></div>`;
  }

  if (charts.content) {
    html += `<div class="chart-container"><img src="${charts.content}" alt="Content Chart"></div>`;
  }

  if (charts.llm) {
    html += `<div class="chart-container"><img src="${charts.llm}" alt="LLM Suitability Chart"></div>`;
  }

  if (trendData && charts.performanceTrend) {
    html += '<h2 class="section-title">Historical Trends</h2>';
    html += `<div class="chart-container"><img src="${charts.performanceTrend}" alt="Performance Trend"></div>`;
  }

  if (trendData && charts.accessibilityTrend) {
    html += `<div class="chart-container"><img src="${charts.accessibilityTrend}" alt="Accessibility Trend"></div>`;
  }

  return html;
}

/**
 * Build comparison section
 */
function buildComparisonSection(comparison) {
  if (!comparison) return '';

  return `
    <h2 class="section-title">Comparison with Previous Run</h2>
    <div class="comparison-section">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Previous</th>
            <th>Current</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Avg Load Time</td>
            <td>${Math.round(comparison.performance.loadTime.old)}ms</td>
            <td>${Math.round(comparison.performance.loadTime.new)}ms</td>
            <td class="${comparison.performance.loadTime.delta < 0 ? 'trend-up' : 'trend-down'}">
              ${comparison.performance.loadTime.delta > 0 ? '+' : ''}${Math.round(comparison.performance.loadTime.delta)}ms
              (${comparison.performance.loadTime.percentChange.toFixed(1)}%)
            </td>
          </tr>
          <tr>
            <td>Accessibility Issues</td>
            <td>${comparison.accessibility.totalIssues.old}</td>
            <td>${comparison.accessibility.totalIssues.new}</td>
            <td class="${comparison.accessibility.totalIssues.delta < 0 ? 'trend-up' : 'trend-down'}">
              ${comparison.accessibility.totalIssues.delta > 0 ? '+' : ''}${comparison.accessibility.totalIssues.delta}
              (${comparison.accessibility.totalIssues.percentChange.toFixed(1)}%)
            </td>
          </tr>
          <tr>
            <td>SEO Score</td>
            <td>${comparison.seo.averageScore.old.toFixed(1)}</td>
            <td>${comparison.seo.averageScore.new.toFixed(1)}</td>
            <td class="${comparison.seo.averageScore.delta > 0 ? 'trend-up' : 'trend-down'}">
              ${comparison.seo.averageScore.delta > 0 ? '+' : ''}${comparison.seo.averageScore.delta.toFixed(1)}
              (${comparison.seo.averageScore.percentChange.toFixed(1)}%)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Build detailed metrics section
 */
function buildDetailedMetricsSection(results) {
  return `
    <h2 class="section-title">Detailed Metrics</h2>
    <div class="card">
      <div class="card-header">Pass/Fail Summary</div>
      ${buildPassFailTable(results)}
    </div>
  `;
}

/**
 * Build pass/fail table
 */
function buildPassFailTable(results) {
  const metrics = calculatePassFailMetrics(results);

  let html = '<table><thead><tr><th>Category</th><th>Metric</th><th>Value</th><th>Status</th></tr></thead><tbody>';

  metrics.forEach(m => {
    const badgeClass = m.status === 'Pass' ? 'badge-pass' : m.status === 'Warn' ? 'badge-warn' : 'badge-fail';
    html += `
      <tr>
        <td>${m.category}</td>
        <td>${m.metric}</td>
        <td>${m.value}</td>
        <td><span class="badge ${badgeClass}">${m.status}</span></td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  return html;
}

/**
 * Helper functions
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

function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function getStatusColor(value, threshold, isScore = false) {
  if (isScore) {
    // For scores, higher is better
    if (value >= threshold.pass) return '#28a745';
    if (value >= threshold.warn) return '#ffc107';
    return '#dc3545';
  } else {
    // For times/counts, lower is better
    if (value <= threshold.pass) return '#28a745';
    if (value <= threshold.warn) return '#ffc107';
    return '#dc3545';
  }
}

function getStatusClass(status) {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('excellent') || statusLower.includes('pass')) return 'status-excellent';
  if (statusLower.includes('good')) return 'status-good';
  if (statusLower.includes('fair') || statusLower.includes('warn')) return 'status-fair';
  return 'status-poor';
}

function calculatePerformanceOverview(results) {
  const metrics = results.performanceAnalysis || [];
  if (metrics.length === 0) return { status: 'No data', avgLoadTime: 0, avgLCP: 0 };

  const avgLoadTime = Math.round(average(metrics.map(m => m.loadTime || 0)));
  const avgLCP = Math.round(average(metrics.map(m => m.largestContentfulPaint || 0)));

  let status = 'Excellent';
  if (avgLoadTime > 3000 || avgLCP > 2500) status = 'Fair';
  if (avgLoadTime > 5000 || avgLCP > 4000) status = 'Poor';

  return { status, avgLoadTime, avgLCP };
}

function calculateAccessibilityOverview(results) {
  const metrics = results.pa11y || [];
  let totalIssues = 0, errors = 0;

  metrics.forEach(m => {
    if (m.issues) {
      m.issues.forEach(issue => {
        totalIssues++;
        if (issue.type === 'error') errors++;
      });
    }
  });

  let status = 'Excellent';
  if (errors > 0) status = 'Critical';
  else if (totalIssues > 20) status = 'Fair';
  else if (totalIssues > 50) status = 'Poor';

  return { status, totalIssues, errors };
}

function calculateSeoOverview(results) {
  const metrics = results.seoScores || [];
  if (metrics.length === 0) return { status: 'No data', avgScore: 0, pageCount: 0 };

  const avgScore = Math.round(average(metrics.map(m => m.totalScore || 0)));
  let status = 'Excellent';
  if (avgScore < 80) status = 'Good';
  if (avgScore < 70) status = 'Fair';
  if (avgScore < 60) status = 'Poor';

  return { status, avgScore, pageCount: metrics.length };
}

function calculateLLMOverview(results) {
  const metrics = results.llmMetrics || [];
  if (metrics.length === 0) return { status: 'No data', servedScore: 0, renderedScore: 0 };

  const servedScore = Math.round(average(metrics.map(m => m.servedScore || 0)));
  const renderedScore = Math.round(average(metrics.map(m => m.renderedScore || 0)));

  let status = 'Good';
  if (servedScore < 50) status = 'Poor';
  if (servedScore >= 70) status = 'Excellent';

  return { status, servedScore, renderedScore };
}

function calculatePassFailMetrics(results) {
  const metrics = [];
  const perf = results.performanceAnalysis || [];
  const a11y = results.pa11y || [];
  const seo = results.seoScores || [];
  const llm = results.llmMetrics || [];

  // Performance metrics
  if (perf.length > 0) {
    const avgLoadTime = average(perf.map(m => m.loadTime || 0));
    metrics.push({
      category: 'Performance',
      metric: 'Avg Load Time',
      value: `${Math.round(avgLoadTime)}ms`,
      status: avgLoadTime <= passFailThresholds.performance.loadTime.pass ? 'Pass' :
              avgLoadTime <= passFailThresholds.performance.loadTime.warn ? 'Warn' : 'Fail'
    });

    const avgLCP = average(perf.map(m => m.largestContentfulPaint || 0));
    metrics.push({
      category: 'Performance',
      metric: 'Avg LCP',
      value: `${Math.round(avgLCP)}ms`,
      status: avgLCP <= passFailThresholds.performance.lcp.pass ? 'Pass' :
              avgLCP <= passFailThresholds.performance.lcp.warn ? 'Warn' : 'Fail'
    });
  }

  // Accessibility metrics
  if (a11y.length > 0) {
    let errors = 0;
    a11y.forEach(m => {
      if (m.issues) errors += m.issues.filter(i => i.type === 'error').length;
    });

    metrics.push({
      category: 'Accessibility',
      metric: 'Total Errors',
      value: errors,
      status: errors <= passFailThresholds.accessibility.maxErrors.pass ? 'Pass' :
              errors <= passFailThresholds.accessibility.maxErrors.warn ? 'Warn' : 'Fail'
    });
  }

  // SEO metrics
  if (seo.length > 0) {
    const avgScore = average(seo.map(m => m.totalScore || 0));
    metrics.push({
      category: 'SEO',
      metric: 'Avg Score',
      value: `${Math.round(avgScore)}/100`,
      status: avgScore >= passFailThresholds.seo.minScore.pass ? 'Pass' :
              avgScore >= passFailThresholds.seo.minScore.warn ? 'Warn' : 'Fail'
    });
  }

  // LLM metrics
  if (llm.length > 0) {
    const avgServed = average(llm.map(m => m.servedScore || 0));
    metrics.push({
      category: 'LLM',
      metric: 'Served Score',
      value: `${Math.round(avgServed)}/100`,
      status: avgServed >= passFailThresholds.llm.minServedScore.pass ? 'Pass' :
              avgServed >= passFailThresholds.llm.minServedScore.warn ? 'Warn' : 'Fail'
    });
  }

  return metrics;
}
