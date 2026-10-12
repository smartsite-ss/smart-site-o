// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  rootDir: path.resolve(__dirname, '..', '..'),

  roots: ['<rootDir>/apps/ss-node-server/src'],

  moduleNameMapper: {
    // ss-collector 系列嵌套在 packages/ss-collector/ 下，需优先匹配
    '^@ss-node/ss-collector-([^/]+)/(.+)$': '<rootDir>/packages/ss-collector/ss-collector-$1/src/$2',
    '^@ss-node/ss-collector-([^/]+)$': '<rootDir>/packages/ss-collector/ss-collector-$1/src',
    // ss-storage-influx 嵌套在 packages/ss-storage/ 下，需优先匹配
    '^@ss-node/ss-storage-influx/(.+)$': '<rootDir>/packages/ss-storage/ss-storage-influx/src/$1',
    '^@ss-node/ss-storage-influx$': '<rootDir>/packages/ss-storage/ss-storage-influx/src',
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