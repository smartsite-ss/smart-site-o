// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataController } from '../data.controller';
import { DataService } from '../data.service';
import { DataQueryService, AggregationType } from '../data-query.service';

// ============================================================
// Mock @nestjs/swagger decorators to avoid Reflect metadata issues
// ============================================================
jest.mock('@nestjs/swagger', () => {
  const noop = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  const noopProp = () => () => {};
  return {
    ApiTags: (..._tags: string[]) => noop(),
    ApiBearerAuth: () => noop(),
    ApiOperation: (_opts: any) => noop(),
    ApiParam: (_opts: any) => noop(),
    ApiQuery: (_opts: any) => noop(),
    ApiProperty: (_opts?: any) => noopProp(),
    ApiPropertyOptional: (_opts?: any) => noopProp(),
    PartialType: (cls: any) => cls,
    OmitType: (cls: any, _keys: string[]) => cls,
    PickType: (cls: any, _keys: string[]) => cls,
    IntersectionType: (...classes: any[]) => classes[0],
  };
});

// ============================================================
// Mock JWT guard
// ============================================================
jest.mock('@ss-node/ss-core', () => {
  const noopDeco = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  class MockJwtAuthGuard {
    canActivate = () => true;
  }
  class MockRolesGuard {
    canActivate = () => true;
  }
  // Stub for ProjectScopedEntity (required by ss-device entities import chain)
  class ProjectScopedEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    projectId: string;
  }
  return {
    JwtAuthGuard: MockJwtAuthGuard,
    RolesGuard: MockRolesGuard,
    Roles: (..._roles: any[]) => noopDeco(),
    WriteRoles: () => noopDeco(),
    ReadRoles: () => noopDeco(),
    UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
    ProjectScopedEntity,
  };
});

// Mock @ss-node/ss-device to avoid deep transitive import chain (DeviceService → ss-system → device-template.controller)
jest.mock('@ss-node/ss-device', () => ({
  Device: class MockDevice {
    id: string;
    name: string;
    projectId: string;
  },
  DataTag: class MockDataTag {
    id: string;
    tagId?: string;
    name: string;
    deviceId: string;
  },
  DeviceGroup: class MockDeviceGroup {
    id: string;
    name: string;
  },
  DeviceStatusLog: class MockDeviceStatusLog {
    id: string;
  },
  EventLog: class MockEventLog {
    id: string;
  },
}));

// ============================================================
// Mock services
// ============================================================
const mockDataService = {
  getLatestData: jest.fn(),
};

const mockDataQueryService = {
  queryTimeRange: jest.fn(),
  aggregate: jest.fn(),
  aggregateWindow: jest.fn(),
  batchQueryLatest: jest.fn(),
  batchQueryTimeRange: jest.fn(),
  getTagStats: jest.fn(),
  queryTrendData: jest.fn(),
};

