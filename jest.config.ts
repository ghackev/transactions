import type { Config } from 'jest';

const baseConfig: Omit<Config, 'displayName' | 'testRegex' | 'coverageDirectory' | 'collectCoverage' | 'coverageThreshold'> = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/main.ts'],
  testEnvironment: 'node'
};

const config: Config = {
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      testRegex: '.*\\.spec\\.ts$',
      coverageDirectory: 'coverage/unit',
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 85,
          lines: 90,
          statements: 90
        }
      }
    },
    {
      ...baseConfig,
      displayName: 'e2e',
      testRegex: '.*\\.e2e-spec\\.ts$',
      coverageDirectory: 'coverage/e2e',
    }
  ]
};

export default config;
