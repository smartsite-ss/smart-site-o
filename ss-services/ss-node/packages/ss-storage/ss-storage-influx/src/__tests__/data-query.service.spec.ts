// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataQueryService, AggregationType, TimeRangeQuery } from '../data-query.service';
import { HistoricalData } from '../entities/historical-data.entity';
import { Repository, Between } from 'typeorm';

/**
 * Mock ProjectDatabaseService — 返回项目级 DataSource
 * 模拟项目数据库隔离模式，使 DataQueryService 查询正确的数据库
 */
function createMockProjectDbService(mockRepo: jest.Mocked<Repository<HistoricalData>>) {
  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepo),
  };
  return {
    getSystemDb: jest.fn().mockResolvedValue(mockDataSource),
    registerSystemEntities: jest.fn(),
  } as any;
}

describe('DataQueryService', () => {
  let service: DataQueryService;
  let mockRepo: jest.Mocked<Repository<HistoricalData>>;
  let mockProjectDbService: any;

  const createRecord = (overrides: Partial<HistoricalData> = {}): HistoricalData => {
    return {
      id: overrides.id || 'uuid-default',
      tagId: overrides.tagId || 'tag-001',
      numericValue: 'numericValue' in overrides ? overrides.numericValue : 42.5,
      stringValue: overrides.stringValue ?? null,
      booleanValue: overrides.booleanValue ?? null,
      metadata: overrides.metadata ?? {},
      timestamp: overrides.timestamp || new Date('2025-01-15T10:30:00Z'),
      tag: undefined as any,
    } as HistoricalData;
  };

  /** Mock ConfigService — 返回 HISTORICAL_DATA_BACKEND=sqlite 以测试 SQLite 后端路径 */
  const mockConfigService = {
    get: jest.fn().mockReturnValue('sqlite'),
  } as any;

  beforeEach(() => {
    mockRepo = {
      findAndCount: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockProjectDbService = createMockProjectDbService(mockRepo);
    service = new DataQueryService(mockRepo, mockProjectDbService, mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────── queryTimeRange ────────────

  describe('queryTimeRange', () => {
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');

    it('TC-DQS-001: should return paginated data with total count', async () => {
      const records = [createRecord(), createRecord({ id: 'uuid-2' })];
      mockRepo.findAndCount.mockResolvedValue([records, 50]);

      const query: TimeRangeQuery = { tagId: 'tag-001', startTime, endTime, page: 1, pageSize: 10 };
      const result = await service.queryTimeRange(query);

      expect(mockRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(mockRepo.findAndCount).toHaveBeenCalledWith({
        where: { tagId: 'tag-001', timestamp: Between(startTime, endTime) },
        order: { timestamp: 'ASC' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toEqual(records);
      expect(result.total).toBe(50);
    });

    it('TC-DQS-002: should use default page and pageSize when not provided', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const query: TimeRangeQuery = { tagId: 'tag-001', startTime, endTime };
      await service.queryTimeRange(query);

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
    });

    it('TC-DQS-003: should calculate correct offset for page 3 with pageSize 25', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const query: TimeRangeQuery = { tagId: 'tag-001', startTime, endTime, page: 3, pageSize: 25 };
      await service.queryTimeRange(query);

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 25 }),
      );
    });

    it('TC-DQS-004: should return empty data array when no records match', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const query: TimeRangeQuery = { tagId: 'no-match', startTime, endTime };
      const result = await service.queryTimeRange(query);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('TC-DQS-005: should propagate repository errors', async () => {
      mockRepo.findAndCount.mockRejectedValue(new Error('DB error'));

      const query: TimeRangeQuery = { tagId: 'tag-001', startTime, endTime };
      await expect(service.queryTimeRange(query)).rejects.toThrow('DB error');
    });
  });

  // ──────────── aggregate ────────────

  describe('aggregate', () => {
    const tagId = 'tag-001';
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');

    let mockQb: any;

    beforeEach(() => {
      mockQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        getCount: jest.fn(),
      };
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQb);
    });

    it('TC-DQS-006: should compute AVG aggregation correctly', async () => {
      mockQb.getRawOne.mockResolvedValue({ avg: 37.25 });

      const result = await service.aggregate(tagId, startTime, endTime, AggregationType.AVG);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('h');
      expect(mockQb.where).toHaveBeenCalledWith('h.tagId = :tagId', { tagId });
      expect(mockQb.andWhere).toHaveBeenCalledWith('h.timestamp BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      });
      expect(result).toEqual({
        aggregation: AggregationType.AVG,
        value: 37.25,
        tagId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
    });

    it('TC-DQS-007: should compute MAX aggregation correctly', async () => {
      mockQb.getRawOne.mockResolvedValue({ max: 100 });

      const result = await service.aggregate(tagId, startTime, endTime, AggregationType.MAX);

      expect(mockQb.select).toHaveBeenCalledWith('MAX(h.numericValue)', 'max');
      expect(result.value).toBe(100);
      expect(result.aggregation).toBe(AggregationType.MAX);
    });

    it('TC-DQS-008: should compute MIN aggregation correctly', async () => {
      mockQb.getRawOne.mockResolvedValue({ min: -5.2 });

      const result = await service.aggregate(tagId, startTime, endTime, AggregationType.MIN);

      expect(mockQb.select).toHaveBeenCalledWith('MIN(h.numericValue)', 'min');
      expect(result.value).toBe(-5.2);
      expect(result.aggregation).toBe(AggregationType.MIN);
    });

    it('TC-DQS-009: should compute SUM aggregation correctly', async () => {
      mockQb.getRawOne.mockResolvedValue({ sum: 456.78 });

      const result = await service.aggregate(tagId, startTime, endTime, AggregationType.SUM);

      expect(mockQb.select).toHaveBeenCalledWith('SUM(h.numericValue)', 'sum');
      expect(result.value).toBe(456.78);
    });

    it('TC-DQS-010: should compute COUNT aggregation via getCount', async () => {
      mockQb.getCount.mockResolvedValue(120);

      const result = await service.aggregate(tagId, startTime, endTime, AggregationType.COUNT);

      expect(mockQb.getCount).toHaveBeenCalledTimes(1);
      expect(result.value).toBe(120);
      expect(result.aggregation).toBe(AggregationType.COUNT);
    });

    it('TC-DQS-011: should default value to 0 when raw result returns null', async () => {
      mockQb.getRawOne.mockResolvedValue({ avg: null });

      const result = await service.aggregate(tagId, startTime, endTime, AggregationType.AVG);

      expect(result.value).toBe(0);
    });

    it('TC-DQS-012: should default value to 0 when raw result returns undefined', async () => {
      mockQb.getRawOne.mockResolvedValue({ max: undefined });

      const result = await service.aggregate(tagId, startTime, endTime, AggregationType.MAX);

      expect(result.value).toBe(0);
    });

    it('TC-DQS-013: should throw for unknown aggregation type', async () => {
      await expect(
        service.aggregate(tagId, startTime, endTime, 'INVALID' as AggregationType),
      ).rejects.toThrow('Unknown aggregation type: INVALID');
    });

    it('TC-DQS-014: should propagate query builder errors', async () => {
      mockQb.getRawOne.mockRejectedValue(new Error('SQL syntax error'));

      await expect(
        service.aggregate(tagId, startTime, endTime, AggregationType.AVG),
      ).rejects.toThrow('SQL syntax error');
    });
  });

  // ──────────── aggregateWindow ────────────

  describe('aggregateWindow', () => {
    const tagId = 'tag-001';
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-01T01:00:00Z');
    const windowMs = 600000; // 10 minutes

    it('TC-DQS-015: should perform AVG window aggregation in application layer', async () => {
      const records = [
        createRecord({ timestamp: new Date('2025-01-01T00:01:00Z'), numericValue: 10 }),
        createRecord({ timestamp: new Date('2025-01-01T00:05:00Z'), numericValue: 20 }),
        createRecord({ timestamp: new Date('2025-01-01T00:11:00Z'), numericValue: 30 }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.aggregateWindow(
        tagId,
        startTime,
        endTime,
        windowMs,
        AggregationType.AVG,
      );

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { tagId, timestamp: Between(startTime, endTime) },
        order: { timestamp: 'ASC' },
      });
      // First bucket: avg of 10 and 20 = 15; second bucket: avg of 30 = 30
      expect(result.length).toBe(2);
      expect(result[0].value).toBe(15);
      expect(result[1].value).toBe(30);
    });

    it('TC-DQS-016: should perform MAX window aggregation', async () => {
      const records = [
        createRecord({ timestamp: new Date('2025-01-01T00:01:00Z'), numericValue: 10 }),
        createRecord({ timestamp: new Date('2025-01-01T00:03:00Z'), numericValue: 50 }),
        createRecord({ timestamp: new Date('2025-01-01T00:05:00Z'), numericValue: 30 }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.aggregateWindow(
        tagId,
        startTime,
        endTime,
        windowMs,
        AggregationType.MAX,
      );

      expect(result.length).toBe(1);
      expect(result[0].value).toBe(50);
    });

    it('TC-DQS-017: should perform MIN window aggregation', async () => {
      const records = [
        createRecord({ timestamp: new Date('2025-01-01T00:01:00Z'), numericValue: 10 }),
        createRecord({ timestamp: new Date('2025-01-01T00:03:00Z'), numericValue: 5 }),
        createRecord({ timestamp: new Date('2025-01-01T00:05:00Z'), numericValue: 8 }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.aggregateWindow(
        tagId,
        startTime,
        endTime,
        windowMs,
        AggregationType.MIN,
      );

      expect(result[0].value).toBe(5);
    });

    it('TC-DQS-018: should perform SUM window aggregation', async () => {
      const records = [
        createRecord({ timestamp: new Date('2025-01-01T00:01:00Z'), numericValue: 10 }),
        createRecord({ timestamp: new Date('2025-01-01T00:05:00Z'), numericValue: 20 }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.aggregateWindow(
        tagId,
        startTime,
        endTime,
        windowMs,
        AggregationType.SUM,
      );

      expect(result[0].value).toBe(30);
    });

    it('TC-DQS-019: should perform COUNT window aggregation', async () => {
      const records = [
        createRecord({ timestamp: new Date('2025-01-01T00:01:00Z'), numericValue: 10 }),
        createRecord({ timestamp: new Date('2025-01-01T00:05:00Z'), numericValue: 20 }),
        createRecord({ timestamp: new Date('2025-01-01T00:15:00Z'), numericValue: 30 }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.aggregateWindow(
        tagId,
        startTime,
        endTime,
        windowMs,
        AggregationType.COUNT,
      );

      expect(result.length).toBe(2);
      expect(result[0].value).toBe(2); // 2 records in first bucket
      expect(result[1].value).toBe(1); // 1 record in second bucket
    });

    it('TC-DQS-020: should skip buckets with zero values (all null)', async () => {
      const records = [
        createRecord({ timestamp: new Date('2025-01-01T00:01:00Z'), numericValue: null as any }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.aggregateWindow(
        tagId,
        startTime,
        endTime,
        windowMs,
        AggregationType.AVG,
      );

      expect(result.length).toBe(0);
    });

    it('TC-DQS-021: should return empty array when no records exist', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.aggregateWindow(
        tagId,
        startTime,
        endTime,
        windowMs,
        AggregationType.AVG,
      );

      expect(result).toEqual([]);
    });

    it('TC-DQS-022: should sort results by interval in ascending order', async () => {
      const records = [
        createRecord({ timestamp: new Date('2025-01-01T00:45:00Z'), numericValue: 100 }),
        createRecord({ timestamp: new Date('2025-01-01T00:01:00Z'), numericValue: 10 }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.aggregateWindow(
        tagId,
        startTime,
        endTime,
        windowMs,
        AggregationType.AVG,
      );

      expect(result[0].value).toBe(10);
      expect(result[1].value).toBe(100);
      expect(result[0].interval < result[1].interval).toBe(true);
    });

    it('TC-DQS-023: should propagate find errors', async () => {
      mockRepo.find.mockRejectedValue(new Error('Read error'));

      await expect(
        service.aggregateWindow(tagId, startTime, endTime, windowMs, AggregationType.AVG),
      ).rejects.toThrow('Read error');
    });
  });

  // ──────────── batchQueryLatest ────────────

  describe('batchQueryLatest', () => {
    it('TC-DQS-024: should return latest values for multiple tagIds', async () => {
      mockRepo.findOne
        .mockResolvedValueOnce(createRecord({ tagId: 'tag-a', numericValue: 100 }))
        .mockResolvedValueOnce(createRecord({ tagId: 'tag-b', numericValue: 200 }))
        .mockResolvedValueOnce(createRecord({ tagId: 'tag-c', numericValue: 300 }));

      const result = await service.batchQueryLatest(['tag-a', 'tag-b', 'tag-c']);

      expect(mockRepo.findOne).toHaveBeenCalledTimes(3);
      expect(result.get('tag-a')).toBe(100);
      expect(result.get('tag-b')).toBe(200);
      expect(result.get('tag-c')).toBe(300);
    });

    it('TC-DQS-025: should return null for tagIds with no data', async () => {
      mockRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createRecord({ tagId: 'tag-b', numericValue: 42 }));

      const result = await service.batchQueryLatest(['tag-a', 'tag-b']);

      expect(result.get('tag-a')).toBeNull();
      expect(result.get('tag-b')).toBe(42);
    });

    it('TC-DQS-026: should return empty Map for empty tagIds array', async () => {
      const result = await service.batchQueryLatest([]);

      expect(result.size).toBe(0);
      expect(mockRepo.findOne).not.toHaveBeenCalled();
    });

    it('TC-DQS-027: should propagate errors during batch processing', async () => {
      mockRepo.findOne
        .mockResolvedValueOnce(createRecord({ numericValue: 100 }))
        .mockRejectedValueOnce(new Error('Query failed'));

      await expect(service.batchQueryLatest(['tag-a', 'tag-b'])).rejects.toThrow('Query failed');
    });
  });

  // ──────────── batchQueryTimeRange ────────────

  describe('batchQueryTimeRange', () => {
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');

    it('TC-DQS-028: should return TagDataPage array for multiple tagIds', async () => {
      const recordsA = [
        createRecord({
          tagId: 'tag-a',
          numericValue: 10,
          timestamp: new Date('2025-01-15T10:00:00Z'),
        }),
      ];
      const recordsB = [
        createRecord({
          tagId: 'tag-b',
          numericValue: 20,
          timestamp: new Date('2025-01-16T10:00:00Z'),
        }),
      ];

      mockRepo.findAndCount
        .mockResolvedValueOnce([recordsA, 1])
        .mockResolvedValueOnce([recordsB, 1]);

      const result = await service.batchQueryTimeRange(['tag-a', 'tag-b'], startTime, endTime);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        tagId: 'tag-a',
        data: [{ value: 10, timestamp: '2025-01-15T10:00:00.000Z' }],
      });
      expect(result[1]).toEqual({
        tagId: 'tag-b',
        data: [{ value: 20, timestamp: '2025-01-16T10:00:00.000Z' }],
      });
    });

    it('TC-DQS-029: should return empty data arrays when no records match', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.batchQueryTimeRange(['tag-x'], startTime, endTime);

      expect(result.length).toBe(1);
      expect(result[0].tagId).toBe('tag-x');
      expect(result[0].data).toEqual([]);
    });

    it('TC-DQS-030: should return empty array for empty tagIds input', async () => {
      const result = await service.batchQueryTimeRange([], startTime, endTime);

      expect(result).toEqual([]);
      expect(mockRepo.findAndCount).not.toHaveBeenCalled();
    });

    it('TC-DQS-031: should propagate errors from findAndCount', async () => {
      mockRepo.findAndCount.mockRejectedValue(new Error('Batch query error'));

      await expect(service.batchQueryTimeRange(['tag-a'], startTime, endTime)).rejects.toThrow(
        'Batch query error',
      );
    });
  });

  // ──────────── queryTrendData ────────────

  describe('queryTrendData', () => {
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');

    it('TC-DQS-036: should query trend data for a single tag', async () => {
      const records = [
        createRecord({
          tagId: 'tag-a',
          numericValue: 10,
          timestamp: new Date('2025-01-15T10:00:00Z'),
        }),
        createRecord({
          tagId: 'tag-a',
          numericValue: 20,
          timestamp: new Date('2025-01-15T10:05:00Z'),
        }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.queryTrendData({ tagIds: ['tag-a'], startTime, endTime });

      expect(mockRepo.find).toHaveBeenCalledTimes(1);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { tagId: 'tag-a', timestamp: Between(startTime, endTime) },
        order: { timestamp: 'ASC' },
      });
      expect(result.data.length).toBe(1);
      expect(result.data[0].tagId).toBe('tag-a');
      expect(result.data[0].data).toEqual([
        { value: 10, timestamp: '2025-01-15T10:00:00.000Z' },
        { value: 20, timestamp: '2025-01-15T10:05:00.000Z' },
      ]);
      expect(result.pagination.total).toBe(2);
    });

    it('TC-DQS-037: should query trend data for multiple tags', async () => {
      const recordsA = [
        createRecord({
          tagId: 'tag-a',
          numericValue: 10,
          timestamp: new Date('2025-01-15T10:00:00Z'),
        }),
      ];
      const recordsB = [
        createRecord({
          tagId: 'tag-b',
          numericValue: 30,
          timestamp: new Date('2025-01-16T10:00:00Z'),
        }),
      ];
      mockRepo.find.mockResolvedValueOnce(recordsA).mockResolvedValueOnce(recordsB);

      const result = await service.queryTrendData({
        tagIds: ['tag-a', 'tag-b'],
        startTime,
        endTime,
      });

      expect(mockRepo.find).toHaveBeenCalledTimes(2);
      expect(result.data.length).toBe(2);
      expect(result.data[0].tagId).toBe('tag-a');
      expect(result.data[0].data[0].value).toBe(10);
      expect(result.data[1].tagId).toBe('tag-b');
      expect(result.data[1].data[0].value).toBe(30);
    });

    it('TC-DQS-038: should return empty data array when no records match', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.queryTrendData({ tagIds: ['tag-no-match'], startTime, endTime });

      expect(result.data.length).toBe(1);
      expect(result.data[0].tagId).toBe('tag-no-match');
      expect(result.data[0].data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('TC-DQS-038A: should return empty array for empty tagIds', async () => {
      const result = await service.queryTrendData({ tagIds: [], startTime, endTime });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(mockRepo.find).not.toHaveBeenCalled();
    });

    it('TC-DQS-039: should use default maxPoints of 1000', async () => {
      const records = Array.from({ length: 50 }, (_, i) =>
        createRecord({
          tagId: 'tag-a',
          numericValue: i,
          timestamp: new Date(Date.UTC(2025, 0, 15, 10, 0, 0, i * 100)),
        }),
      );
      mockRepo.find.mockResolvedValue(records);

      const result = await service.queryTrendData({ tagIds: ['tag-a'], startTime, endTime });

      // 50 points < 1000 maxPoints → no downsampling
      expect(result.data[0].data.length).toBe(50);
    });

    it('TC-DQS-040: should apply LTTB downsampling when data exceeds maxPoints', async () => {
      // Create 100 data points, maxPoints = 50 → should downsample
      const records = Array.from({ length: 100 }, (_, i) =>
        createRecord({
          tagId: 'tag-a',
          numericValue: i,
          timestamp: new Date(Date.UTC(2025, 0, 15, 10, 0, i)),
        }),
      );
      mockRepo.find.mockResolvedValue(records);

      const result = await service.queryTrendData({
        tagIds: ['tag-a'],
        startTime,
        endTime,
        maxPoints: 50,
      });

      // Downsampled to 50 points
      expect(result.data[0].data.length).toBe(50);
      // First and last points should be preserved
      expect(result.data[0].data[0].value).toBe(0);
      expect(result.data[0].data[49].value).toBe(99);
    });

    it('TC-DQS-041: should not downsample when data equals maxPoints', async () => {
      const records = Array.from({ length: 50 }, (_, i) =>
        createRecord({
          tagId: 'tag-a',
          numericValue: i,
          timestamp: new Date(Date.UTC(2025, 0, 15, 10, 0, i)),
        }),
      );
      mockRepo.find.mockResolvedValue(records);

      const result = await service.queryTrendData({
        tagIds: ['tag-a'],
        startTime,
        endTime,
        maxPoints: 50,
      });

      expect(result.data[0].data.length).toBe(50);
    });

    it('TC-DQS-042: should not downsample when threshold < 3', async () => {
      const records = Array.from({ length: 10 }, (_, i) =>
        createRecord({
          tagId: 'tag-a',
          numericValue: i,
          timestamp: new Date(Date.UTC(2025, 0, 15, 10, 0, i)),
        }),
      );
      mockRepo.find.mockResolvedValue(records);

      // maxPoints=2 (< 3) → LTTB requires threshold >= 3
      const result = await service.queryTrendData({
        tagIds: ['tag-a'],
        startTime,
        endTime,
        maxPoints: 2,
      });

      expect(result.data[0].data.length).toBe(10); // No downsampling
    });

    it('TC-DQS-043: should propagate repository errors', async () => {
      mockRepo.find.mockRejectedValue(new Error('DB read error'));

      await expect(
        service.queryTrendData({ tagIds: ['tag-a'], startTime, endTime }),
      ).rejects.toThrow('DB read error');
    });

    it('TC-DQS-044: should handle records with null numericValue', async () => {
      const records = [
        createRecord({
          tagId: 'tag-a',
          numericValue: null as any,
          timestamp: new Date('2025-01-15T10:00:00Z'),
        }),
        createRecord({
          tagId: 'tag-a',
          numericValue: 42,
          timestamp: new Date('2025-01-15T10:05:00Z'),
        }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.queryTrendData({ tagIds: ['tag-a'], startTime, endTime });

      expect(result.data[0].data[0].value).toBeNull();
      expect(result.data[0].data[1].value).toBe(42);
    });
  });

  // ──────────── queryTrendData with aggregation (三期增强：08 #6) ────────────

  describe('queryTrendData with aggregation', () => {
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-01T01:00:00Z');
    const windowMs = 600000; // 10 minutes

    it('TC-DQS-070: should aggregate by window and map interval to timestamp', async () => {
      const records = [
        createRecord({ timestamp: new Date('2025-01-01T00:01:00Z'), numericValue: 10 }),
        createRecord({ timestamp: new Date('2025-01-01T00:05:00Z'), numericValue: 20 }),
        createRecord({ timestamp: new Date('2025-01-01T00:11:00Z'), numericValue: 30 }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.queryTrendData({
        tagIds: ['tag-001'],
        startTime,
        endTime,
        aggregation: { type: AggregationType.AVG, windowMs },
      });

      // First bucket: avg of 10 and 20 = 15; second bucket: avg of 30 = 30
      expect(result.data.length).toBe(1);
      expect(result.data[0].tagId).toBe('tag-001');
      expect(result.data[0].data.length).toBe(2);
      expect(result.data[0].data[0].value).toBe(15);
      expect(result.data[0].data[1].value).toBe(30);
      // 窗口起始时间作为数据点时间戳（ISO 字符串）
      expect(result.data[0].data[0].timestamp).toBe('2025-01-01T00:00:00.000Z');
      expect(result.data[0].data[1].timestamp).toBe('2025-01-01T00:10:00.000Z');
      expect(result.pagination.total).toBe(2);
    });

    it('TC-DQS-071: should skip LTTB downsampling in aggregation mode', async () => {
      // 6 buckets of records; maxPoints=2 would trigger LTTB in raw mode,
      // but aggregation mode must return all buckets untouched
      const records = Array.from({ length: 6 }, (_, i) =>
        createRecord({
          timestamp: new Date(Date.UTC(2025, 0, 1, 0, i * 10 + 1)),
          numericValue: i + 1,
        }),
      );
      mockRepo.find.mockResolvedValue(records);

      const result = await service.queryTrendData({
        tagIds: ['tag-001'],
        startTime,
        endTime,
        maxPoints: 2,
        aggregation: { type: AggregationType.MAX, windowMs },
      });

      expect(result.data[0].data.length).toBe(6);
      expect(result.pagination.total).toBe(6);
    });

    it('TC-DQS-072: should return empty data for tags with no records', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.queryTrendData({
        tagIds: ['tag-no-data'],
        startTime,
        endTime,
        aggregation: { type: AggregationType.AVG, windowMs },
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].tagId).toBe('tag-no-data');
      expect(result.data[0].data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('TC-DQS-073: should aggregate each tag independently', async () => {
      const recordsA = [
        createRecord({
          tagId: 'tag-a',
          timestamp: new Date('2025-01-01T00:01:00Z'),
          numericValue: 10,
        }),
      ];
      const recordsB = [
        createRecord({
          tagId: 'tag-b',
          timestamp: new Date('2025-01-01T00:02:00Z'),
          numericValue: 40,
        }),
        createRecord({
          tagId: 'tag-b',
          timestamp: new Date('2025-01-01T00:03:00Z'),
          numericValue: 60,
        }),
      ];
      mockRepo.find.mockResolvedValueOnce(recordsA).mockResolvedValueOnce(recordsB);

      const result = await service.queryTrendData({
        tagIds: ['tag-a', 'tag-b'],
        startTime,
        endTime,
        aggregation: { type: AggregationType.SUM, windowMs },
      });

      expect(mockRepo.find).toHaveBeenCalledTimes(2);
      expect(result.data.length).toBe(2);
      expect(result.data[0].data[0].value).toBe(10);
      expect(result.data[1].data[0].value).toBe(100);
      expect(result.pagination.total).toBe(2);
    });

    it('TC-DQS-074: should propagate aggregation errors', async () => {
      mockRepo.find.mockRejectedValue(new Error('Aggregate read error'));

      await expect(
        service.queryTrendData({
          tagIds: ['tag-001'],
          startTime,
          endTime,
          aggregation: { type: AggregationType.AVG, windowMs },
        }),
      ).rejects.toThrow('Aggregate read error');
    });
  });

  // ──────────── LTTB downsampling (via queryTrendData) ────────────

  describe('LTTB downsampling (via queryTrendData)', () => {
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');

    it('TC-DQS-045: should downsample 200 points to 100 while preserving first and last', async () => {
      const records = Array.from({ length: 200 }, (_, i) =>
        createRecord({
          tagId: 'tag-a',
          numericValue: Math.sin(i * 0.1) * 100, // variable values
          timestamp: new Date(Date.UTC(2025, 0, 15, 10, 0, i)),
        }),
      );
      mockRepo.find.mockResolvedValue(records);

      const result = await service.queryTrendData({
        tagIds: ['tag-a'],
        startTime,
        endTime,
        maxPoints: 100,
      });

      expect(result.data[0].data.length).toBe(100);
      // First and last preserved
      expect(result.data[0].data[0].value).toBe(records[0].numericValue);
      expect(result.data[0].data[99].value).toBe(records[199].numericValue);
    });

    it('TC-DQS-046: should downsample 500 points to 50 for each of 2 tags', async () => {
      const recordsA = Array.from({ length: 500 }, (_, i) =>
        createRecord({
          tagId: 'tag-a',
          numericValue: i,
          timestamp: new Date(Date.UTC(2025, 0, 15, 10, 0, i)),
        }),
      );
      const recordsB = Array.from({ length: 500 }, (_, i) =>
        createRecord({
          tagId: 'tag-b',
          numericValue: i * 2,
          timestamp: new Date(Date.UTC(2025, 0, 15, 10, 0, i)),
        }),
      );
      mockRepo.find.mockResolvedValueOnce(recordsA).mockResolvedValueOnce(recordsB);

      const result = await service.queryTrendData({
        tagIds: ['tag-a', 'tag-b'],
        startTime,
        endTime,
        maxPoints: 50,
      });

      expect(result.data.length).toBe(2);
      expect(result.data[0].data.length).toBe(50);
      expect(result.data[1].data.length).toBe(50);
      // Each tag's first and last preserved
      expect(result.data[0].data[0].value).toBe(0);
      expect(result.data[0].data[49].value).toBe(499);
      expect(result.data[1].data[0].value).toBe(0);
      expect(result.data[1].data[49].value).toBe(998);
    });
  });

  // ──────────── exportCsv ────────────

  describe('exportCsv', () => {
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');

    it('TC-DQS-050: should export CSV with header and data rows', async () => {
      const records = [
        createRecord({
          tagId: 'tag-a',
          numericValue: 42.5,
          stringValue: null,
          timestamp: new Date('2025-01-15T10:00:00Z'),
        }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.exportCsv('tag-a', startTime, endTime);

      expect(result.csv).toContain('timestamp,value,quality');
      expect(result.csv).toContain('42.5');
      expect(result.csv).toContain('good');
      expect(result.filename).toBe('tag-a_2025-01-01_2025-01-31.csv');
    });

    it('TC-DQS-051: should handle null values in CSV', async () => {
      const records = [
        createRecord({
          tagId: 'tag-a',
          numericValue: null as any,
          stringValue: null,
          timestamp: new Date('2025-01-15T10:00:00Z'),
        }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.exportCsv('tag-a', startTime, endTime);

      // null numericValue → empty string; null stringValue → 'good'
      expect(result.csv).toContain(',,good');
    });

    it('TC-DQS-052: should export empty CSV when no records', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.exportCsv('tag-a', startTime, endTime);

      expect(result.csv).toBe('timestamp,value,quality\n');
    });
  });

  // ──────────── exportJson ────────────

  describe('exportJson', () => {
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');

    it('TC-DQS-055: should export JSON with correct structure', async () => {
      const records = [
        createRecord({
          tagId: 'tag-a',
          numericValue: 42.5,
          stringValue: null,
          timestamp: new Date('2025-01-15T10:00:00Z'),
        }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.exportJson('tag-a', startTime, endTime);

      const parsed = JSON.parse(result.json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].value).toBe(42.5);
      expect(parsed[0].quality).toBe('good');
      expect(parsed[0].timestamp).toBe('2025-01-15T10:00:00.000Z');
    });

    it('TC-DQS-056: should export empty JSON array when no records', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.exportJson('tag-a', startTime, endTime);

      const parsed = JSON.parse(result.json);
      expect(parsed).toEqual([]);
    });

    it('TC-DQS-057: should use default quality "good" for null stringValue', async () => {
      const records = [
        createRecord({
          tagId: 'tag-a',
          numericValue: 100,
          stringValue: null,
          timestamp: new Date('2025-01-15T10:00:00Z'),
        }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.exportJson('tag-a', startTime, endTime);

      const parsed = JSON.parse(result.json);
      expect(parsed[0].quality).toBe('good');
    });
  });

  // ──────────── exportBatchJson ────────────

  describe('exportBatchJson', () => {
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');

    it('TC-DQS-060: should export batch JSON grouped by tagId', async () => {
      const recordsA = [
        createRecord({
          tagId: 'tag-a',
          numericValue: 10,
          timestamp: new Date('2025-01-15T10:00:00Z'),
        }),
      ];
      const recordsB = [
        createRecord({
          tagId: 'tag-b',
          numericValue: 20,
          timestamp: new Date('2025-01-16T10:00:00Z'),
        }),
      ];
      mockRepo.find.mockResolvedValueOnce(recordsA).mockResolvedValueOnce(recordsB);

      const result = await service.exportBatchJson(['tag-a', 'tag-b'], startTime, endTime);

      const parsed = JSON.parse(result.json);
      expect(parsed['tag-a'].length).toBe(1);
      expect(parsed['tag-a'][0].value).toBe(10);
      expect(parsed['tag-b'].length).toBe(1);
      expect(parsed['tag-b'][0].value).toBe(20);
      expect(result.filename).toBe('batch_export_2025-01-01_2025-01-31.json');
    });

    it('TC-DQS-061: should handle tags with no data in batch export', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.exportBatchJson(['tag-a'], startTime, endTime);

      const parsed = JSON.parse(result.json);
      expect(parsed['tag-a']).toEqual([]);
    });

    it('TC-DQS-062: should return empty object for empty tagIds', async () => {
      const result = await service.exportBatchJson([], startTime, endTime);

      const parsed = JSON.parse(result.json);
      expect(parsed).toEqual({});
      expect(mockRepo.find).not.toHaveBeenCalled();
    });
  });

  // ──────────── 项目级数据库查询 (projectId) ────────────

  describe('project-scoped queries', () => {
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');
    const projectId = 'proj-abc-123';

    it('TC-DQS-065: should use project DB repo when projectId is provided', async () => {
      mockRepo.find.mockResolvedValue([createRecord()]);

      await service.queryTrendData({
        tagIds: ['tag-a'],
        startTime,
        endTime,
        maxPoints: 1000,
        projectId,
      });

      // 验证调用了 ProjectDatabaseService.getSystemDb
      expect(mockProjectDbService.getSystemDb).toHaveBeenCalledWith(projectId);
      // 验证查询仍然使用 mockRepo（来自 mock DataSource）
      expect(mockRepo.find).toHaveBeenCalled();
    });

    it('TC-DQS-066: should use global repo when projectId is undefined', async () => {
      mockRepo.find.mockResolvedValue([createRecord()]);

      await service.queryTrendData({ tagIds: ['tag-a'], startTime, endTime });

      // 不应该调用 ProjectDatabaseService
      expect(mockProjectDbService.getSystemDb).not.toHaveBeenCalled();
      expect(mockRepo.find).toHaveBeenCalled();
    });

    it('TC-DQS-067: should query project DB with queryTimeRange', async () => {
      mockRepo.findAndCount.mockResolvedValue([[createRecord()], 1]);

      const query: TimeRangeQuery = {
        tagId: 'tag-a',
        startTime,
        endTime,
        projectId,
      };
      await service.queryTimeRange(query);

      expect(mockProjectDbService.getSystemDb).toHaveBeenCalledWith(projectId);
    });

    it('TC-DQS-068: should query project DB with getTagStats', async () => {
      mockRepo.count.mockResolvedValue(10);
      // aggregate uses createQueryBuilder
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: 42 }),
        getCount: jest.fn().mockResolvedValue(10),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      await service.getTagStats('tag-a', startTime, endTime, projectId);

      expect(mockProjectDbService.getSystemDb).toHaveBeenCalledWith(projectId);
    });
  });

  // ──────────── getTagStats ────────────

  describe('getTagStats', () => {
    const tagId = 'tag-001';
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');

    let mockQb: any;

    beforeEach(() => {
      mockQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        getCount: jest.fn(),
      };
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQb);
    });

    it('TC-DQS-032: should compute all statistics in parallel and return combined result', async () => {
      mockQb.getRawOne.mockResolvedValueOnce({ avg: 25.5 });
      mockQb.getRawOne.mockResolvedValueOnce({ max: 100.0 });
      mockQb.getRawOne.mockResolvedValueOnce({ min: 1.0 });
      mockQb.getRawOne.mockResolvedValueOnce({ sum: 255.0 });
      (mockRepo.count as jest.Mock).mockResolvedValue(10);

      const result = await service.getTagStats(tagId, startTime, endTime);

      expect(result).toEqual({
        tagId,
        avg: 25.5,
        max: 100.0,
        min: 1.0,
        sum: 255.0,
        count: 10,
      });
      // Verify all calls were made (aggregate x4 + count x1)
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledTimes(4);
      expect(mockRepo.count).toHaveBeenCalledTimes(1);
    });

    it('TC-DQS-033: should handle zero count case', async () => {
      mockQb.getRawOne.mockResolvedValue({ avg: null });
      mockQb.getRawOne.mockResolvedValue({ max: null });
      mockQb.getRawOne.mockResolvedValue({ min: null });
      mockQb.getRawOne.mockResolvedValue({ sum: null });
      (mockRepo.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getTagStats(tagId, startTime, endTime);

      expect(result.count).toBe(0);
      expect(result.avg).toBe(0);
      expect(result.max).toBe(0);
      expect(result.min).toBe(0);
      expect(result.sum).toBe(0);
    });

    it('TC-DQS-034: should propagate errors from any aggregate call', async () => {
      mockQb.getRawOne.mockRejectedValue(new Error('Aggregate failed'));

      await expect(service.getTagStats(tagId, startTime, endTime)).rejects.toThrow(
        'Aggregate failed',
      );
    });

    it('TC-DQS-035: should propagate errors from count call', async () => {
      mockQb.getRawOne.mockResolvedValue({ avg: 10 });
      mockQb.getRawOne.mockResolvedValue({ max: 10 });
      mockQb.getRawOne.mockResolvedValue({ min: 10 });
      mockQb.getRawOne.mockResolvedValue({ sum: 10 });
      (mockRepo.count as jest.Mock).mockRejectedValue(new Error('Count query failed'));

      await expect(service.getTagStats(tagId, startTime, endTime)).rejects.toThrow(
        'Count query failed',
      );
    });
  });
});
