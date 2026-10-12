// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { PluginPropertySchema } from '@scada-editor/plugin-sdk';
import * as fs from 'fs';

export interface FieldUsageReport {
  field: string;
  used: boolean;
  locations: string[];
}

export class RenderFieldMapper {
  private cache: FieldUsageReport[] | null = null;

  constructor(
    private schema: PluginPropertySchema,
    private pluginSourcePath: string,
  ) {}

  analyze(): FieldUsageReport[] {
    if (this.cache) return this.cache;

    const source = fs.readFileSync(this.pluginSourcePath, 'utf-8');
    const reports: FieldUsageReport[] = [];

    for (const field of this.schema.fields) {
      const usage = this.findFieldUsage(source, field.name);
      reports.push({
        field: field.name,
        used: usage.length > 0,
        locations: usage,
      });
    }

    this.cache = reports;
    return reports;
  }

  private findFieldUsage(source: string, fieldName: string): string[] {
    const locations: string[] = [];
    const lines = source.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('PropertySchema') || line.includes("from './")) continue;
      if (line.includes('import ') && line.includes('PropertySchema')) continue;

      const patterns = [
        new RegExp(`\\bprops\\.${escapeRegex(fieldName)}\\b`),
        new RegExp(`\\b${escapeRegex(fieldName)}\\b`),
      ];

      for (const pattern of patterns) {
        if (pattern.test(line)) {
          locations.push(`L${i + 1}: ${line.trim().substring(0, 80)}`);
          break;
        }
      }
    }

    return locations;
  }

  getUnusedFields(): string[] {
    return this.analyze().filter(r => !r.used).map(r => r.field);
  }

  summary(): string {
    const reports = this.analyze();
    const total = reports.length;
    const used = reports.filter(r => r.used).length;
    const unused = reports.filter(r => !r.used);
    return [
      `${this.schema.name}: ${total} 字段, ${used} 已使用, ${unused.length} 未使用`,
      ...unused.map(f => `  ⚠ ${f.field}`),
    ].join('\n');
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}