describe('DataController', () => {
  let controller: DataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataController],
      providers: [
        { provide: DataService, useValue: mockDataService },
        { provide: DataQueryService, useValue: mockDataQueryService },
      ],
    }).compile();

    controller = module.get<DataController>(DataController);
    jest.clearAllMocks();
  });

  // ==================== getHistoricalData ====================
  describe('GET /data/historical/:tagId', () => {
    it('TC-DDC-001: should query time range with default pagination', async () => {
      const mockResult = {
        data: [{ tagId: 'tag-001', value: 42, timestamp: '2026-01-01T00:00:00Z' }],
        total: 1,
      };
      mockDataQueryService.queryTimeRange.mockResolvedValue(mockResult);

      const result = await controller.getHistoricalData(
        'tag-001',
        '2026-01-01T00:00:00Z',
        '2026-01-01T01:00:00Z',
      );

      expect(result).toEqual(mockResult);
      expect(mockDataQueryService.queryTimeRange).toHaveBeenCalledWith({
        tagId: 'tag-001',
        startTime: new Date('2026-01-01T00:00:00Z'),
        endTime: new Date('2026-01-01T01:00:00Z'),
        page: undefined,
        pageSize: undefined,
      });
    });

    it('TC-DDC-002: should parse page and pageSize as numbers', async () => {
      mockDataQueryService.queryTimeRange.mockResolvedValue({ data: [], total: 0 });

      await controller.getHistoricalData(
        'tag-001',
        '2026-01-01T00:00:00Z',
        '2026-01-01T01:00:00Z',
        '2',
        '50',
      );

      expect(mockDataQueryService.queryTimeRange).toHaveBeenCalledWith({
        tagId: 'tag-001',
        startTime: new Date('2026-01-01T00:00:00Z'),
        endTime: new Date('2026-01-01T01:00:00Z'),
        page: 2,
        pageSize: 50,
      });
    });

    it('TC-DDC-003: should return empty data when no records in range', async () => {
      mockDataQueryService.queryTimeRange.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.getHistoricalData(
        'tag-001',
        '2020-01-01T00:00:00Z',
        '2020-01-01T01:00:00Z',
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==================== getLatestData ====================
  describe('GET /data/latest/:tagId', () => {
    it('TC-DDC-010: should return latest data for a tag', async () => {
      const latestRecord = { tagId: 'tag-001', value: 99.5, timestamp: new Date() };
      mockDataService.getLatestData.mockResolvedValue(latestRecord);

      const result = await controller.getLatestData('tag-001');

      expect(result).toEqual(latestRecord);
      expect(mockDataService.getLatestData).toHaveBeenCalledWith('tag-001');
    });

    it('TC-DDC-011: should return null when tag has no data', async () => {
      mockDataService.getLatestData.mockResolvedValue(null);

      const result = await controller.getLatestData('tag-empty');

      expect(result).toBeNull();
    });
  });

  // ==================== getAggregate ====================
  describe('GET /data/aggregate/:tagId', () => {
    it('TC-DDC-020: should aggregate with avg type', async () => {
      const aggResult = {
        aggregation: AggregationType.AVG,
        value: 50.5,
        tagId: 'tag-001',
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-01-01T01:00:00.000Z',
      };
      mockDataQueryService.aggregate.mockResolvedValue(aggResult);

      const result = await controller.getAggregate(
        'tag-001',
        '2026-01-01T00:00:00Z',
        '2026-01-01T01:00:00Z',
        'avg',
      );

      expect(result).toEqual(aggResult);
      expect(mockDataQueryService.aggregate).toHaveBeenCalledWith(
        'tag-001',
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-01T01:00:00Z'),
        AggregationType.AVG,
      );
    });

    it('TC-DDC-021: should aggregate with max type', async () => {
      const aggResult = {
        aggregation: AggregationType.MAX,
        value: 100,
        tagId: 'tag-001',
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-01-01T01:00:00.000Z',
      };
      mockDataQueryService.aggregate.mockResolvedValue(aggResult);

      const result = await controller.getAggregate(
        'tag-001',
        '2026-01-01T00:00:00Z',
        '2026-01-01T01:00:00Z',
        'max',
      );

      expect(result.aggregation).toBe(AggregationType.MAX);
      expect(result.value).toBe(100);
    });

    it('TC-DDC-022: should aggregate with min type', async () => {
      mockDataQueryService.aggregate.mockResolvedValue({
        aggregation: AggregationType.MIN,
        value: 0,
        tagId: 'tag-001',
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-01-01T01:00:00.000Z',
      });

      await controller.getAggregate(
        'tag-001',
        '2026-01-01T00:00:00Z',
        '2026-01-01T01:00:00Z',
        'min',
      );

      expect(mockDataQueryService.aggregate).toHaveBeenCalledWith(
        'tag-001',
        expect.any(Date),
        expect.any(Date),
        AggregationType.MIN,
      );
    });

    it('TC-DDC-023: should aggregate with sum type', async () => {
      mockDataQueryService.aggregate.mockResolvedValue({
        aggregation: AggregationType.SUM,
        value: 500,
        tagId: 'tag-001',
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-01-01T01:00:00.000Z',
      });

      await controller.getAggregate(
        'tag-001',
        '2026-01-01T00:00:00Z',
        '2026-01-01T01:00:00Z',
        'sum',
      );

      expect(mockDataQueryService.aggregate).toHaveBeenCalledWith(
        'tag-001',
        expect.any(Date),
        expect.any(Date),
        AggregationType.SUM,
      );
    });

    it('TC-DDC-024: should aggregate with count type', async () => {
      mockDataQueryService.aggregate.mockResolvedValue({
        aggregation: AggregationType.COUNT,
        value: 100,
        tagId: 'tag-001',
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-01-01T01:00:00.000Z',
      });

      await controller.getAggregate(
        'tag-001',
        '2026-01-01T00:00:00Z',
        '2026-01-01T01:00:00Z',
        'count',
      );

      expect(mockDataQueryService.aggregate).toHaveBeenCalledWith(
        'tag-001',
        expect.any(Date),
        expect.any(Date),
        AggregationType.COUNT,
      );
    });

    it('TC-DDC-025: should throw error for invalid aggregation type', () => {
      expect(() =>
        controller.getAggregate(
          'tag-001',
          '2026-01-01T00:00:00Z',
          '2026-01-01T01:00:00Z',
          'invalid',
        ),
      ).toThrow('Invalid aggregation type: invalid');
    });
  });

  // ==================== getAggregateWindow ====================
  describe('GET /data/aggregate/:tagId/window', () => {
    it('TC-DDC-030: should aggregate with time window', async () => {
      const windowResult = [
        { interval: '2026-01-01T00:00:00.000Z', value: 25 },
        { interval: '2026-01-01T00:01:00.000Z', value: 30 },
      ];
      mockDataQueryService.aggregateWindow.mockResolvedValue(windowResult);

      const result = await controller.getAggregateWindow(
        'tag-001',
        '2026-01-01T00:00:00Z',
        '2026-01-01T01:00:00Z',
        'avg',
        '60000',
      );

      expect(result).toEqual(windowResult);
      expect(mockDataQueryService.aggregateWindow).toHaveBeenCalledWith(
        'tag-001',
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-01T01:00:00Z'),
        60000,
        AggregationType.AVG,
      );
    });

    it('TC-DDC-031: should parse windowMs to integer', async () => {
      mockDataQueryService.aggregateWindow.mockResolvedValue([]);

      await controller.getAggregateWindow(
        'tag-001',
        '2026-01-01T00:00:00Z',
        '2026-01-01T01:00:00Z',
        'max',
        '300000',
      );

      expect(mockDataQueryService.aggregateWindow).toHaveBeenCalledWith(
        'tag-001',
        expect.any(Date),
        expect.any(Date),
        300000,
        AggregationType.MAX,
      );
    });

    it('TC-DDC-032: should return empty array when no data in window', async () => {
      mockDataQueryService.aggregateWindow.mockResolvedValue([]);

      const result = await controller.getAggregateWindow(
        'tag-001',
        '2020-01-01T00:00:00Z',
        '2020-01-01T01:00:00Z',
        'avg',
        '60000',
      );

      expect(result).toEqual([]);
    });
  });

  // ==================== batchQueryLatest ====================
  describe('POST /data/batch/latest', () => {
    it('TC-DDC-040: should batch query latest values for multiple tags', async () => {
      const latestMap = new Map<string, number | null>();
      latestMap.set('tag-001', 42);
      latestMap.set('tag-002', 100);
      mockDataQueryService.batchQueryLatest.mockResolvedValue(latestMap);

      const result = await controller.batchQueryLatest({ tagIds: ['tag-001', 'tag-002'] });

      expect(result).toEqual(latestMap);
      expect(mockDataQueryService.batchQueryLatest).toHaveBeenCalledWith(
        ['tag-001', 'tag-002'],
        undefined,
      );
    });

    it('TC-DDC-041: should return null for tags with no data', async () => {
      const latestMap = new Map<string, number | null>();
      latestMap.set('tag-empty', null);
      mockDataQueryService.batchQueryLatest.mockResolvedValue(latestMap);

      const result = await controller.batchQueryLatest({ tagIds: ['tag-empty'] });

      expect(result.get('tag-empty')).toBeNull();
    });

    it('TC-DDC-042: should handle empty tagIds array', async () => {
      mockDataQueryService.batchQueryLatest.mockResolvedValue(new Map());

      const result = await controller.batchQueryLatest({ tagIds: [] });

      expect(result.size).toBe(0);
    });
  });

  // ==================== batchQueryHistorical ====================
  describe('POST /data/batch/historical', () => {
    it('TC-DDC-050: should batch query historical data for multiple tags', async () => {
      const batchResult = [
        { tagId: 'tag-001', data: [{ value: 42, timestamp: '2026-01-01T00:00:00.000Z' }] },
        { tagId: 'tag-002', data: [{ value: 100, timestamp: '2026-01-01T00:00:00.000Z' }] },
      ];
      mockDataQueryService.batchQueryTimeRange.mockResolvedValue(batchResult);

      const result = await controller.batchQueryHistorical({
        tagIds: ['tag-001', 'tag-002'],
        startTime: '2026-01-01T00:00:00Z',
        endTime: '2026-01-01T01:00:00Z',
      });

      expect(result).toEqual(batchResult);
      expect(mockDataQueryService.batchQueryTimeRange).toHaveBeenCalledWith(
        ['tag-001', 'tag-002'],
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-01T01:00:00Z'),
        undefined,
      );
    });

    it('TC-DDC-051: should return empty data arrays for tags with no matching data', async () => {
      mockDataQueryService.batchQueryTimeRange.mockResolvedValue([{ tagId: 'tag-001', data: [] }]);

      const result = await controller.batchQueryHistorical({
        tagIds: ['tag-001'],
        startTime: '2020-01-01T00:00:00Z',
        endTime: '2020-01-01T01:00:00Z',
      });

      expect(result[0].data).toEqual([]);
    });
  });

  // ==================== trendQuery ====================

  describe('POST /data/trend/query', () => {
    it('TC-DDC-070: should query trend data with default maxPoints and projectId', async () => {
      const trendResult = {
        data: [
          {
            tagId: 'tag-001',
            data: [{ value: 42, timestamp: '2026-07-21T15:13:00.000Z' }],
          },
        ],
        total: 1,
      };
      mockDataQueryService.queryTrendData.mockResolvedValue(trendResult);

      const result = await controller.trendQuery({
        tagIds: ['tag-001'],
        startTime: '2026-07-21T15:13:00.000Z',
        endTime: '2026-07-21T16:13:00.000Z',
        projectId: 'proj-test',
      });

      expect(result).toEqual(trendResult);
      expect(mockDataQueryService.queryTrendData).toHaveBeenCalledWith({
        tagIds: ['tag-001'],
        startTime: new Date('2026-07-21T15:13:00.000Z'),
        endTime: new Date('2026-07-21T16:13:00.000Z'),
        maxPoints: 1000, // default
        projectId: 'proj-test',
        interpolation: undefined,
        interval: undefined,
      });
    });

    it('TC-DDC-071: should pass custom maxPoints and projectId from request body', async () => {
      mockDataQueryService.queryTrendData.mockResolvedValue({ data: [], total: 0 });

      await controller.trendQuery({
        tagIds: ['tag-001'],
        startTime: '2026-07-21T15:13:00.000Z',
        endTime: '2026-07-21T16:13:00.000Z',
        maxPoints: 2000,
        projectId: 'proj-456',
      });

      expect(mockDataQueryService.queryTrendData).toHaveBeenCalledWith({
        tagIds: ['tag-001'],
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        maxPoints: 2000,
        projectId: 'proj-456',
        interpolation: undefined,
        interval: undefined,
      });
    });

    it('TC-DDC-072: should handle multiple tagIds', async () => {
      const trendResult = {
        data: [
          { tagId: 'tag-001', data: [{ value: 10, timestamp: '2026-07-21T15:00:00.000Z' }] },
          { tagId: 'tag-002', data: [{ value: 20, timestamp: '2026-07-21T15:00:00.000Z' }] },
        ],
        total: 2,
      };
      mockDataQueryService.queryTrendData.mockResolvedValue(trendResult);

      const result = await controller.trendQuery({
        tagIds: ['tag-001', 'tag-002'],
        startTime: '2026-07-21T15:00:00.000Z',
        endTime: '2026-07-21T16:00:00.000Z',
      });

      expect(result.data.length).toBe(2);
      expect(result.data[0].tagId).toBe('tag-001');
      expect(result.data[1].tagId).toBe('tag-002');
    });

    it('TC-DDC-073: should return empty array when no data in range', async () => {
      mockDataQueryService.queryTrendData.mockResolvedValue({
        data: [],
        pagination: { total: 0 },
      });

      const result = await controller.trendQuery({
        tagIds: ['tag-no-data'],
        startTime: '2020-01-01T00:00:00.000Z',
        endTime: '2020-01-01T01:00:00.000Z',
      });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('TC-DDC-074: should parse date strings to Date objects', async () => {
      mockDataQueryService.queryTrendData.mockResolvedValue({ data: [], total: 0 });

      await controller.trendQuery({
        tagIds: ['tag-001'],
        startTime: '2026-07-21T15:13:00.000Z',
        endTime: '2026-07-21T16:13:00.000Z',
      });

      expect(mockDataQueryService.queryTrendData).toHaveBeenCalledWith({
        tagIds: ['tag-001'],
        startTime: new Date('2026-07-21T15:13:00.000Z'),
        endTime: new Date('2026-07-21T16:13:00.000Z'),
        maxPoints: 1000,
        projectId: undefined,
        interpolation: undefined,
        interval: undefined,
      });
    });

    // ──────────── 窗口聚合参数（三期增强：08 #6）────────────

    it('TC-DDC-075: should pass valid aggregation parameters to queryTrendData', async () => {
      mockDataQueryService.queryTrendData.mockResolvedValue({ data: [], pagination: { total: 0 } });

      await controller.trendQuery({
        tagIds: ['tag-001'],
        startTime: '2026-07-21T15:13:00.000Z',
        endTime: '2026-07-21T16:13:00.000Z',
        aggregation: { type: 'avg', windowMs: 60000 },
      });

      expect(mockDataQueryService.queryTrendData).toHaveBeenCalledWith({
        tagIds: ['tag-001'],
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        maxPoints: 1000,
        projectId: undefined,
        interpolation: undefined,
        interval: undefined,
        aggregation: { type: AggregationType.AVG, windowMs: 60000 },
      });
    });

    it('TC-DDC-076: should floor fractional aggregation windowMs', async () => {
      mockDataQueryService.queryTrendData.mockResolvedValue({ data: [], pagination: { total: 0 } });

      await controller.trendQuery({
        tagIds: ['tag-001'],
        startTime: '2026-07-21T15:13:00.000Z',
        endTime: '2026-07-21T16:13:00.000Z',
        aggregation: { type: 'max', windowMs: 60000.7 },
      });

      expect(mockDataQueryService.queryTrendData).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregation: { type: AggregationType.MAX, windowMs: 60000 },
        }),
      );
    });

    it('TC-DDC-077: should reject invalid aggregation type with BadRequestException', async () => {
      await expect(
        controller.trendQuery({
          tagIds: ['tag-001'],
          startTime: '2026-07-21T15:13:00.000Z',
          endTime: '2026-07-21T16:13:00.000Z',
          aggregation: { type: 'median', windowMs: 60000 },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockDataQueryService.queryTrendData).not.toHaveBeenCalled();
    });

    it('TC-DDC-078: should reject non-positive aggregation windowMs with BadRequestException', async () => {
      await expect(
        controller.trendQuery({
          tagIds: ['tag-001'],
          startTime: '2026-07-21T15:13:00.000Z',
          endTime: '2026-07-21T16:13:00.000Z',
          aggregation: { type: 'avg', windowMs: 0 },
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.trendQuery({
          tagIds: ['tag-001'],
          startTime: '2026-07-21T15:13:00.000Z',
          endTime: '2026-07-21T16:13:00.000Z',
          aggregation: { type: 'avg', windowMs: Number.NaN },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockDataQueryService.queryTrendData).not.toHaveBeenCalled();
    });
  });

  // ==================== getTagStats ====================
  describe('GET /data/stats/:tagId', () => {
    it('TC-DDC-060: should return tag statistics', async () => {
      const stats = {
        tagId: 'tag-001',
        avg: 50.5,
        max: 100,
        min: 0,
        sum: 5050,
        count: 100,
      };
      mockDataQueryService.getTagStats.mockResolvedValue(stats);

      const result = await controller.getTagStats(
        'tag-001',
        '2026-01-01T00:00:00Z',
        '2026-01-01T01:00:00Z',
      );

      expect(result).toEqual(stats);
      expect(mockDataQueryService.getTagStats).toHaveBeenCalledWith(
        'tag-001',
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-01T01:00:00Z'),
        undefined,
      );
    });

    it('TC-DDC-061: should return zero stats when no data in range', async () => {
      mockDataQueryService.getTagStats.mockResolvedValue({
        tagId: 'tag-001',
        avg: 0,
        max: 0,
        min: 0,
        sum: 0,
        count: 0,
      });

      const result = await controller.getTagStats(
        'tag-001',
        '2020-01-01T00:00:00Z',
        '2020-01-01T01:00:00Z',
      );

      expect(result.count).toBe(0);
      expect(result.avg).toBe(0);
    });
  });
});
