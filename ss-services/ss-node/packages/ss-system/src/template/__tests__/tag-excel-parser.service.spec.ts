// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TagExcelParserService, ExcelParseOptions } from '../parsers/tag-excel-parser.service';
import * as XLSX from 'xlsx';

// Mock xlsx module
jest.mock('xlsx');

function createMockWorkbook(sheetData: any[][]): any {
  return {
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: sheetData,
    },
  };
}

function makeOptions(overrides: Partial<ExcelParseOptions> = {}): ExcelParseOptions {
  return {
    headerRow: 0,
    dataStartRow: 1,
    ...overrides,
  };
}

describe('TagExcelParserService', () => {
  let service: TagExcelParserService;

  beforeEach(() => {
    service = new TagExcelParserService();
    jest.clearAllMocks();
  });

  // ==================== Basic Parsing ====================

  it('TC-EXCEL-001: should parse Excel with Chinese headers', () => {
    const mockData = [
      ['名称', '地址', '数据类型', '描述', '单位', '最小值', '最大值'],
      ['温度', '40001', 'float32', '温度传感器', '°C', 0, 100],
      ['湿度', '40002', 'float32', '湿度传感器', '%', 0, 100],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('温度');
    expect(result[0].address).toBe('40001');
    expect(result[0].dataType).toBe('float32');
    expect(result[0].description).toBe('温度传感器');
    expect(result[0].unit).toBe('°C');
    expect(result[0].minValue).toBe(0);
    expect(result[0].maxValue).toBe(100);
    expect(result[1].name).toBe('湿度');
  });

  it('TC-EXCEL-002: should parse Excel with English headers', () => {
    const mockData = [
      ['name', 'address', 'dataType', 'unit'],
      ['pressure', '40003', 'int32', 'Pa'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('pressure');
    expect(result[0].address).toBe('40003');
    expect(result[0].dataType).toBe('int32');
    expect(result[0].unit).toBe('Pa');
  });

  it('TC-EXCEL-003: should handle mixed Chinese/English headers', () => {
    const mockData = [
      ['名称', 'address', 'dataType', '描述'],
      ['流量', '40010', 'float32', '流量计'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('流量');
    expect(result[0].address).toBe('40010');
    expect(result[0].dataType).toBe('float32');
  });

  // ==================== Row Index ====================

  it('TC-EXCEL-004: should assign correct row indices', () => {
    const mockData = [
      ['名称', '地址', '数据类型'],
      ['Tag1', '40001', 'float32'],
      ['Tag2', '40002', 'int32'],
      ['Tag3', '40003', 'boolean'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result).toHaveLength(3);
    expect(result[0].rowIndex).toBe(2);
    expect(result[1].rowIndex).toBe(3);
    expect(result[2].rowIndex).toBe(4);
  });

  // ==================== Empty Row Handling ====================

  it('TC-EXCEL-005: should skip completely empty rows', () => {
    const mockData = [
      ['名称', '地址', '数据类型'],
      ['Tag1', '40001', 'float32'],
      ['', '', ''],
      ['Tag2', '40002', 'int32'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Tag1');
    expect(result[1].name).toBe('Tag2');
  });

  it('TC-EXCEL-006: should skip rows with empty name', () => {
    const mockData = [
      ['名称', '地址', '数据类型'],
      ['', '40001', 'float32'],
      ['Tag2', '40002', 'int32'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tag2');
  });

  // ==================== Value Normalization ====================

  it('TC-EXCEL-007: should normalize minValue/maxValue to numbers', () => {
    const mockData = [
      ['名称', '地址', '数据类型', '最小值', '最大值'],
      ['Tag1', '40001', 'float32', '0', '100'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result[0].minValue).toBe(0);
    expect(result[0].maxValue).toBe(100);
    expect(typeof result[0].minValue).toBe('number');
    expect(typeof result[0].maxValue).toBe('number');
  });

  it('TC-EXCEL-008: should handle empty minValue/maxValue as null', () => {
    const mockData = [
      ['名称', '地址', '数据类型', '最小值', '最大值'],
      ['Tag1', '40001', 'float32', '-', '-'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result[0].minValue).toBeNull();
    expect(result[0].maxValue).toBeNull();
  });

  it('TC-EXCEL-009: should normalize enabled values', () => {
    const mockData = [
      ['名称', '地址', '数据类型', '启用'],
      ['Tag1', '40001', 'float32', '是'],
      ['Tag2', '40002', 'int32', '否'],
      ['Tag3', '40003', 'boolean', 'true'],
      ['Tag4', '40004', 'float32', '0'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result[0].enabled).toBe(true);
    expect(result[1].enabled).toBe(false);
    expect(result[2].enabled).toBe(true);
    expect(result[3].enabled).toBe(false);
  });

  it('TC-EXCEL-010: should normalize scanRate to number', () => {
    const mockData = [
      ['名称', '地址', '数据类型', '采集频率'],
      ['Tag1', '40001', 'float32', '500'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result[0].scanRate).toBe(500);
    expect(typeof result[0].scanRate).toBe('number');
  });

  // ==================== Custom Column Mapping ====================

  it('TC-EXCEL-011: should use custom column mapping', () => {
    const mockData = [
      ['Tag', 'Addr', 'Type'],
      ['Tag1', '40001', 'float32'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const customMapping = {
      Tag: 'name',
      Addr: 'address',
      Type: 'dataType',
    };

    const result = service.parse(
      Buffer.from('test'),
      makeOptions({ columnMapping: customMapping }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tag1');
    expect(result[0].address).toBe('40001');
    expect(result[0].dataType).toBe('float32');
  });

  // ==================== Error Handling ====================

  it('TC-EXCEL-012: should throw when missing required columns', () => {
    const mockData = [
      ['名称', '地址'],
      ['Tag1', '40001'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    expect(() => service.parse(Buffer.from('test'), makeOptions())).toThrow(
      'Excel 表头缺少必填字段对应的列',
    );
  });

  it('TC-EXCEL-013: should throw when workbook read fails', () => {
    (XLSX.read as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid file format');
    });

    expect(() => service.parse(Buffer.from('test'), makeOptions())).toThrow('无法解析 Excel 文件');
  });

  it('TC-EXCEL-014: should throw when sheet is empty', () => {
    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook([]));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([]);

    expect(() => service.parse(Buffer.from('test'), makeOptions())).toThrow('Excel 工作表为空');
  });

  it('TC-EXCEL-015: should throw when sheet not found', () => {
    (XLSX.read as jest.Mock).mockReturnValue({
      SheetNames: [],
      Sheets: {},
    });

    expect(() => service.parse(Buffer.from('test'), makeOptions())).toThrow(
      'Excel 文件中未找到有效工作表',
    );
  });

  // ==================== Custom Options ====================

  it('TC-EXCEL-016: should support custom headerRow and dataStartRow', () => {
    const mockData = [
      ['Skip', 'this', 'row'],
      ['名称', '地址', '数据类型'],
      ['Tag1', '40001', 'float32'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(
      Buffer.from('test'),
      makeOptions({ headerRow: 1, dataStartRow: 2 }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tag1');
  });

  it('TC-EXCEL-017: should support alternate column aliases', () => {
    const mockData = [
      ['变量名', '寄存器地址', '类型', '工程单位'],
      ['Tag1', '40001', 'float32', '°C'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tag1');
    expect(result[0].address).toBe('40001');
    expect(result[0].dataType).toBe('float32');
    expect(result[0].unit).toBe('°C');
  });

  it('TC-EXCEL-018: should handle Excel with extra columns gracefully', () => {
    const mockData = [
      ['名称', '地址', '数据类型', '额外列1', '额外列2'],
      ['Tag1', '40001', 'float32', 'ignored1', 'ignored2'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tag1');
  });

  it('TC-EXCEL-019: should handle numeric values directly (not strings)', () => {
    const mockData = [
      ['名称', '地址', '数据类型', '最小值', '最大值'],
      ['Tag1', 40001, 'float32', 0, 100],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    expect(result[0].address).toBe('40001');
    expect(result[0].minValue).toBe(0);
    expect(result[0].maxValue).toBe(100);
  });

  it('TC-EXCEL-020: should handle missing optional columns', () => {
    const mockData = [
      ['名称', '地址', '数据类型'],
      ['Tag1', '40001', 'float32'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const result = service.parse(Buffer.from('test'), makeOptions());

    // Optional fields are undefined when their columns are missing from the Excel
    expect(result[0].description).toBeUndefined();
    expect(result[0].unit).toBeUndefined();
    expect(result[0].category).toBeUndefined();
  });
});
