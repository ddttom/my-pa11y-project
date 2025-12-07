# Adding LLM Readability Report

This guide walks through adding a new "LLM Readability Report" following the 4-phase architecture pattern.

## Overview

The LLM Readability Report analyzes how well a page's content can be understood and processed by Large Language Models, considering factors like structural clarity, content organization, and text extractability.

## Metrics to Track

### 1. Structural Clarity Score (0-100)
- Semantic HTML usage (`<article>`, `<section>`, `<nav>`, `<header>`, `<footer>`)
- Proper heading hierarchy (h1 → h2 → h3)
- List usage for enumerated content
- Table structure for tabular data

### 2. Content Organization Score (0-100)
- Paragraph count and average length
- Sentence count and average complexity
- Content-to-markup ratio
- Main content identifiability

### 3. Metadata Quality Score (0-100)
- Schema.org structured data
- OpenGraph tags completeness
- Meta descriptions
- JSON-LD data

### 4. Text Extractability Score (0-100)
- Text density (clean text / total page size)
- Hidden content detection
- Dynamic content indicators
- Text readability

### 5. Overall LLM Readability Score (0-100)
- Weighted average of all sub-scores

## Implementation Steps

Follow the 4-phase architecture pattern documented in CLAUDE.md.

---

## Phase 1: DOM Extraction (caching.js)

**File**: `src/utils/caching.js`

Add extraction logic inside the `page.evaluate()` block (around line 291):

```javascript
// LLM Readability Metrics
const llmReadability = {
  // Structural elements
  semanticElements: {
    article: document.querySelectorAll('article').length,
    section: document.querySelectorAll('section').length,
    nav: document.querySelectorAll('nav').length,
    header: document.querySelectorAll('header').length,
    footer: document.querySelectorAll('footer').length,
    aside: document.querySelectorAll('aside').length,
    main: document.querySelectorAll('main').length
  },

  // Heading structure
  headings: {
    h1: document.querySelectorAll('h1').length,
    h2: document.querySelectorAll('h2').length,
    h3: document.querySelectorAll('h3').length,
    h4: document.querySelectorAll('h4').length,
    h5: document.querySelectorAll('h5').length,
    h6: document.querySelectorAll('h6').length
  },

  // Content structure
  paragraphs: document.querySelectorAll('p').length,
  lists: {
    ul: document.querySelectorAll('ul').length,
    ol: document.querySelectorAll('ol').length,
    total: document.querySelectorAll('ul, ol').length
  },
  tables: document.querySelectorAll('table').length,

  // Code and pre-formatted content
  codeBlocks: document.querySelectorAll('pre, code').length,

  // Metadata
  hasJsonLd: document.querySelectorAll('script[type="application/ld+json"]').length > 0,
  jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,

  // Schema.org microdata
  hasMicrodata: document.querySelectorAll('[itemscope]').length > 0,
  microdataCount: document.querySelectorAll('[itemscope]').length,

  // OpenGraph
  ogTags: {
    title: document.querySelector('meta[property="og:title"]')?.content || '',
    description: document.querySelector('meta[property="og:description"]')?.content || '',
    image: document.querySelector('meta[property="og:image"]')?.content || '',
    url: document.querySelector('meta[property="og:url"]')?.content || '',
    type: document.querySelector('meta[property="og:type"]')?.content || ''
  },

  // Text content analysis
  bodyText: document.body?.innerText || '',
  bodyTextLength: (document.body?.innerText || '').length,

  // Hidden content detection
  hiddenElements: Array.from(document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], [hidden]')).length,

  // Main content detection
  hasMainElement: document.querySelector('main') !== null,
  hasArticleElement: document.querySelector('article') !== null,

  // Content extractability indicators
  totalElements: document.querySelectorAll('*').length,
  textNodes: Array.from(document.body?.childNodes || []).filter(node =>
    node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
  ).length
};
```

Then add it to the return object (around line 528):

```javascript
return {
  // ... existing fields ...
  llmReadability: llmReadability,
  // ... rest of fields ...
}
```

---

## Phase 2: Analysis Phase (pageAnalyzer.js)

**File**: `src/utils/pageAnalyzer.js`

If you need additional processing, add it in the `analyzePageContent()` function. For LLM readability, most analysis can happen in the metrics phase, so this step might be minimal.

Optional: Add a helper to calculate text-to-markup ratio:

```javascript
function calculateTextToMarkupRatio(pageData) {
  const textLength = pageData.llmReadability?.bodyTextLength || 0;
  const markupLength = pageData.htmlContent?.length || 1; // Avoid division by zero
  return (textLength / markupLength) * 100;
}
```

