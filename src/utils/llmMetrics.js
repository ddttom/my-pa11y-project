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
  ESSENTIAL_SERVED: 'essential_served', // Works for all agents
  ESSENTIAL_RENDERED: 'essential_rendered', // Works for browser agents
  NICE_TO_HAVE: 'nice_to_have', // Speculative, not critical
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
    },
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
    'dateOfBirth', 'date_of_birth', 'company', 'company_name', 'quantity',
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
    if (standardNames.some((std) => name === std || id === std)) {
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
    },
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
    },
  };
}

/**
 * Analyzes ESSENTIAL_SERVED metrics - llms.txt file detection
 * Critical: llms.txt provides structured information for LLM agents
 * See: https://llmstxt.org/ or https://github.com/cfahlgren1/llms-txt
 */
function analyzeLLMsTxt($) {
  // Check for llms.txt link in the page
  const llmsTxtLink = $('link[href*="llms.txt"], a[href*="llms.txt"]').first();
  const hasLLMsTxtReference = llmsTxtLink.length > 0;

  // Check for llms.txt metadata
  const llmsTxtMeta = $('meta[name="llms-txt"], meta[property="llms:txt"]').first();
  const hasLLMsTxtMeta = llmsTxtMeta.length > 0;

  return {
    importance: IMPORTANCE.ESSENTIAL_SERVED,
    metrics: {
      hasLLMsTxtReference,
      hasLLMsTxtMeta,
      llmsTxtUrl: hasLLMsTxtReference ? llmsTxtLink.attr('href') : null,
      // Note: Actual llms.txt content would be fetched separately by the pageAnalyzer
      // This is just detecting the presence of the reference
    },
  };
}

/**
 * Analyzes ESSENTIAL_SERVED metrics - robots.txt and ai.txt detection
 * Critical: These files control agent access and provide agent-specific instructions
 */
function analyzeRobotsTxt($) {
  // Check for robots.txt and ai.txt references
  const robotsTxtLink = $('link[href*="robots.txt"], a[href*="robots.txt"]').first();
  const aiTxtLink = $('link[href*="ai.txt"], a[href*="ai.txt"]').first();

  // Check for robots meta tag
  const robotsMeta = $('meta[name="robots"]').attr('content');
  const hasRobotsMeta = !!robotsMeta;
  const robotsMetaContent = robotsMeta || '';

  // Parse robots meta directives
  const isNoIndex = robotsMetaContent.includes('noindex');
  const isNoFollow = robotsMetaContent.includes('nofollow');
  const isNoArchive = robotsMetaContent.includes('noarchive');
  const hasAgentRestrictions = isNoIndex || isNoFollow || isNoArchive;

  return {
    importance: IMPORTANCE.ESSENTIAL_SERVED,
    metrics: {
      hasRobotsTxtReference: robotsTxtLink.length > 0,
      hasAiTxtReference: aiTxtLink.length > 0,
      hasRobotsMeta,
      robotsMetaContent,
      isNoIndex,
      isNoFollow,
      isNoArchive,
      hasAgentRestrictions,
      // Note: Actual robots.txt and ai.txt content would be fetched at domain level
    },
  };
}

/**
 * Analyzes ESSENTIAL_SERVED metrics - Form autocomplete attributes
 * Critical: Autocomplete helps agents understand field purpose and fill forms correctly
 */
function analyzeFormAutocomplete($) {
  const inputs = $('input, select, textarea');
  let fieldsWithAutocomplete = 0;
  let fieldsWithoutAutocomplete = 0;
  const autocompleteValues = [];

  inputs.each((_, el) => {
    const $input = $(el);
    const autocomplete = $input.attr('autocomplete');
    const type = $input.attr('type');

    // Skip hidden, submit, button inputs
    if (type === 'hidden' || type === 'submit' || type === 'button' || $input.is('button')) {
      return;
    }

    if (autocomplete) {
      fieldsWithAutocomplete++;
      if (!autocompleteValues.includes(autocomplete)) {
        autocompleteValues.push(autocomplete);
      }
    } else {
      fieldsWithoutAutocomplete++;
    }
  });

  const totalRelevantFields = fieldsWithAutocomplete + fieldsWithoutAutocomplete;
  const autocompleteRatio = totalRelevantFields > 0 ? fieldsWithAutocomplete / totalRelevantFields : 1;

  return {
    importance: IMPORTANCE.ESSENTIAL_SERVED,
    metrics: {
      totalFormFields: totalRelevantFields,
      fieldsWithAutocomplete,
      fieldsWithoutAutocomplete,
      autocompleteRatio,
      autocompleteValues,
      hasGoodAutocompleteCoverage: autocompleteRatio >= 0.7,
    },
  };
}

