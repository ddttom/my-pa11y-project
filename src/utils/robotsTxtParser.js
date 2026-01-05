/**
 * robots.txt Parser and Quality Analyzer
 *
 * Evaluates robots.txt files for AI agent compatibility based on guidance from
 * "The Invisible Users" book (https://github.com/tomcranstoun/invisible-users)
 *
 * Quality Criteria:
 * - Specific user-agent declarations (GPTBot, ClaudeBot, etc.)
 * - Proper access control for sensitive paths
 * - Sitemap references
 * - Clear structure and formatting
 * - AI-specific guidance and llms.txt references
 */

/**
 * Known AI agent user-agent strings
 * Source: invisible-users repository, chapter-10-technical-advice.md
 */
const AI_USER_AGENTS = [
  'GPTBot', // OpenAI
  'ClaudeBot', // Anthropic
  'Claude-Web', // Anthropic web crawler
  'GoogleBot-AI', // Google AI services
  'PerplexityBot', // Perplexity AI
  'Bingbot', // Microsoft Bing (also used for AI)
  'Anthropic-AI', // Anthropic generic
  'cohere-ai', // Cohere
  'ChatGPT-User', // ChatGPT browsing
];

/**
 * Sensitive paths that should typically be disallowed for AI agents
 */
const SENSITIVE_PATHS = [
  '/admin',
  '/account',
  '/cart',
  '/checkout',
  '/login',
  '/auth',
  '/api/private',
  '/user',
  '/profile',
];

/**
 * Parse robots.txt content into structured data
 * @param {string} content - Raw robots.txt content
 * @returns {Object} Parsed robots.txt structure
 */
export function parseRobotsTxt(content) {
  if (!content || typeof content !== 'string') {
    return {
      valid: false,
      userAgents: [],
      rules: [],
      sitemaps: [],
      comments: [],
    };
  }

  const lines = content.split(/\r?\n/);
  const userAgents = [];
  const rules = [];
  const sitemaps = [];
  const comments = [];
  let currentUserAgent = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Comments
    if (trimmed.startsWith('#')) {
      comments.push(trimmed.substring(1).trim());
      continue;
    }

    // Sitemap declarations
    if (trimmed.toLowerCase().startsWith('sitemap:')) {
      const sitemapUrl = trimmed.substring(8).trim();
      sitemaps.push(sitemapUrl);
      continue;
    }

    // User-agent declarations
    if (trimmed.toLowerCase().startsWith('user-agent:')) {
      currentUserAgent = trimmed.substring(11).trim();
      if (!userAgents.includes(currentUserAgent)) {
        userAgents.push(currentUserAgent);
      }
      continue;
    }

    // Allow/Disallow rules
    if (trimmed.toLowerCase().startsWith('allow:') || trimmed.toLowerCase().startsWith('disallow:')) {
      const [directive, ...pathParts] = trimmed.split(':');
      const path = pathParts.join(':').trim();

      rules.push({
        userAgent: currentUserAgent || '*',
        directive: directive.toLowerCase(),
        path,
      });
    }
  }

  return {
    valid: true,
    userAgents,
    rules,
    sitemaps,
    comments,
  };
}

/**
 * Analyze robots.txt quality for AI agent compatibility
 * @param {Object} parsed - Parsed robots.txt structure
 * @returns {Object} Quality analysis results
 */