---

## Phase 3: Metrics Aggregation (metricsUpdater.js)

**File**: `src/utils/metricsUpdater.js`

Add a new aggregation function:

```javascript
/**
 * Update LLM readability metrics aggregation
 * @param {Object} pageData - Page data from rendering phase
 * @param {Object} results - Results object to update
 * @param {string} testUrl - URL being processed
 */
export function updateLlmReadabilityMetrics(pageData, results, testUrl) {
  if (!results.llmReadabilityAggregation) {
    results.llmReadabilityAggregation = {};
  }

  const llm = pageData.llmReadability || {};

  // Calculate structural clarity score (0-100)
  const structuralScore = calculateStructuralScore(llm);

  // Calculate content organization score (0-100)
  const organizationScore = calculateOrganizationScore(llm, pageData);

  // Calculate metadata quality score (0-100)
  const metadataScore = calculateMetadataScore(llm, pageData);

  // Calculate text extractability score (0-100)
  const extractabilityScore = calculateExtractabilityScore(llm, pageData);

  // Calculate overall LLM readability score (weighted average)
  const overallScore = Math.round(
    (structuralScore * 0.25) +
    (organizationScore * 0.25) +
    (metadataScore * 0.25) +
    (extractabilityScore * 0.25)
  );

  results.llmReadabilityAggregation[testUrl] = {
    url: testUrl,
    overallScore,
    structuralScore,
    organizationScore,
    metadataScore,
    extractabilityScore,

    // Detailed metrics
    semanticHtmlUsage: calculateSemanticHtmlUsage(llm),
    headingHierarchyQuality: calculateHeadingHierarchyQuality(llm),
    hasMainContent: llm.hasMainElement || llm.hasArticleElement,
    hasStructuredData: llm.hasJsonLd || llm.hasMicrodata,
    textToMarkupRatio: calculateTextToMarkupRatio(pageData, llm),
    hiddenContentRatio: calculateHiddenContentRatio(llm),

    // Counts
    paragraphCount: llm.paragraphs || 0,
    listCount: llm.lists?.total || 0,
    tableCount: llm.tables || 0,
    codeBlockCount: llm.codeBlocks || 0,
    totalElements: llm.totalElements || 0
  };
}

// Helper functions

function calculateStructuralScore(llm) {
  let score = 0;
  const semantic = llm.semanticElements || {};
  const headings = llm.headings || {};

  // Semantic HTML elements (40 points)
  if (semantic.main > 0) score += 10;
  if (semantic.article > 0) score += 10;
  if (semantic.section > 0) score += 5;
  if (semantic.header > 0) score += 5;
  if (semantic.footer > 0) score += 5;
  if (semantic.nav > 0) score += 5;

  // Proper heading hierarchy (40 points)
  if (headings.h1 === 1) score += 20; // Single h1
  if (headings.h2 > 0) score += 10; // Has h2s
  if (headings.h3 > 0) score += 5; // Has h3s
  if (headings.h4 > 0 || headings.h5 > 0 || headings.h6 > 0) score += 5;

  // Lists and tables (20 points)
  if ((llm.lists?.total || 0) > 0) score += 10;
  if (llm.tables > 0) score += 10;

  return Math.min(score, 100);
}

function calculateOrganizationScore(llm, pageData) {
  let score = 50; // Base score

  // Paragraph usage (25 points)
  const paragraphs = llm.paragraphs || 0;
  if (paragraphs > 0 && paragraphs < 100) score += 25;
  else if (paragraphs >= 100) score += 15; // Too many might be disorganized
  else score += 5; // Very few paragraphs

  // Content length (25 points)
  const textLength = llm.bodyTextLength || 0;
  if (textLength > 100 && textLength < 50000) score += 25;
  else if (textLength >= 50000) score += 15;
  else score += 5;

  return Math.min(score, 100);
}

function calculateMetadataScore(llm, pageData) {
  let score = 0;

  // Structured data (40 points)
  if (llm.hasJsonLd) score += 20;
  if (llm.hasMicrodata) score += 20;

  // OpenGraph tags (40 points)
  const og = llm.ogTags || {};
  if (og.title) score += 10;
  if (og.description) score += 10;
  if (og.image) score += 10;
  if (og.type) score += 10;

  // Meta description (20 points)
  if (pageData.metaDescription && pageData.metaDescription.length > 50) {
    score += 20;
  } else if (pageData.metaDescription) {
    score += 10;
  }

  return Math.min(score, 100);
}

function calculateExtractabilityScore(llm, pageData) {
  let score = 50; // Base score

  // Text to markup ratio (30 points)
  const ratio = calculateTextToMarkupRatio(pageData, llm);
  if (ratio > 10) score += 30;
  else if (ratio > 5) score += 20;
  else if (ratio > 2) score += 10;

  // Hidden content (20 points - penalize if too much)
  const hiddenRatio = calculateHiddenContentRatio(llm);
  if (hiddenRatio < 5) score += 20;
  else if (hiddenRatio < 10) score += 10;
  else if (hiddenRatio < 20) score += 5;

  return Math.min(score, 100);
}

function calculateSemanticHtmlUsage(llm) {
  const semantic = llm.semanticElements || {};
  const total = semantic.article + semantic.section + semantic.nav +
                semantic.header + semantic.footer + semantic.main + semantic.aside;
  if (total >= 5) return 'Excellent';
  if (total >= 3) return 'Good';
  if (total >= 1) return 'Fair';
  return 'Poor';
}

function calculateHeadingHierarchyQuality(llm) {
  const headings = llm.headings || {};
  if (headings.h1 === 1 && headings.h2 > 0) return 'Excellent';
  if (headings.h1 === 1) return 'Good';
  if (headings.h1 > 1) return 'Multiple H1s';
  if (headings.h1 === 0) return 'No H1';
  return 'Poor';
}

function calculateTextToMarkupRatio(pageData, llm) {
  const textLength = llm.bodyTextLength || 0;
  const pageSize = pageData.pageSize || 1;
  return ((textLength / pageSize) * 100).toFixed(2);
}

function calculateHiddenContentRatio(llm) {
  const hidden = llm.hiddenElements || 0;
  const total = llm.totalElements || 1;
  return ((hidden / total) * 100).toFixed(2);
}
```

