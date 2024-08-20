export default {
    testEnvironment: 'node',
    transform: {},
    // extensionsToTreatAsEsm: [],
    moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    verbose: true,
  };