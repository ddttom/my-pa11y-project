/**
 * Technology Detection Module
 * Detects web technologies, frameworks, CMSs, and libraries from page resources
 */

/**
 * Detect Adobe Edge Delivery Services (EDS) / AEM
 */
function detectAdobeEDS(resources) {
  const jsResources = resources.filter((r) => r.type === 'javascript');

  const patterns = {
    hasAemJs: jsResources.some((r) => r.url.toLowerCase().includes('aem.js')),
    hasHlxDomain: jsResources.some((r) => r.url.includes('.hlx.page') || r.url.includes('.hlx.live')),
    hasFranklin: jsResources.some((r) => r.url.toLowerCase().includes('franklin')),
    hasClientLibs: jsResources.some((r) => r.url.includes('/clientlibs/')),
    hasGraniteLibs: jsResources.some((r) => r.url.includes('/libs/granite/')),
    hasCqLibs: jsResources.some((r) => r.url.includes('/libs/cq/')),
  };

  const detected = Object.values(patterns).some((v) => v === true);

  if (!detected) return null;

  return {
    name: 'Adobe Experience Manager Edge Delivery Services',
    category: 'CMS',
    confidence: patterns.hasAemJs || patterns.hasHlxDomain ? 'high' : 'medium',
    patterns,
  };
}

/**
 * Detect JavaScript frameworks
 */
function detectFrameworks(resources) {
  const jsResources = resources.filter((r) => r.type === 'javascript');
  const frameworks = [];

  // React
  if (jsResources.some((r) => r.url.includes('react') || r.url.includes('React'))) {
    frameworks.push({
      name: 'React',
      category: 'Framework',
      confidence: 'high',
    });
  }

  // Vue.js
  if (jsResources.some((r) => r.url.includes('vue') || r.url.includes('Vue'))) {
    frameworks.push({
      name: 'Vue.js',
      category: 'Framework',
      confidence: 'high',
    });
  }

  // Angular
  if (jsResources.some((r) => r.url.includes('angular') || r.url.includes('Angular'))) {
    frameworks.push({
      name: 'Angular',
      category: 'Framework',
      confidence: 'high',
    });
  }

  // Svelte
  if (jsResources.some((r) => r.url.includes('svelte'))) {
    frameworks.push({
      name: 'Svelte',
      category: 'Framework',
      confidence: 'high',
    });
  }

  // Next.js
  if (jsResources.some((r) => r.url.includes('next') || r.url.includes('_next/'))) {
    frameworks.push({
      name: 'Next.js',
      category: 'Framework',
      confidence: 'high',
    });
  }

  // Nuxt.js
  if (jsResources.some((r) => r.url.includes('nuxt') || r.url.includes('_nuxt/'))) {
    frameworks.push({
      name: 'Nuxt.js',
      category: 'Framework',
      confidence: 'high',
    });
  }

  return frameworks;
}

/**
 * Detect popular JavaScript libraries
 */
function detectLibraries(resources) {
  const jsResources = resources.filter((r) => r.type === 'javascript');
  const libraries = [];

  // jQuery
  if (jsResources.some((r) => r.url.includes('jquery'))) {
    libraries.push({
      name: 'jQuery',
      category: 'Library',
      confidence: 'high',
    });
  }

  // Lodash
  if (jsResources.some((r) => r.url.includes('lodash'))) {
    libraries.push({
      name: 'Lodash',
      category: 'Library',
      confidence: 'high',
    });
  }

  // Moment.js
  if (jsResources.some((r) => r.url.includes('moment'))) {
    libraries.push({
      name: 'Moment.js',
      category: 'Library',
      confidence: 'high',
    });
  }

  // Three.js
  if (jsResources.some((r) => r.url.includes('three'))) {
    libraries.push({
      name: 'Three.js',
      category: 'Library',
      confidence: 'high',
    });
  }

  // D3.js
  if (jsResources.some((r) => r.url.includes('d3.') || r.url.includes('d3.min'))) {
    libraries.push({
      name: 'D3.js',
      category: 'Library',
      confidence: 'high',
    });
  }

  // Chart.js
  if (jsResources.some((r) => r.url.includes('chart.js') || r.url.includes('chartjs'))) {
    libraries.push({
      name: 'Chart.js',
      category: 'Library',
      confidence: 'high',
    });
  }

  // GSAP
  if (jsResources.some((r) => r.url.includes('gsap'))) {
    libraries.push({
      name: 'GSAP',
      category: 'Library',
      confidence: 'high',
    });
  }

  // Alpine.js
  if (jsResources.some((r) => r.url.includes('alpine'))) {
    libraries.push({
      name: 'Alpine.js',
      category: 'Library',
      confidence: 'high',
    });
  }

  // HTMX
  if (jsResources.some((r) => r.url.includes('htmx'))) {
    libraries.push({
      name: 'HTMX',
      category: 'Library',
      confidence: 'high',
    });
  }

  return libraries;
}