Then wire up the function in `pageAnalyzer.js` in the `runMetricsAnalysis()` function (around line 246):

```javascript
export async function runMetricsAnalysis(pageData, results, testUrl) {
  // ... existing metric updates ...

  updateLlmReadabilityMetrics(pageData, results, testUrl);

  // ... rest of metrics ...
}
```

---

## Phase 4: Report Generation (reportGenerators.js)

**File**: `src/utils/reportUtils/reportGenerators.js`

Add the report generator function:

```javascript
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';

/**
 * Generate LLM Readability Report
 * Analyzes how well pages can be processed by Large Language Models
 */
export async function generateLlmReadabilityReport(results, outputDir) {
  if (!results.llmReadabilityAggregation ||
      Object.keys(results.llmReadabilityAggregation).length === 0) {
    global.auditcore.logger.warn('No LLM readability data available for report generation');
    return;
  }

  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'llm_readability_report.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'overallScore', title: 'Overall LLM Readability Score' },
      { id: 'structuralScore', title: 'Structural Clarity Score' },
      { id: 'organizationScore', title: 'Content Organization Score' },
      { id: 'metadataScore', title: 'Metadata Quality Score' },
      { id: 'extractabilityScore', title: 'Text Extractability Score' },
      { id: 'semanticHtmlUsage', title: 'Semantic HTML Usage' },
      { id: 'headingHierarchyQuality', title: 'Heading Hierarchy Quality' },
      { id: 'hasMainContent', title: 'Has Main Content Element' },
      { id: 'hasStructuredData', title: 'Has Structured Data' },
      { id: 'textToMarkupRatio', title: 'Text to Markup Ratio (%)' },
      { id: 'hiddenContentRatio', title: 'Hidden Content Ratio (%)' },
      { id: 'paragraphCount', title: 'Paragraph Count' },
      { id: 'listCount', title: 'List Count' },
      { id: 'tableCount', title: 'Table Count' },
      { id: 'codeBlockCount', title: 'Code Block Count' },
      { id: 'totalElements', title: 'Total DOM Elements' }
    ]
  });

  const reportData = Object.values(results.llmReadabilityAggregation)
    .map(item => ({
      url: item.url,
      overallScore: item.overallScore,
      structuralScore: item.structuralScore,
      organizationScore: item.organizationScore,
      metadataScore: item.metadataScore,
      extractabilityScore: item.extractabilityScore,
      semanticHtmlUsage: item.semanticHtmlUsage,
      headingHierarchyQuality: item.headingHierarchyQuality,
      hasMainContent: item.hasMainContent ? 'Yes' : 'No',
      hasStructuredData: item.hasStructuredData ? 'Yes' : 'No',
      textToMarkupRatio: item.textToMarkupRatio,
      hiddenContentRatio: item.hiddenContentRatio,
      paragraphCount: item.paragraphCount,
      listCount: item.listCount,
      tableCount: item.tableCount,
      codeBlockCount: item.codeBlockCount,
      totalElements: item.totalElements
    }))
    .sort((a, b) => b.overallScore - a.overallScore); // Sort by overall score descending

  await csvWriter.writeRecords(reportData);

  global.auditcore.logger.info(`LLM Readability report generated: ${reportData.length} pages analyzed`);

  // Console summary
  const avgScore = reportData.reduce((sum, item) => sum + item.overallScore, 0) / reportData.length;
  console.log(`\n📊 LLM Readability Analysis:`);
  console.log(`   Average Score: ${avgScore.toFixed(1)}/100`);
  console.log(`   Pages with Good Readability (>70): ${reportData.filter(p => p.overallScore > 70).length}`);
  console.log(`   Pages Needing Improvement (<50): ${reportData.filter(p => p.overallScore < 50).length}`);
  console.log(`   Report: llm_readability_report.csv`);
}
```

