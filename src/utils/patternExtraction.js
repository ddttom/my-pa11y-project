import fs from 'fs/promises';
import path from 'path';

/**
 * Extracts successful patterns from high-scoring pages
 * @param {Array} results - Analysis results array
 * @param {string} outputDir - Output directory
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} Extracted patterns with examples
 */
export async function extractPatterns(results, outputDir, options = {}) {
  const {
    minServedScore = 70,
    minRenderedScore = 70,
    maxExamples = 5,
  } = options;

  // Filter high-scoring pages
  const highScoringPages = results.filter((r) => {
    const llmMetrics = r.llmMetrics?.[0];
    if (!llmMetrics) return false;

    const servedScore = calculateServedScore(llmMetrics);
    const renderedScore = calculateRenderedScore(llmMetrics);

    return servedScore >= minServedScore && renderedScore >= minRenderedScore;
  });

  if (highScoringPages.length === 0) {
    return {
      success: false,
      message: 'No high-scoring pages found. Consider lowering the score threshold.',
      patterns: [],
    };
  }

  global.auditcore.logger.info(`Found ${highScoringPages.length} high-scoring pages for pattern extraction`);

  // Extract patterns by category
  const patterns = {
    structuredData: extractStructuredDataPatterns(highScoringPages, maxExamples),
    semanticHTML: extractSemanticHTMLPatterns(highScoringPages, maxExamples),
    formPatterns: extractFormPatterns(highScoringPages, maxExamples),
    errorHandling: extractErrorHandlingPatterns(highScoringPages, maxExamples),
    stateManagement: extractStateManagementPatterns(highScoringPages, maxExamples),
    llmsTxt: extractLLMsTxtPatterns(highScoringPages, maxExamples),
  };

  // Generate pattern library report
  await generatePatternLibraryReport(patterns, outputDir, highScoringPages.length);

  return {
    success: true,
    pagesAnalyzed: highScoringPages.length,
    patterns,
  };
}

/**
 * Calculate served score (simplified from llmMetrics.js)
 */
function calculateServedScore(metrics) {
  let score = 0;

  // Semantic HTML (20 points)
  if (metrics.semanticHTML?.metrics?.hasMain) score += 5;
  if (metrics.semanticHTML?.metrics?.hasNav) score += 3;
  if (metrics.semanticHTML?.metrics?.hasHeader) score += 3;
  if (metrics.semanticHTML?.metrics?.hasFooter) score += 3;
  if (metrics.semanticHTML?.metrics?.hasArticle) score += 3;
  if (metrics.semanticHTML?.metrics?.hasSection) score += 3;

  // Structured Data (25 points)
  const structuredDataCount = metrics.structuredData?.metrics?.structuredDataCount || 0;
  if (structuredDataCount > 0) score += Math.min(25, structuredDataCount * 8);

  // Form patterns (20 points)
  const formMetrics = metrics.formPatterns?.metrics || {};
  const standardFieldRatio = formMetrics.formCount > 0
    ? (formMetrics.standardFieldsCount || 0) / (formMetrics.totalFieldsCount || 1)
    : 0;
  score += Math.round(standardFieldRatio * 15);

  // LLMs.txt (10 points)
  if (metrics.llmsTxt?.metrics?.hasLLMsTxtReference || metrics.llmsTxt?.metrics?.hasLLMsTxtMeta) {
    score += 10;
  }

  // Security headers (10 points)
  const securityMetrics = metrics.securityHeaders?.metrics || {};
  if (securityMetrics.hasHsts) score += 3;
  if (securityMetrics.hasCSP) score += 3;
  if (securityMetrics.hasXFrameOptions) score += 2;
  if (securityMetrics.hasXContentTypeOptions) score += 2;

  // robots.txt quality (15 points)
  const robotsScore = metrics.robotsTxt?.score || 0;
  score += Math.round((robotsScore / 100) * 15);

  return Math.min(100, score);
}

/**
 * Calculate rendered score (simplified from llmMetrics.js)
 */
