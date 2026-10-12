// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { DataPointRepository, DataPointCacheService } from '@ss-node/ss-core';

export interface ExportFilter {
  projectId?: string;
  deviceId?: string;
  tagIds?: string[];
  startTime?: Date;
  endTime?: Date;
  format?: 'csv' | 'excel';
  maxRows?: number;
}

export interface ExportResult {
  filename: string;
  data: string | Buffer;
  contentType: string;
  rowCount: number;
}

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor(
    private readonly dataPointRepo: DataPointRepository,
    private readonly dataPointCache: DataPointCacheService,
  ) {}

  async exportCSV(filters: ExportFilter): Promise<string> {
    const rows = await this.queryData(filters);
    return this.formatCSV(rows);
  }

  async exportExcel(filters: ExportFilter): Promise<Buffer> {
    const csv = await this.exportCSV(filters);
    return Buffer.from(csv, 'utf-8');
  }

  async *exportStream(filters: ExportFilter): AsyncGenerator<string> {
    const rows = await this.queryData(filters);

    if (rows.length === 0) {
      yield '';
      return;
    }

    const headers = Object.keys(rows[0]);
    yield this.formatCSVRow(headers) + '\n';

    for (const row of rows) {
      const values = headers.map((h) => this.formatCSVValue(row[h]));
      yield values.join(',') + '\n';
    }
  }

  async exportToResult(filters: ExportFilter): Promise<ExportResult> {
    const format = filters.format || 'csv';
    const rows = await this.queryData(filters);

    const filename = `export_${Date.now()}.${format === 'excel' ? 'csv' : format}`;
    const contentType = format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv';

    const csv = this.formatCSV(rows);

    return {
      filename,
      data: format === 'excel' ? Buffer.from(csv, 'utf-8') : csv,
      contentType,
      rowCount: rows.length,
    };
  }

  private async queryData(filters: ExportFilter): Promise<Record<string, any>[]> {
    let rows: any[] = [];

    if (filters.deviceId) {
      rows = await this.dataPointRepo.getValuesByDevice(filters.deviceId);
    } else if (filters.projectId) {
      rows = await this.dataPointRepo.getValuesByProject(filters.projectId);
    } else if (filters.tagIds && filters.tagIds.length > 0) {
      const cached = await this.dataPointCache.getMany(filters.tagIds);
      rows = Array.from(cached.values()).map((dp) => ({
        tagId: dp.tagId,
        deviceId: dp.deviceId,
        projectId: dp.projectId,
        value: dp.value,
        quality: dp.quality,
        timestamp: new Date(dp.timestamp),
        updatedAt: new Date(dp.cachedAt),
      }));
    } else {
      rows = [];
    }

    if (filters.startTime) {
      const start = filters.startTime.getTime();
      rows = rows.filter((r) => {
        const t = r.timestamp instanceof Date ? r.timestamp.getTime() : r.updatedAt?.getTime();
        return t && t >= start;
      });
    }

    if (filters.endTime) {
      const end = filters.endTime.getTime();
      rows = rows.filter((r) => {
        const t = r.timestamp instanceof Date ? r.timestamp.getTime() : r.updatedAt?.getTime();
        return t && t <= end;
      });
    }

    if (filters.maxRows && rows.length > filters.maxRows) {
      rows = rows.slice(0, filters.maxRows);
    }

    return rows;
  }

  private formatCSV(rows: Record<string, any>[]): string {
    if (rows.length === 0) {
      return '';
    }

    const headers = Object.keys(rows[0]);
    const lines = [this.formatCSVRow(headers)];

    for (const row of rows) {
      const values = headers.map((h) => this.formatCSVValue(row[h]));
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  private formatCSVRow(cells: string[]): string {
    return cells.map((c) => this.formatCSVValue(c)).join(',');
  }

  private formatCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = value instanceof Date ? value.toISOString() : String(value);

    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }
}
