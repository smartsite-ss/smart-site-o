// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { SchemaMigration, PluginPropertySchema } from '../types/PluginPropertySchema';

export interface MigrationSource {
  type: string;
  schemaVersion: number;
  props: Record<string, any>;
}

export interface MigrationResult {
  props: Record<string, any>;
}

export class SchemaMigrationEngine {
  static migrate(
    source: MigrationSource,
    migrations: SchemaMigration[],
    _targetVersion: number,
  ): MigrationResult {
    let currentVersion = source.schemaVersion;
    let { props } = source;
    for (const m of migrations) {
      if (currentVersion >= m.from && currentVersion < m.to) {
        props = m.migrate(props);
        currentVersion = m.to;
      }
    }
    return { props };
  }

  static migrateAndClean(
    source: MigrationSource,
    migrations: SchemaMigration[],
    targetVersion: number,
    schema: PluginPropertySchema,
  ): MigrationResult {
    const { props } = this.migrate(source, migrations, targetVersion);

    const validKeys = new Set(schema.fields.map((f) => f.name));
    const filtered: Record<string, any> = {};
    for (const [key, value] of Object.entries(props)) {
      if (validKeys.has(key)) {
        filtered[key] = value;
      }
    }

    for (const field of schema.fields) {
      if (!(field.name in filtered) && field.defaultValue !== undefined) {
        filtered[field.name] = field.defaultValue;
      }
    }

    return { props: filtered };
  }
}