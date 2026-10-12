// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TagExcelParserService } from '../parsers/tag-excel-parser.service';
import { TagJsonParserService } from '../parsers/tag-json-parser.service';
import { ImportValidatorService } from '../parsers/import-validator.service';
import * as XLSX from 'xlsx';

// Mock xlsx
jest.mock('xlsx');

// Mock ss-datatag for validator
jest.mock('@ss-node/ss-datatag', () => ({
  TagDataType: {
    BOOLEAN: 'boolean',
    INT16: 'int16',
    UINT16: 'uint16',
    INT32: 'int32',
    UINT32: 'uint32',
    FLOAT32: 'float32',
    FLOAT64: 'float64',
    STRING: 'string',
  },
}));

function createMockWorkbook(sheetData: any[][]): any {
  return {
    SheetNames: ['Sheet1'],
    Sheets: { Sheet1: sheetData },
  };
}

describe('Tag Import/Export Integration', () => {
  let excelParser: TagExcelParserService;
  let jsonParser: TagJsonParserService;
  let validator: ImportValidatorService;

  beforeEach(() => {
    excelParser = new TagExcelParserService();
    jsonParser = new TagJsonParserService();
    validator = new ImportValidatorService();
    jest.clearAllMocks();
  });

  // ==================== Excel → Validation Flow ====================

  it('TC-IEX-001: should parse Excel and validate successfully', () => {
    const mockData = [
      ['名称', '地址', '数据类型', '单位', '最小值', '最大值'],
      ['温度', '40001', 'float32', '°C', 0, 100],
      ['湿度', '40002', 'float32', '%', 0, 100],
      ['压力', '40003', 'int32', 'Pa', 0, 1000],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const tags = excelParser.parse(Buffer.from('test'), { headerRow: 0, dataStartRow: 1 });
    const result = validator.validate(tags);

    expect(tags).toHaveLength(3);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.total).toBe(3);
    expect(result.summary.valid).toBe(3);
  });

  it('TC-IEX-002: should detect Excel parsing errors in validation', () => {
    const mockData = [
      ['名称', '地址', '数据类型'],
      ['温度', '40001', 'float32'],
      ['', '40002', 'float32'], // empty name
      ['湿度', '40001', 'invalid_type'], // duplicate address + invalid type
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const tags = excelParser.parse(Buffer.from('test'), { headerRow: 0, dataStartRow: 1 });
    const result = validator.validate(tags);

    // Empty name row is skipped by parser, so only 2 tags
    expect(tags).toHaveLength(2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'dataType')).toBe(true);
    expect(result.warnings.some((w) => w.field === 'address')).toBe(true);
  });

  // ==================== JSON → Validation Flow ====================

  it('TC-IEX-003: should parse JSON array and validate successfully', () => {
    const json = JSON.stringify([
      { name: 'temperature', address: '40001', dataType: 'float32', minValue: 0, maxValue: 100 },
      { name: 'humidity', address: '40002', dataType: 'float32', minValue: 0, maxValue: 100 },
    ]);

    const parseResult = jsonParser.parse(json);
    const validationResult = validator.validate(parseResult.tags);

    expect(parseResult.tags).toHaveLength(2);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('TC-IEX-004: should parse JSON object and validate', () => {
    const json = JSON.stringify({
      name: 'Temperature Template',
      deviceType: 'modbus_tcp',
      tags: [
        { name: 'temp', address: '40001', dataType: 'float32' },
        { name: 'press', address: '40002', dataType: 'int32' },
      ],
    });

    const parseResult = jsonParser.parse(json);
    const validationResult = validator.validate(parseResult.tags);

    expect(parseResult.metadata?.name).toBe('Temperature Template');
    expect(parseResult.metadata?.deviceType).toBe('modbus_tcp');
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('TC-IEX-005: should detect JSON data issues in validation', () => {
    const json = JSON.stringify([
      { name: 'tag1', address: '40001', dataType: 'float32' },
      { name: 'tag1', address: '40001', dataType: 'bad_type' }, // duplicate name + bad type
      { name: '', address: '', dataType: '' }, // empty required fields
    ]);

    const parseResult = jsonParser.parse(json);
    expect(parseResult.tags).toHaveLength(3);

    const validationResult = validator.validate(parseResult.tags);
    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors.length).toBeGreaterThanOrEqual(3);
  });

  // ==================== Full Import Pipeline (Excel → Parse → Validate) ====================

  it('TC-IEX-006: should handle complete import pipeline with valid data', () => {
    const mockData = [
      ['名称', '地址', '数据类型', '描述', '单位', '最小值', '最大值', '采集频率'],
      ['温度传感器', '40001', 'float32', '主温度', '°C', -40, 150, 1000],
      ['湿度传感器', '40002', 'float32', '环境湿度', '%RH', 0, 100, 2000],
      ['压力传感器', '40003', 'int32', '管道压力', 'kPa', 0, 500, 500],
      ['流量计', '40004', 'float32', '瞬时流量', 'm³/h', 0, 1000, 1000],
      ['开关状态', '00001', 'boolean', '阀门开关', '', undefined, undefined, 500],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    // Step 1: Parse Excel
    const tags = excelParser.parse(Buffer.from('test'), { headerRow: 0, dataStartRow: 1 });

    expect(tags).toHaveLength(5);

    // Step 2: Validate
    const result = validator.validate(tags);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.total).toBe(5);
    expect(result.summary.valid).toBe(5);
  });

  it('TC-IEX-007: should handle import pipeline with errors', () => {
    const mockData = [
      ['名称', '地址', '数据类型', '最小值', '最大值'],
      ['Tag1', '40001', 'float32', 0, 100],
      ['Tag1', '40002', 'int32', 100, 50], // duplicate name, min > max
      ['', '40003', 'float32', 0, 100], // empty name - skipped by parser
      ['Tag3', '40001', 'unknown_type', 0, 100], // duplicate address, bad type
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    // Step 1: Parse
    const tags = excelParser.parse(Buffer.from('test'), { headerRow: 0, dataStartRow: 1 });

    // Empty name row skipped
    expect(tags).toHaveLength(3);

    // Step 2: Validate
    const result = validator.validate(tags);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.field === 'name' && e.message.includes('重复'))).toBe(true);
    expect(result.errors.some((e) => e.field === 'dataType')).toBe(true);
    expect(result.errors.some((e) => e.message.includes('必须小于最大值'))).toBe(true);
    expect(result.warnings.some((w) => w.field === 'address')).toBe(true);
  });

  // ==================== JSON with Variables Format → Validation ====================

  it('TC-IEX-008: should handle JSON with variables format in pipeline', () => {
    const json = JSON.stringify({
      schemaVersion: '1.0',
      templateType: 'device_tag_template',
      name: 'Import Template',
      deviceType: 'modbus_tcp',
      version: '1.0',
      variables: [
        { name: 'temp', address: '40001', dataType: 'float32', order: 1 },
        { name: 'press', address: '40002', dataType: 'int32', order: 2 },
        { name: 'flow', address: '40003', dataType: 'float32', order: 3 },
      ],
    });

    const parseResult = jsonParser.parse(json);
    const validationResult = validator.validate(parseResult.tags);

    expect(parseResult.tags).toHaveLength(3);
    expect(parseResult.metadata?.name).toBe('Import Template');
    expect(validationResult.valid).toBe(true);
  });

  // ==================== Edge Cases ====================

  it('TC-IEX-009: should handle all valid data types in JSON import', () => {
    const validTypes = [
      'boolean',
      'int16',
      'uint16',
      'int32',
      'uint32',
      'float32',
      'float64',
      'string',
    ];

    const tags = validTypes.map((dt, i) => ({
      name: `tag_${i}`,
      address: `4000${i}`,
      dataType: dt,
    }));

    const json = JSON.stringify(tags);
    const parseResult = jsonParser.parse(json);
    const validationResult = validator.validate(parseResult.tags);

    expect(parseResult.tags).toHaveLength(8);
    expect(validationResult.valid).toBe(true);
  });

  it('TC-IEX-010: should handle empty input gracefully', () => {
    // Empty array
    expect(() => jsonParser.parse('[]')).toThrow('JSON 标签数组为空');

    // Empty tags
    expect(() => jsonParser.parse('{"tags":[]}')).toThrow('JSON 中 tags 数组为空');

    // Empty validation
    const emptyResult = validator.validate([]);
    expect(emptyResult.valid).toBe(false);
    expect(emptyResult.errors[0].message).toContain('标签数据为空');
  });

  it('TC-IEX-011: should handle mixed valid/invalid tags in batch', () => {
    const mockData = [
      ['名称', '地址', '数据类型'],
      ['Valid1', '40001', 'float32'],
      ['Valid2', '40002', 'int32'],
      ['Invalid1', '40003', 'bad_type'],
      ['Valid3', '40004', 'boolean'],
      ['Invalid2', '', 'float32'],
      ['Valid4', '40005', 'string'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const tags = excelParser.parse(Buffer.from('test'), { headerRow: 0, dataStartRow: 1 });
    const result = validator.validate(tags);

    expect(tags).toHaveLength(6);
    expect(result.valid).toBe(false);
    // Invalid1: bad type, Invalid2: empty address
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('TC-IEX-012: should handle large batch import', () => {
    const tags = Array.from({ length: 500 }, (_, i) => ({
      name: `tag_${i}`,
      address: `${40001 + i}`,
      dataType: i % 3 === 0 ? 'float32' : i % 3 === 1 ? 'int32' : 'boolean',
    }));

    const json = JSON.stringify(tags);
    const parseResult = jsonParser.parse(json);
    const validationResult = validator.validate(parseResult.tags);

    expect(parseResult.tags).toHaveLength(500);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('TC-IEX-013: should detect cross-parser consistency issues', () => {
    // Simulate: Excel parsed data has rowIndex, JSON parsed data has order
    const mockData = [
      ['名称', '地址', '数据类型'],
      ['Tag1', '40001', 'float32'],
    ];

    (XLSX.read as jest.Mock).mockReturnValue(createMockWorkbook(mockData));
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const excelTags = excelParser.parse(Buffer.from('test'), { headerRow: 0, dataStartRow: 1 });
    const jsonResult = jsonParser.parse(
      JSON.stringify([{ name: 'Tag1', address: '40001', dataType: 'float32' }]),
    );

    // Both should produce the same core data
    expect(excelTags[0].name).toBe(jsonResult.tags[0].name);
    expect(excelTags[0].address).toBe(jsonResult.tags[0].address);
    expect(excelTags[0].dataType).toBe(jsonResult.tags[0].dataType);

    // Both should validate successfully
    expect(validator.validate(excelTags).valid).toBe(true);
    expect(validator.validate(jsonResult.tags).valid).toBe(true);
  });
});
