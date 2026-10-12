// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';
import { resolveDatabasePath, loadEnvFiles } from './config/db-path';

// Load .env files for TypeORM CLI (CLI does not go through NestJS ConfigModule)
const projectRoot = path.resolve(__dirname, '..', '..', '..');
loadEnvFiles(projectRoot);

/**
 * Build TypeORM DataSource options.
 * Uses DATABASE_PATH from .env.ss (or environment), falls back to ./data/ss-data.db.
 */
export function getDataSourceOptions(): DataSourceOptions {
  return {
    type: 'sqlite',
    database: resolveDatabasePath(projectRoot),
    entities: [path.resolve(projectRoot, 'packages', '**', 'entities', '*.entity.{ts,js}')],
    migrations: [path.resolve(__dirname, 'migrations', '*{.ts,.js}')],
    migrationsTableName: 'migrations',
    extra: { busyTimeout: 10000 },
  };
}

export const AppDataSource = new DataSource(getDataSourceOptions());