function calculateRenderedScore(metrics) {
  let score = 0;

  // Explicit state attributes (30 points)
  const dataAttributes = metrics.dataAttributes?.metrics || {};
  if (dataAttributes.hasValidationState) score += 10;
  if (dataAttributes.hasLoadingState) score += 10;
  if (dataAttributes.hasAgentVisibilityControl) score += 10;

  // Dynamic validation (20 points)
  const formMetrics = metrics.formPatterns?.metrics || {};
  if (formMetrics.hasValidation) score += 20;

  // Error persistence (25 points)
  if (metrics.errorHandling?.metrics?.hasPersistentErrors) score += 25;

  // ARIA attributes (25 points)
  const ariaMetrics = metrics.ariaAttributes?.metrics || {};
  if (ariaMetrics.hasAriaLive) score += 10;
  if (ariaMetrics.hasAriaInvalid) score += 10;
  if (ariaMetrics.hasRoleAlert) score += 5;

  return Math.min(100, score);
}

/**
 * Extract structured data patterns
 */
function extractStructuredDataPatterns(pages, maxExamples) {
  const examples = [];

  for (const page of pages) {
    const llmMetrics = page.llmMetrics?.[0];
    if (!llmMetrics?.structuredData?.metrics) continue;

    const { structuredDataTypes, structuredDataCount } = llmMetrics.structuredData.metrics;

    if (structuredDataCount > 0 && examples.length < maxExamples) {
      examples.push({
        url: page.url,
        types: structuredDataTypes || [],
        count: structuredDataCount,
        implementation: 'JSON-LD structured data present',
      });
    }
  }

  return {
    name: 'Structured Data (JSON-LD)',
    description: 'Schema.org structured data for machine readability',
    priority: 'Critical',
    effort: 'Low',
    examples,
    recommendations: [
      'Use JSON-LD format (preferred over Microdata/RDFa)',
      'Include all relevant Schema.org types (Product, Organization, Article, etc.)',
      'Validate with Google Rich Results Test',
      'Keep structured data in sync with visible content',
    ],
  };
}

/**
 * Extract semantic HTML patterns
 */
function extractSemanticHTMLPatterns(pages, maxExamples) {
  const examples = [];

  for (const page of pages) {
    const llmMetrics = page.llmMetrics?.[0];
    if (!llmMetrics?.semanticHTML?.metrics) continue;

    const semanticElements = [];
    if (llmMetrics.semanticHTML.metrics.hasMain) semanticElements.push('<main>');
    if (llmMetrics.semanticHTML.metrics.hasNav) semanticElements.push('<nav>');
    if (llmMetrics.semanticHTML.metrics.hasHeader) semanticElements.push('<header>');
    if (llmMetrics.semanticHTML.metrics.hasFooter) semanticElements.push('<footer>');
    if (llmMetrics.semanticHTML.metrics.hasArticle) semanticElements.push('<article>');
    if (llmMetrics.semanticHTML.metrics.hasSection) semanticElements.push('<section>');

    if (semanticElements.length >= 4 && examples.length < maxExamples) {
      examples.push({
        url: page.url,
        elements: semanticElements,
        count: semanticElements.length,
      });
    }
  }

  return {
    name: 'Semantic HTML Structure',
    description: 'Proper use of HTML5 semantic elements for content structure',
    priority: 'Critical',
    effort: 'Low',
    examples,
    recommendations: [
      'Wrap main content in <main> element',
      'Use <nav> for navigation sections',
      'Use <header> and <footer> for page/section headers and footers',
      'Use <article> for self-contained content',
      'Use <section> for thematic groupings',
      'Maintain proper heading hierarchy (h1 → h2 → h3)',
    ],
  };
}

/**
 * Extract form patterns
 */
