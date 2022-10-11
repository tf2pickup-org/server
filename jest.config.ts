import type { JestConfigWithTsJest } from 'ts-jest/dist/types';
import { defaults } from 'ts-jest/presets';
import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

const config: JestConfigWithTsJest = {
  ...defaults,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.(t|j)s',
    '!src/utils/testing-mongoose-module.ts',
  ],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['trace-unhandled/register'],
  fakeTimers: {
    legacyFakeTimers: true,
  },
};

export default config;
