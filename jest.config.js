module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '((\\.|/*.)(spec))\\.ts?$',
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageThreshold: {
    global: {
      lines: 40,
    },
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '.mock.ts'
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],
};
