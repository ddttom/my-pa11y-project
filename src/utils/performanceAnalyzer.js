import puppeteer from 'puppeteer';

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

    if (pathParts.length > 0) {
      const firstSegment = pathParts[0];
      if (firstSegment.length === 2 && firstSegment !== 'en') {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

async function setupPerformanceObservers(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const metrics = {
      largestContentfulPaint: null,
      cumulativeLayoutShift: 0,
      totalBlockingTime: 0,
      longTasks: [],
      timeToInteractive: null,
      firstCpuIdle: null,
      lcpEntries: [],
      firstPaint: 0,
      firstContentfulPaint: 0,
    };

    // Track paint events
    const paintObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-paint') {
          metrics.firstPaint = entry.startTime;
        }
        if (entry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = entry.startTime;
        }
      });
    });
    paintObserver.observe({ type: 'paint', buffered: true });

    // Enhanced LCP tracking with validation
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      metrics.lcpEntries = entries;

      // Validate and select LCP
      const validEntries = entries.filter((e) => e.element
          && e.size > 0
          && e.startTime > metrics.firstContentfulPaint);

      if (validEntries.length > 0) {
        const lastEntry = validEntries.reduce((prev, curr) => (curr.size > prev.size ? curr : prev));
        metrics.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // TTI calculation using First CPU Idle and Long Tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      let firstInteractive = metrics.timeToInteractive;

      entries.forEach((entry) => {
        metrics.longTasks.push(entry);
        metrics.totalBlockingTime += Math.max(entry.duration - 50, 0);

        // Calculate TTI based on long tasks
        if (!firstInteractive && entry.startTime > metrics.firstContentfulPaint) {
          firstInteractive = entry.startTime + entry.duration;
        }
      });

      metrics.timeToInteractive = firstInteractive || metrics.firstContentfulPaint + 5000;
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });

    // Layout Shift Observer
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          metrics.cumulativeLayoutShift += entry.value;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Wait for metrics to stabilize
    const stabilizationTime = Math.max(
      5000, // Minimum wait time
      metrics.longTasks.length > 0
        ? metrics.longTasks[metrics.longTasks.length - 1].startTime + 2000
        : 5000,
    );

    setTimeout(() => {
      // Final validation of metrics
      if (!metrics.largestContentfulPaint && metrics.lcpEntries.length > 0) {
        metrics.largestContentfulPaint = metrics.lcpEntries[0].renderTime
            || metrics.lcpEntries[0].loadTime;
      }

      if (!metrics.timeToInteractive) {
        metrics.timeToInteractive = metrics.firstContentfulPaint + 5000;
      }

      resolve({
        largestContentfulPaint: metrics.largestContentfulPaint,
        cumulativeLayoutShift: metrics.cumulativeLayoutShift,
        totalBlockingTime: metrics.totalBlockingTime,
        timeToInteractive: metrics.timeToInteractive,
        firstPaint: metrics.firstPaint,
        firstContentfulPaint: metrics.firstContentfulPaint,
      });
    }, stabilizationTime);
  }));
}

async function attemptAnalysis(url) {
  let browser;
  let page;

  try {
    global.auditcore.logger.debug('Launching browser');
    browser = await puppeteer.launch();
    page = await browser.newPage();
    global.auditcore.logger.debug('Browser launched successfully');

    if (!page || page.isClosed()) {
      throw new Error('Page context is invalid or closed');
    }

    global.auditcore.logger.debug(`Navigating to ${url}`);
    const { performance } = global.auditcore.options;
    const navigationPromise = page.goto(url, {
      waitUntil: performance.waitUntil,
      timeout: performance.timeout,
    });

    await navigationPromise;
    global.auditcore.logger.debug('Page loaded successfully');

    if (!page || page.isClosed()) {
      throw new Error('Page context destroyed after navigation');
    }

    const observersPromise = setupPerformanceObservers(page);
    await sleep(2000);

    if (!page || page.isClosed()) {
      throw new Error('Page context destroyed before evaluation');
    }

    const navigationTiming = await page.evaluate(() => {
      try {
        const timing = performance.getEntriesByType('navigation')[0] || {};
        return {
          loadTime: timing.loadEventEnd || 0,
        };
      } catch (error) {
        console.error('Error getting navigation timing:', error);
        return {
          loadTime: 0,
        };
      }
    });

    const observerMetrics = await observersPromise;

    const performanceMetrics = {
      ...navigationTiming,
      ...observerMetrics,
    };

    global.auditcore.logger.debug(`Performance metrics collected for ${url}: ${JSON.stringify(performanceMetrics)}`);
    return performanceMetrics;
  } catch (error) {
    global.auditcore.logger.error(`Error collecting metrics for ${url}:`, error);
    throw error;
  } finally {
    if (browser) {
      try {
        global.auditcore.logger.debug('Closing browser');
        await browser.close();
        global.auditcore.logger.debug('Browser closed successfully');
      } catch (error) {
        global.auditcore.logger.error('Error closing browser:', error);
      }
    }
  }
}

async function analyzePerformance(url) {
  if (typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error('Invalid URL provided');
  }

  if (!isValidUrl(url)) {
    global.auditcore.logger.warn(`Skipping analysis for URL with restricted country code: ${url}`);
    return {
      loadTime: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      timeToInteractive: 0,
      totalBlockingTime: 0,
      cumulativeLayoutShift: 0,
    };
  }

  global.auditcore.logger.info(`Starting performance analysis for ${url}`);

  const { maxRetries, initialBackoff } = global.auditcore.options;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const result = await attemptAnalysis(url);
      global.auditcore.logger.info(`Performance analysis completed for ${url}`);
      return result;
    } catch (error) {
      global.auditcore.logger.warn(`Attempt ${attempt} failed for ${url}: ${error.message}`);
      global.auditcore.logger.debug('Error stack:', error.stack);

      if (attempt === maxRetries) {
        global.auditcore.logger.error(`All ${maxRetries} attempts failed for ${url}`);
        return {
          loadTime: 0,
          firstPaint: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          timeToInteractive: 0,
          totalBlockingTime: 0,
          cumulativeLayoutShift: 0,
        };
      }

      const backoffTime = initialBackoff * 2 ** (attempt - 1);
      global.auditcore.logger.debug(`Retrying in ${backoffTime}ms`);
      await sleep(backoffTime);
    }
  }

  return {
    loadTime: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    timeToInteractive: 0,
    totalBlockingTime: 0,
    cumulativeLayoutShift: 0,
  };
}

export default analyzePerformance;
