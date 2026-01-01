/**
 * Environment variable support and management
 * Allows configuration via environment variables for containerized deployments
 */

import { ENV_VARS, NODE_ENV, LOG_LEVELS } from './defaults.js';

/**
 * Loads configuration from environment variables
 * Environment variables take precedence over CLI arguments but not over explicit CLI flags
 * @returns {Object} - Configuration object from environment
 */
export function loadEnvConfig() {
  const config = {};

  // Log level
  if (process.env[ENV_VARS.LOG_LEVEL]) {
    const logLevel = process.env[ENV_VARS.LOG_LEVEL].toLowerCase();
    if (Object.values(LOG_LEVELS).includes(logLevel)) {
      config.logLevel = logLevel;
    }
  }

  // Output directory
  if (process.env[ENV_VARS.OUTPUT_DIR]) {
    config.output = process.env[ENV_VARS.OUTPUT_DIR];
  }

  // Sitemap URL
  if (process.env[ENV_VARS.SITEMAP_URL]) {
    config.sitemap = process.env[ENV_VARS.SITEMAP_URL];
  }

  // Cache directory
  if (process.env[ENV_VARS.CACHE_DIR]) {
    config.cacheDir = process.env[ENV_VARS.CACHE_DIR];
  }

  // Max retries
  if (process.env[ENV_VARS.MAX_RETRIES]) {
    const maxRetries = parseInt(process.env[ENV_VARS.MAX_RETRIES], 10);
    if (!Number.isNaN(maxRetries) && maxRetries >= 0) {
      config.maxRetries = maxRetries;
    }
  }

  // Timeout
  if (process.env[ENV_VARS.TIMEOUT]) {
    const timeout = parseInt(process.env[ENV_VARS.TIMEOUT], 10);
    if (!Number.isNaN(timeout) && timeout > 0) {
      config.timeout = timeout;
    }
  }

  // Feature Flags - History
  if (process.env[ENV_VARS.ENABLE_HISTORY]) {
    config.enableHistory = process.env[ENV_VARS.ENABLE_HISTORY].toLowerCase() === 'true';
  }

  // Feature Flags - Dashboard
  if (process.env[ENV_VARS.GENERATE_DASHBOARD]) {
    config.generateDashboard = process.env[ENV_VARS.GENERATE_DASHBOARD].toLowerCase() === 'true';
  }

  // Feature Flags - Executive Summary
  if (process.env[ENV_VARS.GENERATE_EXECUTIVE_SUMMARY]) {
    config.generateExecutiveSummary = process.env[ENV_VARS.GENERATE_EXECUTIVE_SUMMARY].toLowerCase() === 'true';
  }

  // Limit (Integers)
  if (process.env[ENV_VARS.LIMIT]) {
    config.limit = parseInt(process.env[ENV_VARS.LIMIT], 10);
  }
  if (process.env[ENV_VARS.COUNT]) {
    config.count = parseInt(process.env[ENV_VARS.COUNT], 10);
  }

  // Boolean Flags
  if (process.env[ENV_VARS.CACHE_ONLY]) {
    config.cacheOnly = process.env[ENV_VARS.CACHE_ONLY].toLowerCase() === 'true';
  }
  if (process.env[ENV_VARS.NO_CACHE]) {
    // Note: CLI flag is --no-cache which sets cache to false
    // Here we map env var NO_CACHE=true to { cache: false }
    if (process.env[ENV_VARS.NO_CACHE].toLowerCase() === 'true') {
      config.cache = false;
    }
  }
  if (process.env[ENV_VARS.NO_PUPPETEER]) {
    if (process.env[ENV_VARS.NO_PUPPETEER].toLowerCase() === 'true') {
      config.puppeteer = false;
    }
  }
  if (process.env[ENV_VARS.FORCE_DELETE_CACHE]) {
    config.forceDeleteCache = process.env[ENV_VARS.FORCE_DELETE_CACHE].toLowerCase() === 'true';
  }
  if (process.env[ENV_VARS.INCLUDE_ALL_LANGUAGES]) {
    config.includeAllLanguages = process.env[ENV_VARS.INCLUDE_ALL_LANGUAGES].toLowerCase() === 'true';
  }
  if (process.env[ENV_VARS.NO_RECURSIVE]) {
    if (process.env[ENV_VARS.NO_RECURSIVE].toLowerCase() === 'true') {
      config.recursive = false;
    }
  }

  // Strings
  if (process.env[ENV_VARS.THRESHOLDS_FILE]) {
    config.thresholds = process.env[ENV_VARS.THRESHOLDS_FILE];
  }

  return config;
}

/**
 * Checks if running in development mode
 * @returns {boolean}
 */
export function isDevelopment() {
  return process.env[ENV_VARS.NODE_ENV] === NODE_ENV.DEVELOPMENT;
}

/**
 * Checks if running in production mode
 * @returns {boolean}
 */
export function isProduction() {
  return process.env[ENV_VARS.NODE_ENV] === NODE_ENV.PRODUCTION;
}

/**
 * Checks if running in test mode
 * @returns {boolean}
 */
export function isTest() {
  return process.env[ENV_VARS.NODE_ENV] === NODE_ENV.TEST;
}

/**
 * Gets the current Node environment
 * @returns {string} - development, production, or test
 */
