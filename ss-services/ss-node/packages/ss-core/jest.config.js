// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  rootDir: path.resolve(__dirname, '..', '..'),

  roots: ['<rootDir>/packages/ss-core/src'],

  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],

  moduleNameMapper: {
    '^@ss-node/ss-sdk$': '<rootDir>/packages/ss-sdk/src',
    '^@ss-node/ss-core$': '<rootDir>/packages/ss-core/src',
    '^@ss-node/([^/]+)/(.+)$': '<rootDir>/packages/$1/src/$2',
    '^@ss-node/([^/]+)$': '<rootDir>/packages/$1/src',
  },

  transform: {
    '^.+\\.ts$': ['ts-jest', {
      diagnostics: false,
      tsconfig: '<rootDir>/tsconfig.base.json',
      isolatedModules: true,
    }],
  },

  testPathIgnorePatterns: ['/dist/', '/node_modules/'],

  testMatch: ['**/__tests__/**/*.(spec|test).ts'],
  testTimeout: 10000,
  verbose: true,
};