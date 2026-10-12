// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { DataTagService } from '../datatag.service';
import { CreateDataTagDto } from '../dto/create-datatag.dto';
import { TagImportResultDto } from '../dto/tag-import.dto';

@Injectable()
export class TagImportService {
  private readonly logger = new Logger(TagImportService.name);

  private readonly VALID_TYPES = [
    'boolean',
    'int16',
    'uint16',
    'int32',
    'uint32',
    'float32',
    'float64',
    'string',
  ];

  constructor(private readonly tagService: DataTagService) {}

  validate(data: any[]): TagImportResultDto {
    const result: TagImportResultDto = {
      valid: true,
      successCount: 0,
      failureCount: 0,
      errors: [],
      warnings: [],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      if (!row.name || String(row.name).trim() === '') {
        result.errors.push({ row: rowNum, column: '名称', message: '标签名称不能为空' });
      }

      if (row.dataType && !this.VALID_TYPES.includes(String(row.dataType).toLowerCase())) {
        result.errors.push({
          row: rowNum,
          column: 'dataType',
          message: `无效的数据类型: ${row.dataType}，有效值: ${this.VALID_TYPES.join(', ')}`,
        });
      }

      if (row.scanRate !== undefined) {
        const rate = Number(row.scanRate);
        if (isNaN(rate) || rate < 100 || rate > 60000) {
          result.warnings.push({
            row: rowNum,
            column: 'scanRate',
            message: '扫描周期建议 100-60000ms',
          });
        }
      }

      if (row.minValue !== undefined && row.maxValue !== undefined) {
        const min = Number(row.minValue);
        const max = Number(row.maxValue);
        if (!isNaN(min) && !isNaN(max) && min >= max) {
          result.errors.push({ row: rowNum, column: '量程', message: '量程下限必须小于量程上限' });
        }
      }
    }

    result.failureCount = result.errors.length;
    result.valid = result.errors.length === 0;

    return result;
  }

  async importJson(
    data: any[],
    deviceId: string,
    projectId: string,
    options?: { overwrite?: boolean; skipErrors?: boolean },
  ): Promise<TagImportResultDto> {
    const result = this.validate(data);

    if (!result.valid && !options?.skipErrors) {
      return result;
    }

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      const alreadyFailed = result.errors.some((e) => e.row === rowNum);
      if (alreadyFailed && options?.skipErrors) {
        failureCount++;
        continue;
      }

      try {
        const dto: CreateDataTagDto = {
          name: row.name,
          address: row.address ?? `${rowNum}`,
          dataType: (row.dataType ?? 'float32').toLowerCase(),
          deviceId,
          projectId,
          description: row.description,
          unit: row.unit,
          displayFormat: row.displayFormat,
          scale: row.scale ?? 1.0,
          offset: row.offset ?? 0.0,
          scanRate: row.scanRate ?? 1000,
          enabled: row.enabled ?? true,
        };

        if (row.minValue !== undefined) dto.minValue = Number(row.minValue);
        if (row.maxValue !== undefined) dto.maxValue = Number(row.maxValue);
        if (row.deadbandMode) dto.deadbandMode = row.deadbandMode;
        if (row.deadbandValue !== undefined) dto.deadbandValue = Number(row.deadbandValue);
        if (row.deadbandPercent !== undefined) dto.deadbandPercent = Number(row.deadbandPercent);
        if (row.deadbandTime !== undefined) dto.deadbandTime = Number(row.deadbandTime);
        if (row.alarmHighHigh !== undefined) dto.alarmHighHigh = Number(row.alarmHighHigh);
        if (row.alarmHigh !== undefined) dto.alarmHigh = Number(row.alarmHigh);
        if (row.alarmLow !== undefined) dto.alarmLow = Number(row.alarmLow);
        if (row.alarmLowLow !== undefined) dto.alarmLowLow = Number(row.alarmLowLow);
        if (row.conversionType) dto.conversionType = row.conversionType;
        if (row.conversionConfig) dto.conversionConfig = row.conversionConfig;
        if (row.archiveEnabled !== undefined) dto.archiveEnabled = row.archiveEnabled;
        if (row.archiveInterval !== undefined) dto.archiveInterval = Number(row.archiveInterval);
        if (row.retentionDays !== undefined) dto.retentionDays = Number(row.retentionDays);
        if (row.groupId) dto.groupId = row.groupId;
        if (row.category) dto.category = row.category;
        if (row.priority) dto.priority = row.priority;
        if (row.qualityCheckEnabled !== undefined)
          dto.qualityCheckEnabled = row.qualityCheckEnabled;
        if (row.maxAge !== undefined) dto.maxAge = Number(row.maxAge);

        await this.tagService.create(dto);
        successCount++;
      } catch (err: any) {
        result.errors.push({ row: rowNum, column: '-', message: err.message });
        failureCount++;
      }
    }

    result.successCount = successCount;
    result.failureCount = failureCount;
    result.valid = failureCount === 0;

    this.logger.log(`Import complete: ${successCount} success, ${failureCount} failed`);
    return result;
  }
}
