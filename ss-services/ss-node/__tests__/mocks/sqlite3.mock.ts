// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// Mock for sqlite3 native module used in tests
// sqlite3 is used in project-database.service.ts for backup/restore and SQL script execution

const mockDatabase = {
  run: jest.fn((sql: string, params?: any, callback?: any) => {
    const cb = typeof params === 'function' ? params : callback;
    if (cb) cb(null);
  }),
  exec: jest.fn((sql: string, callback?: any) => {
    if (callback) callback(null);
  }),
  all: jest.fn((sql: string, params?: any, callback?: any) => {
    const cb = typeof params === 'function' ? params : callback;
    if (cb) cb(null, []);
  }),
  get: jest.fn((sql: string, params?: any, callback?: any) => {
    const cb = typeof params === 'function' ? params : callback;
    if (cb) cb(null, undefined);
  }),
  close: jest.fn((callback?: any) => {
    if (callback) callback(null);
  }),
  serialize: jest.fn((fn?: any) => {
    if (fn) fn();
  }),
  parallelize: jest.fn((fn?: any) => {
    if (fn) fn();
  }),
};

const mockSqlite3: any = {
  Database: jest.fn().mockImplementation((_dbPath: string, callback?: any) => {
    if (callback) {
      // Simulate async construction
      setImmediate(() => callback(null));
    }
    return mockDatabase;
  }),
  OPEN_READONLY: 1,
  OPEN_READWRITE: 2,
  OPEN_CREATE: 4,
  verbose: jest.fn(),
};

// verbose() returns itself for chaining
mockSqlite3.verbose.mockReturnValue(mockSqlite3);

module.exports = mockSqlite3;