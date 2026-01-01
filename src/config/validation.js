/**
 * Configuration validation and schema enforcement
 * Ensures all configuration values are valid before use
 */

import { LOG_LEVELS, defaultOptions } from './defaults.js';

/**
 * Configuration schema definition
 */
export const configSchema = {
  sitemap: {
    type: 'string',
    required: true,
    validate: (value) => {
      if (!value || typeof value !== 'string') {
        return 'Sitemap URL must be a non-empty string';
      }
      try {
        // eslint-disable-next-line no-new
        new URL(value);
        return null;
      } catch {
        return 'Sitemap URL must be a valid URL';
      }
    },
  },
  output: {
    type: 'string',
    required: true,
    default: 'results',
    validate: (value) => {
      if (!value || typeof value !== 'string') {
        return 'Output directory must be a non-empty string';
      }
      if (value.includes('..')) {
        return 'Output directory cannot contain ".." (path traversal)';
      }
      return null;
    },
  },
  limit: {
    type: 'number',
    required: false,
    default: -1,
    validate: (value) => {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return 'Limit must be an integer';
      }
      if (value < -1) {
        return 'Limit must be -1 (unlimited) or a positive integer';
      }
      return null;
    },
  },
  count: {
    type: 'number',
    required: false,
    default: -1,
    validate: (value) => {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return 'Count must be an integer';
      }
      if (value < -1) {
        return 'Count must be -1 (unlimited) or a positive integer';
      }
      return null;
    },
  },
  cacheOnly: {
    type: 'boolean',
    required: false,
    default: false,
  },
  cache: {
    type: 'boolean',
    required: false,
    default: true,
  },
  forceDeleteCache: {
    type: 'boolean',
    required: false,
    default: false,
  },
  logLevel: {
    type: 'string',
    required: false,
    default: 'debug',
    validate: (value) => {
      const validLevels = Object.values(LOG_LEVELS);
      if (!validLevels.includes(value)) {
        return `Log level must be one of: ${validLevels.join(', ')}`;
      }
      return null;
    },
  },
  includeAllLanguages: {
    type: 'boolean',
    required: false,
    default: false,
  },
  recursive: {
    type: 'boolean',
    required: false,
    default: true,
  },
  enableHistory: {
    type: 'boolean',
    required: false,
    default: false,
  },
  generateDashboard: {
    type: 'boolean',
    required: false,
    default: false,
  },
  generateExecutiveSummary: {
    type: 'boolean',
    required: false,
    default: false,
  },
  thresholds: {
    required: false,
    validate: (value) => {
      if (value && typeof value !== 'string' && typeof value !== 'object') {
        return 'Thresholds must be a file path (string) or configuration object';
      }
      return null;
    },
  },
};

/**
 * Threshold configuration schema
 */
export const thresholdSchema = {
  performance: {
    type: 'object',
    properties: {
      loadTime: {
        type: 'object',
        properties: {
          pass: { type: 'number', min: 0 },
          warn: { type: 'number', min: 0 },
        },
      },
      lcp: {
        type: 'object',
        properties: {
          pass: { type: 'number', min: 0 },
          warn: { type: 'number', min: 0 },
        },
      },
      fcp: {
        type: 'object',
        properties: {
          pass: { type: 'number', min: 0 },
          warn: { type: 'number', min: 0 },
        },
      },
      cls: {
        type: 'object',
        properties: {
          pass: { type: 'number', min: 0, max: 1 },
          warn: { type: 'number', min: 0, max: 1 },
        },
      },
    },
  },
  accessibility: {
    type: 'object',
    properties: {
      maxErrors: {
        type: 'object',
        properties: {
          pass: { type: 'number', min: 0 },
          warn: { type: 'number', min: 0 },
        },
      },
      maxWarnings: {
        type: 'object',
        properties: {
          pass: { type: 'number', min: 0 },
          warn: { type: 'number', min: 0 },
        },
      },
    },
  },
  seo: {
    type: 'object',
    properties: {
      minScore: {
        type: 'object',
        properties: {
          pass: { type: 'number', min: 0, max: 100 },
          warn: { type: 'number', min: 0, max: 100 },
        },
      },
    },
  },
  llm: {
    type: 'object',
    properties: {
      minServedScore: {
        type: 'object',
        properties: {
          pass: { type: 'number', min: 0, max: 100 },
          warn: { type: 'number', min: 0, max: 100 },
        },
      },
      minRenderedScore: {
        type: 'object',
        properties: {
          pass: { type: 'number', min: 0, max: 100 },
          warn: { type: 'number', min: 0, max: 100 },
        },
      },
    },
  },
};

