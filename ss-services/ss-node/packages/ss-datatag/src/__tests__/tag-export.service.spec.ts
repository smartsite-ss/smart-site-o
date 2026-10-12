// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TagExportService } from '../export/tag-export.service';
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
    description: 'test description',
    unit: 'V',
    displayFormat: '%.2f',
    decimalPlaces: 2,
    minValue: 0,
    maxValue: 100,
    engMinValue: 0,
    engMaxValue: 100,
    scale: 1.0,
    offset: 0.0,
    scanRate: 1000,
    timeout: 5000,
    retryCount: 3,
    enabled: true,
    deadbandMode: 'absolute' as any,
    deadbandValue: 1.5,
    deadbandPercent: null,
    deadbandTime: null,
    conversionType: 'linear' as any,
    conversionConfig: { scale: 2, offset: 1 },
    alarmHighHigh: 90,
    alarmHigh: 80,
    alarmLow: 20,
    alarmLowLow: 10,
    alarmDeviation: null,
    alarmEnabled: true,
    qualityCheckEnabled: false,
    maxAge: null,
    archiveEnabled: true,
    archiveInterval: 60000,
    archiveDeadband: null,
    retentionDays: 30,
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

describe('TagExportService', () => {
  let service: TagExportService;
  let mockTagService: jest.Mocked<Partial<DataTagService>>;

  beforeEach(() => {
    mockTagService = {
      findByDevice: jest.fn(),
    };
    service = new TagExportService(mockTagService as any);
  });

  // ==================== exportByDevice ====================
  describe('exportByDevice', () => {
    it('TC-TEX-001: should export device tags in correct format', async () => {
      const tags = [
        makeTag({ id: 'tag-001', name: 'temperature' }),
        makeTag({ id: 'tag-002', name: 'pressure', address: '40002' }),
      ];
      mockTagService.findByDevice!.mockResolvedValue(tags);

      const result = await service.exportByDevice('device-001', 'project-001');

      expect(result).toHaveProperty('version', '1.0');
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('projectId', 'project-001');
      expect(result).toHaveProperty('deviceId', 'device-001');
      expect(result).toHaveProperty('totalTags', 2);
      expect(result).toHaveProperty('tags');
      expect(Array.isArray((result as any).tags)).toBe(true);
      expect((result as any).tags).toHaveLength(2);
    });

    it('TC-TEX-002: should export each tag with correct fields', async () => {
      const tag = makeTag({
        id: 'tag-001',
        name: 'temperature',
        address: '40001',
        dataType: 'float32' as any,
        description: 'main temp',
        unit: '°C',
        scale: 1.5,
        offset: 0.5,
        scanRate: 2000,
        enabled: true,
        minValue: -20,
        maxValue: 80,
        deadbandMode: 'absolute' as any,
        deadbandValue: 1.0,
        deadbandPercent: null,
        deadbandTime: null,
        conversionType: 'linear' as any,
        conversionConfig: { scale: 2, offset: 1 },
        alarmHighHigh: 90,
        alarmHigh: 80,
        alarmLow: 20,
        alarmLowLow: 10,
        archiveEnabled: true,
        archiveInterval: 60000,
        retentionDays: 90,
      });
      mockTagService.findByDevice!.mockResolvedValue([tag]);

      const result: any = await service.exportByDevice('device-001', 'project-001');

      const exportedTag = result.tags[0];
      expect(exportedTag.name).toBe('temperature');
      expect(exportedTag.address).toBe('40001');
      expect(exportedTag.dataType).toBe('float32');
      expect(exportedTag.description).toBe('main temp');
      expect(exportedTag.unit).toBe('°C');
      expect(exportedTag.scale).toBe(1.5);
      expect(exportedTag.offset).toBe(0.5);
      expect(exportedTag.scanRate).toBe(2000);
      expect(exportedTag.enabled).toBe(true);
      expect(exportedTag.minValue).toBe(-20);
      expect(exportedTag.maxValue).toBe(80);
      expect(exportedTag.deadbandMode).toBe('absolute');
      expect(exportedTag.deadbandValue).toBe(1.0);
      expect(exportedTag.deadbandPercent).toBeNull();
      expect(exportedTag.deadbandTime).toBeNull();
      expect(exportedTag.conversionType).toBe('linear');
      expect(exportedTag.conversionConfig).toEqual({ scale: 2, offset: 1 });
      expect(exportedTag.alarmHighHigh).toBe(90);
      expect(exportedTag.alarmHigh).toBe(80);
      expect(exportedTag.alarmLow).toBe(20);
      expect(exportedTag.alarmLowLow).toBe(10);
      expect(exportedTag.archiveEnabled).toBe(true);
      expect(exportedTag.archiveInterval).toBe(60000);
      expect(exportedTag.retentionDays).toBe(90);
    });

    it('TC-TEX-003: should handle empty tags array', async () => {
      mockTagService.findByDevice!.mockResolvedValue([]);

      const result: any = await service.exportByDevice('device-001', 'project-001');

      expect(result.totalTags).toBe(0);
      expect(result.tags).toEqual([]);
    });

    it('TC-TEX-004: should use default empty string for null description', async () => {
      const tag = makeTag({ description: null });
      mockTagService.findByDevice!.mockResolvedValue([tag]);

      const result: any = await service.exportByDevice('device-001', 'project-001');

      expect(result.tags[0].description).toBe('');
    });

    it('TC-TEX-005: should use default empty string for null unit', async () => {
      const tag = makeTag({ unit: null });
      mockTagService.findByDevice!.mockResolvedValue([tag]);

      const result: any = await service.exportByDevice('device-001', 'project-001');

      expect(result.tags[0].unit).toBe('');
    });

    it('TC-TEX-006: should include exportedAt timestamp in ISO format', async () => {
      mockTagService.findByDevice!.mockResolvedValue([]);

      const result: any = await service.exportByDevice('device-001', 'project-001');

      expect(result.exportedAt).toBeDefined();
      expect(() => new Date(result.exportedAt)).not.toThrow();
    });
  });

  // ==================== exportByProject ====================
  describe('exportByProject', () => {
    it('TC-TEX-010: should export project metadata', async () => {
      const result: any = await service.exportByProject('project-001');

      expect(result).toHaveProperty('version', '1.0');
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('projectId', 'project-001');
    });

    it('TC-TEX-011: should accept optional deviceIds parameter', async () => {
      const result: any = await service.exportByProject('project-001', [
        'device-001',
        'device-002',
      ]);

      expect(result.projectId).toBe('project-001');
      expect(result.version).toBe('1.0');
    });

    it('TC-TEX-012: should handle no deviceIds', async () => {
      const result: any = await service.exportByProject('project-001');

      expect(result.projectId).toBe('project-001');
    });
  });
});
