/**
 * LLM Suitability Metrics Collection
 *
 * Analyzes pages for AI agent compatibility based on patterns from
 * "The Invisible Users" book (https://github.com/tomcranstoun/invisible-users)
 *
 * CRITICAL DISTINCTION:
 * AI agents operate in two modes:
 * 1. SERVED HTML - Static HTML as received (CLI agents, server-based agents)
 * 2. RENDERED HTML - After JavaScript execution (browser-based agents)
 *
 * Metrics are categorized as:
 * - ESSENTIAL_SERVED: Critical for all agents (HTTP codes, semantic HTML, form names)
 * - ESSENTIAL_RENDERED: Critical for browser agents (dynamic state, errors)
 * - NICE_TO_HAVE: Helpful but not essential (speculative patterns)
 */

/**
 * Metric importance levels
 */
const IMPORTANCE = {
  ESSENTIAL_SERVED: 'essential_served',    // Works for all agents
  ESSENTIAL_RENDERED: 'essential_rendered', // Works for browser agents
  NICE_TO_HAVE: 'nice_to_have'             // Speculative, not critical
};

/**
 * Analyzes ESSENTIAL_SERVED metrics - Semantic HTML structure
 * These work for ALL agents (with or without JavaScript)
 */
function analyzeSemanticHTML($) {
  return {
    importance: IMPORTANCE.ESSENTIAL_SERVED,
    metrics: {
      hasMain: $('main').length > 0,
      hasNav: $('nav').length > 0,
      hasHeader: $('header').length > 0,
      hasFooter: $('footer').length > 0,
      hasArticle: $('article').length > 0,
      hasSection: $('section').length > 0,
      navCount: $('nav').length,
      articleCount: $('article').length,
      sectionCount: $('section').length,
      divCount: $('div').length,
    }
  };
}

/**
 * Analyzes ESSENTIAL_SERVED metrics - Form field naming
 * Critical: Standard names work for all agents
 */
function analyzeFormFields($) {
  const forms = $('form');
  const inputs = $('input, select, textarea');

  // Standard field names from advice.md - ESSENTIAL
  const standardNames = [
    'email', 'firstName', 'first_name', 'lastName', 'last_name',
    'fullName', 'full_name', 'phone', 'telephone',
    'postcode', 'postal_code', 'address1', 'street_address',
    'address2', 'city', 'county', 'state', 'country', 'country_code',
    'cardNumber', 'card_number', 'expiryDate', 'expiry',
    'cvv', 'cvc', 'password', 'username',
    'dateOfBirth', 'date_of_birth', 'company', 'company_name', 'quantity'
  ];

  let standardNamedFields = 0;
  let nonStandardNamedFields = 0;
  let fieldsWithLabels = 0;
  let fieldsWithType = 0;
  let fieldsWithRequired = 0;

  inputs.each((_, el) => {
    const $input = $(el);
    const name = $input.attr('name') || '';
    const id = $input.attr('id') || '';
    const type = $input.attr('type');

    // ESSENTIAL: Standard naming
    if (standardNames.some(std => name === std || id === std)) {
      standardNamedFields++;
    } else if (name) {
      nonStandardNamedFields++;
    }

    // ESSENTIAL: Labels (work in served HTML)
    if ($input.attr('aria-label') || $(`label[for="${id}"]`).length > 0) {
      fieldsWithLabels++;
    }

    // ESSENTIAL: Input types (work in served HTML)
    if (type) {
      fieldsWithType++;
    }

    // ESSENTIAL: Required indicators (work in served HTML)
    if ($input.attr('required') || $input.attr('aria-required') === 'true') {
      fieldsWithRequired++;
    }
  });

  return {
    importance: IMPORTANCE.ESSENTIAL_SERVED,
    metrics: {
      formCount: forms.length,
      totalInputs: inputs.length,
      standardNamedFields,
      nonStandardNamedFields,
      fieldsWithLabels,
      fieldsWithType,
      fieldsWithRequired,
      standardNameRatio: inputs.length > 0 ? standardNamedFields / inputs.length : 1,
      labelRatio: inputs.length > 0 ? fieldsWithLabels / inputs.length : 1,
    }
  };
}

/**
 * Analyzes ESSENTIAL_SERVED metrics - Structured data
 * Critical: Schema.org JSON-LD works for all agents
 */
