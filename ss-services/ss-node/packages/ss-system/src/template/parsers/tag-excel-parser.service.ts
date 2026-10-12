// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

/** 从 Excel 解析出的标签原始数据 */
export interface ParsedTagRow {
  rowIndex: number;
  name: string;
  address: string;
  dataType: string;
  description?: string;
  unit?: string;
  minValue?: number | null;
  maxValue?: number | null;
  scanRate?: number;
  enabled?: boolean;
  category?: string;
  [key: string]: any;
}

/** Excel 解析配置 */
export interface ExcelParseOptions {
  /** 工作表名称（默认读取第一个） */
  sheetName?: string;
  /** 表头行号（从 0 开始，默认 0 即第一行） */
  headerRow?: number;
  /** 数据起始行号（从 0 开始，默认 headerRow + 1） */
  dataStartRow?: number;
  /** 列名映射：Excel 列名 → 标签字段名 */
  columnMapping?: Record<string, string>;
}

/** 默认列名映射 */
const DEFAULT_COLUMN_MAPPING: Record<string, string> = {
  名称: 'name',
  name: 'name',
  变量名: 'name',
  tagName: 'name',
  地址: 'address',
  address: 'address',
  寄存器地址: 'address',
  数据类型: 'dataType',
  dataType: 'dataType',
  data_type: 'dataType',
  类型: 'dataType',
  描述: 'description',
  description: 'description',
  单位: 'unit',
  unit: 'unit',
  工程单位: 'unit',
  最小值: 'minValue',
  minValue: 'minValue',
  min: 'minValue',
  最大值: 'maxValue',
  maxValue: 'maxValue',
  max: 'maxValue',
  采集频率: 'scanRate',
  scanRate: 'scanRate',
  scan_rate: 'scanRate',
  启用: 'enabled',
  enabled: 'enabled',
  是否启用: 'enabled',
  分类: 'category',
  category: 'category',
};

/** 必填字段名列表 */
const REQUIRED_FIELDS = ['name', 'address', 'dataType'];

@Injectable()
export class TagExcelParserService {
  private readonly logger = new Logger(TagExcelParserService.name);

  /**
   * 解析 Excel 文件 Buffer，返回标签数据数组
   */
  parse(buffer: Buffer, options: ExcelParseOptions = {}): ParsedTagRow[] {
    const workbook = this.readWorkbook(buffer);
    const sheetName = options.sheetName ?? workbook.SheetNames[0];

    if (!sheetName || !workbook.Sheets[sheetName]) {
      throw new BadRequestException('Excel 文件中未找到有效工作表');
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawData.length === 0) {
      throw new BadRequestException('Excel 工作表为空');
    }

    const headerRow = options.headerRow ?? 0;
    const dataStartRow = options.dataStartRow ?? headerRow + 1;
    const columnMapping = options.columnMapping ?? DEFAULT_COLUMN_MAPPING;

    // 读取表头
    const headerRowData = rawData[headerRow];
    if (!headerRowData || headerRowData.length === 0) {
      throw new BadRequestException('Excel 表头行无效');
    }

    // 构建列索引映射：列索引 → 标签字段名
    const colIndexMap: Record<number, string> = {};
    for (let i = 0; i < headerRowData.length; i++) {
      const colName = String(headerRowData[i] ?? '').trim();
      const mappedField = columnMapping[colName];
      if (mappedField) {
        colIndexMap[i] = mappedField;
      }
    }

    // 验证必填字段对应的列是否存在
    const mappedFields = new Set(Object.values(colIndexMap));
    const missingRequired = REQUIRED_FIELDS.filter((f) => !mappedFields.has(f));
    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Excel 表头缺少必填字段对应的列: ${missingRequired.join(', ')}。` +
          `已识别的列: ${[...mappedFields].join(', ')}`,
      );
    }

    // 解析数据行
    const tags: ParsedTagRow[] = [];

    for (let rowIdx = dataStartRow; rowIdx < rawData.length; rowIdx++) {
      const row = rawData[rowIdx];
      if (!row || row.every((cell: any) => String(cell ?? '').trim() === '')) {
        continue; // 跳过空行
      }

      const tag: ParsedTagRow = { rowIndex: rowIdx + 1, name: '', address: '', dataType: '' };

      for (const [colIdx, fieldName] of Object.entries(colIndexMap)) {
        const colIndex = Number(colIdx);
        const rawValue = row[colIndex];
        tag[fieldName] = this.normalizeValue(fieldName, rawValue);
      }

      // 跳过 name 为空的行
      if (!tag.name || String(tag.name).trim() === '') {
        continue;
      }

      tags.push(tag);
    }

    this.logger.log(`Excel 解析完成: 共 ${tags.length} 个标签`);
    return tags;
  }

  /**
   * 读取工作簿
   */
  private readWorkbook(buffer: Buffer): XLSX.WorkBook {
    try {
      return XLSX.read(buffer, { type: 'buffer' });
    } catch (error: any) {
      throw new BadRequestException(`无法解析 Excel 文件: ${error.message}`);
    }
  }

  /**
   * 根据字段名规范化值
   */
  private normalizeValue(fieldName: string, rawValue: any): any {
    if (rawValue === undefined || rawValue === null) {
      return fieldName === 'minValue' || fieldName === 'maxValue' ? null : '';
    }

    const strValue = String(rawValue).trim();

    switch (fieldName) {
      case 'name':
      case 'address':
      case 'dataType':
      case 'description':
      case 'unit':
      case 'category':
        return strValue;
      case 'minValue':
      case 'maxValue': {
        if (strValue === '' || strValue === '-') return null;
        const num = Number(strValue);
        return isNaN(num) ? null : num;
      }
      case 'scanRate': {
        const num = Number(strValue);
        return isNaN(num) ? undefined : num;
      }
      case 'enabled': {
        const lower = strValue.toLowerCase();
        if (lower === 'true' || lower === '是' || lower === 'yes' || lower === '1') return true;
        if (lower === 'false' || lower === '否' || lower === 'no' || lower === '0') return false;
        return true; // 默认启用
      }
      default:
        return strValue;
    }
  }
}
