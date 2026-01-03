/**
 * llms.txt Parser and Quality Analyzer
 *
 * Evaluates llms.txt files for AI agent compatibility based on guidance from
 * "The Invisible Users" book (https://github.com/tomcranstoun/invisible-users)
 * and the llmstxt.org specification.
 *
 * Quality Criteria:
 * - Core elements present (title, description, contact, last updated)
 * - Comprehensive sections (access guidelines, rate limits, restrictions)
 * - Clear structure and markdown formatting
 * - Specific and actionable guidance
 * - Complete policy documentation
 */

/**
 * Required core elements for a quality llms.txt file
 */
const CORE_ELEMENTS = {
  TITLE: 'title', // H1 heading
  DESCRIPTION: 'description', // Clear site description
  CONTACT: 'contact', // Contact information
  LAST_UPDATED: 'lastUpdated', // Version timestamp
};

/**
 * Important sections for comprehensive llms.txt
 */
const IMPORTANT_SECTIONS = {
  ACCESS_GUIDELINES: ['access', 'guidelines', 'rate limit', 'usage'],
  CONTENT_RESTRICTIONS: ['restrictions', 'prohibited', 'disallow', 'off-limits'],
  API_ACCESS: ['api', 'endpoint', 'authentication'],
  TRAINING_GUIDELINES: ['training', 'machine learning', 'data usage'],
  ATTRIBUTION: ['attribution', 'credit', 'citation'],
  ERROR_HANDLING: ['error', 'retry', 'fallback'],
};

/**
 * Site types that should be declared
 * Note: These are documentation for reference, not enforced in validation
 */
// const SITE_TYPES = [
//   'E-Commerce',
//   'Content-Driven',
//   'API-Driven',
//   'Document-Driven',
//   'Informative',
//   'Entertainment',
//   'SaaS',
//   'Transactional',
// ];

/**
 * Parse llms.txt content into structured data
 * @param {string} content - Raw llms.txt content
 * @returns {Object} Parsed llms.txt structure
 */
export function parseLlmsTxt(content) {
  if (!content || typeof content !== 'string') {
    return {
      valid: false,
      hasTitle: false,
      hasDescription: false,
      hasContact: false,
      hasLastUpdated: false,
      sections: [],
      headings: [],
      links: [],
      wordCount: 0,
    };
  }

  const result = {
    valid: true,
    hasTitle: false,
    title: null,
    hasDescription: false,
    description: null,
    hasContact: false,
    contact: null,
    hasLastUpdated: false,
    lastUpdated: null,
    hasSiteType: false,
    siteType: null,
    sections: [],
    headings: [],
    links: [],
    wordCount: 0,
    lineCount: 0,
  };

  const lines = content.split(/\r?\n/);
  result.lineCount = lines.length;
  result.wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Check for H1 title (first heading)
    if (trimmed.startsWith('# ') && !result.hasTitle) {
      result.hasTitle = true;
      result.title = trimmed.substring(2).trim();
      result.headings.push({ level: 1, text: result.title, line: i + 1 });
      continue;
    }

    // Check for other headings
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#+)\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        result.headings.push({ level, text, line: i + 1 });

        currentSection = {
          heading: text,
          level,
          line: i + 1,
          content: [],
        };
        result.sections.push(currentSection);
      }
      continue;
    }

    // Check for contact information
    if (trimmed.toLowerCase().includes('contact:') || trimmed.toLowerCase().match(/\*\*contact\*\*:/i)) {
      result.hasContact = true;
      const contactMatch = trimmed.match(/contact[:\s]+(.+)/i);
      if (contactMatch) {
        result.contact = contactMatch[1].trim();
      }
    }

    // Check for last updated
    if (trimmed.toLowerCase().includes('last updated:') || trimmed.toLowerCase().match(/\*\*last updated\*\*:/i)) {
      result.hasLastUpdated = true;
      const dateMatch = trimmed.match(/last updated[:\s]+(.+)/i);
      if (dateMatch) {
        result.lastUpdated = dateMatch[1].trim();
      }
    }

    // Check for site type
    if (trimmed.toLowerCase().includes('site type:') || trimmed.toLowerCase().match(/\*\*site type\*\*:/i)) {
      result.hasSiteType = true;
      const typeMatch = trimmed.match(/site type[:\s]+(.+)/i);
      if (typeMatch) {
        result.siteType = typeMatch[1].trim();
      }
    }

    // Check for description (first substantial paragraph after title)
    if (!result.hasDescription && result.hasTitle && trimmed.length > 20 && !trimmed.startsWith('#') && !trimmed.startsWith('**')) {
      result.hasDescription = true;
      result.description = trimmed;
    }

    // Extract links
    const linkMatches = trimmed.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const match of linkMatches) {
      result.links.push({
        text: match[1],
        url: match[2],
        line: i + 1,
      });
    }

    // Add content to current section
    if (currentSection) {
      currentSection.content.push(trimmed);
    }
  }

  return result;
}