function extractFormPatterns(pages, maxExamples) {
  const examples = [];

  for (const page of pages) {
    const llmMetrics = page.llmMetrics?.[0];
    if (!llmMetrics?.formPatterns?.metrics) continue;

    const {
      formCount, standardFieldsCount, totalFieldsCount, autocompleteFieldsCount,
    } = llmMetrics.formPatterns.metrics;

    if (formCount > 0 && standardFieldsCount > 0 && examples.length < maxExamples) {
      const standardRatio = Math.round((standardFieldsCount / totalFieldsCount) * 100);
      const autocompleteRatio = Math.round((autocompleteFieldsCount / totalFieldsCount) * 100);

      examples.push({
        url: page.url,
        formCount,
        standardFieldsPercent: standardRatio,
        autocompletePercent: autocompleteRatio,
      });
    }
  }

  return {
    name: 'Standard Form Field Naming',
    description: 'Use conventional field names that agents recognize',
    priority: 'High',
    effort: 'Low',
    examples,
    recommendations: [
      'Use standard names: email, firstName, lastName, phone, address, etc.',
      'Add autocomplete attributes: autocomplete="email", autocomplete="given-name"',
      'Use <label> elements with for attributes',
      'Avoid cryptic field names like field_x7b3 or user_email_address_field',
      'Add aria-label for fields without visible labels',
    ],
  };
}

/**
 * Extract error handling patterns
 */
function extractErrorHandlingPatterns(pages, maxExamples) {
  const examples = [];

  for (const page of pages) {
    const llmMetrics = page.llmMetrics?.[0];
    if (!llmMetrics?.errorHandling?.metrics) continue;

    const { hasPersistentErrors } = llmMetrics.errorHandling.metrics;

    if (hasPersistentErrors && examples.length < maxExamples) {
      examples.push({
        url: page.url,
        pattern: 'Persistent error messages',
      });
    }
  }

  return {
    name: 'Persistent Error Messages',
    description: 'Error messages that remain visible until resolved',
    priority: 'Critical',
    effort: 'Moderate',
    examples,
    recommendations: [
      'Keep error messages in DOM until user fixes the issue',
      'Add role="alert" to error containers',
      'Use aria-live="polite" for dynamic errors',
      'Avoid auto-dismissing error toasts/notifications',
      'Show all errors together (error summary at top)',
      'Link error summary to specific fields',
    ],
  };
}

/**
 * Extract state management patterns
 */
function extractStateManagementPatterns(pages, maxExamples) {
  const examples = [];

  for (const page of pages) {
    const llmMetrics = page.llmMetrics?.[0];
    if (!llmMetrics?.dataAttributes?.metrics) continue;

    const { hasValidationState, hasLoadingState, hasAgentVisibilityControl } = llmMetrics.dataAttributes.metrics;

    const patterns = [];
    if (hasValidationState) patterns.push('data-validation-state');
    if (hasLoadingState) patterns.push('data-load-state');
    if (hasAgentVisibilityControl) patterns.push('data-agent-visible');

    if (patterns.length > 0 && examples.length < maxExamples) {
      examples.push({
        url: page.url,
        patterns,
      });
    }
  }

  return {
    name: 'Explicit State Attributes',
    description: 'Data attributes that expose application state to agents',
    priority: 'High',
    effort: 'Moderate',
    examples,
    recommendations: [
      'Add data-validation-state="valid|invalid|pending" to form fields',
      'Add data-load-state="loading|complete|error" to async content',
      'Add data-agent-visible="true|false" to control agent visibility',
      'Add data-authenticated="true|false" for auth state',
      'Add data-disabled-reason="..." to disabled buttons',
      'Make JavaScript state visible in HTML attributes',
    ],
  };
}

/**
 * Extract llms.txt patterns
 */
