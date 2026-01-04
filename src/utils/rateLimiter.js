/**
 * Adaptive Rate Limiter
 *
 * Automatically adjusts crawl rate based on server responses to prevent
 * overwhelming target servers and handle rate limiting gracefully.
 *
 * Features:
 * - Monitors 429 (Too Many Requests) and 503 (Service Unavailable) responses
 * - Dynamically reduces concurrency when rate limited
 * - Gradually recovers when server health improves
 * - Exponential backoff for rate-limited requests
 * - Configurable thresholds and recovery behavior
 */

/**
 * Adaptive Rate Limiter Class
 *
 * Manages dynamic concurrency adjustment based on server responses.
 * Reduces load when encountering rate limits, recovers when stable.
 */
export class AdaptiveRateLimiter {
  /**
   * Creates a new adaptive rate limiter
   * @param {Object} config - Configuration options
   * @param {number} config.initialConcurrency - Starting concurrency level (default: 3)
   * @param {number} config.minConcurrency - Minimum concurrency level (default: 1)
   * @param {number} config.maxConcurrency - Maximum concurrency level (default: 5)
   * @param {number} config.backoffMultiplier - Exponential backoff multiplier (default: 2)
   * @param {number} config.recoveryThreshold - Successful requests before increasing (default: 10)
   * @param {number} config.errorThreshold - Errors before reducing concurrency (default: 2)
   */
  constructor(config = {}) {
    this.initialConcurrency = config.initialConcurrency || 3;
    this.minConcurrency = config.minConcurrency || 1;
    this.maxConcurrency = config.maxConcurrency || 5;
    this.backoffMultiplier = config.backoffMultiplier || 2;
    this.recoveryThreshold = config.recoveryThreshold || 10;
    this.errorThreshold = config.errorThreshold || 2;

    // Current state
    this.concurrency = this.initialConcurrency;
    this.consecutiveErrors = 0;
    this.consecutiveSuccesses = 0;
    this.backoffDelay = 0; // No delay initially
    this.totalRequests = 0;
    this.rateLimitedRequests = 0;
    this.adjustments = [];
  }

  /**
   * Process a response and adjust rate limiting if needed
   * @param {number} statusCode - HTTP status code
   * @returns {boolean} - True if should continue, false if should pause
   */
  onResponse(statusCode) {
    this.totalRequests++;

    if (this.isRateLimited(statusCode)) {
      this.rateLimitedRequests++;
      this.consecutiveErrors++;
      this.consecutiveSuccesses = 0;

      global.auditcore.logger.warn(
        `Rate limited (${statusCode}): ${this.consecutiveErrors} consecutive errors`,
      );

      // Reduce concurrency if threshold exceeded
      if (this.consecutiveErrors >= this.errorThreshold) {
        this.reduceConcurrency(statusCode);
        return false; // Signal to pause
      }
    } else if (this.isSuccess(statusCode)) {
      this.consecutiveSuccesses++;
      this.consecutiveErrors = 0;

      // Recover concurrency if threshold met
      if (this.consecutiveSuccesses >= this.recoveryThreshold) {
        this.recoverConcurrency();
      }
    }

    return true;
  }

  /**
   * Check if status code indicates rate limiting
   * @param {number} statusCode - HTTP status code
   * @returns {boolean} - True if rate limited
   */
  // eslint-disable-next-line class-methods-use-this
  isRateLimited(statusCode) {
    return statusCode === 429 || statusCode === 503;
  }

  /**
   * Check if status code indicates success
   * @param {number} statusCode - HTTP status code
   * @returns {boolean} - True if successful
   */
  // eslint-disable-next-line class-methods-use-this
  isSuccess(statusCode) {
    return statusCode >= 200 && statusCode < 300;
  }

  /**
   * Reduce concurrency due to rate limiting
   * @param {number} statusCode - HTTP status code that triggered reduction
   */
  reduceConcurrency(statusCode) {
    const oldConcurrency = this.concurrency;
    const oldDelay = this.backoffDelay;

    // Reduce concurrency
    this.concurrency = Math.max(this.minConcurrency, this.concurrency - 1);

    // Increase backoff delay exponentially
    if (this.backoffDelay === 0) {
      this.backoffDelay = 1; // Start with 1 second
    } else {
      this.backoffDelay *= this.backoffMultiplier;
    }

    // Cap backoff at 60 seconds
    this.backoffDelay = Math.min(this.backoffDelay, 60);

    // Log adjustment
    const adjustment = {
      timestamp: new Date().toISOString(),
      type: 'reduce',
      reason: `Status ${statusCode}`,
      oldConcurrency,
      newConcurrency: this.concurrency,
      oldDelay,
      newDelay: this.backoffDelay,
      consecutiveErrors: this.consecutiveErrors,
    };
    this.adjustments.push(adjustment);

    global.auditcore.logger.warn(
      `⚠️  RATE LIMIT: Reduced concurrency ${oldConcurrency} → ${this.concurrency}, `
      + `backoff ${oldDelay}s → ${this.backoffDelay}s`,
    );

    // Reset error counter after adjustment
    this.consecutiveErrors = 0;
  }

