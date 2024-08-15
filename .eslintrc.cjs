module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
  },
  plugins: [
    'node',
  ],
  rules: {
    'node/file-extension-in-import': ['error', 'always'],
    'node/no-unsupported-features/es-syntax': ['error', {
      version: '>=20.0.0',
      ignores: ['modules'],
    }],
    'no-process-exit': 'off', // Turning off this rule as it's causing issues
  },
  settings: {
    node: {
      version: '>=20.0.0',
    },
  },
};