function extractLLMsTxtPatterns(pages, maxExamples) {
  const examples = [];

  for (const page of pages) {
    const llmMetrics = page.llmMetrics?.[0];
    if (!llmMetrics?.llmsTxt?.metrics) continue;

    const { hasLLMsTxtReference, hasLLMsTxtMeta, llmsTxtUrl } = llmMetrics.llmsTxt.metrics;

    if ((hasLLMsTxtReference || hasLLMsTxtMeta) && examples.length < maxExamples) {
      examples.push({
        url: page.url,
        llmsTxtUrl: llmsTxtUrl || '/llms.txt',
        referenceType: hasLLMsTxtMeta ? 'meta tag' : 'link element',
      });
    }
  }

  return {
    name: 'llms.txt Implementation',
    description: 'Site-wide guidance file for AI agents',
    priority: 'High',
    effort: 'Low',
    examples,
    recommendations: [
      'Create /llms.txt at site root',
      'Include title, overview, and usage guidelines',
      'Add <link rel="llms-txt" href="/llms.txt"> to HTML head',
      'Or add <meta name="llms-txt" content="..."> with URL',
      'Document rate limits, authentication, and policies',
      'Reference API endpoints if available',
      'See https://llmstxt.org/ for specification',
    ],
  };
}

/**
 * Generate pattern library report
 */
async function generatePatternLibraryReport(patterns, outputDir, pageCount) {
  const reportPath = path.join(outputDir, 'pattern_library.md');

  let content = `# AI Agent Pattern Library

**Generated from:** ${pageCount} high-scoring pages
**Date:** ${new Date().toISOString()}

This report extracts successful patterns from pages with high AI agent compatibility scores. These patterns are proven to work in production and can be adapted to your site.

---

`;

  // Add each pattern category
  Object.entries(patterns).forEach(([, pattern]) => {
    content += `## ${pattern.name}\n\n`;
    content += `**Description:** ${pattern.description}\n\n`;
    content += `**Priority:** ${pattern.priority}\n`;
    content += `**Effort:** ${pattern.effort}\n\n`;

    if (pattern.examples.length > 0) {
      content += '### Examples from High-Scoring Sites\n\n';

      pattern.examples.forEach((example, index) => {
        content += `**Example ${index + 1}:** ${example.url}\n`;

        // Add example-specific details
        Object.entries(example).forEach(([key, value]) => {
          if (key !== 'url') {
            if (Array.isArray(value)) {
              content += `- ${key}: ${value.join(', ')}\n`;
            } else if (typeof value === 'object') {
              content += `- ${key}: ${JSON.stringify(value)}\n`;
            } else {
              content += `- ${key}: ${value}\n`;
            }
          }
        });

        content += '\n';
      });
    } else {
      content += '### Examples\n\n';
      content += '*No examples found in analyzed pages*\n\n';
    }

    content += '### Implementation Recommendations\n\n';
    pattern.recommendations.forEach((rec) => {
      content += `- ${rec}\n`;
    });

    content += '\n---\n\n';
  });

  // Add usage guide
  content += `## How to Use This Library

1. **Review each pattern** - Understand why it matters
2. **Check examples** - See how high-scoring sites implement it
3. **Adapt to your site** - Apply the pattern using your design system
4. **Test implementation** - Re-run the audit to measure improvement
5. **Iterate** - Continue improving based on new recommendations

## Expected Impact

Implementing these patterns should significantly improve your AI agent compatibility scores:

- **Served Score:** Patterns like semantic HTML and structured data are critical
- **Rendered Score:** Patterns like explicit state and persistent errors are important
- **Overall Score:** Combination of both served and rendered improvements

## Next Steps

1. Start with **Critical priority** patterns (highest impact)
2. Focus on **Low effort** patterns first (quick wins)
3. Re-run audit after each pattern implementation
4. Track score improvements over time

## Additional Resources

- **LLM Suitability Guide:** See docs/llm_general_suitability_guide.md
- **Implementation Checklist:** See invisible-users book implementation checklist
- **Validation Tools:** Google Rich Results Test, W3C Validator, Pa11y

---

**Note:** These patterns are extracted from production websites with proven high scores. They represent real-world, working implementations that you can learn from and adapt.
`;

  await fs.writeFile(reportPath, content);
  global.auditcore.logger.info(`Generated pattern library report: ${reportPath}`);

  return reportPath;
}
