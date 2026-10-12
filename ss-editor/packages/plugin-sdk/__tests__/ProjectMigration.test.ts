// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { ProjectMigration } from '../src/utils/ProjectMigration';
import type { SchemaMigration } from '../src/types/PluginPropertySchema';
import type { ProjectData } from '../src/utils/ProjectMigration';

describe('ProjectMigration.migrateProject', () => {
  const emptyMigrations: Record<string, SchemaMigration[]> = {};

  const pipeVMigrations: SchemaMigration[] = [
    {
      from: 1,
      to: 2,
      migrate: (props) => ({ ...props, newField: 'default' }),
    },
  ];

  it('should pass through unchanged data when no migrations match', () => {
    const project: ProjectData = {
      pages: [
        {
          graphics: [
            { type: 'unknown-type', schemaVersion: 1, foo: 'bar' },
          ],
        },
      ],
    };
    const result = ProjectMigration.migrateProject(project, emptyMigrations);
    expect(result.data.pages![0].graphics![0].foo).toBe('bar');
    expect(result.report.migratedCount).toBe(0);
  });

  it('should migrate graphics that have registered migrations', () => {
    const project: ProjectData = {
      pages: [
        {
          graphics: [
            { type: 'pipe-v', schemaVersion: 1, color: '#ff0000' },
          ],
        },
      ],
    };
    const result = ProjectMigration.migrateProject(project, {
      'pipe-v': pipeVMigrations,
    });
    expect(result.report.migratedCount).toBe(1);
    expect(result.report.details[0].graphicType).toBe('pipe-v');
    expect(result.report.details[0].fromVersion).toBe(1);
    expect(result.report.details[0].toVersion).toBe(2);
  });

  it('should set schemaVersion to target version after migration', () => {
    const project: ProjectData = {
      pages: [
        {
          graphics: [
            { type: 'pipe-v', schemaVersion: 1, color: '#000000' },
          ],
        },
      ],
    };
    const result = ProjectMigration.migrateProject(project, {
      'pipe-v': pipeVMigrations,
    });
    expect(result.data.pages![0].graphics![0].schemaVersion).toBe(2);
    expect(result.data.pages![0].graphics![0].newField).toBe('default');
  });

  it('should skip already current version graphics', () => {
    const project: ProjectData = {
      pages: [
        {
          graphics: [
            { type: 'pipe-v', schemaVersion: 2, color: '#000000' },
          ],
        },
      ],
    };
    const result = ProjectMigration.migrateProject(project, {
      'pipe-v': pipeVMigrations,
    });
    expect(result.report.migratedCount).toBe(0);
  });

  it('should handle multiple pages', () => {
    const project: ProjectData = {
      pages: [
        { graphics: [{ type: 'pipe-v', schemaVersion: 1 }] },
        { graphics: [{ type: 'pipe-v', schemaVersion: 1 }, { type: 'other', schemaVersion: 1 }] },
      ],
    };
    const result = ProjectMigration.migrateProject(project, {
      'pipe-v': pipeVMigrations,
    });
    expect(result.report.totalGraphics).toBe(3);
    expect(result.report.migratedCount).toBe(2);
  });

  it('should handle project without schemaVersion (default to 1)', () => {
    const project: ProjectData = {
      pages: [
        {
          graphics: [
            { type: 'pipe-v', color: '#ff0000' },
          ],
        },
      ],
    };
    const result = ProjectMigration.migrateProject(project, {
      'pipe-v': pipeVMigrations,
    });
    expect(result.report.migratedCount).toBe(1);
  });
});