function analyzeStructuredData($) {
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const schemaTypes = [];
  let hasSchemaOrg = false;

  jsonLdScripts.each((_, script) => {
    try {
      const data = JSON.parse($(script).html());
      if (data['@type']) {
        schemaTypes.push(data['@type']);
        if (data['@context'] && data['@context'].includes('schema.org')) {
          hasSchemaOrg = true;
        }
      }
    } catch (e) {
      // Invalid JSON-LD, skip
    }
  });

  return {
    importance: IMPORTANCE.ESSENTIAL_SERVED,
    metrics: {
      hasJsonLd: jsonLdScripts.length > 0,
      jsonLdCount: jsonLdScripts.length,
      schemaTypes,
      hasSchemaOrg,
      // Microdata is NICE_TO_HAVE, not essential
      hasMicrodata: $('[itemscope]').length > 0,
      microdataCount: $('[itemscope]').length,
    }
  };
}

/**
 * Analyzes ESSENTIAL_RENDERED metrics - Dynamic state visibility
 * Important for browser-based agents that execute JavaScript
 */
function analyzeDataAttributes($) {
  const elements = $('[data-state], [data-authenticated], [data-validation-state], [data-error-code], [data-loading]');

  return {
    importance: IMPORTANCE.ESSENTIAL_RENDERED,
    metrics: {
      hasDataState: $('[data-state]').length > 0,
      dataStateCount: $('[data-state]').length,
      hasAuthState: $('[data-authenticated]').length > 0,
      hasValidationState: $('[data-validation-state]').length > 0,
      hasErrorCodes: $('[data-error-code]').length > 0,
      hasLoadingIndicators: $('[data-loading], [data-state="loading"]').length > 0,
      totalDataAttributes: elements.length,
    }
  };
}

/**
 * Analyzes ESSENTIAL_RENDERED metrics - Error handling
 * Persistent errors matter for browser agents
 */
function analyzeErrorHandling($) {
  const hasAriaLive = $('[aria-live]').length > 0;
  const hasRoleAlert = $('[role="alert"]').length > 0;

  return {
    importance: IMPORTANCE.ESSENTIAL_RENDERED,
    metrics: {
      hasErrorSummary: hasRoleAlert,
      errorAlertCount: $('[role="alert"]').length,
      hasAriaLive,
      ariaLiveCount: $('[aria-live]').length,
      hasFieldErrors: $('.error, .field-error, [class*="error"]').length > 0,
      errorElementCount: $('.error, .field-error, [class*="error"]').length,
      hasAriaInvalid: $('[aria-invalid="true"]').length > 0,
      invalidFieldCount: $('[aria-invalid="true"]').length,
      hasPersistentErrors: hasRoleAlert && hasAriaLive,
    }
  };
}

/**
 * Analyzes NICE_TO_HAVE metrics - Table data attributes
 * Helpful but agents can parse tables without data attributes
 */
function analyzeTableData($) {
  const tables = $('table');
  const tableCells = $('td');

  // Having scope and caption is ESSENTIAL for accessibility
  // Having data attributes is NICE_TO_HAVE
  const cellsWithDataAttributes = tableCells.filter((_, el) => {
    const $el = $(el);
    return $el.attr('data-price') || $el.attr('data-currency') ||
           $el.attr('data-quantity') || $el.attr('data-in-stock') ||
           $el.attr('data-product-id') || $el.attr('data-rating');
  }).length;

  return {
    importance: IMPORTANCE.NICE_TO_HAVE,
    metrics: {
      tableCount: tables.length,
      tablesWithCaption: $('table caption').length,
      tablesWithScope: $('th[scope]').length > 0 ? tables.length : 0,
      cellsWithDataAttributes,
      totalCells: tableCells.length,
      machineReadableRatio: tableCells.length > 0 ? cellsWithDataAttributes / tableCells.length : 0,
    }
  };
}

/**
 * Analyzes NICE_TO_HAVE metrics - Button state explanations
 * Helpful but agents can often infer why buttons are disabled
 */
