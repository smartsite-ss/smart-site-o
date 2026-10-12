// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { resolveDatabasePath, loadEnvFiles } from '../config/db-path';
import { getDataSourceOptions } from '../data-source';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Create a temp directory and .env file, return cleanup function */
function createTempEnv(
  fileMap: Record<string, string>, // relative filename → content
): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-data-db-test-'));
  for (const [filename, content] of Object.entries(fileMap)) {
    fs.writeFileSync(path.join(dir, filename), content, 'utf-8');
  }
  return {
    dir,
    cleanup: () => {
      for (const filename of Object.keys(fileMap)) {
        const fp = path.join(dir, filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      if (fs.existsSync(dir)) fs.rmdirSync(dir);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-DB-100 ~ TC-DB-107: resolveDatabasePath
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveDatabasePath', () => {
  const projectRoot = '/home/user/ss-services/ss-data';

  // TC-DB-100: uses DATABASE_PATH when set
  it('TC-DB-100: should use DATABASE_PATH when set in env', () => {
    const env = { DATABASE_PATH: '../../ss-run/ss/data/db/ss-data.db' };
    const result = resolveDatabasePath(projectRoot, env);
    expect(result).toBe(path.resolve(projectRoot, '../../ss-run/ss/data/db/ss-data.db'));
  });

  // TC-DB-101: falls back to default when DATABASE_PATH is not set
  it('TC-DB-101: should fall back to ./data/ss-node.db when DATABASE_PATH is not set', () => {
    const env = {};
    const result = resolveDatabasePath(projectRoot, env);
    expect(result).toBe(path.resolve(projectRoot, './data/ss-node.db'));
  });

  // TC-DB-102: falls back when DATABASE_PATH is empty string
  it('TC-DB-102: should fall back when DATABASE_PATH is empty string', () => {
    const env = { DATABASE_PATH: '' };
    const result = resolveDatabasePath(projectRoot, env);
    // empty string is falsy, so || fallback kicks in
    expect(result).toBe(path.resolve(projectRoot, './data/ss-node.db'));
  });

  // TC-DB-103: resolves relative path correctly
  it('TC-DB-103: should resolve relative DATABASE_PATH against projectRoot', () => {
    const env = { DATABASE_PATH: 'custom/path/mydb.db' };
    const result = resolveDatabasePath(projectRoot, env);
    expect(result).toBe(path.resolve(projectRoot, 'custom/path/mydb.db'));
  });

  // TC-DB-104: resolves absolute path as-is (platform-aware)
  it('TC-DB-104: should resolve absolute DATABASE_PATH correctly', () => {
    const absPath = path.resolve('/absolute/path/to/db.sqlite');
    const env = { DATABASE_PATH: absPath };
    const result = resolveDatabasePath(projectRoot, env);
    // On Windows, path.resolve prepends drive letter; on POSIX, it returns as-is
    expect(result).toBe(absPath);
  });

  // TC-DB-105: handles Windows-style paths
  it('TC-DB-105: should handle Windows-style relative paths', () => {
    const env = { DATABASE_PATH: '..\\..\\ss-run\\ss\\data\\db\\ss-data.db' };
    const result = resolveDatabasePath('C:\\work\\ss-services\\ss-data', env);
    expect(result).toBe(
      path.resolve('C:\\work\\ss-services\\ss-data', '..\\..\\ss-run\\ss\\data\\db\\ss-data.db'),
    );
  });

  // TC-DB-106: multiple env vars present, only DATABASE_PATH matters
  it('TC-DB-106: should ignore other env vars and only use DATABASE_PATH', () => {
    const env = {
      DATABASE_PATH: 'target.db',
      DB_TYPE: 'mysql',
      DATABASE_HOST: 'localhost',
    };
    const result = resolveDatabasePath(projectRoot, env);
    expect(result).toBe(path.resolve(projectRoot, 'target.db'));
  });

  // TC-DB-107: returns consistent result for same inputs
  it('TC-DB-107: should return deterministic result for same inputs', () => {
    const env = { DATABASE_PATH: './data/ss-data.db' };
    const r1 = resolveDatabasePath(projectRoot, env);
    const r2 = resolveDatabasePath(projectRoot, env);
    expect(r1).toBe(r2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-DB-200 ~ TC-DB-205: loadEnvFiles
// ─────────────────────────────────────────────────────────────────────────────

describe('loadEnvFiles', () => {
  // TC-DB-200: loads key=value from .env.base
  it('TC-DB-200: should load key=value pairs from .env.base', () => {
    const { dir, cleanup } = createTempEnv({
      '.env.base': 'TEST_KEY_200=hello_world\nANOTHER_KEY=123',
    });
    try {
      loadEnvFiles(dir);
      expect(process.env.TEST_KEY_200).toBe('hello_world');
      expect(process.env.ANOTHER_KEY).toBe('123');
    } finally {
      cleanup();
      delete process.env.TEST_KEY_200;
      delete process.env.ANOTHER_KEY;
    }
  });

  // TC-DB-201: does not override existing env vars
  it('TC-DB-201: should NOT override already-set environment variables', () => {
    process.env.PREEXISTING_KEY = 'original_value';
    const { dir, cleanup } = createTempEnv({
      '.env.ss': 'PREEXISTING_KEY=from_file',
    });
    try {
      loadEnvFiles(dir);
      expect(process.env.PREEXISTING_KEY).toBe('original_value');
    } finally {
      cleanup();
      delete process.env.PREEXISTING_KEY;
    }
  });

  // TC-DB-202: expands ${VAR} references
  it('TC-DB-202: should expand ${VAR} references in values', () => {
    const { dir, cleanup } = createTempEnv({
      '.env.base': 'BASE_PATH=/base\nEXPANDED_PATH=${BASE_PATH}/sub/db.db',
    });
    try {
      loadEnvFiles(dir);
      expect(process.env.BASE_PATH).toBe('/base');
      expect(process.env.EXPANDED_PATH).toBe('/base/sub/db.db');
    } finally {
      cleanup();
      delete process.env.BASE_PATH;
      delete process.env.EXPANDED_PATH;
    }
  });

  // TC-DB-203: handles missing .env files gracefully
  it('TC-DB-203: should not throw when .env files do not exist', () => {
    const nonExistentDir = path.join(os.tmpdir(), 'nonexistent-dir-' + Date.now());
    expect(() => loadEnvFiles(nonExistentDir)).not.toThrow();
  });

  // TC-DB-204: strips quotes from values
  it('TC-DB-204: should strip surrounding double quotes from values', () => {
    const { dir, cleanup } = createTempEnv({
      '.env.base': 'QUOTED_KEY="quoted value"',
    });
    try {
      loadEnvFiles(dir);
      expect(process.env.QUOTED_KEY).toBe('quoted value');
    } finally {
      cleanup();
      delete process.env.QUOTED_KEY;
    }
  });

  // TC-DB-205: skips comment lines and empty lines
  it('TC-DB-205: should skip comment lines and empty lines', () => {
    const { dir, cleanup } = createTempEnv({
      '.env.base': '# This is a comment\n\nVALID_KEY=yes\n   # indented comment',
    });
    try {
      loadEnvFiles(dir);
      expect(process.env.VALID_KEY).toBe('yes');
      // # comment lines should not become env vars
      expect(process.env['# This is a comment']).toBeUndefined();
      expect(process.env['# indented comment']).toBeUndefined();
    } finally {
      cleanup();
      delete process.env.VALID_KEY;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-DB-300 ~ TC-DB-303: getDataSourceOptions (data-source.ts)
// ─────────────────────────────────────────────────────────────────────────────

describe('getDataSourceOptions', () => {
  // TC-DB-300: returns valid DataSourceOptions with sqlite type
  it('TC-DB-300: should return options with sqlite type', () => {
    const opts = getDataSourceOptions();
    expect(opts.type).toBe('sqlite');
  });

  // TC-DB-301: database path is a non-empty string
  it('TC-DB-301: database path should be a non-empty string', () => {
    const opts = getDataSourceOptions();
    expect(typeof opts.database).toBe('string');
    expect(opts.database!.length).toBeGreaterThan(0);
  });

  // TC-DB-302: entities glob pattern is configured
  it('TC-DB-302: should have entities configured', () => {
    const opts = getDataSourceOptions();
    expect(opts.entities).toBeDefined();
    expect(Array.isArray(opts.entities)).toBe(true);
    expect(opts.entities!.length).toBeGreaterThan(0);
  });

  // TC-DB-303: migrations configuration is present
  it('TC-DB-303: should have migrations table name configured', () => {
    const opts = getDataSourceOptions();
    expect(opts.migrationsTableName).toBe('migrations');
    expect(opts.migrations).toBeDefined();
    expect(Array.isArray(opts.migrations)).toBe(true);
  });
});
