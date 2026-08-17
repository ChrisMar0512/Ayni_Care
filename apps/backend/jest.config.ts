import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  maxWorkers: 1,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

export default config;
