// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { TagDataType } from '@ss-node/ss-datatag';

/** 验证错误级别 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
}

/** 单条验证结果 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  field: string;
  message: string;
  rowIndex?: number;
  tagName?: string;
}

/** 总体验证结果 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    total: number;
    valid: number;
    errors: number;
    warnings: number;
  };
}

/** 允许的 dataType 值集合 */
const ALLOWED_DATA_TYPES = new Set<string>(Object.values(TagDataType).map((v) => String(v)));

/** 必填字段 */
const REQUIRED_FIELDS = ['name', 'address', 'dataType'] as const;

/** 允许的字段名集合（用于检测未知字段） */
const ALLOWED_FIELDS = new Set([
  'name',
  'address',
  'dataType',
  'description',
  'unit',
  'minValue',
  'maxValue',
  'scanRate',
  'enabled',
  'category',
  'order',
  'registerCount',
  'timeout',
  'retryCount',
  'priority',
  'scale',
  'offset',
  'conversionType',
  'conversionConfig',
  'displayFormat',
  'engMinValue',
  'engMaxValue',
  'deadbandMode',
  'deadbandValue',
  'deadbandPercent',
  'deadbandTime',
  'alarmEnabled',
  'alarmHighHigh',
  'alarmHigh',
  'alarmLow',
  'alarmLowLow',
  'alarmDeviation',
  'qualityCheckEnabled',
  'maxAge',
  'archiveEnabled',
  'archiveInterval',
  'retentionDays',
  'tags',
  'rowIndex',
]);

@Injectable()
export class ImportValidatorService {
  private readonly logger = new Logger(ImportValidatorService.name);

  /**
   * 验证导入的标签数据
   */
  validate(tags: Array<Record<string, any>>): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    if (!tags || tags.length === 0) {
      errors.push({
        severity: ValidationSeverity.ERROR,
        field: 'root',
        message: '标签数据为空，无法导入',
      });
      return this.buildResult(tags?.length ?? 0, errors, warnings);
    }

    const tagNames = new Map<string, number>();
    const tagAddresses = new Map<string, number>();

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const rowIndex = tag.rowIndex ?? i + 1;
      const tagName = tag.name;

      // 1. 必填字段检查
      for (const field of REQUIRED_FIELDS) {
        const value = tag[field];
        if (value === undefined || value === null || String(value).trim() === '') {
          errors.push({
            severity: ValidationSeverity.ERROR,
            field,
            message: `必填字段 "${field}" 为空`,
            rowIndex,
            tagName: tagName || `(第${rowIndex}行)`,
          });
        }
      }

      // 如果必填字段缺失，跳过后续对此行数据的验证
      if (
        !tag.name ||
        String(tag.name).trim() === '' ||
        !tag.dataType ||
        String(tag.dataType).trim() === ''
      ) {
        continue;
      }

      // 2. dataType 有效性检查
      const dataType = String(tag.dataType).trim().toLowerCase();
      if (!ALLOWED_DATA_TYPES.has(dataType)) {
        errors.push({
          severity: ValidationSeverity.ERROR,
          field: 'dataType',
          message: `无效的数据类型 "${tag.dataType}"，允许的值: ${[...ALLOWED_DATA_TYPES].join(', ')}`,
          rowIndex,
          tagName,
        });
      }

      // 3. 重复名称检查
      if (tagNames.has(tag.name)) {
        errors.push({
          severity: ValidationSeverity.ERROR,
          field: 'name',
          message: `标签名称 "${tag.name}" 重复（第 ${tagNames.get(tag.name)} 行和第 ${rowIndex} 行）`,
          rowIndex,
          tagName,
        });
      } else {
        tagNames.set(tag.name, rowIndex);
      }

      // 4. 重复地址检查（仅当 address 非空时）
      if (tag.address && String(tag.address).trim() !== '') {
        if (tagAddresses.has(tag.address)) {
          warnings.push({
            severity: ValidationSeverity.WARNING,
            field: 'address',
            message: `标签地址 "${tag.address}" 重复（第 ${tagAddresses.get(tag.address)} 行和第 ${rowIndex} 行）`,
            rowIndex,
            tagName,
          });
        } else {
          tagAddresses.set(tag.address, rowIndex);
        }
      }

      // 5. 值范围验证
      const minValue =
        tag.minValue !== undefined && tag.minValue !== null ? Number(tag.minValue) : undefined;
      const maxValue =
        tag.maxValue !== undefined && tag.maxValue !== null ? Number(tag.maxValue) : undefined;

      if (minValue !== undefined && isNaN(minValue)) {
        errors.push({
          severity: ValidationSeverity.ERROR,
          field: 'minValue',
          message: `最小值 "${tag.minValue}" 不是有效数字`,
          rowIndex,
          tagName,
        });
      }

      if (maxValue !== undefined && isNaN(maxValue)) {
        errors.push({
          severity: ValidationSeverity.ERROR,
          field: 'maxValue',
          message: `最大值 "${tag.maxValue}" 不是有效数字`,
          rowIndex,
          tagName,
        });
      }

      if (
        minValue !== undefined &&
        maxValue !== undefined &&
        !isNaN(minValue) &&
        !isNaN(maxValue) &&
        minValue >= maxValue
      ) {
        errors.push({
          severity: ValidationSeverity.ERROR,
          field: 'minValue/maxValue',
          message: `最小值 (${minValue}) 必须小于最大值 (${maxValue})`,
          rowIndex,
          tagName,
        });
      }

      // 6. scanRate 有效性检查
      if (tag.scanRate !== undefined && tag.scanRate !== null) {
        const scanRate = Number(tag.scanRate);
        if (isNaN(scanRate) || scanRate <= 0) {
          warnings.push({
            severity: ValidationSeverity.WARNING,
            field: 'scanRate',
            message: `采集频率 "${tag.scanRate}" 无效，应为正数`,
            rowIndex,
            tagName,
          });
        }
      }

      // 7. name 长度检查
      if (tag.name.length > 128) {
        warnings.push({
          severity: ValidationSeverity.WARNING,
          field: 'name',
          message: `标签名称过长 (${tag.name.length} 字符)，建议不超过 128 字符`,
          rowIndex,
          tagName,
        });
      }

      // 8. 未知字段警告
      for (const key of Object.keys(tag)) {
        if (!ALLOWED_FIELDS.has(key) && typeof tag[key] !== 'undefined') {
          // 跳过 rowIndex 和内部字段
          warnings.push({
            severity: ValidationSeverity.WARNING,
            field: key,
            message: `未知字段 "${key}"，将被忽略`,
            rowIndex,
            tagName,
          });
        }
      }
    }

    return this.buildResult(tags.length, errors, warnings);
  }

  /**
   * 构建验证结果
   */
  private buildResult(
    total: number,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
  ): ValidationResult {
    const errorCount = errors.length;
    const warningCount = warnings.length;

    return {
      valid: errorCount === 0,
      errors,
      warnings,
      summary: {
        total,
        valid: total - new Set(errors.map((e) => e.rowIndex)).size,
        errors: errorCount,
        warnings: warningCount,
      },
    };
  }
}
