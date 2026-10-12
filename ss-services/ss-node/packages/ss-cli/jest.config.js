// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false }],
  },
  testMatch: ['**/__tests__/**/*.(spec|test).ts'],
  testPathIgnorePatterns: ['/dist/', '/node_modules/'],
  moduleNameMapper: {
    '^@ss-node/([^/]+)/(.+)$': '<rootDir>/../$1/src/$2',
    '^@ss-node/([^/]+)$': '<rootDir>/../$1/src',
  },
  verbose: true,
};