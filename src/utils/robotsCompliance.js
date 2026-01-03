/**
 * robots.txt Compliance Checker
 *
 * Validates whether scraping is allowed based on robots.txt directives.
 * Implements the robots exclusion standard (https://www.robotstxt.org/)
 *
 * Features:
 * - Parses robots.txt and checks user-agent rules
 * - Evaluates Allow/Disallow directives with pattern matching
 * - Respects rule precedence (most specific wins)
 * - Interactive prompts for blocked URLs
 * - Force-scrape override capability
 */

import readline from 'readline';

/**
 * User agent string for this tool
 */
const USER_AGENT = 'WebAuditSuite/1.0';

/**
 * Check if a URL is allowed to be scraped according to robots.txt
 * @param {Object} robotsTxtData - Parsed robots.txt data from robotsTxtParser
 * @param {string} url - URL to check
 * @param {string} userAgent - User agent string (default: WebAuditSuite/1.0)
 * @returns {Object} { allowed: boolean, matchedRule: string|null, reason: string }
 */
export function isUrlAllowed(robotsTxtData, url, userAgent = USER_AGENT) {
  if (!robotsTxtData || !robotsTxtData.parsed || !robotsTxtData.parsed.valid) {
    // If robots.txt doesn't exist or is invalid, allow scraping (permissive default)
    return {
      allowed: true,
      matchedRule: null,
      reason: 'No valid robots.txt found - allowing by default',
    };
  }

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search; // Include query string
    const { rules } = robotsTxtData.parsed;

    // Find applicable rules for our user agent
    // Rules are checked in this order: specific user agent, then '*' (wildcard)
    const applicableRules = rules.filter((rule) => (
      rule.userAgent.toLowerCase() === userAgent.toLowerCase()
      || rule.userAgent === '*'
    ));

    if (applicableRules.length === 0) {
      // No rules apply to this user agent
      return {
        allowed: true,
        matchedRule: null,
        reason: 'No applicable rules found for user agent',
      };
    }

    // Check rules - most specific match wins
    // Allow rules take precedence over Disallow rules of equal specificity
    let bestMatch = null;
    let bestMatchLength = 0;
    let bestMatchType = null;

    for (const rule of applicableRules) {
      const pattern = rule.path;

      if (pathMatches(path, pattern)) {
        const matchLength = pattern.length;

        // If this is a longer (more specific) match, it wins
        // If same length, Allow takes precedence over Disallow
        if (matchLength > bestMatchLength
            || (matchLength === bestMatchLength && rule.directive === 'allow')) {
          bestMatch = pattern;
          bestMatchLength = matchLength;
          bestMatchType = rule.directive;
        }
      }
    }

    if (bestMatch === null) {
      // No matching rules, allow by default
      return {
        allowed: true,
        matchedRule: null,
        reason: 'No matching rules - allowing by default',
      };
    }

    const allowed = bestMatchType === 'allow';
    return {
      allowed,
      matchedRule: bestMatch,
      reason: allowed
        ? `Explicitly allowed by rule: ${bestMatch}`
        : `Blocked by rule: ${bestMatch}`,
    };
  } catch (error) {
    global.auditcore.logger.warn(`Error checking robots.txt for ${url}: ${error.message}`);
    return {
      allowed: true,
      matchedRule: null,
      reason: 'Error parsing URL - allowing by default',
    };
  }
}

/**
 * Check if a path matches a robots.txt pattern
 * Implements pattern matching per robots.txt specification:
 * - '*' matches any sequence of characters
 * - '$' at end matches end of URL
 * - Everything else is literal
 *
 * @param {string} path - URL path to check
 * @param {string} pattern - robots.txt pattern
 * @returns {boolean} True if path matches pattern
 */