/**
 * Analyze llms.txt quality for AI agent compatibility
 * @param {Object} parsed - Parsed llms.txt structure
 * @param {string} content - Raw content for additional checks
 * @returns {Object} Quality analysis results
 */
export function analyzeLlmsTxtQuality(parsed, content = '') {
  const analysis = {
    score: 0,
    maxScore: 100,
    issues: [],
    recommendations: [],
    details: {
      coreElementsPresent: 0,
      coreElementsTotal: Object.keys(CORE_ELEMENTS).length,
      sectionsPresent: 0,
      sectionsTotal: Object.keys(IMPORTANT_SECTIONS).length,
      hasStructuredContent: false,
      contentLength: 'Unknown',
      specificityLevel: 'Unknown',
    },
  };

  // If not valid, return early
  if (!parsed.valid) {
    analysis.issues.push('llms.txt file is missing or invalid');
    analysis.recommendations.push('Create a valid llms.txt file at the site root');
    return analysis;
  }

  let score = 0;

  // 1. Core Elements (40 points total - 10 points each)
  let coreElementsScore = 0;

  if (parsed.hasTitle) {
    coreElementsScore += 10;
    analysis.details.coreElementsPresent++;
  } else {
    analysis.issues.push('Missing H1 title identifying the site');
    analysis.recommendations.push('Add H1 heading as first element (# Site Name)');
  }

  if (parsed.hasDescription) {
    coreElementsScore += 10;
    analysis.details.coreElementsPresent++;
  } else {
    analysis.issues.push('Missing clear description of site purpose');
    analysis.recommendations.push('Add concise description of what the site does');
  }

  if (parsed.hasContact) {
    coreElementsScore += 10;
    analysis.details.coreElementsPresent++;
  } else {
    analysis.issues.push('Missing contact information for AI policy questions');
    analysis.recommendations.push('Add contact email or form for AI access inquiries');
  }

  if (parsed.hasLastUpdated) {
    coreElementsScore += 10;
    analysis.details.coreElementsPresent++;
  } else {
    analysis.issues.push('Missing "Last Updated" timestamp');
    analysis.recommendations.push('Add **Last updated:** [Date] for version tracking');
  }

  score += coreElementsScore;

  // 2. Important Sections (30 points total - 5 points each for 6 sections)
  let sectionsScore = 0;
  const sectionHeadings = parsed.headings.map((h) => h.text.toLowerCase());

  for (const [sectionName, keywords] of Object.entries(IMPORTANT_SECTIONS)) {
    const hasSection = sectionHeadings.some((heading) => keywords.some((keyword) => heading.includes(keyword)));

    if (hasSection) {
      sectionsScore += 5;
      analysis.details.sectionsPresent++;
    } else {
      const sectionLabel = sectionName.replace(/_/g, ' ').toLowerCase();
      analysis.recommendations.push(`Add section for ${sectionLabel}`);
    }
  }

  score += sectionsScore;

  // 3. Content Structure and Length (15 points)
  if (parsed.wordCount >= 200) {
    score += 15;
    analysis.details.contentLength = 'Comprehensive';
    analysis.details.hasStructuredContent = true;
  } else if (parsed.wordCount >= 100) {
    score += 10;
    analysis.details.contentLength = 'Adequate';
    analysis.recommendations.push(`Expand content with more specific guidance (current: ${parsed.wordCount} words)`);
  } else if (parsed.wordCount >= 50) {
    score += 5;
    analysis.details.contentLength = 'Minimal';
    analysis.recommendations.push('Add more detailed sections and guidance');
  } else {
    analysis.details.contentLength = 'Insufficient';
    analysis.issues.push('Very brief content - needs substantial expansion');
  }

  // 4. Links and Documentation (10 points)
  if (parsed.links.length >= 5) {
    score += 10;
  } else if (parsed.links.length >= 3) {
    score += 7;
    analysis.recommendations.push('Add more documentation links (API docs, policies, etc.)');
  } else if (parsed.links.length >= 1) {
    score += 4;
    analysis.recommendations.push('Include links to key resources and documentation');
  } else {
    analysis.issues.push('No documentation links found');
    analysis.recommendations.push('Add links to API documentation, policies, and resources');
  }

  // 5. Specificity and Detail (5 points)
  // Check for specific patterns indicating detailed guidance
  const hasRateLimits = content.toLowerCase().includes('rate')
                        && (content.includes('per hour') || content.includes('per minute'));
  const hasAPIEndpoints = content.toLowerCase().includes('endpoint') || content.toLowerCase().includes('api/');
  const hasSpecificPaths = content.includes('/') && (content.includes('admin') || content.includes('api'));

  let specificityCount = 0;
  if (hasRateLimits) specificityCount++;
  if (hasAPIEndpoints) specificityCount++;
  if (hasSpecificPaths) specificityCount++;

  if (specificityCount >= 2) {
    score += 5;
    analysis.details.specificityLevel = 'High';
  } else if (specificityCount === 1) {
    score += 3;
    analysis.details.specificityLevel = 'Medium';
    analysis.recommendations.push('Add more specific details (rate limits, endpoints, paths)');
  } else {
    analysis.details.specificityLevel = 'Low';
    analysis.recommendations.push('Include specific rate limits, API endpoints, and restricted paths');
  }

  // Bonus points for exceptional quality
  if (parsed.hasSiteType) {
    score += 3;
  } else {
    analysis.recommendations.push('Declare site type (E-Commerce, Content-Driven, API-Driven, etc.)');
  }

  if (parsed.headings.length >= 5) {
    score += 2; // Well-structured with multiple sections
  }

  analysis.score = Math.min(score, analysis.maxScore);

  // Add overall assessment
  if (analysis.score >= 85) {
    analysis.quality = 'Excellent';
  } else if (analysis.score >= 70) {
    analysis.quality = 'Good';
  } else if (analysis.score >= 50) {
    analysis.quality = 'Fair';
  } else if (analysis.score >= 30) {
    analysis.quality = 'Poor';
  } else {
    analysis.quality = 'Very Poor';
  }

  return analysis;
}

/**
 * Process llms.txt URL and return quality analysis
 * @param {string} llmsTxtUrl - URL to llms.txt file
 * @param {string} content - Raw llms.txt content (if already fetched)
 * @returns {Promise<Object>} Quality analysis results
 */
export async function processLlmsTxt(llmsTxtUrl, content = null) {
  try {
    // If content not provided, it should be fetched by the caller
    if (!content) {
      throw new Error('llms.txt content must be provided');
    }

    const parsed = parseLlmsTxt(content);
    const analysis = analyzeLlmsTxtQuality(parsed, content);

    return {
      url: llmsTxtUrl,
      exists: true,
      content,
      parsed,
      analysis,
    };
  } catch (error) {
    return {
      url: llmsTxtUrl,
      exists: false,
      error: error.message,
      analysis: {
        score: 0,
        maxScore: 100,
        quality: 'Missing',
        issues: ['llms.txt file not found or inaccessible'],
        recommendations: ['Create a comprehensive llms.txt file following llmstxt.org specification'],
        details: {},
      },
    };
  }
}