/**
 * Detect Content Management Systems
 */
function detectCMS(resources) {
  const jsResources = resources.filter((r) => r.type === 'javascript');
  const cms = [];

  // WordPress
  if (
    jsResources.some((r) => r.url.includes('wp-includes') || r.url.includes('wp-content'))
    || resources.some((r) => r.url.includes('wp-admin'))
  ) {
    cms.push({
      name: 'WordPress',
      category: 'CMS',
      confidence: 'high',
    });
  }

  // Drupal
  if (jsResources.some((r) => r.url.includes('/drupal') || r.url.includes('drupal.js'))) {
    cms.push({
      name: 'Drupal',
      category: 'CMS',
      confidence: 'high',
    });
  }

  // Joomla
  if (jsResources.some((r) => r.url.includes('joomla') || r.url.includes('/components/com_'))) {
    cms.push({
      name: 'Joomla',
      category: 'CMS',
      confidence: 'high',
    });
  }

  // Shopify
  if (jsResources.some((r) => r.url.includes('shopify') || r.url.includes('cdn.shopify.com'))) {
    cms.push({
      name: 'Shopify',
      category: 'CMS',
      confidence: 'high',
    });
  }

  // Wix
  if (jsResources.some((r) => r.url.includes('wix.com') || r.url.includes('wixstatic.com'))) {
    cms.push({
      name: 'Wix',
      category: 'CMS',
      confidence: 'high',
    });
  }

  // Squarespace
  if (jsResources.some((r) => r.url.includes('squarespace'))) {
    cms.push({
      name: 'Squarespace',
      category: 'CMS',
      confidence: 'high',
    });
  }

  // Webflow
  if (jsResources.some((r) => r.url.includes('webflow'))) {
    cms.push({
      name: 'Webflow',
      category: 'CMS',
      confidence: 'high',
    });
  }

  // Adobe EDS is checked separately in detectAdobeEDS()

  return cms;
}

/**
 * Detect analytics and tracking tools
 */
function detectAnalytics(resources) {
  const jsResources = resources.filter((r) => r.type === 'javascript');
  const analytics = [];

  // Google Analytics
  if (
    jsResources.some(
      (r) => r.url.includes('google-analytics.com') || r.url.includes('googletagmanager.com') || r.url.includes('/gtag/'),
    )
  ) {
    analytics.push({
      name: 'Google Analytics',
      category: 'Analytics',
      confidence: 'high',
    });
  }

  // Adobe Analytics
  if (jsResources.some((r) => r.url.includes('omniture') || r.url.includes('2o7.net'))) {
    analytics.push({
      name: 'Adobe Analytics',
      category: 'Analytics',
      confidence: 'high',
    });
  }

  // Matomo (Piwik)
  if (jsResources.some((r) => r.url.includes('matomo') || r.url.includes('piwik'))) {
    analytics.push({
      name: 'Matomo',
      category: 'Analytics',
      confidence: 'high',
    });
  }

  // Hotjar
  if (jsResources.some((r) => r.url.includes('hotjar'))) {
    analytics.push({
      name: 'Hotjar',
      category: 'Analytics',
      confidence: 'high',
    });
  }

  // Mixpanel
  if (jsResources.some((r) => r.url.includes('mixpanel'))) {
    analytics.push({
      name: 'Mixpanel',
      category: 'Analytics',
      confidence: 'high',
    });
  }

  // Segment
  if (jsResources.some((r) => r.url.includes('segment'))) {
    analytics.push({
      name: 'Segment',
      category: 'Analytics',
      confidence: 'high',
    });
  }

  return analytics;
}

