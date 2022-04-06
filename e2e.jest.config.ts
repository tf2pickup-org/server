import type { InitialOptionsTsJest } from 'ts-jest/dist/types';
import { defaults } from 'ts-jest/presets';
import { pathsToModuleNameMapper } from 'ts-jest/utils';
import { compilerOptions } from './tsconfig.json';

const config: InitialOptionsTsJest = {
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
  testMatch: ['<rootDir>/e2e/**/*.e2e-spec.ts'],
  slowTestThreshold: 10,
  setupFiles: ['trace-unhandled/register'],
};
export default config;