export function getNodeEnv() {
  return process.env[ENV_VARS.NODE_ENV] || NODE_ENV.DEVELOPMENT;
}

/**
 * Merges CLI options with environment variables
 * Priority: CLI explicit flags > CLI defaults > Environment variables > System defaults
 * @param {Object} cliOptions - Options from CLI (commander.js)
 * @returns {Object} - Merged configuration
 */
export function mergeConfig(cliOptions = {}) {
  const envConfig = loadEnvConfig();

  // Start with environment variables
  const merged = { ...envConfig };

  // Override with CLI options (CLI takes precedence)
  for (const [key, value] of Object.entries(cliOptions)) {
    // Only override if CLI value is explicitly set (not just default)
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Validates environment configuration
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateEnvConfig() {
  const errors = [];

  // Validate log level if set
  if (process.env[ENV_VARS.LOG_LEVEL]) {
    const logLevel = process.env[ENV_VARS.LOG_LEVEL].toLowerCase();
    if (!Object.values(LOG_LEVELS).includes(logLevel)) {
      errors.push(`Invalid ${ENV_VARS.LOG_LEVEL}: must be one of ${Object.values(LOG_LEVELS).join(', ')}`);
    }
  }

  // Validate max retries if set
  if (process.env[ENV_VARS.MAX_RETRIES]) {
    const maxRetries = parseInt(process.env[ENV_VARS.MAX_RETRIES], 10);
    if (Number.isNaN(maxRetries) || maxRetries < 0) {
      errors.push(`Invalid ${ENV_VARS.MAX_RETRIES}: must be a non-negative integer`);
    }
  }

  // Validate timeout if set
  if (process.env[ENV_VARS.TIMEOUT]) {
    const timeout = parseInt(process.env[ENV_VARS.TIMEOUT], 10);
    if (Number.isNaN(timeout) || timeout <= 0) {
      errors.push(`Invalid ${ENV_VARS.TIMEOUT}: must be a positive integer`);
    }
  }

  // Validate sitemap URL if set
  if (process.env[ENV_VARS.SITEMAP_URL]) {
    try {
      // eslint-disable-next-line no-new
      new URL(process.env[ENV_VARS.SITEMAP_URL]);
    } catch {
      errors.push(`Invalid ${ENV_VARS.SITEMAP_URL}: must be a valid URL`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates example .env file content
 * @returns {string} - Content for .env.example file
 */
export function generateEnvExample() {
  return `# Web Audit Suite - Environment Configuration
# Copy this file to .env and customize for your environment

# Application Environment (development, production, test)
${ENV_VARS.NODE_ENV}=development

# Logging Configuration
${ENV_VARS.LOG_LEVEL}=debug

# Output Configuration
${ENV_VARS.OUTPUT_DIR}=results

# Default Sitemap URL (can be overridden via CLI)
${ENV_VARS.SITEMAP_URL}=https://example.com/sitemap.xml

# Cache Configuration
${ENV_VARS.CACHE_DIR}=.cache

# Network Configuration
${ENV_VARS.MAX_RETRIES}=3
${ENV_VARS.TIMEOUT}=120000

# Feature Flags
# Uncomment to enable by default
# ${ENV_VARS.ENABLE_HISTORY}=true
# ${ENV_VARS.GENERATE_DASHBOARD}=true
# ${ENV_VARS.GENERATE_EXECUTIVE_SUMMARY}=true

# Advanced Options
# ${ENV_VARS.LIMIT}=10
# ${ENV_VARS.COUNT}=50
# ${ENV_VARS.INCLUDE_ALL_LANGUAGES}=true
# ${ENV_VARS.THRESHOLDS_FILE}=./thresholds.json
# ${ENV_VARS.CACHE_ONLY}=false
# ${ENV_VARS.NO_CACHE}=false
# ${ENV_VARS.FORCE_DELETE_CACHE}=false
`;
}

/**
 * Creates .env.example file if it doesn't exist
 * @param {string} rootDir - Root directory of the project
 */
export async function createEnvExample(rootDir = process.cwd()) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const envExamplePath = path.join(rootDir, '.env.example');

    // Check if file already exists
    try {
      await fs.access(envExamplePath);
      // File exists, don't overwrite
    } catch {
      // File doesn't exist, create it
      const content = generateEnvExample();
      await fs.writeFile(envExamplePath, content);
      console.log('Created .env.example file');
    }
  } catch (error) {
    console.warn('Failed to create .env.example:', error.message);
  }
}

/**
 * Loads .env file if it exists (optional dotenv-like functionality)
 * This is a simple implementation - for production use, consider using the 'dotenv' package
 * @param {string} envPath - Path to .env file
 * @returns {Object} - Parsed environment variables
 */
export async function loadDotEnv(envPath = '.env') {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const fullPath = path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
    const content = await fs.readFile(fullPath, 'utf-8');

    const env = {};
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (!line || line.trim().startsWith('#')) continue;

      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '').trim();
        env[key] = cleanValue;

        // Set in process.env if not already set
        if (!process.env[key]) {
          process.env[key] = cleanValue;
        }
      }
    }

    return env;
  } catch (error) {
    // .env file is optional, silently ignore if not found
    if (error.code !== 'ENOENT') {
      console.warn(`Failed to load .env file: ${error.message}`);
    }
    return {};
  }
}
