// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { SchemaMigration } from '../types/PluginPropertySchema';
import { SchemaMigrationEngine } from './SchemaMigrationEngine';

export interface ProjectGraphicData {
  id?: string;
  type: string;
  schemaVersion?: number;
  [key: string]: any;
}

export interface ProjectPageData {
  id?: string;
  graphics?: ProjectGraphicData[];
  [key: string]: any;
}

export interface ProjectData {
  pages?: ProjectPageData[];
  [key: string]: any;
}

export interface MigrationReport {
  totalGraphics: number;
  migratedCount: number;
  details: Array<{
    graphicType: string;
    graphicId?: string;
    fromVersion: number;
    toVersion: number;
  }>;
}

export class ProjectMigration {
  static migrateProject(
    projectData: ProjectData,
    migrationsByType: Record<string, SchemaMigration[]>,
  ): { data: ProjectData; report: MigrationReport } {
    const report: MigrationReport = {
      totalGraphics: 0,
      migratedCount: 0,
      details: [],
    };

    const migratedData = { ...projectData };

    if (migratedData.pages) {
      migratedData.pages = migratedData.pages.map((page) => ({
        ...page,
        graphics: page.graphics
          ? page.graphics.map((graphic) => {
              report.totalGraphics += 1;
              const migrated = this.migrateGraphic(graphic, migrationsByType);
              if (migrated.migrated) {
                report.migratedCount += 1;
                report.details.push({
                  graphicType: graphic.type,
                  graphicId: graphic.id,
                  fromVersion: migrated.fromVersion,
                  toVersion: migrated.toVersion,
                });
              }
              return migrated.data;
            })
          : undefined,
      }));
    }

    if (migratedData.graphics) {
      migratedData.graphics = migratedData.graphics.map((graphic: ProjectGraphicData) => {
        report.totalGraphics += 1;
        const migrated = this.migrateGraphic(graphic, migrationsByType);
        if (migrated.migrated) {
          report.migratedCount += 1;
          report.details.push({
            graphicType: graphic.type,
            graphicId: graphic.id,
            fromVersion: migrated.fromVersion,
            toVersion: migrated.toVersion,
          });
        }
        return migrated.data;
      });
    }

    return { data: migratedData, report };
  }

  private static migrateGraphic(
    graphic: ProjectGraphicData,
    migrationsByType: Record<string, SchemaMigration[]>,
  ): { data: ProjectGraphicData; migrated: boolean; fromVersion: number; toVersion: number } {
    const migrations = migrationsByType[graphic.type];
    if (!migrations || migrations.length === 0) {
      return { data: graphic, migrated: false, fromVersion: 0, toVersion: 0 };
    }

    const currentVersion = graphic.schemaVersion || 1;
    const targetVersion = Math.max(...migrations.map((m) => m.to));

    if (currentVersion >= targetVersion) {
      return { data: graphic, migrated: false, fromVersion: currentVersion, toVersion: currentVersion };
    }

    const result = SchemaMigrationEngine.migrate(
      { type: graphic.type, schemaVersion: currentVersion, props: graphic },
      migrations,
      targetVersion,
    );

    return {
      data: { ...graphic, ...result.props, schemaVersion: targetVersion },
      migrated: true,
      fromVersion: currentVersion,
      toVersion: targetVersion,
    };
  }
}