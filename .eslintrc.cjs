module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
    requireConfigFile: false,
  },
  plugins: ['unused-imports'],
  rules: {
    'import/extensions': ['error', { js: 'always' }],
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'no-param-reassign': [2, { props: false }],
    'no-console': 'off',
    'max-len': 'off',
    'no-unused-vars': 'off', // Disabled in favor of unused-imports/no-unused-vars
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
    'no-underscore-dangle': 'off',
    'linebreak-style': 'off',
    'no-process-exit': 'off',
    'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
    'no-plusplus': 'off',
    'no-continue': 'off',
    'no-restricted-syntax': [
      'error',
      'ForInStatement',
      'LabeledStatement',
      'WithStatement',
    ],
    'import/prefer-default-export': 'off',
    'no-await-in-loop': 'off',
    'no-nested-ternary': 'off',
  },
  ignorePatterns: [
    '.claude/**/*.md',
    'node_modules',
  ],
  overrides: [
    {
      files: ['test/**/*.js'],
      env: {
        mocha: true,
      },
    },
  ],
};