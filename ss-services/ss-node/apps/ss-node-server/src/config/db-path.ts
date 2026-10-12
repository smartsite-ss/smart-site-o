// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as path from 'path';
import * as fs from 'fs';

/**
 * Resolve the SQLite database absolute path from environment configuration.
 *
 * Priority chain (aligned with NestJS ConfigModule + .env.base):
 *   1. process.env.DATABASE_PATH  →  relative to projectRoot
 *   2. Fallback: './data/ss-data.db' → relative to projectRoot
 *
 * @param projectRoot - Absolute path to ss-services/ss-data/
 * @param env - Environment variables (defaults to process.env, overridable for testing)
 * @returns Absolute path to the SQLite database file
 */
export function resolveDatabasePath(
  projectRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const dbPath = env.DATABASE_PATH || './data/ss-node.db';
  return path.resolve(projectRoot, dbPath);
}

/**
 * Load .env files and expand ${VAR} references for TypeORM CLI usage.
 *
 * TypeORM CLI (data-source.ts) does not go through NestJS ConfigModule,
 * so we must manually load .env files to pick up DATABASE_PATH.
 *
 * Variables already set in process.env are NOT overwritten
 * (respects explicit CLI env overrides).
 *
 * @param projectRoot - Absolute path to ss-services/ss-data/
 */
export function loadEnvFiles(projectRoot: string): void {
  const appEnv = process.env.APP_ENV || 'dev';
  const files = [
    path.resolve(projectRoot, `.env.${appEnv}`),
    path.resolve(projectRoot, '.env.base'),
  ];

  // Pass 1: load key=value pairs (respect existing env)
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (process.env[key] !== undefined) continue; // do not override
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }

  // Pass 2: expand ${VAR} references (e.g. DATABASE_PATH=${DATA_DIR}/db/ss-data.db)
  for (const key of Object.keys(process.env)) {
    const value = process.env[key];
    if (value && typeof value === 'string' && value.includes('${')) {
      process.env[key] = value.replace(/\$\{(\w+)\}/g, (_: string, varName: string) => {
        return process.env[varName] || '';
      });
    }
  }
}