function analyzeButtonStates($) {
  const disabledButtons = $('button[disabled], input[type="submit"][disabled]');
  const disabledWithExplanation = disabledButtons.filter((_, el) => {
    const $btn = $(el);
    return $btn.attr('aria-describedby') || $btn.attr('title') || $btn.attr('data-disabled-reason');
  }).length;

  return {
    importance: IMPORTANCE.NICE_TO_HAVE,
    metrics: {
      disabledButtonCount: disabledButtons.length,
      disabledWithExplanation,
      disabledWithoutExplanation: disabledButtons.length - disabledWithExplanation,
      explanationRatio: disabledButtons.length > 0 ? disabledWithExplanation / disabledButtons.length : 1,
    }
  };
}

/**
 * Analyzes NICE_TO_HAVE metrics - Authentication state visibility
 * Helpful but agents can usually detect login state from content
 */
function analyzeAuthenticationState($) {
  return {
    importance: IMPORTANCE.NICE_TO_HAVE,
    metrics: {
      hasAuthStateAttribute: $('[data-authenticated]').length > 0,
      hasLoginLink: $('a[href*="login"], a[href*="signin"], a[href*="sign-in"]').length > 0,
      hasLogoutLink: $('a[href*="logout"], a[href*="signout"], a[href*="sign-out"], form[action*="logout"]').length > 0,
      hasAccountLink: $('a[href*="account"], a[href*="profile"]').length > 0,
      hasUserIdentifier: $('[data-user-id], [data-user-name], [data-user-email]').length > 0,
    }
  };
}

/**
 * Main function to collect all LLM metrics
 * Categorizes by importance and HTML state (served vs rendered)
 */
export function collectLLMMetrics($, url, htmlSource = 'rendered') {
  try {
    const metrics = {
      url,
      htmlSource, // 'served' or 'rendered'

      // ESSENTIAL_SERVED - Work for ALL agents
      semanticHTML: analyzeSemanticHTML($),
      formFields: analyzeFormFields($),
      structuredData: analyzeStructuredData($),

      // ESSENTIAL_RENDERED - Work for browser agents
      dataAttributes: analyzeDataAttributes($),
      errorHandling: analyzeErrorHandling($),

      // NICE_TO_HAVE - Helpful but not critical
      tableData: analyzeTableData($),
      buttonStates: analyzeButtonStates($),
      authenticationState: analyzeAuthenticationState($),
    };

    return metrics;
  } catch (error) {
    global.auditcore.logger.error(`Error collecting LLM metrics for ${url}:`, error);
    return {
      url,
      htmlSource,
      error: error.message,
    };
  }
}

/**
 * Calculate criticality-weighted score for SERVED HTML
 * Focuses on what works for ALL agents (no JavaScript required)
 */
export function calculateServedScore(metrics) {
  if (!metrics || metrics.error) return 0;

  let score = 0;

  // ESSENTIAL: HTTP status codes (handled in backend report)
  // ESSENTIAL: Semantic HTML (30 points)
  if (metrics.semanticHTML?.metrics) {
    const sem = metrics.semanticHTML.metrics;
    if (sem.hasMain) score += 8;
    if (sem.hasNav) score += 7;
    if (sem.hasHeader) score += 5;
    if (sem.hasFooter) score += 5;
    if (sem.hasArticle || sem.hasSection) score += 5;
  }

  // ESSENTIAL: Form field naming (40 points)
  if (metrics.formFields?.metrics) {
    const form = metrics.formFields.metrics;
    score += form.standardNameRatio * 25; // 25 points for standard names
    score += form.labelRatio * 15; // 15 points for labels
  }

  // ESSENTIAL: Structured data (20 points)
  if (metrics.structuredData?.metrics) {
    if (metrics.structuredData.metrics.hasSchemaOrg) score += 20;
  }

  // NICE_TO_HAVE: Tables (10 points) - only if tables exist
  if (metrics.tableData?.metrics && metrics.tableData.metrics.tableCount > 0) {
    const hasProperMarkup = metrics.tableData.metrics.tablesWithScope > 0 &&
                            metrics.tableData.metrics.tablesWithCaption > 0;
    if (hasProperMarkup) score += 10;
  } else if (metrics.tableData?.metrics && metrics.tableData.metrics.tableCount === 0) {
    score += 10; // No tables means no opportunity to fail
  }

  return Math.round(score);
}

/**
 * Calculate criticality-weighted score for RENDERED HTML
 * Focuses on dynamic features for browser-based agents
 */
