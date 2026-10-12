// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TagJsonParserService } from '../parsers/tag-json-parser.service';

describe('TagJsonParserService', () => {
  let service: TagJsonParserService;

  beforeEach(() => {
    service = new TagJsonParserService();
  });

  // ==================== Array Format ====================

  it('TC-JSON-001: should parse array format JSON', () => {
    const json = JSON.stringify([
      { name: 'temperature', address: '40001', dataType: 'float32' },
      { name: 'humidity', address: '40002', dataType: 'float32' },
    ]);

    const result = service.parse(json);

    expect(result.tags).toHaveLength(2);
    expect(result.tags[0].name).toBe('temperature');
    expect(result.tags[0].address).toBe('40001');
    expect(result.tags[0].dataType).toBe('float32');
    expect(result.tags[1].name).toBe('humidity');
    expect(result.metadata).toBeUndefined();
  });

  it('TC-JSON-002: should parse array format with optional fields', () => {
    const json = JSON.stringify([
      {
        name: 'pressure',
        address: '40003',
        dataType: 'int32',
        description: '压力传感器',
        unit: 'Pa',
        minValue: 0,
        maxValue: 1000,
        scanRate: 500,
        enabled: true,
        category: 'AI',
      },
    ]);

    const result = service.parse(json);

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].description).toBe('压力传感器');
    expect(result.tags[0].unit).toBe('Pa');
    expect(result.tags[0].minValue).toBe(0);
    expect(result.tags[0].maxValue).toBe(1000);
    expect(result.tags[0].scanRate).toBe(500);
    expect(result.tags[0].enabled).toBe(true);
    expect(result.tags[0].category).toBe('AI');
  });

  // ==================== Object Format with tags ====================

  it('TC-JSON-003: should parse object format with tags key', () => {
    const json = JSON.stringify({
      name: '温度模板',
      deviceType: 'modbus_tcp',
      version: '1.0',
      tags: [
        { name: 'temperature', address: '40001', dataType: 'float32' },
        { name: 'humidity', address: '40002', dataType: 'float32' },
      ],
    });

    const result = service.parse(json);

    expect(result.tags).toHaveLength(2);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.name).toBe('温度模板');
    expect(result.metadata?.deviceType).toBe('modbus_tcp');
    expect(result.metadata?.version).toBe('1.0');
  });

  // ==================== Object Format with variables ====================

  it('TC-JSON-004: should parse object format with variables key', () => {
    const json = JSON.stringify({
      schemaVersion: '1.0',
      templateType: 'device_tag_template',
      name: 'PLC模板',
      deviceType: 'modbus_tcp',
      variables: [
        { name: 'temp', address: '40001', dataType: 'float32' },
        { name: 'press', address: '40002', dataType: 'int32' },
      ],
    });

    const result = service.parse(json);

    expect(result.tags).toHaveLength(2);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.schemaVersion).toBe('1.0');
    expect(result.metadata?.templateType).toBe('device_tag_template');
    expect(result.metadata?.name).toBe('PLC模板');
  });

  // ==================== Tag Name Alias (tagName) ====================

  it('TC-JSON-005: should support tagName as alias for name', () => {
    const json = JSON.stringify([
      { tagName: 'temperature', address: '40001', dataType: 'float32' },
    ]);

    const result = service.parse(json);

    expect(result.tags[0].name).toBe('temperature');
  });

  it('TC-JSON-006: should support data_type as alias for dataType', () => {
    const json = JSON.stringify([{ name: 'temperature', address: '40001', data_type: 'float32' }]);

    const result = service.parse(json);

    expect(result.tags[0].dataType).toBe('float32');
  });

  // ==================== Order Assignment ====================

  it('TC-JSON-007: should assign order from data or index', () => {
    const json = JSON.stringify([
      { name: 'tag1', address: '40001', dataType: 'float32', order: 10 },
      { name: 'tag2', address: '40002', dataType: 'float32' },
    ]);

    const result = service.parse(json);

    expect(result.tags[0].order).toBe(10);
    expect(result.tags[1].order).toBe(2);
  });

  // ==================== Error Handling ====================

  it('TC-JSON-008: should throw on invalid JSON string', () => {
    expect(() => service.parse('not valid json')).toThrow('JSON 解析失败');
  });

  it('TC-JSON-009: should throw on null input', () => {
    expect(() => service.parse('null')).toThrow('JSON 数据为空');
  });

  it('TC-JSON-010: should throw on empty array', () => {
    expect(() => service.parse('[]')).toThrow('JSON 标签数组为空');
  });

  it('TC-JSON-011: should throw on empty tags array in object', () => {
    expect(() => service.parse('{"tags": []}')).toThrow('JSON 中 tags 数组为空');
  });

  it('TC-JSON-012: should throw on empty variables array in object', () => {
    expect(() => service.parse('{"variables": []}')).toThrow('JSON 中 variables 数组为空');
  });

  it('TC-JSON-013: should throw on unsupported object format', () => {
    expect(() => service.parse('{"name": "test", "deviceType": "modbus"}')).toThrow(
      'JSON 格式不支持',
    );
  });

  it('TC-JSON-014: should throw on primitive values', () => {
    expect(() => service.parse('"just a string"')).toThrow('JSON 格式不支持');
    expect(() => service.parse('123')).toThrow('JSON 格式不支持');
  });

  it('TC-JSON-015: should throw on non-object tag items', () => {
    const json = JSON.stringify([
      { name: 'valid', address: '40001', dataType: 'float32' },
      'invalid string item',
    ]);

    expect(() => service.parse(json)).toThrow('JSON 第 2 个标签数据格式无效');
  });

  // ==================== Preserving Extra Fields ====================

  it('TC-JSON-016: should preserve extra fields on tags', () => {
    const json = JSON.stringify([
      {
        name: 'temperature',
        address: '40001',
        dataType: 'float32',
        customField: 'customValue',
        anotherField: 123,
      },
    ]);

    const result = service.parse(json);

    expect(result.tags[0].customField).toBe('customValue');
    expect(result.tags[0].anotherField).toBe(123);
  });

  // ==================== Empty String Defaults ====================

  it('TC-JSON-017: should default missing required fields to empty string', () => {
    const json = JSON.stringify([{}]);

    const result = service.parse(json);

    expect(result.tags[0].name).toBe('');
    expect(result.tags[0].address).toBe('');
    expect(result.tags[0].dataType).toBe('');
  });

  // ==================== Large Dataset ====================

  it('TC-JSON-018: should handle large tag arrays', () => {
    const tags = Array.from({ length: 1000 }, (_, i) => ({
      name: `tag_${i}`,
      address: `${40001 + i}`,
      dataType: 'float32',
    }));

    const result = service.parse(JSON.stringify(tags));

    expect(result.tags).toHaveLength(1000);
    expect(result.tags[0].name).toBe('tag_0');
    expect(result.tags[999].name).toBe('tag_999');
  });

  // ==================== Metadata Extraction ====================

  it('TC-JSON-019: should extract metadata from object format', () => {
    const json = JSON.stringify({
      schemaVersion: '2.0',
      templateType: 'custom',
      name: 'My Template',
      description: 'A test template',
      deviceType: 'opc_ua',
      version: '3.1',
      tags: [{ name: 'tag1', address: '40001', dataType: 'float32' }],
    });

    const result = service.parse(json);

    expect(result.metadata).toEqual({
      schemaVersion: '2.0',
      templateType: 'custom',
      name: 'My Template',
      description: 'A test template',
      deviceType: 'opc_ua',
      version: '3.1',
    });
  });

  it('TC-JSON-020: should handle object with only tags and no metadata', () => {
    const json = JSON.stringify({
      tags: [{ name: 'tag1', address: '40001', dataType: 'float32' }],
    });

    const result = service.parse(json);

    expect(result.tags).toHaveLength(1);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.name).toBeUndefined();
  });
});
