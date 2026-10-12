// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import { TagImportResultDto } from '../dto/tag-import.dto';

@Injectable()
export class ImportValidatorService {
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
}