/**
 * Analyzes NICE_TO_HAVE metrics - CAPTCHA and bot protection detection
 * Important: Agents need to know if human verification is required
 */
function analyzeCaptchaAndBotProtection($) {
  // Common CAPTCHA indicators
  const hasRecaptcha = $('.g-recaptcha, [data-sitekey]').length > 0
                       || $('script[src*="recaptcha"]').length > 0;
  const hasHCaptcha = $('.h-captcha').length > 0
                      || $('script[src*="hcaptcha"]').length > 0;
  const hasTurnstile = $('[data-sitekey], script[src*="turnstile"]').length > 0
                       && $('script[src*="cloudflare"]').length > 0;

  // Generic CAPTCHA/challenge indicators
  const hasCaptchaKeyword = $('*').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('captcha') || text.includes('verify you are human')
           || text.includes('security check') || text.includes('bot protection');
  }).length > 0;

  // Cloudflare challenge indicator
  const hasCloudflareChallenge = $('script[src*="cloudflare"]').length > 0
                                  || $('.cf-browser-verification').length > 0;

  const hasCaptcha = hasRecaptcha || hasHCaptcha || hasTurnstile || hasCaptchaKeyword;
  const hasBotProtection = hasCaptcha || hasCloudflareChallenge;

  return {
    importance: IMPORTANCE.NICE_TO_HAVE,
    metrics: {
      hasCaptcha,
      hasRecaptcha,
      hasHCaptcha,
      hasTurnstile,
      hasCloudflareChallenge,
      hasBotProtection,
      captchaType: hasRecaptcha ? 'reCAPTCHA'
        : hasHCaptcha ? 'hCaptcha'
          : hasTurnstile ? 'Turnstile'
            : hasCaptcha ? 'Unknown' : 'None',
    },
  };
}

/**
 * Analyzes NICE_TO_HAVE metrics - API endpoint discoverability
 * Helps agents find and use APIs for programmatic access
 */
function analyzeApiEndpoints($) {
  // Look for API documentation links
  const apiLinks = $('a[href*="/api"], a[href*="/docs"], a[href*="/swagger"], a[href*="/openapi"]');
  const hasApiDocs = apiLinks.length > 0;

  // Check for API-related meta tags
  const hasApiMeta = $('meta[name*="api"], meta[property*="api"]').length > 0;

  // Look for REST/GraphQL indicators
  const hasRestIndicators = $('script, link').filter((_, el) => {
    const src = $(el).attr('src') || $(el).attr('href') || '';
    return src.includes('/api/') || src.includes('/rest/');
  }).length > 0;

  const hasGraphQLIndicators = $('script, link').filter((_, el) => {
    const src = $(el).attr('src') || $(el).attr('href') || '';
    return src.includes('graphql');
  }).length > 0;

  // Check for OpenAPI/Swagger links
  const hasOpenApiSpec = $('link[rel="alternate"][type="application/json"]').filter((_, el) => {
    const href = $(el).attr('href') || '';
    return href.includes('openapi') || href.includes('swagger');
  }).length > 0;

  const apiEndpointScore = (hasApiDocs ? 25 : 0)
                           + (hasOpenApiSpec ? 25 : 0)
                           + (hasRestIndicators ? 15 : 0)
                           + (hasGraphQLIndicators ? 15 : 0);

  return {
    importance: IMPORTANCE.NICE_TO_HAVE,
    metrics: {
      hasApiDocs,
      hasApiMeta,
      hasRestIndicators,
      hasGraphQLIndicators,
      hasOpenApiSpec,
      apiDiscoverabilityScore: apiEndpointScore,
      apiLinksCount: apiLinks.length,
    },
  };
}