function pathMatches(path, pattern) {
  if (pattern === '/') {
    // Special case: '/' matches everything
    return true;
  }

  // Escape special regex characters except * and $
  let regexPattern = pattern
    .replace(/[.+?^{}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*/g, '.*'); // Convert * to .*

  // Handle $ at end (matches end of URL)
  if (regexPattern.endsWith('$')) {
    regexPattern = `^${regexPattern}`;
  } else {
    regexPattern = `^${regexPattern}`;
  }

  const regex = new RegExp(regexPattern);
  return regex.test(path);
}

/**
 * Prompt user for permission to scrape a blocked URL
 * @param {string} url - The URL that is blocked
 * @param {string} matchedRule - The robots.txt rule that blocked it
 * @param {boolean} isFirst - Whether this is the first blocked URL
 * @returns {Promise<Object>} { proceed: boolean, rememberChoice: boolean }
 */
export async function promptUserForOverride(url, matchedRule, isFirst = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const message = isFirst
      ? `\n⚠️  robots.txt RESTRICTION DETECTED\n\nThe URL is blocked by robots.txt:\n  URL: ${url}\n  Rule: ${matchedRule}\n\nOptions:\n  [y] Scrape this URL anyway (override for this URL only)\n  [a] Scrape all URLs (enable force-scrape mode for remainder of session)\n  [n] Skip this URL and continue\n  [q] Quit the analysis\n\nYour choice (y/a/n/q): `
      : `\n⚠️  Another URL blocked by robots.txt:\n  URL: ${url}\n  Rule: ${matchedRule}\n\nOptions:\n  [y] Scrape anyway\n  [a] Enable force-scrape mode\n  [n] Skip\n  [q] Quit\n\nChoice (y/a/n/q): `;

    rl.question(message, (answer) => {
      rl.close();

      const choice = answer.toLowerCase().trim();

      switch (choice) {
        case 'y':
          console.log('✓ Overriding robots.txt for this URL only\n');
          resolve({ proceed: true, enableForceScrape: false, quit: false });
          break;
        case 'a':
          console.log('✓ Force-scrape mode ENABLED - all robots.txt restrictions will be bypassed');
          console.log('   This setting will persist for the remainder of this session\n');
          resolve({ proceed: true, enableForceScrape: true, quit: false });
          break;
        case 'n':
          console.log('✓ Skipping this URL\n');
          resolve({ proceed: false, enableForceScrape: false, quit: false });
          break;
        case 'q':
          console.log('✓ Quitting analysis\n');
          resolve({ proceed: false, enableForceScrape: false, quit: true });
          break;
        default:
          console.log(`Invalid choice "${choice}" - skipping URL\n`);
          resolve({ proceed: false, enableForceScrape: false, quit: false });
      }
    });
  });
}

/**
 * Check robots.txt compliance for a URL and prompt if needed
 * @param {Object} robotsTxtData - Parsed robots.txt data
 * @param {string} url - URL to check
 * @param {boolean} forceScrape - Whether force-scrape mode is enabled
 * @param {boolean} isFirstCheck - Whether this is the first blocked URL
 * @returns {Promise<Object>} { allowed: boolean, updatedForceScrape: boolean, quit: boolean }
 */
export async function checkRobotsCompliance(
  robotsTxtData,
  url,
  forceScrape = false,
  isFirstCheck = false,
) {
  // If force-scrape is enabled, bypass all checks
  if (forceScrape) {
    return {
      allowed: true,
      updatedForceScrape: forceScrape,
      quit: false,
      reason: 'Force-scrape mode enabled - bypassing robots.txt',
    };
  }

  // Check if URL is allowed
  const check = isUrlAllowed(robotsTxtData, url);

  if (check.allowed) {
    return {
      allowed: true,
      updatedForceScrape: forceScrape,
      quit: false,
      reason: check.reason,
    };
  }

  // URL is blocked - prompt user
  global.auditcore.logger.warn(`robots.txt blocks access to: ${url} (rule: ${check.matchedRule})`);

  const userChoice = await promptUserForOverride(url, check.matchedRule, isFirstCheck);

  if (userChoice.quit) {
    global.auditcore.logger.info('User chose to quit analysis due to robots.txt restriction');
    return {
      allowed: false,
      updatedForceScrape: forceScrape,
      quit: true,
      reason: 'User quit due to robots.txt restriction',
    };
  }

  if (userChoice.enableForceScrape) {
    global.auditcore.logger.warn('⚠️  User enabled force-scrape mode - robots.txt restrictions will be bypassed for remainder of session');
  }

  return {
    allowed: userChoice.proceed,
    updatedForceScrape: userChoice.enableForceScrape || forceScrape,
    quit: false,
    reason: userChoice.proceed ? 'User override' : 'Blocked by robots.txt and user declined override',
  };
}

/**
 * Get a summary of robots.txt rules for logging
 * @param {Object} robotsTxtData - Parsed robots.txt data
 * @returns {string} Human-readable summary
 */
export function getRobotsSummary(robotsTxtData) {
  if (!robotsTxtData || !robotsTxtData.parsed || !robotsTxtData.parsed.valid) {
    return 'No valid robots.txt found';
  }

  const { userAgents, rules, sitemaps } = robotsTxtData.parsed;

  return `robots.txt summary:
  - User agents declared: ${userAgents.length} (${userAgents.slice(0, 3).join(', ')}${userAgents.length > 3 ? '...' : ''})
  - Total rules: ${rules.length}
  - Sitemaps: ${sitemaps.length}`;
}