/**
 * Detect CDNs
 */
function detectCDNs(resources) {
  const cdns = [];

  // Cloudflare
  if (resources.some((r) => r.url.includes('cloudflare') || r.url.includes('cdnjs.cloudflare.com'))) {
    cdns.push({
      name: 'Cloudflare CDN',
      category: 'CDN',
      confidence: 'high',
    });
  }

  // Akamai
  if (resources.some((r) => r.url.includes('akamai'))) {
    cdns.push({
      name: 'Akamai',
      category: 'CDN',
      confidence: 'high',
    });
  }

  // Fastly
  if (resources.some((r) => r.url.includes('fastly'))) {
    cdns.push({
      name: 'Fastly',
      category: 'CDN',
      confidence: 'high',
    });
  }

  // Amazon CloudFront
  if (resources.some((r) => r.url.includes('cloudfront.net'))) {
    cdns.push({
      name: 'Amazon CloudFront',
      category: 'CDN',
      confidence: 'high',
    });
  }

  return cdns;
}

/**
 * Main technology detection function
 * Analyzes base domain (homepage) resources to detect technologies
 * @param {Object} results - Analysis results with externalResourcesAggregation
 * @returns {Object} Detected technologies organized by category
 */
export function detectTechnologies(results) {
  try {
    // Get homepage URL (first URL in performanceAnalysis)
    const performanceData = results.performanceAnalysis || results.urls || [];
    if (performanceData.length === 0) {
      return { detected: false, reason: 'No pages analyzed' };
    }

    const baseDomain = performanceData[0].url;

    // Get all resources from externalResourcesAggregation
    const resourcesAgg = results.externalResourcesAggregation || {};
    const resources = Object.values(resourcesAgg);

    if (resources.length === 0) {
      return { detected: false, reason: 'No resources found' };
    }

    // Run all detection functions
    const adobeEDS = detectAdobeEDS(resources);
    const frameworks = detectFrameworks(resources);
    const libraries = detectLibraries(resources);
    const cms = detectCMS(resources);
    const analytics = detectAnalytics(resources);
    const cdns = detectCDNs(resources);

    // Combine all detected technologies
    const allTechnologies = [
      ...(adobeEDS ? [adobeEDS] : []),
      ...frameworks,
      ...libraries,
      ...cms,
      ...analytics,
      ...cdns,
    ];

    // Organize by category
    const byCategory = {
      CMS: allTechnologies.filter((t) => t.category === 'CMS'),
      Framework: allTechnologies.filter((t) => t.category === 'Framework'),
      Library: allTechnologies.filter((t) => t.category === 'Library'),
      Analytics: allTechnologies.filter((t) => t.category === 'Analytics'),
      CDN: allTechnologies.filter((t) => t.category === 'CDN'),
    };

    return {
      detected: allTechnologies.length > 0,
      baseDomain,
      totalResources: resources.length,
      technologies: allTechnologies,
      byCategory,
      summary: {
        cms: byCategory.CMS.map((t) => t.name),
        frameworks: byCategory.Framework.map((t) => t.name),
        libraries: byCategory.Library.map((t) => t.name),
        analytics: byCategory.Analytics.map((t) => t.name),
        cdns: byCategory.CDN.map((t) => t.name),
      },
    };
  } catch (error) {
    global.auditcore?.logger?.error('Error detecting technologies:', error);
    return { detected: false, reason: error.message };
  }
}