export function calculateRenderedScore(metrics) {
  if (!metrics || metrics.error) return 0;

  // Start with served score as baseline
  let score = calculateServedScore(metrics);

  // Add RENDERED-specific scoring (bonus points, max 100 total)
  let renderedBonus = 0;
  const maxRenderedBonus = 30;

  // ESSENTIAL_RENDERED: Explicit state (15 points)
  if (metrics.dataAttributes?.metrics) {
    const data = metrics.dataAttributes.metrics;
    if (data.hasDataState) renderedBonus += 7;
    if (data.hasValidationState) renderedBonus += 5;
    if (data.hasLoadingIndicators) renderedBonus += 3;
  }

  // ESSENTIAL_RENDERED: Error handling (15 points)
  if (metrics.errorHandling?.metrics) {
    const err = metrics.errorHandling.metrics;
    if (err.hasPersistentErrors) renderedBonus += 10;
    if (err.hasAriaInvalid) renderedBonus += 5;
  }

  // Cap bonus and ensure max 100
  renderedBonus = Math.min(renderedBonus, maxRenderedBonus);
  score = Math.min(score + renderedBonus, 100);

  return Math.round(score);
}

/**
 * Generate actionable feedback based on metrics
 * Prioritizes ESSENTIAL issues over NICE_TO_HAVE
 */
export function generateFeedback(metrics) {
  const essentialIssues = [];
  const niceToHaveIssues = [];
  const recommendations = [];

  if (!metrics || metrics.error) {
    return {
      essentialIssues: ['Failed to collect LLM metrics'],
      niceToHaveIssues: [],
      recommendations: []
    };
  }

  // ESSENTIAL_SERVED issues
  if (!metrics.semanticHTML?.metrics.hasMain) {
    essentialIssues.push('No <main> element - agents cannot identify primary content');
    recommendations.push('Add <main> element around primary page content');
  }

  if (!metrics.semanticHTML?.metrics.hasNav) {
    essentialIssues.push('No <nav> element - agents cannot identify navigation');
    recommendations.push('Wrap navigation menus in <nav> elements');
  }

  if (metrics.formFields?.metrics && metrics.formFields.metrics.totalInputs > 0) {
    const standardRatio = metrics.formFields.metrics.standardNameRatio;
    if (standardRatio < 0.5) {
      essentialIssues.push(`Only ${Math.round(standardRatio * 100)}% of form fields use standard names`);
      recommendations.push('Use standard field names: email, firstName, lastName, phone, etc.');
    }

    const labelRatio = metrics.formFields.metrics.labelRatio;
    if (labelRatio < 0.8) {
      essentialIssues.push(`${Math.round((1 - labelRatio) * 100)}% of form fields missing labels`);
      recommendations.push('Add <label> or aria-label to all form fields');
    }
  }

  if (!metrics.structuredData?.metrics.hasSchemaOrg) {
    essentialIssues.push('No Schema.org structured data');
    recommendations.push('Add JSON-LD with Schema.org vocabulary for key content');
  }

  // ESSENTIAL_RENDERED issues (for browser agents)
  if (metrics.htmlSource === 'rendered') {
    if (!metrics.dataAttributes?.metrics.hasDataState) {
      niceToHaveIssues.push('No data-state attributes for dynamic content');
      recommendations.push('Add data-state to loading indicators and dynamic content');
    }

    if (!metrics.errorHandling?.metrics.hasPersistentErrors) {
      niceToHaveIssues.push('Error messages may not persist');
      recommendations.push('Use role="alert" and aria-live for persistent errors');
    }
  }

  // NICE_TO_HAVE issues (low priority)
  if (metrics.tableData?.metrics && metrics.tableData.metrics.tableCount > 0) {
    if (metrics.tableData.metrics.tablesWithScope === 0) {
      niceToHaveIssues.push('Tables missing scope attributes');
      recommendations.push('Add scope="col" and scope="row" to table headers');
    }
  }

  return { essentialIssues, niceToHaveIssues, recommendations };
}

/**
 * Updates the results object with LLM metrics
 */
export function updateLLMMetrics($, results, url, htmlSource = 'rendered') {
  if (!results.llmMetrics) {
    results.llmMetrics = [];
  }

  const metrics = collectLLMMetrics($, url, htmlSource);
  results.llmMetrics.push(metrics);

  global.auditcore.logger.debug(`Updated LLM metrics for ${url} (${htmlSource} HTML)`);
}
