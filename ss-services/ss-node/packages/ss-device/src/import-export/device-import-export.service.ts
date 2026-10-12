// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { DeviceService } from '../device.service';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { DeviceExportRow, ImportResult, ImportError } from './import-export.dto';

@Injectable()
export class DeviceImportExportService {
  private readonly logger = new Logger(DeviceImportExportService.name);

  constructor(private readonly deviceService: DeviceService) {}

  /**
   * Export devices to CSV format
   */
  async exportToCsv(projectId: string): Promise<string> {
    const result = await this.deviceService.findAll(projectId, { page: 1, pageSize: 9999 });
    const devices = result.data;

    const headers =
      'deviceCode,deviceName,nameAlias,description,type,driver,templateId,groupId,status';
    const rows = devices.map((d) =>
      [
        d.deviceCode,
        `"${(d.deviceName || '').replace(/"/g, '""')}"`,
        `"${(d.nameAlias || '').replace(/"/g, '""')}"`,
        `"${(d.description || '').replace(/"/g, '""')}"`,
        d.type,
        d.driver || '',
        d.templateId || '',
        d.groupId || '',
        d.status,
      ].join(','),
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Export devices to JSON format
   */
  async exportToJson(projectId: string): Promise<DeviceExportRow[]> {
    const result = await this.deviceService.findAll(projectId, { page: 1, pageSize: 9999 });
    return result.data.map((d) => ({
      deviceCode: d.deviceCode,
      deviceName: d.deviceName,
      nameAlias: d.nameAlias,
      description: d.description,
      type: d.type,
      driver: d.driver,
      templateId: d.templateId,
      groupId: d.groupId,
      connection: d.connection as Record<string, any>,
    }));
  }

  /**
   * Import devices from CSV content
   */
  async importFromCsv(projectId: string, csvContent: string): Promise<ImportResult> {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return {
        success: false,
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, message: 'CSV is empty or has no data rows' }],
      };
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const errors: ImportError[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = i;
      try {
        const values = this.parseCsvLine(lines[i]);
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowData[h] = (values[idx] || '').trim();
        });

        // 兼容旧导出文件：优先 deviceCode，回退 tid
        const deviceCode = rowData['deviceCode'] || rowData['tid'];
        if (!deviceCode) {
          errors.push({ row, message: 'Missing deviceCode field' });
          skipped++;
          continue;
        }

        const dto: CreateDeviceDto = {
          deviceCode,
          deviceName: rowData['deviceName'] || rowData['name'] || deviceCode,
          driver: (rowData['driver'] as any) || 'modbus',
          templateId: rowData['templateId'] || undefined,
          groupId: rowData['groupId'] || undefined,
          description: rowData['description'] || undefined,
          nameAlias: rowData['nameAlias'] || undefined,
          connection: {},
        };

        // Try to find existing device by deviceCode
        const existing = await this.deviceService.findAll(projectId, {
          deviceCode,
          page: 1,
          pageSize: 1,
        });
        if (existing.data.length > 0) {
          await this.deviceService.update(existing.data[0].id, dto as any, projectId);
          updated++;
        } else {
          await this.deviceService.create(dto, projectId);
          created++;
        }
      } catch (err: any) {
        errors.push({ row, deviceCode: this.extractDeviceCode(lines[i]), message: err.message });
        skipped++;
      }
    }

    return {
      success: errors.length === 0,
      total: lines.length - 1,
      created,
      updated,
      skipped,
      errors,
    };
  }

  /**
   * Import devices from JSON array
   */
  async importFromJson(projectId: string, jsonData: DeviceExportRow[]): Promise<ImportResult> {
    const errors: ImportError[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const row = i + 1;
      const item = jsonData[i];
      try {
        // 兼容旧导出文件：优先 deviceCode，回退 tid
        const deviceCode = (item as any).deviceCode || (item as any).tid;
        if (!deviceCode) {
          errors.push({ row, message: 'Missing deviceCode field' });
          skipped++;
          continue;
        }

        const dto: CreateDeviceDto = {
          deviceCode,
          deviceName: (item as any).deviceName || (item as any).name || deviceCode,
          driver: (item.driver as any) || 'modbus',
          templateId: item.templateId || undefined,
          groupId: item.groupId || undefined,
          description: item.description || undefined,
          nameAlias: item.nameAlias || undefined,
          connection: {},
        };

        const existing = await this.deviceService.findAll(projectId, {
          deviceCode,
          page: 1,
          pageSize: 1,
        });
        if (existing.data.length > 0) {
          await this.deviceService.update(existing.data[0].id, dto as any, projectId);
          updated++;
        } else {
          await this.deviceService.create(dto, projectId);
          created++;
        }
      } catch (err: any) {
        errors.push({
          row,
          deviceCode: (item as any).deviceCode || (item as any).tid,
          message: err.message,
        });
        skipped++;
      }
    }

    return {
      success: errors.length === 0,
      total: jsonData.length,
      created,
      updated,
      skipped,
      errors,
    };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  private extractDeviceCode(line: string): string | undefined {
    const parts = this.parseCsvLine(line);
    return parts[0] || undefined;
  }
}