/**
 * Analyzes ESSENTIAL_RENDERED metrics - Dynamic state visibility
 * Important for browser-based agents that execute JavaScript
 */
function analyzeDataAttributes($) {
  const elements = $('[data-state], [data-authenticated], [data-validation-state], [data-error-code], [data-loading]');

  // Check for data-agent-visible attribute (explicit agent visibility control)
  const agentVisibleElements = $('[data-agent-visible]');
  const visibleToAgents = agentVisibleElements.filter((_, el) => {
    const value = $(el).attr('data-agent-visible');
    return value === 'true' || value === '';
  }).length;
  const hiddenFromAgents = agentVisibleElements.filter((_, el) => {
    const value = $(el).attr('data-agent-visible');
    return value === 'false';
  }).length;

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
      // data-agent-visible attributes
      hasAgentVisibilityControl: agentVisibleElements.length > 0,
      agentVisibleCount: agentVisibleElements.length,
      visibleToAgents,
      hiddenFromAgents,
    },
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
    },
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
    return $el.attr('data-price') || $el.attr('data-currency')
           || $el.attr('data-quantity') || $el.attr('data-in-stock')
           || $el.attr('data-product-id') || $el.attr('data-rating');
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
    },
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
    },
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
    },
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
      llmsTxt: analyzeLLMsTxt($),
      robotsTxt: analyzeRobotsTxt($),
      formAutocomplete: analyzeFormAutocomplete($),

      // ESSENTIAL_RENDERED - Work for browser agents
      dataAttributes: analyzeDataAttributes($),
      errorHandling: analyzeErrorHandling($),

      // NICE_TO_HAVE - Helpful but not critical
      tableData: analyzeTableData($),
      buttonStates: analyzeButtonStates($),
      authenticationState: analyzeAuthenticationState($),
      captchaProtection: analyzeCaptchaAndBotProtection($),
      apiEndpoints: analyzeApiEndpoints($),
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
  // ESSENTIAL: Semantic HTML (20 points)
  if (metrics.semanticHTML?.metrics) {
    const sem = metrics.semanticHTML.metrics;
    if (sem.hasMain) score += 6;
    if (sem.hasNav) score += 5;
    if (sem.hasHeader) score += 3;
    if (sem.hasFooter) score += 3;
    if (sem.hasArticle || sem.hasSection) score += 3;
  }

  // ESSENTIAL: Form field naming (25 points)
  if (metrics.formFields?.metrics) {
    const form = metrics.formFields.metrics;
    score += form.standardNameRatio * 15; // 15 points for standard names
    score += form.labelRatio * 10; // 10 points for labels
  }

  // ESSENTIAL: Form autocomplete (15 points)
  if (metrics.formAutocomplete?.metrics) {
    score += metrics.formAutocomplete.metrics.autocompleteRatio * 15;
  }

  // ESSENTIAL: Structured data (15 points)
  if (metrics.structuredData?.metrics) {
    if (metrics.structuredData.metrics.hasSchemaOrg) score += 15;
  }

  // ESSENTIAL: llms.txt presence (10 points)
  if (metrics.llmsTxt?.metrics) {
    if (metrics.llmsTxt.metrics.hasLLMsTxtReference || metrics.llmsTxt.metrics.hasLLMsTxtMeta) {
      score += 10;
    }
  }

  // ESSENTIAL: robots.txt/ai.txt (5 points bonus for ai.txt, -5 penalty for restrictive robots)
  if (metrics.robotsTxt?.metrics) {
    if (metrics.robotsTxt.metrics.hasAiTxtReference) score += 5;
    if (metrics.robotsTxt.metrics.hasAgentRestrictions) score -= 5;
  }

  // NICE_TO_HAVE: Tables (10 points) - only if tables exist
  if (metrics.tableData?.metrics && metrics.tableData.metrics.tableCount > 0) {
    const hasProperMarkup = metrics.tableData.metrics.tablesWithScope > 0
                            && metrics.tableData.metrics.tablesWithCaption > 0;
    if (hasProperMarkup) score += 10;
  } else if (metrics.tableData?.metrics && metrics.tableData.metrics.tableCount === 0) {
    score += 10; // No tables means no opportunity to fail
  }

  // Ensure score doesn't go below 0 or above 100
  return Math.max(0, Math.min(100, Math.round(score)));
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
 * Helper to add recommendation with priority, effort, and book reference metadata
 */
