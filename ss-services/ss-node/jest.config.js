// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  roots: ['<rootDir>/__tests__', '<rootDir>/packages', '<rootDir>/apps'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/packages/ss-core/src/$1',
    // ss-collector 包嵌套在 packages/ss-collector/ 下，需优先匹配
    '^@ss-node/(ss-collector-sdk|ss-collector-modbus|ss-collector-mqtt|ss-collector-opcua|ss-collector-s7|ss-collector-virtual)$':
      '<rootDir>/packages/ss-collector/$1/src',
    '^@ss-node/(ss-collector-sdk|ss-collector-modbus|ss-collector-mqtt|ss-collector-opcua|ss-collector-s7|ss-collector-virtual)/(.+)$':
      '<rootDir>/packages/ss-collector/$1/src/$2',
    // ss-storage-influx 包嵌套在 packages/ss-storage/ 下，需优先匹配
    '^@ss-node/(ss-storage-influx)$': '<rootDir>/packages/ss-storage/$1/src',
    '^@ss-node/(ss-storage-influx)/(.+)$': '<rootDir>/packages/ss-storage/$1/src/$2',
    '^@ss-node/([^/]+)/(.+)$': '<rootDir>/packages/$1/src/$2',
    '^@ss-node/([^/]+)$': '<rootDir>/packages/$1/src',
  },

  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false, tsconfig: '<rootDir>/tsconfig.base.json' }],
  },

  collectCoverageFrom: [
    'packages/**/src/**/*.ts',
    '!packages/**/src/**/*.module.ts',
    '!packages/**/src/**/*.dto.ts',
    '!packages/**/src/**/*.interface.ts',
    '!packages/**/src/**/*.types.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'text-summary'],

  coverageThreshold: {
    global: {
      branches: 60,
      functions: 75,
      lines: 72,
      statements: 72,
    },
    './packages/ss-core/src/cache/': {
      branches: 68,
      functions: 80,
      lines: 78,
      statements: 78,
    },
    './packages/ss-collector/ss-collector-sdk/src/pipeline/circuit-breaker.service.ts': {
      branches: 75,
      functions: 82,
      lines: 82,
      statements: 82,
    },
  },

  testTimeout: 15000,

  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],

  verbose: true,

  testMatch: ['**/__tests__/**/*.(spec|test).ts'],

  testPathIgnorePatterns: ['/dist/', '/node_modules/', '.*\\.d\\.ts$'],
};