export function analyzeRobotsTxtQuality(parsed) {
  const analysis = {
    score: 0,
    maxScore: 100,
    issues: [],
    recommendations: [],
    details: {
      hasAIUserAgents: false,
      aiUserAgentsFound: [],
      hasSitemap: false,
      sitemapCount: 0,
      hasSensitivePathProtection: false,
      protectedPaths: [],
      hasLLMsTxtReference: false,
      hasComments: false,
      totalRules: 0,
      structureQuality: 'Unknown',
    },
  };

  // If not valid, return early
  if (!parsed.valid) {
    analysis.issues.push('robots.txt file is missing or invalid');
    analysis.recommendations.push('Create a valid robots.txt file at the site root');
    return analysis;
  }

  let score = 0;

  // 1. Check for AI-specific user agents (30 points)
  const aiAgentsFound = parsed.userAgents.filter((ua) => AI_USER_AGENTS.some((aiAgent) => ua.toLowerCase().includes(aiAgent.toLowerCase())));

  analysis.details.aiUserAgentsFound = aiAgentsFound;
  analysis.details.hasAIUserAgents = aiAgentsFound.length > 0;

  if (aiAgentsFound.length >= 3) {
    score += 30;
    analysis.details.structureQuality = 'Excellent';
  } else if (aiAgentsFound.length >= 1) {
    score += 20;
    analysis.details.structureQuality = 'Good';
    analysis.recommendations.push(`Add more AI user-agent declarations (found ${aiAgentsFound.length}, recommend 3+)`);
  } else {
    score += 5;
    analysis.details.structureQuality = 'Basic';
    analysis.issues.push('No AI-specific user agents found (e.g., GPTBot, ClaudeBot)');
    analysis.recommendations.push('Add specific user-agent declarations for AI crawlers');
  }

  // 2. Check for sitemap references (20 points)
  analysis.details.hasSitemap = parsed.sitemaps.length > 0;
  analysis.details.sitemapCount = parsed.sitemaps.length;

  if (parsed.sitemaps.length > 0) {
    score += 20;
  } else {
    analysis.issues.push('No sitemap reference found');
    analysis.recommendations.push('Add "Sitemap: <URL>" declaration to help AI agents discover content');
  }

  // 3. Check for sensitive path protection (25 points)
  const protectedPaths = [];

  for (const rule of parsed.rules) {
    if (rule.directive === 'disallow') {
      const matchesSensitive = SENSITIVE_PATHS.some((sensitive) => rule.path.toLowerCase().startsWith(sensitive.toLowerCase()));
      if (matchesSensitive && !protectedPaths.includes(rule.path)) {
        protectedPaths.push(rule.path);
      }
    }
  }

  analysis.details.protectedPaths = protectedPaths;
  analysis.details.hasSensitivePathProtection = protectedPaths.length > 0;

  if (protectedPaths.length >= 3) {
    score += 25;
  } else if (protectedPaths.length >= 1) {
    score += 15;
    analysis.recommendations.push('Consider protecting more sensitive paths (admin, account, cart, checkout)');
  } else {
    analysis.issues.push('No sensitive paths are protected (admin, account, cart, checkout)');
    analysis.recommendations.push('Add Disallow rules for sensitive areas to prevent AI access');
  }

  // 4. Check for llms.txt references in comments (15 points)
  const hasLLMsReference = parsed.comments.some((comment) => comment.toLowerCase().includes('llms.txt') || comment.toLowerCase().includes('llms-txt'));

  analysis.details.hasLLMsTxtReference = hasLLMsReference;

  if (hasLLMsReference) {
    score += 15;
  } else {
    analysis.recommendations.push('Add comment referencing llms.txt for comprehensive AI guidance');
  }

  // 5. Check for helpful comments and documentation (10 points)
  analysis.details.hasComments = parsed.comments.length > 0;

  if (parsed.comments.length >= 3) {
    score += 10;
  } else if (parsed.comments.length >= 1) {
    score += 5;
  } else {
    analysis.recommendations.push('Add comments to explain AI access policies');
  }

  // 6. Overall structure and completeness (bonus points if everything present)
  analysis.details.totalRules = parsed.rules.length;

  if (analysis.details.hasAIUserAgents
      && analysis.details.hasSitemap
      && analysis.details.hasSensitivePathProtection
      && analysis.details.hasLLMsTxtReference) {
    score += 10; // Bonus for completeness
  }

  analysis.score = Math.min(score, analysis.maxScore);

  // Add overall assessment
  if (analysis.score >= 80) {
    analysis.quality = 'Excellent';
  } else if (analysis.score >= 60) {
    analysis.quality = 'Good';
  } else if (analysis.score >= 40) {
    analysis.quality = 'Fair';
  } else {
    analysis.quality = 'Poor';
  }

  return analysis;
}

/**
 * Process robots.txt URL and return quality analysis
 * @param {string} robotsTxtUrl - URL to robots.txt file
 * @param {string} content - Raw robots.txt content (if already fetched)
 * @returns {Promise<Object>} Quality analysis results
 */
export async function processRobotsTxt(robotsTxtUrl, content = null) {
  try {
    // If content not provided, it should be fetched by the caller
    if (!content) {
      throw new Error('robots.txt content must be provided');
    }

    const parsed = parseRobotsTxt(content);
    const analysis = analyzeRobotsTxtQuality(parsed);

    return {
      url: robotsTxtUrl,
      exists: true,
      content,
      parsed,
      analysis,
    };
  } catch (error) {
    return {
      url: robotsTxtUrl,
      exists: false,
      error: error.message,
      analysis: {
        score: 0,
        maxScore: 100,
        quality: 'Missing',
        issues: ['robots.txt file not found or inaccessible'],
        recommendations: ['Create a robots.txt file at the site root'],
        details: {},
      },
    };
  }
}
