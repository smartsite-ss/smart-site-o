// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  rootDir: path.resolve(__dirname, '..', '..'),

  roots: ['<rootDir>/packages/ss-report/src'],

  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],

  moduleNameMapper: {
    '^@ss-node/ss-sdk$': '<rootDir>/packages/ss-sdk/src',
    '^@ss-node/ss-core$': '<rootDir>/packages/ss-core/src',
    // ss-storage-influx 嵌套在 packages/ss-storage/ 下
    '^@ss-node/ss-storage-influx$': '<rootDir>/packages/ss-storage/ss-storage-influx/src',
    '^@ss-node/ss-storage-influx/(.+)$': '<rootDir>/packages/ss-storage/ss-storage-influx/src/$1',
    // ss-collector-* 嵌套在 packages/ss-collector/ 下
    '^@ss-node/(ss-collector-sdk|ss-collector-modbus|ss-collector-mqtt|ss-collector-opcua|ss-collector-s7|ss-collector-virtual)$':
      '<rootDir>/packages/ss-collector/$1/src',
    '^@ss-node/(ss-collector-sdk|ss-collector-modbus|ss-collector-mqtt|ss-collector-opcua|ss-collector-s7|ss-collector-virtual)/(.+)$':
      '<rootDir>/packages/ss-collector/$1/src/$2',
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