/**
 * Validates a configuration object against the schema
 * @param {Object} config - Configuration to validate
 * @param {Object} schema - Schema to validate against
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateConfig(config, schema = configSchema) {
  const errors = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = config[key];

    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }

    // Skip validation if field is not present and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    // eslint-disable-next-line valid-typeof
    if (rules.type && typeof value !== rules.type) {
      errors.push(`Field "${key}" must be of type ${rules.type}, got ${typeof value}`);
      continue;
    }

    // Custom validation function
    if (rules.validate) {
      const error = rules.validate(value);
      if (error) {
        errors.push(`Field "${key}": ${error}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates threshold configuration
 * @param {Object} thresholds - Threshold configuration to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateThresholds(thresholds) {
  const errors = [];

  for (const [category, categorySchema] of Object.entries(thresholdSchema)) {
    const categoryValue = thresholds[category];

    if (!categoryValue) continue;

    if (typeof categoryValue !== 'object') {
      errors.push(`Threshold category "${category}" must be an object`);
      continue;
    }

    for (const [metric, metricSchema] of Object.entries(categorySchema.properties)) {
      const metricValue = categoryValue[metric];

      if (!metricValue) continue;

      if (typeof metricValue !== 'object') {
        errors.push(`Threshold "${category}.${metric}" must be an object`);
        continue;
      }

      // Validate pass and warn properties
      for (const [level, levelSchema] of Object.entries(metricSchema.properties)) {
        const levelValue = metricValue[level];

        if (levelValue === undefined) continue;

        // eslint-disable-next-line valid-typeof
        if (typeof levelValue !== levelSchema.type) {
          errors.push(`Threshold "${category}.${metric}.${level}" must be a ${levelSchema.type}`);
          continue;
        }

        if (levelSchema.min !== undefined && levelValue < levelSchema.min) {
          errors.push(`Threshold "${category}.${metric}.${level}" must be >= ${levelSchema.min}`);
        }

        if (levelSchema.max !== undefined && levelValue > levelSchema.max) {
          errors.push(`Threshold "${category}.${metric}.${level}" must be <= ${levelSchema.max}`);
        }
      }

      // Validate that warn >= pass for most metrics (except accessibility where lower is better)
      if (metricValue.pass !== undefined && metricValue.warn !== undefined) {
        if (category === 'accessibility') {
          // For accessibility, warn should be >= pass (more issues allowed)
          if (metricValue.warn < metricValue.pass) {
            errors.push(`Threshold "${category}.${metric}": warn value should be >= pass value`);
          }
        } else if (category === 'performance') {
          // For performance times, warn should be >= pass (more time allowed)
          if (metricValue.warn < metricValue.pass) {
            errors.push(`Threshold "${category}.${metric}": warn value should be >= pass value`);
          }
        } else if (metricValue.warn > metricValue.pass) {
          errors.push(`Threshold "${category}.${metric}": warn value should be <= pass value for scores`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Applies default values to configuration
 * @param {Object} config - Configuration object
 * @returns {Object} - Configuration with defaults applied
 */
export function applyDefaults(config) {
  // Start with default options
  const result = { ...defaultOptions };

  // Override with provided config
  // We do a shallow merge for top-level keys
  // For nested objects like pa11y, thresholds, etc., we need to handle them carefully
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) continue;

    if (
      typeof value === 'object'
      && value !== null
      && !Array.isArray(value)
      && defaultOptions[key]
      && typeof defaultOptions[key] === 'object'
    ) {
      // Shallow merge for second level (e.g. pa11y settings)
      result[key] = { ...defaultOptions[key], ...value };
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Sanitizes configuration values
 * @param {Object} config - Configuration to sanitize
 * @returns {Object} - Sanitized configuration
 */
export function sanitizeConfig(config) {
  const sanitized = { ...config };

  // Trim string values
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    }
  }

  // Ensure output directory doesn't end with slash
  if (sanitized.output && sanitized.output.endsWith('/')) {
    sanitized.output = sanitized.output.slice(0, -1);
  }

  // Normalize boolean values
  if (typeof sanitized.cache === 'string') {
    sanitized.cache = sanitized.cache.toLowerCase() === 'true';
  }
  if (typeof sanitized.cacheOnly === 'string') {
    sanitized.cacheOnly = sanitized.cacheOnly.toLowerCase() === 'true';
  }

  return sanitized;
}

/**
 * Validates and prepares configuration for use
 * @param {Object} config - Raw configuration
 * @returns {Object} - { valid: boolean, config: Object, errors: string[] }
 */
export function prepareConfig(config) {
  // Apply defaults using the central defaultOptions
  let prepared = applyDefaults(config);

  // Sanitize values
  prepared = sanitizeConfig(prepared);

  // Validate
  // Note: We might want to extend validation to cover the new sections from defaultOptions
  // but for now we stick to the existing schema validation for the core fields
  const validation = validateConfig(prepared);

  return {
    valid: validation.valid,
    config: prepared,
    errors: validation.errors,
  };
}

/**
 * Loads and validates threshold configuration from file
 * @param {string} filePath - Path to threshold configuration file
 * @returns {Promise<Object>} - { valid: boolean, thresholds: Object, errors: string[] }
 */
export async function loadThresholds(filePath) {
  try {
    const fs = await import('fs/promises');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const thresholds = JSON.parse(fileContent);

    const validation = validateThresholds(thresholds);

    return {
      valid: validation.valid,
      thresholds,
      errors: validation.errors,
    };
  } catch (error) {
    return {
      valid: false,
      thresholds: null,
      errors: [`Failed to load thresholds file: ${error.message}`],
    };
  }
}
