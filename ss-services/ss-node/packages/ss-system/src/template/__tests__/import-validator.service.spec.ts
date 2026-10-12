// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ImportValidatorService } from '../parsers/import-validator.service';

// Mock TagDataType enum
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

describe('ImportValidatorService', () => {
  let service: ImportValidatorService;

  beforeEach(() => {
    service = new ImportValidatorService();
  });

  function makeTag(overrides: Record<string, any> = {}) {
    return {
      name: 'temperature',
      address: '40001',
      dataType: 'float32',
      description: '温度传感器',
      unit: '°C',
      minValue: 0,
      maxValue: 100,
      scanRate: 1000,
      enabled: true,
      category: 'AI',
      ...overrides,
    };
  }

  // ==================== Basic Validation ====================

  it('TC-VALID-001: should pass for valid tags', () => {
    const tags = [
      makeTag({ name: 'tag1', address: '40001', dataType: 'float32' }),
      makeTag({ name: 'tag2', address: '40002', dataType: 'int32' }),
    ];

    const result = service.validate(tags);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.total).toBe(2);
    expect(result.summary.valid).toBe(2);
  });

  it('TC-VALID-002: should pass for tags with only required fields', () => {
    const tags = [{ name: 'tag1', address: '40001', dataType: 'float32' }];

    const result = service.validate(tags);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ==================== Required Field Validation ====================

  it('TC-VALID-003: should reject missing name', () => {
    const tags = [makeTag({ name: '' })];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('name');
    expect(result.errors[0].message).toContain('必填字段');
  });

  it('TC-VALID-004: should reject missing address', () => {
    const tags = [makeTag({ address: '' })];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'address')).toBe(true);
  });

  it('TC-VALID-005: should reject missing dataType', () => {
    const tags = [makeTag({ dataType: '' })];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'dataType')).toBe(true);
  });

  it('TC-VALID-006: should reject null/undefined required fields', () => {
    const tags = [{ name: null, address: undefined, dataType: null }];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  // ==================== DataType Validation ====================

  it('TC-VALID-007: should accept all valid data types', () => {
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

    const result = service.validate(tags);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('TC-VALID-008: should reject invalid dataType', () => {
    const tags = [makeTag({ dataType: 'invalid_type' })];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'dataType')).toBe(true);
    expect(result.errors[0].message).toContain('无效的数据类型');
  });

  // ==================== Duplicate Detection ====================

  it('TC-VALID-009: should detect duplicate tag names', () => {
    const tags = [
      makeTag({ name: 'same_name', address: '40001' }),
      makeTag({ name: 'same_name', address: '40002' }),
    ];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'name' && e.message.includes('重复'))).toBe(true);
  });

  it('TC-VALID-010: should warn on duplicate addresses', () => {
    const tags = [
      makeTag({ name: 'tag1', address: '40001' }),
      makeTag({ name: 'tag2', address: '40001' }),
    ];

    const result = service.validate(tags);

    // Duplicate addresses are warnings, not errors
    // But duplicate names are errors, and there are no duplicate names here
    expect(result.warnings.some((w) => w.field === 'address' && w.message.includes('重复'))).toBe(
      true,
    );
    // No duplicate names, so should be valid
    expect(result.valid).toBe(true);
  });

  // ==================== Value Range Validation ====================

  it('TC-VALID-011: should reject minValue >= maxValue', () => {
    const tags = [makeTag({ minValue: 100, maxValue: 50 })];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('必须小于最大值'))).toBe(true);
  });

  it('TC-VALID-012: should reject minValue equal to maxValue', () => {
    const tags = [makeTag({ minValue: 50, maxValue: 50 })];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('必须小于最大值'))).toBe(true);
  });

  it('TC-VALID-013: should accept valid minValue < maxValue', () => {
    const tags = [makeTag({ minValue: 0, maxValue: 100 })];

    const result = service.validate(tags);

    expect(result.valid).toBe(true);
  });

  it('TC-VALID-014: should accept tag without minValue/maxValue', () => {
    const tags = [makeTag({ minValue: undefined, maxValue: undefined })];

    const result = service.validate(tags);

    expect(result.valid).toBe(true);
  });

  it('TC-VALID-015: should reject non-numeric minValue', () => {
    const tags = [makeTag({ minValue: 'abc' })];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.field === 'minValue' && e.message.includes('不是有效数字')),
    ).toBe(true);
  });

  it('TC-VALID-016: should reject non-numeric maxValue', () => {
    const tags = [makeTag({ maxValue: 'xyz' })];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.field === 'maxValue' && e.message.includes('不是有效数字')),
    ).toBe(true);
  });

  // ==================== ScanRate Validation ====================

  it('TC-VALID-017: should warn on non-positive scanRate', () => {
    const tags = [makeTag({ scanRate: 0 })];

    const result = service.validate(tags);

    expect(result.warnings.some((w) => w.field === 'scanRate')).toBe(true);
  });

  it('TC-VALID-018: should warn on negative scanRate', () => {
    const tags = [makeTag({ scanRate: -100 })];

    const result = service.validate(tags);

    expect(result.warnings.some((w) => w.field === 'scanRate')).toBe(true);
  });

  it('TC-VALID-019: should accept positive scanRate', () => {
    const tags = [makeTag({ scanRate: 1000 })];

    const result = service.validate(tags);

    expect(result.warnings.some((w) => w.field === 'scanRate')).toBe(false);
  });

  // ==================== Name Length ====================

  it('TC-VALID-020: should warn on long tag names', () => {
    const longName = 'a'.repeat(200);
    const tags = [makeTag({ name: longName })];

    const result = service.validate(tags);

    expect(result.warnings.some((w) => w.field === 'name' && w.message.includes('过长'))).toBe(
      true,
    );
  });

  // ==================== Unknown Field Warnings ====================

  it('TC-VALID-021: should warn on unknown fields', () => {
    const tags = [makeTag({ unknownField: 'value', anotherUnknown: 123 })];

    const result = service.validate(tags);

    expect(result.warnings.filter((w) => w.field === 'unknownField')).toHaveLength(1);
    expect(result.warnings.filter((w) => w.field === 'anotherUnknown')).toHaveLength(1);
  });

  // ==================== Empty Tags ====================

  it('TC-VALID-022: should reject empty tags array', () => {
    const result = service.validate([]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('标签数据为空'))).toBe(true);
  });

  it('TC-VALID-023: should reject null/undefined input', () => {
    const result = service.validate(null as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('标签数据为空'))).toBe(true);
  });

  // ==================== Row Index Handling ====================

  it('TC-VALID-024: should use rowIndex from tag data', () => {
    const tags = [makeTag({ name: '', rowIndex: 5 })];

    const result = service.validate(tags);

    expect(result.errors[0].rowIndex).toBe(5);
  });

  it('TC-VALID-025: should default rowIndex to array index + 1', () => {
    const tags = [
      makeTag({ name: '' }),
      makeTag({ name: 'valid', address: '40001', dataType: 'float32' }),
    ];

    const result = service.validate(tags);

    expect(result.errors[0].rowIndex).toBe(1);
    expect(result.summary.total).toBe(2);
  });

  // ==================== Summary Calculation ====================

  it('TC-VALID-026: should calculate summary correctly', () => {
    const tags = [
      makeTag({ name: 'tag1', address: '40001', dataType: 'float32' }),
      makeTag({ name: '', address: '40002', dataType: 'float32' }), // error
      makeTag({ name: 'tag3', address: '40003', dataType: 'invalid' }), // error
      makeTag({ name: 'tag4', address: '40001', dataType: 'float32' }), // warning (duplicate address)
    ];

    const result = service.validate(tags);

    expect(result.summary.total).toBe(4);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('TC-VALID-027: should report valid as true when only warnings exist', () => {
    const tags = [
      makeTag({ name: 'tag1', address: '40001', dataType: 'float32', scanRate: 0 }),
      makeTag({ name: 'tag2', address: '40001', dataType: 'float32' }), // duplicate address warning
    ];

    const result = service.validate(tags);

    // Only warnings, no errors
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  // ==================== Multiple Errors Per Tag ====================

  it('TC-VALID-028: should report multiple errors per tag', () => {
    const tags = [
      makeTag({
        name: '',
        address: '',
        dataType: 'bad_type',
        minValue: 'abc',
        maxValue: 'xyz',
        unknownField: 'value',
      }),
    ];

    const result = service.validate(tags);

    // name and address are empty, so dataType check is skipped
    // But we should still get at least 2 errors for name and address
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.some((e) => e.field === 'name')).toBe(true);
    expect(result.errors.some((e) => e.field === 'address')).toBe(true);
  });

  it('TC-VALID-029: should skip further validation when required fields missing', () => {
    const tags = [makeTag({ name: '', dataType: '' })];

    const result = service.validate(tags);

    // Should have errors for name and dataType, but skip dataType validity check
    const dataTypeErrors = result.errors.filter((e) => e.field === 'dataType');
    expect(dataTypeErrors).toHaveLength(1);
    expect(dataTypeErrors[0].message).toContain('必填字段');
  });

  it('TC-VALID-030: should handle tags with only name and address but no dataType', () => {
    const tags = [{ name: 'tag1', address: '40001', dataType: '' }];

    const result = service.validate(tags);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'dataType')).toBe(true);
  });
});