  /**
   * Gradually increase concurrency after stable period
   */
  recoverConcurrency() {
    // Only recover if below initial level
    if (this.concurrency >= this.initialConcurrency) {
      this.consecutiveSuccesses = 0; // Reset counter
      return;
    }

    const oldConcurrency = this.concurrency;
    const oldDelay = this.backoffDelay;

    // Increase concurrency by 1
    this.concurrency = Math.min(this.maxConcurrency, this.concurrency + 1);

    // Reduce backoff delay
    this.backoffDelay = Math.max(0, this.backoffDelay / this.backoffMultiplier);

    // Log adjustment
    const adjustment = {
      timestamp: new Date().toISOString(),
      type: 'recover',
      reason: `${this.recoveryThreshold} consecutive successes`,
      oldConcurrency,
      newConcurrency: this.concurrency,
      oldDelay,
      newDelay: this.backoffDelay,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
    this.adjustments.push(adjustment);

    global.auditcore.logger.info(
      `✅ RECOVERY: Increased concurrency ${oldConcurrency} → ${this.concurrency}, `
      + `backoff ${oldDelay}s → ${this.backoffDelay}s`,
    );

    // Reset success counter after adjustment
    this.consecutiveSuccesses = 0;
  }

  /**
   * Get current delay in milliseconds
   * @returns {number} - Delay in milliseconds
   */
  getDelay() {
    return this.backoffDelay * 1000; // Convert to milliseconds
  }

  /**
   * Get current concurrency level
   * @returns {number} - Current concurrency
   */
  getConcurrency() {
    return this.concurrency;
  }

  /**
   * Apply backoff delay (sleep)
   * @returns {Promise<void>}
   */
  async applyBackoff() {
    const delay = this.getDelay();
    if (delay > 0) {
      global.auditcore.logger.info(`⏱️  Applying backoff delay: ${this.backoffDelay}s`);
      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }

  /**
   * Get statistics about rate limiting behavior
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      totalRequests: this.totalRequests,
      rateLimitedRequests: this.rateLimitedRequests,
      rateLimitPercentage: this.totalRequests > 0
        ? ((this.rateLimitedRequests / this.totalRequests) * 100).toFixed(2)
        : 0,
      currentConcurrency: this.concurrency,
      currentBackoffDelay: this.backoffDelay,
      adjustmentCount: this.adjustments.length,
      adjustments: this.adjustments,
    };
  }

  /**
   * Log final statistics
   */
  logStats() {
    const stats = this.getStats();

    global.auditcore.logger.info('📊 Rate Limiter Statistics:');
    global.auditcore.logger.info(`  Total Requests: ${stats.totalRequests}`);
    global.auditcore.logger.info(`  Rate Limited: ${stats.rateLimitedRequests} (${stats.rateLimitPercentage}%)`);
    global.auditcore.logger.info(`  Final Concurrency: ${stats.currentConcurrency}`);
    global.auditcore.logger.info(`  Total Adjustments: ${stats.adjustmentCount}`);

    if (stats.adjustments.length > 0) {
      global.auditcore.logger.debug('Adjustment History:');
      stats.adjustments.forEach((adj) => {
        global.auditcore.logger.debug(
          `  ${adj.timestamp}: ${adj.type} (${adj.reason}) - `
          + `concurrency ${adj.oldConcurrency}→${adj.newConcurrency}, `
          + `delay ${adj.oldDelay}s→${adj.newDelay}s`,
        );
      });
    }
  }

  /**
   * Reset rate limiter to initial state
   */
  reset() {
    this.concurrency = this.initialConcurrency;
    this.consecutiveErrors = 0;
    this.consecutiveSuccesses = 0;
    this.backoffDelay = 0;
    this.totalRequests = 0;
    this.rateLimitedRequests = 0;
    this.adjustments = [];

    global.auditcore.logger.debug('Rate limiter reset to initial state');
  }
}

/**
 * Create a rate limiter from options object
 * @param {Object} options - Options containing rate limiting configuration
 * @returns {AdaptiveRateLimiter|null} - Rate limiter instance or null if disabled
 */
export function createRateLimiter(options) {
  if (!options.rateLimiting || !options.rateLimiting.enabled) {
    return null;
  }

  return new AdaptiveRateLimiter(options.rateLimiting);
}