function addRecommendation(recommendations, recommendationsWithPriority, text, priority, effort, bookReference) {
  recommendations.push(text);
  recommendationsWithPriority.push({
    text,
    priority,
    effort,
    bookReference,
  });
}

/**
 * Generate actionable feedback based on metrics
 * Prioritizes ESSENTIAL issues over NICE_TO_HAVE
 */
export function generateFeedback(metrics) {
  const essentialIssues = [];
  const niceToHaveIssues = [];
  const recommendations = [];
  const recommendationsWithPriority = [];

  if (!metrics || metrics.error) {
    return {
      essentialIssues: ['Failed to collect LLM metrics'],
      niceToHaveIssues: [],
      recommendations: [],
      recommendationsWithPriority: [],
    };
  }

  // ESSENTIAL_SERVED issues
  if (!metrics.semanticHTML?.metrics.hasMain) {
    essentialIssues.push('No <main> element - agents cannot identify primary content');
    addRecommendation(
      recommendations,
      recommendationsWithPriority,
      'Add <main> element around primary page content',
      'Critical',
      'Low',
      'Chapter 10: Technical Patterns - Semantic HTML Structure',
    );
  }

  if (!metrics.semanticHTML?.metrics.hasNav) {
    essentialIssues.push('No <nav> element - agents cannot identify navigation');
    addRecommendation(
      recommendations,
      recommendationsWithPriority,
      'Wrap navigation menus in <nav> elements',
      'Critical',
      'Low',
      'Chapter 10: Technical Patterns - Semantic HTML Structure',
    );
  }

  if (metrics.formFields?.metrics && metrics.formFields.metrics.totalInputs > 0) {
    const standardRatio = metrics.formFields.metrics.standardNameRatio;
    if (standardRatio < 0.5) {
      essentialIssues.push(`Only ${Math.round(standardRatio * 100)}% of form fields use standard names`);
      addRecommendation(
        recommendations,
        recommendationsWithPriority,
        'Use standard field names: email, firstName, lastName, phone, etc.',
        'Critical',
        'Low',
        'Chapter 10: Technical Patterns - Form Field Naming',
      );
    }

    const { labelRatio } = metrics.formFields.metrics;
    if (labelRatio < 0.8) {
      essentialIssues.push(`${Math.round((1 - labelRatio) * 100)}% of form fields missing labels`);
      addRecommendation(
        recommendations,
        recommendationsWithPriority,
        'Add <label> or aria-label to all form fields',
        'High',
        'Low',
        'Chapter 10: Technical Patterns - Form Accessibility',
      );
    }
  }

  if (!metrics.structuredData?.metrics.hasSchemaOrg) {
    essentialIssues.push('No Schema.org structured data');
    addRecommendation(
      recommendations,
      recommendationsWithPriority,
      'Add JSON-LD with Schema.org vocabulary for key content',
      'Critical',
      'Low',
      'Chapter 10: Technical Patterns - Structured Data',
    );
  }

  if (!metrics.llmsTxt?.metrics.hasLLMsTxtReference && !metrics.llmsTxt?.metrics.hasLLMsTxtMeta) {
    essentialIssues.push('No llms.txt file detected');
    addRecommendation(
      recommendations,
      recommendationsWithPriority,
      'Add llms.txt file at site root for LLM agent discovery (see llmstxt.org)',
      'Critical',
      'Low',
      'Chapter 11: Agent-Friendly Patterns - llms.txt Specification',
    );
  }

  // Form autocomplete issues
  if (metrics.formAutocomplete?.metrics && metrics.formAutocomplete.metrics.totalFormFields > 0) {
    const { autocompleteRatio } = metrics.formAutocomplete.metrics;
    if (autocompleteRatio < 0.5) {
      essentialIssues.push(`Only ${Math.round(autocompleteRatio * 100)}% of form fields have autocomplete attributes`);
      addRecommendation(
        recommendations,
        recommendationsWithPriority,
        'Add autocomplete attributes to form fields (e.g., autocomplete="email", "name", "tel")',
        'High',
        'Low',
        'Chapter 10: Technical Patterns - Form Autocomplete',
      );
    }
  }

  // Robots.txt and ai.txt issues
  if (metrics.robotsTxt?.metrics) {
    if (metrics.robotsTxt.metrics.hasAgentRestrictions) {
      essentialIssues.push('Page has robot restrictions (noindex/nofollow) that may block agents');
      addRecommendation(
        recommendations,
        recommendationsWithPriority,
        'Review robots meta tags - consider allowing agent access where appropriate',
        'High',
        'Low',
        'Chapter 9: Access Control - Robot Restrictions',
      );
    }
    if (!metrics.robotsTxt.metrics.hasAiTxtReference) {
      niceToHaveIssues.push('No ai.txt file detected for AI-specific instructions');
      addRecommendation(
        recommendations,
        recommendationsWithPriority,
        'Consider adding ai.txt file for AI agent-specific guidance',
        'Low',
        'Low',
        'Chapter 11: Agent-Friendly Patterns - ai.txt File',
      );
    }
  }

  // ESSENTIAL_RENDERED issues (for browser agents)
  if (metrics.htmlSource === 'rendered') {
    if (!metrics.dataAttributes?.metrics.hasDataState) {
      niceToHaveIssues.push('No data-state attributes for dynamic content');
      addRecommendation(
        recommendations,
        recommendationsWithPriority,
        'Add data-state to loading indicators and dynamic content',
        'Medium',
        'Moderate',
        'Chapter 10: Technical Patterns - Explicit State Attributes',
      );
    }

    if (!metrics.dataAttributes?.metrics.hasAgentVisibilityControl) {
      niceToHaveIssues.push('No data-agent-visible attributes found');
      addRecommendation(
        recommendations,
        recommendationsWithPriority,
        'Consider using data-agent-visible to explicitly control agent visibility',
        'Medium',
        'Low',
        'Chapter 11: Agent-Friendly Patterns - Agent Visibility Control',
      );
    }

    if (!metrics.errorHandling?.metrics.hasPersistentErrors) {
      niceToHaveIssues.push('Error messages may not persist');
      addRecommendation(
        recommendations,
        recommendationsWithPriority,
        'Use role="alert" and aria-live for persistent errors',
        'High',
        'Moderate',
        'Chapter 10: Technical Patterns - Error Handling',
      );
    }
  }

  // NICE_TO_HAVE issues (low priority)
  if (metrics.captchaProtection?.metrics?.hasBotProtection) {
    niceToHaveIssues.push(`Bot protection detected: ${metrics.captchaProtection.metrics.captchaType}`);
    addRecommendation(
      recommendations,
      recommendationsWithPriority,
      'Bot protection may prevent agent access - consider alternative verification for agents',
      'Medium',
      'High',
      'Chapter 9: Access Control - CAPTCHA and Bot Protection',
    );
  }

  if (metrics.apiEndpoints?.metrics && metrics.apiEndpoints.metrics.apiDiscoverabilityScore < 25) {
    niceToHaveIssues.push('Low API endpoint discoverability');
    addRecommendation(
      recommendations,
      recommendationsWithPriority,
      'Add API documentation links and OpenAPI/Swagger specifications for agent access',
      'Medium',
      'Moderate',
      'Chapter 12: API-First Design - API Discoverability',
    );
  }

  if (metrics.tableData?.metrics && metrics.tableData.metrics.tableCount > 0) {
    if (metrics.tableData.metrics.tablesWithScope === 0) {
      niceToHaveIssues.push('Tables missing scope attributes');
      addRecommendation(
        recommendations,
        recommendationsWithPriority,
        'Add scope="col" and scope="row" to table headers',
        'Low',
        'Low',
        'Chapter 10: Technical Patterns - Table Semantics',
      );
    }
  }

  return {
    essentialIssues,
    niceToHaveIssues,
    recommendations,
    recommendationsWithPriority,
  };
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