---

## Phase 5: Wire Up in reports.js

**File**: `src/utils/reports.js`

Import and call the new report generator:

```javascript
// Add to imports at top
import {
  generateSeoReport,
  generatePerformanceReport,
  // ... other imports ...
  generateLlmReadabilityReport  // ADD THIS
} from './reportUtils/reportGenerators.js';

// In generateReports() function, add:
export async function generateReports(results, outputDir) {
  try {
    // ... existing report generations ...

    await generateLlmReadabilityReport(results, outputDir);

    // ... rest of reports ...

  } catch (error) {
    global.auditcore.logger.error('Error generating reports:', error);
    throw error;
  }
}
```

---

## Testing

1. **Run with a small sample:**
```bash
npm start -- -s https://example.com/sitemap.xml -l 5
```

2. **Check the output:**
```bash
ls -la results/llm_readability_report.csv
cat results/llm_readability_report.csv
```

3. **Verify in results.json:**
```bash
cat results/results.json | grep -A 20 "llmReadabilityAggregation"
```

4. **Test with different sites to verify scoring:**
```bash
npm start -- -s https://developer.mozilla.org/sitemap.xml -l 3
npm start -- -s https://stackoverflow.com/sitemap.xml -l 3
```

---

## Update Documentation

### 1. Update User Manual (docs/usermanual.md)

Add a new section after Content Quality Report:

```markdown
### LLM Readability Report (llm_readability_report.csv)

- Analyzes how well page content can be processed by Large Language Models
- Structural clarity and semantic HTML usage
- Content organization quality
- Metadata completeness
- Text extractability metrics

Fields:

- URL
- Overall LLM Readability Score (0-100)
- Structural Clarity Score (0-100)
- Content Organization Score (0-100)
- Metadata Quality Score (0-100)
- Text Extractability Score (0-100)
- Semantic HTML Usage (Excellent/Good/Fair/Poor)
- Heading Hierarchy Quality
- Has Main Content Element
- Has Structured Data
- Text to Markup Ratio (%)
- Hidden Content Ratio (%)
- Paragraph Count
- List Count
- Table Count
- Code Block Count
- Total DOM Elements

**Use Cases:**
- Optimizing content for AI/LLM processing
- Improving structured data implementation
- Ensuring clean content extraction
- Identifying pages with poor semantic structure
```

### 2. Update README.md

Add to the "Advanced Reports" section:

```markdown
- **llm_readability_report.csv** - LLM content processing analysis
```

### 3. Update CHANGELOG.md

Add under `### Added`:

```markdown
- **LLM Readability Report**: New analysis for AI/LLM content processing optimization
  - Structural clarity scoring (semantic HTML, heading hierarchy)
  - Content organization metrics
  - Metadata quality assessment (Schema.org, OpenGraph)
  - Text extractability analysis
  - Overall LLM readability score (0-100)
  - New report: `llm_readability_report.csv`
```

---

## Summary

Following this guide, you'll add a comprehensive LLM Readability Report that:

1. ✅ Extracts relevant DOM data in Phase 1 (caching.js)
2. ✅ Processes and scores in Phase 3 (metricsUpdater.js)
3. ✅ Generates CSV report in Phase 4 (reportGenerators.js)
4. ✅ Integrates with existing report workflow (reports.js)
5. ✅ Follows all architectural patterns from CLAUDE.md

The report provides actionable insights for optimizing web content for LLM processing and understanding.
