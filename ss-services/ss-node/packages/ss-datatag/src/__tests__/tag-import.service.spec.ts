// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TagImportService } from '../import/tag-import.service';
import { DataTagService } from '../datatag.service';
import { DataTag } from '../entities/data-tag.entity';

function makeTag(overrides: Partial<DataTag> = {}): DataTag {
  return {
    id: 'tag-001',
    name: 'test-tag',
    address: '40001',
    dataType: 'float32' as any,
    deviceId: 'device-001',
    projectId: 'project-001',
    description: null,
    unit: null,
    displayFormat: '%.2f',
    decimalPlaces: null,
    minValue: null,
    maxValue: null,
    engMinValue: null,
    engMaxValue: null,
    scale: 1.0,
    offset: 0.0,
    scanRate: 1000,
    timeout: 5000,
    retryCount: 3,
    enabled: true,
    deadbandMode: 'none' as any,
    deadbandValue: null,
    deadbandPercent: null,
    deadbandTime: null,
    conversionType: 'none' as any,
    conversionConfig: null,
    alarmHighHigh: null,
    alarmHigh: null,
    alarmLow: null,
    alarmLowLow: null,
    alarmDeviation: null,
    alarmEnabled: true,
    qualityCheckEnabled: false,
    maxAge: null,
    archiveEnabled: false,
    archiveInterval: null,
    archiveDeadband: null,
    retentionDays: null,
    priority: 1,
    groupId: null,
    category: null,
    tags: null,
    simulationEnabled: false,
    simulationConfig: null,
    direction: 'read',
    config: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('TagImportService', () => {
  let service: TagImportService;
  let mockTagService: jest.Mocked<Partial<DataTagService>>;

  beforeEach(() => {
    mockTagService = {
      create: jest.fn(),
    };
    service = new TagImportService(mockTagService as any);
  });

  // ==================== validate ====================
  describe('validate', () => {
    it('TC-TIM-001: should validate valid data successfully', () => {
      const data = [
        { name: 'tag1', dataType: 'float32', scanRate: 1000, minValue: 0, maxValue: 100 },
        { name: 'tag2', dataType: 'int32', scanRate: 500, minValue: -10, maxValue: 10 },
      ];

      const result = service.validate(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.failureCount).toBe(0);
    });

    it('TC-TIM-002: should report error for empty name', () => {
      const data = [{ name: '', dataType: 'float32' }];

      const result = service.validate(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].column).toBe('名称');
      expect(result.errors[0].message).toContain('标签名称不能为空');
    });

    it('TC-TIM-003: should report error for whitespace-only name', () => {
      const data = [{ name: '   ', dataType: 'float32' }];

      const result = service.validate(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('TC-TIM-004: should report error for missing name field', () => {
      const data = [{ dataType: 'float32' }];

      const result = service.validate(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('TC-TIM-005: should report error for invalid dataType', () => {
      const data = [{ name: 'tag1', dataType: 'invalid_type' }];

      const result = service.validate(data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].column).toBe('dataType');
      expect(result.errors[0].message).toContain('无效的数据类型');
    });

    it('TC-TIM-006: should accept all valid data types', () => {
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
      const data = validTypes.map((type, i) => ({ name: `tag${i}`, dataType: type }));

      const result = service.validate(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('TC-TIM-007: should accept case-insensitive dataType', () => {
      const data = [
        { name: 'tag1', dataType: 'FLOAT32' },
        { name: 'tag2', dataType: 'Int32' },
      ];

      const result = service.validate(data);

      expect(result.valid).toBe(true);
    });

    it('TC-TIM-008: should warn for scanRate below 100', () => {
      const data = [{ name: 'tag1', dataType: 'float32', scanRate: 50 }];

      const result = service.validate(data);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].column).toBe('scanRate');
      expect(result.warnings[0].message).toContain('100-60000ms');
      expect(result.valid).toBe(true); // warnings don't invalidate
    });

    it('TC-TIM-009: should warn for scanRate above 60000', () => {
      const data = [{ name: 'tag1', dataType: 'float32', scanRate: 100000 }];

      const result = service.validate(data);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].column).toBe('scanRate');
    });

    it('TC-TIM-010: should not warn for valid scanRate range', () => {
      const data = [
        { name: 'tag1', dataType: 'float32', scanRate: 100 },
        { name: 'tag2', dataType: 'float32', scanRate: 60000 },
        { name: 'tag3', dataType: 'float32', scanRate: 5000 },
      ];

      const result = service.validate(data);

      expect(result.warnings).toHaveLength(0);
    });

    it('TC-TIM-011: should warn for NaN scanRate', () => {
      const data = [{ name: 'tag1', dataType: 'float32', scanRate: 'abc' }];

      const result = service.validate(data);

      // Number('abc') is NaN, isNaN(NaN) is true, so warning is triggered
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].column).toBe('scanRate');
    });

    it('TC-TIM-012: should report error when minValue >= maxValue', () => {
      const data = [{ name: 'tag1', dataType: 'float32', minValue: 100, maxValue: 50 }];

      const result = service.validate(data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].column).toBe('量程');
      expect(result.errors[0].message).toContain('量程下限必须小于量程上限');
    });

    it('TC-TIM-013: should report error when minValue equals maxValue', () => {
      const data = [{ name: 'tag1', dataType: 'float32', minValue: 50, maxValue: 50 }];

      const result = service.validate(data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].column).toBe('量程');
    });

    it('TC-TIM-014: should not report range error when minValue < maxValue', () => {
      const data = [{ name: 'tag1', dataType: 'float32', minValue: 0, maxValue: 100 }];

      const result = service.validate(data);

      expect(result.errors).toHaveLength(0);
    });

    it('TC-TIM-015: should not report range error when only one bound is set', () => {
      const data = [
        { name: 'tag1', dataType: 'float32', minValue: 0 },
        { name: 'tag2', dataType: 'float32', maxValue: 100 },
      ];

      const result = service.validate(data);

      expect(result.errors).toHaveLength(0);
    });

    it('TC-TIM-016: should handle multiple errors per row', () => {
      const data = [{ name: '', dataType: 'bad_type', scanRate: 50, minValue: 100, maxValue: 50 }];

      const result = service.validate(data);

      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.failureCount).toBe(result.errors.length);
      expect(result.valid).toBe(false);
    });

    it('TC-TIM-017: should handle empty data array', () => {
      const result = service.validate([]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.successCount).toBe(0);
    });

    it('TC-TIM-018: should track row numbers correctly', () => {
      const data = [
        { name: 'tag1', dataType: 'float32' },
        { name: '', dataType: 'float32' },
        { name: 'tag3', dataType: 'float32' },
      ];

      const result = service.validate(data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(2);
    });
  });

  // ==================== importJson ====================
  describe('importJson', () => {
    const validRow = {
      name: 'tag1',
      dataType: 'float32',
    };

    it('TC-TIM-020: should import valid data successfully', async () => {
      mockTagService.create!.mockResolvedValue(makeTag({ id: 'tag-001', name: 'tag1' }));

      const result = await service.importJson([validRow], 'device-001', 'project-001');

      expect(result.valid).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(mockTagService.create).toHaveBeenCalledTimes(1);
    });

    it('TC-TIM-021: should return validation errors without skipErrors option', async () => {
      const data = [{ name: '', dataType: 'float32' }];

      const result = await service.importJson(data, 'device-001', 'project-001');

      expect(result.valid).toBe(false);
      expect(mockTagService.create).not.toHaveBeenCalled();
    });

    it('TC-TIM-022: should skip validation errors when skipErrors is true', async () => {
      mockTagService.create!.mockResolvedValue(makeTag({ id: 'tag-001', name: 'valid-tag' }));

      const data = [
        { name: '', dataType: 'float32' }, // validation error
        { name: 'valid-tag', dataType: 'float32' }, // valid
      ];

      const result = await service.importJson(data, 'device-001', 'project-001', {
        skipErrors: true,
      });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(mockTagService.create).toHaveBeenCalledTimes(1);
    });

    it('TC-TIM-023: should handle service create failure', async () => {
      const error = new Error('DB error');
      mockTagService.create!.mockRejectedValue(error);

      const result = await service.importJson([validRow], 'device-001', 'project-001');

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('DB error');
    });

    it('TC-TIM-024: should apply default values for missing fields', async () => {
      mockTagService.create!.mockResolvedValue(makeTag({ id: 'tag-001' }));

      await service.importJson([validRow], 'device-001', 'project-001');

      const dto = mockTagService.create!.mock.calls[0][0];
      expect(dto.address).toBeDefined();
      expect(dto.dataType).toBe('float32');
      expect(dto.scale).toBe(1.0);
      expect(dto.offset).toBe(0.0);
      expect(dto.scanRate).toBe(1000);
      expect(dto.enabled).toBe(true);
      expect(dto.deviceId).toBe('device-001');
      expect(dto.projectId).toBe('project-001');
    });

    it('TC-TIM-025: should pass through optional fields when provided', async () => {
      mockTagService.create!.mockResolvedValue(makeTag({ id: 'tag-001' }));

      const row = {
        name: 'tag1',
        dataType: 'int32',
        description: 'desc',
        unit: 'V',
        minValue: 0,
        maxValue: 100,
        deadbandMode: 'absolute',
        deadbandValue: 1.5,
        deadbandPercent: 10,
        deadbandTime: 5000,
        alarmHighHigh: 90,
        alarmHigh: 80,
        alarmLow: 20,
        alarmLowLow: 10,
        conversionType: 'linear',
        conversionConfig: { scale: 2, offset: 1 },
        archiveEnabled: true,
        archiveInterval: 60000,
        retentionDays: 30,
        groupId: 'group-001',
        category: 'temperature',
        priority: 'high',
        qualityCheckEnabled: true,
        maxAge: 10000,
      };

      await service.importJson([row], 'device-001', 'project-001');

      const dto = mockTagService.create!.mock.calls[0][0];
      expect(dto.description).toBe('desc');
      expect(dto.unit).toBe('V');
      expect(dto.minValue).toBe(0);
      expect(dto.maxValue).toBe(100);
      expect(dto.deadbandMode).toBe('absolute');
      expect(dto.deadbandValue).toBe(1.5);
      expect(dto.deadbandPercent).toBe(10);
      expect(dto.deadbandTime).toBe(5000);
      expect(dto.alarmHighHigh).toBe(90);
      expect(dto.alarmHigh).toBe(80);
      expect(dto.alarmLow).toBe(20);
      expect(dto.alarmLowLow).toBe(10);
      expect(dto.conversionType).toBe('linear');
      expect(dto.conversionConfig).toEqual({ scale: 2, offset: 1 });
      expect(dto.archiveEnabled).toBe(true);
      expect(dto.archiveInterval).toBe(60000);
      expect(dto.retentionDays).toBe(30);
      expect(dto.groupId).toBe('group-001');
      expect(dto.category).toBe('temperature');
      expect(dto.priority).toBe('high');
      expect(dto.qualityCheckEnabled).toBe(true);
      expect(dto.maxAge).toBe(10000);
    });

    it('TC-TIM-026: should handle mixed success and failure', async () => {
      mockTagService
        .create!.mockResolvedValueOnce(makeTag({ id: 'tag-001', name: 'tag1' }))
        .mockRejectedValueOnce(new Error('Create failed'));

      const data = [
        { name: 'tag1', dataType: 'float32' },
        { name: 'tag2', dataType: 'float32' },
      ];

      const result = await service.importJson(data, 'device-001', 'project-001');

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.valid).toBe(false);
    });

    it('TC-TIM-027: should handle empty data array', async () => {
      const result = await service.importJson([], 'device-001', 'project-001');

      expect(result.valid).toBe(true);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(mockTagService.create).not.toHaveBeenCalled();
    });

    it('TC-TIM-028: should include overwrite option (no-op in current impl)', async () => {
      mockTagService.create!.mockResolvedValue(makeTag({ id: 'tag-001' }));

      const result = await service.importJson([validRow], 'device-001', 'project-001', {
        overwrite: true,
      });

      expect(result.successCount).toBe(1);
      expect(mockTagService.create).toHaveBeenCalledTimes(1);
    });

    it('TC-TIM-029: should skip already-failed rows when skipErrors is true', async () => {
      mockTagService.create!.mockResolvedValue(makeTag({ id: 'tag-001' }));

      const data = [
        { name: '', dataType: 'float32' }, // validation error
        { name: 'valid-tag', dataType: 'float32' }, // valid
      ];

      const result = await service.importJson(data, 'device-001', 'project-001', {
        skipErrors: true,
      });

      expect(result.failureCount).toBe(1);
      expect(result.successCount).toBe(1);
      // The failed row should be skipped, not attempted to create
      expect(mockTagService.create).toHaveBeenCalledTimes(1);
    });
  });
});
