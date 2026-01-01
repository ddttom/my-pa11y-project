/**
 * Calculate header score based on security headers
 */
export function calculateHeaderScore(headers) {
  if (!headers) return 0;
  let score = 0;

  const securityHeaders = {
    'strict-transport-security': 20,
    'content-security-policy': 20,
    'x-frame-options': 15,
    'x-content-type-options': 15,
    'referrer-policy': 15,
    'permissions-policy': 15,
  };

  Object.entries(securityHeaders).forEach(([header, points]) => {
    if (headers[header]) score += points;
  });

  return score;
}

/**
 * Detect mixed content in HTML
 */
export function detectMixedContent(html) {
  if (!html) return 0;

  const mixedContentPatterns = [
    /src=["']http:\/\//g, // HTTP sources
    /href=["']http:\/\//g, // HTTP links
    /url\(["']?http:\/\//g, // HTTP in CSS
    /[@import\s]+["']http:\/\//g, // HTTP imports
  ];

  return mixedContentPatterns.reduce((count, pattern) => {
    const matches = html.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

/**
 * Analyze cookie security
 */
export function analyzeCookieSecurity(headers) {
  if (!headers || !headers['set-cookie']) return 0;

  let score = 100;
  const cookies = Array.isArray(headers['set-cookie'])
    ? headers['set-cookie']
    : [headers['set-cookie']];

  cookies.forEach((cookie) => {
    if (!cookie.includes('Secure;')) score -= 20;
    if (!cookie.includes('HttpOnly;')) score -= 20;
    if (!cookie.includes('SameSite=')) score -= 15;
    if (!cookie.includes('Expires=') && !cookie.includes('Max-Age=')) score -= 10;
  });

  return Math.max(0, score);
}

/**
 * Calculate CSP score
 */
export function calculateCspScore(headers) {
  if (!headers?.['content-security-policy']) return 0;

  const csp = headers['content-security-policy'];
  let score = 100;

  const essentialDirectives = [
    'default-src',
    'script-src',
    'style-src',
    'img-src',
    'connect-src',
    'form-action',
    'frame-ancestors',
  ];

  essentialDirectives.forEach((directive) => {
    if (!csp.includes(directive)) score -= Math.floor(100 / essentialDirectives.length);
  });

  if (csp.includes("'unsafe-inline'")) score -= 20;
  if (csp.includes("'unsafe-eval'")) score -= 20;

  return Math.max(0, score);
}

/**
 * Calculate XSS protection score
 */
export function calculateXssScore(headers) {
  if (!headers) return 0;
  let score = 100;

  if (!headers['x-xss-protection']) {
    score -= 50;
  } else if (headers['x-xss-protection'] !== '1; mode=block') {
    score -= 25;
  }

  const csp = headers['content-security-policy'];
  if (!csp) {
    score -= 25;
  } else {
    if (!csp.includes('script-src')) score -= 15;
    if (csp.includes("'unsafe-inline'")) score -= 15;
  }

  return Math.max(0, score);
}

/**
 * Analyze SSL certificate
 */
export function analyzeCertificate(cert) {
  if (!cert) return 'No SSL certificate information';

  try {
    const validTo = new Date(cert.validTo);
    const now = new Date();
    const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));

    let status = 'Valid';
    if (daysUntilExpiry < 0) {
      status = 'Expired';
    } else if (daysUntilExpiry < 30) {
      status = 'Expiring soon';
    }

    return `${status} - Valid until ${validTo.toISOString()}, Issuer: ${cert.issuer}`;
  } catch (error) {
    return 'Error analyzing certificate';
  }
}

/**
 * Detect vulnerabilities in HTML
 */
export function detectVulnerabilities(html) {
  if (!html) return 0;

  const vulnerabilityPatterns = [
    /<input[^>]*type=["']password["'][^>]*>/i, // Unprotected password fields
    /onclick=["'][^"']*["']/g, // Inline event handlers
    /javascript:void/g, // javascript: URLs
    /eval\s*\(/g, // eval() usage
    /document\.write\s*\(/g, // document.write
    /<form[^>]*>/i, // Forms without CSRF protection
    /<a[^>]*target=["']_blank["'][^>]*>/g, // Target blank without noopener
    /innerHTML\s*=/g, // innerHTML assignments
    /localStorage\./g, // LocalStorage usage without checks
    /sessionStorage\./g, // SessionStorage usage without checks
  ];

  return vulnerabilityPatterns.reduce((count, pattern) => {
    const matches = html.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

/**
 * Analyze security features
 */
export function analyzeSecurityFeatures(page) {
  if (!page) {
    global.auditcore.logger.warn('No page data provided for security analysis');
    return {
      httpsScore: 0,
      headerScore: 0,
      mixedContentIssues: 0,
      cookieScore: 0,
      cspScore: 0,
      xssScore: 0,
      certificateInfo: 'No data',
      vulnerabilitiesCount: 0,
      overallScore: 0,
    };
  }

  const httpsScore = page.url.startsWith('https://') ? 100 : 0;
  const headerScore = calculateHeaderScore(page.headers);
  const mixedContentIssues = detectMixedContent(page.html);
  const cookieScore = analyzeCookieSecurity(page.headers);
  const cspScore = calculateCspScore(page.headers);
  const xssScore = calculateXssScore(page.headers);
  const certificateInfo = analyzeCertificate(page.certificate);
  const vulnerabilitiesCount = detectVulnerabilities(page.html);

  // Calculate overall security score with weights
  const weights = {
    https: 0.3,
    headers: 0.2,
    cookies: 0.15,
    csp: 0.15,
    xss: 0.1,
    vulnerabilities: 0.1,
  };

  const overallScore = (
    httpsScore * weights.https
    + headerScore * weights.headers
    + cookieScore * weights.cookies
    + cspScore * weights.csp
    + xssScore * weights.xss
    + Math.max(0, 100 - vulnerabilitiesCount * 10) * weights.vulnerabilities
  );

  return {
    httpsScore,
    headerScore,
    mixedContentIssues,
    cookieScore,
    cspScore,
    xssScore,
    certificateInfo,
    vulnerabilitiesCount,
    overallScore,
  };
}
