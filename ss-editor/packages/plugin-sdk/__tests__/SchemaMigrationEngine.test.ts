// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { SchemaMigrationEngine } from '../src/utils/SchemaMigrationEngine';
import type { SchemaMigration, PluginPropertySchema } from '../src/types/PluginPropertySchema';

describe('SchemaMigrationEngine.migrate', () => {
  const migrations: SchemaMigration[] = [
    { from: 1, to: 2, migrate: (props) => ({ ...props, newField: 'added' }) },
    { from: 2, to: 3, migrate: (props) => ({ ...props, color: props.oldColor, oldColor: undefined }) },
  ];

  it('should run no migration if already at target', () => {
    const result = SchemaMigrationEngine.migrate(
      { type: 'test', schemaVersion: 3, props: { name: 'a' } },
      migrations,
      3,
    );
    expect(result.props).toEqual({ name: 'a' });
  });

  it('should run single migration v1->v2', () => {
    const result = SchemaMigrationEngine.migrate(
      { type: 'test', schemaVersion: 1, props: { name: 'a' } },
      migrations,
      2,
    );
    expect(result.props.newField).toBe('added');
    expect(result.props.name).toBe('a');
  });

  it('should chain multiple migrations v1->v3', () => {
    const result = SchemaMigrationEngine.migrate(
      { type: 'test', schemaVersion: 1, props: { name: 'a', oldColor: '#ff00ff' } },
      migrations,
      3,
    );
    expect(result.props.newField).toBe('added');
    expect(result.props.color).toBe('#ff00ff');
  });
});

describe('SchemaMigrationEngine.migrateAndClean', () => {
  const schema: PluginPropertySchema = {
    fields: [
      { name: 'name', type: 'text', defaultValue: 'default' },
      { name: 'count', type: 'number', defaultValue: 0 },
      { name: 'active', type: 'boolean', defaultValue: false },
    ],
  };

  const migrations: SchemaMigration[] = [
    { from: 1, to: 2, migrate: (props) => ({ ...props, count: Number(props.count), active: true }) },
  ];

  it('should filter out fields not in schema', () => {
    const result = SchemaMigrationEngine.migrateAndClean(
      { type: 'test', schemaVersion: 1, props: { name: 'a', count: '5', removedField: 'should-be-gone' } },
      migrations,
      2,
      schema,
    );
    expect(result.props.name).toBe('a');
    expect(result.props.count).toBe(5);
    expect(Object.keys(result.props)).not.toContain('removedField');
  });

  it('should fill missing fields with defaults', () => {
    const result = SchemaMigrationEngine.migrateAndClean(
      { type: 'test', schemaVersion: 2, props: { name: 'a' } },
      [],
      2,
      schema,
    );
    expect(result.props.name).toBe('a');
    expect(result.props.count).toBe(0);
    expect(result.props.active).toBe(false);
  });

  it('should run migration then clean', () => {
    const result = SchemaMigrationEngine.migrateAndClean(
      { type: 'test', schemaVersion: 1, props: { name: 'a', count: '10', oldThing: 'x' } },
      migrations,
      2,
      schema,
    );
    expect(result.props.name).toBe('a');
    expect(result.props.count).toBe(10);
    expect(result.props.active).toBe(true);
    expect(Object.keys(result.props)).not.toContain('oldThing');
  });
});