// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 3.15 + 3.17 集成测试 — DeviceArchiveService / ArchiveService 接入真实 InfluxDB
 *
 * 验证：
 * - InfluxWriteService 可用时，archiveToInfluxDB 调用真实 writePoint()
 * - DataQueryService 可用时，queryArchive / queryHistory 从 HistoricalData 表查询
 * - 不可用时降级到内存 Map / 空返回
 * - toInfluxPoint 数据映射正确
 */
import { DeviceArchiveService } from '../archive/device-archive.service';
import { ArchiveService } from '../data/archive.service';
import { Repository } from 'typeorm';
import { DataTag } from '../entities/data-tag.entity';
import { ProjectDatabaseService } from '@ss-node/ss-core';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockDataTagRepo(): MockRepository<DataTag> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };
}

function createMockProjectDbService(repo: MockRepository<DataTag>): ProjectDatabaseService {
  return {
    getSystemDb: jest.fn().mockResolvedValue({
      getRepository: jest.fn(() => repo),
    }),
    getLoadedSystemDb: jest.fn(),
    unloadProjectDatabases: jest.fn(),
    getActiveProjects: jest.fn(),
    isConnected: jest.fn(),
    setProjectsDir: jest.fn(),
  } as any;
}

function createMockInfluxWriteService() {
  return {
    writePoint: jest.fn().mockResolvedValue(undefined),
    writePoints: jest.fn().mockResolvedValue(undefined),
    flushAll: jest.fn(),
    getStats: jest.fn().mockReturnValue({ totalWritten: 0, totalErrors: 0 }),
  };
}

function createMockDataQueryService() {
  return {
    queryTimeRange: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  };
}

describe('3.15 + 3.17 — DeviceArchiveService InfluxDB 集成', () => {
  describe('InfluxWriteService 可用时', () => {
    let service: DeviceArchiveService;
    let mockInfluxWrite: any;

    beforeEach(() => {
      const mockRepo = createMockDataTagRepo();
      const mockPdb = createMockProjectDbService(mockRepo);
      mockInfluxWrite = createMockInfluxWriteService();
      const mockDataQuery = createMockDataQueryService();

      service = new DeviceArchiveService(mockRepo as any, mockPdb, mockInfluxWrite, mockDataQuery);
    });

    it('TC-ARC-IFLX-001: archiveToInfluxDB 应调用 influxWriteService.writePoint', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      // 模拟 DataQueryService 返回数据
      const mockDataQuery = (service as any).dataQueryService;
      mockDataQuery.queryTimeRange.mockResolvedValue({
        data: [
          { tagId: 'tag-001', numericValue: 42.5, timestamp: new Date('2024-01-01T00:00:01.000Z') },
          { tagId: 'tag-001', numericValue: 43.0, timestamp: new Date('2024-01-01T00:00:02.000Z') },
        ],
        total: 2,
      });

      const result = await service.archiveToInfluxDB('tag-001', startTime, endTime);

      expect(result.archived).toBe(2);
      expect(mockInfluxWrite.writePoint).toHaveBeenCalledTimes(2);
      expect(mockInfluxWrite.writePoint).toHaveBeenCalledWith(
        expect.objectContaining({
          measurement: 'device_archive',
          tags: expect.objectContaining({ tagId: 'tag-001' }),
          fields: expect.objectContaining({ value: 42.5 }),
        }),
      );
    });

    it('TC-ARC-IFLX-002: toInfluxPoint 映射应包含 measurement/tags/fields/timestamp', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const mockDataQuery = (service as any).dataQueryService;
      mockDataQuery.queryTimeRange.mockResolvedValue({
        data: [
          { tagId: 'tag-002', numericValue: 100, timestamp: new Date('2024-01-01T00:00:01.000Z') },
        ],
        total: 1,
      });

      await service.archiveToInfluxDB('tag-002', startTime, endTime);

      const call = mockInfluxWrite.writePoint.mock.calls[0][0];
      expect(call.measurement).toBe('device_archive');
      expect(call.tags).toHaveProperty('tagId', 'tag-002');
      expect(call.tags).toHaveProperty('projectId');
      expect(call.tags).toHaveProperty('deviceId');
      expect(call.fields).toHaveProperty('value', 100);
      expect(call.fields).toHaveProperty('quality');
      expect(call.timestamp).toBeInstanceOf(Date);
    });

    it('TC-ARC-IFLX-003: queryArchive 应从 DataQueryService 查询', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const mockDataQuery = (service as any).dataQueryService;
      mockDataQuery.queryTimeRange.mockResolvedValue({
        data: [
          { tagId: 'tag-003', numericValue: 55, timestamp: new Date('2024-01-01T00:00:30.000Z') },
        ],
        total: 1,
      });

      const result = await service.queryArchive('tag-003', {
        startTime,
        endTime,
        page: 1,
        pageSize: 50,
      });

      expect(mockDataQuery.queryTimeRange).toHaveBeenCalledWith({
        tagId: 'tag-003',
        startTime,
        endTime,
        page: 1,
        pageSize: 50,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].value).toBe(55);
      expect(result.total).toBe(1);
    });

    it('TC-ARC-IFLX-004: DataQueryService 查询失败时降级到内存', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const mockDataQuery = (service as any).dataQueryService;
      mockDataQuery.queryTimeRange.mockRejectedValue(new Error('DB connection failed'));

      const result = await service.queryArchive('tag-004', {
        startTime,
        endTime,
      });

      // 降级到内存返回空结果
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('InfluxWriteService 不可用时（降级模式）', () => {
    let service: DeviceArchiveService;

    beforeEach(() => {
      const mockRepo = createMockDataTagRepo();
      const mockPdb = createMockProjectDbService(mockRepo);
      // 不传入 influxWriteService 和 dataQueryService
      service = new DeviceArchiveService(mockRepo as any, mockPdb);
    });

    it('TC-ARC-IFLX-010: 无 InfluxWriteService 时应降级到内存 Map', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const result = await service.archiveToInfluxDB('tag-fallback', startTime, endTime);

      // 无 DataQueryService 时 fetchDataPoints 返回空数组
      expect(result.archived).toBe(0);
      expect(result.jobId).toMatch(/^arc_/);
    });

    it('TC-ARC-IFLX-011: 无 DataQueryService 时 queryArchive 降级到内存查询', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const result = await service.queryArchive('tag-fallback-query', {
        startTime,
        endTime,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('TC-ARC-IFLX-012: fetchDataPoints 无 DataQueryService 时返回空数组不生成随机数', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      // 间接验证：archiveToInfluxDB 调用 fetchDataPoints，archived 应为 0
      const result = await service.archiveToInfluxDB('tag-no-random', startTime, endTime);
      expect(result.archived).toBe(0);
    });
  });
});

describe('3.17 — ArchiveService InfluxDB 集成', () => {
  describe('InfluxWriteService 可用时', () => {
    let archiveService: ArchiveService;
    let mockInfluxWrite: any;

    beforeEach(() => {
      mockInfluxWrite = createMockInfluxWriteService();
      const mockDataQuery = createMockDataQueryService();
      archiveService = new ArchiveService(mockInfluxWrite, mockDataQuery);
    });

    it('TC-ARC-SVC-001: archiveDataPoint 应调用 influxWriteService.writePoint', async () => {
      const point = {
        tagId: 'tag-100',
        deviceId: 'device-001',
        value: 88.8,
        quality: 'good',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      };

      await archiveService.archiveDataPoint(point);

      expect(mockInfluxWrite.writePoint).toHaveBeenCalledTimes(1);
      const call = mockInfluxWrite.writePoint.mock.calls[0][0];
      expect(call.measurement).toBe('tag_archive');
      expect(call.tags.tagId).toBe('tag-100');
      expect(call.fields.value).toBe(88.8);
    });

    it('TC-ARC-SVC-002: queryHistory 应调用 dataQueryService.queryTimeRange', async () => {
      const start = new Date('2024-01-01T00:00:00.000Z');
      const end = new Date('2024-01-01T01:00:00.000Z');

      const mockDataQuery = (archiveService as any).dataQueryService;
      mockDataQuery.queryTimeRange.mockResolvedValue({
        data: [
          { tagId: 'tag-200', numericValue: 10, timestamp: new Date('2024-01-01T00:30:00.000Z') },
        ],
        total: 1,
      });

      const result = await archiveService.queryHistory('tag-200', start, end);

      expect(mockDataQuery.queryTimeRange).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].tagId).toBe('tag-200');
      expect(result[0].value).toBe(10);
    });

    it('TC-ARC-SVC-003: writePoint 失败时应捕获错误不抛出', async () => {
      mockInfluxWrite.writePoint.mockRejectedValue(new Error('InfluxDB down'));

      await archiveService.archiveDataPoint({
        tagId: 'tag-err',
        deviceId: 'dev-001',
        value: 1,
        quality: 'good',
        timestamp: new Date(),
      });
      // 不应抛出异常
      expect(true).toBe(true);
    });
  });

  describe('InfluxWriteService 不可用时', () => {
    let archiveService: ArchiveService;

    beforeEach(() => {
      archiveService = new ArchiveService(undefined, undefined);
    });

    it('TC-ARC-SVC-010: archiveDataPoint 无 InfluxWrite 时应仅记录日志', async () => {
      await archiveService.archiveDataPoint({
        tagId: 'tag-noop',
        deviceId: 'dev-001',
        value: 1,
        quality: 'good',
        timestamp: new Date(),
      });
      // 不应抛出异常
      expect(true).toBe(true);
    });

    it('TC-ARC-SVC-011: queryHistory 无 DataQuery 时应返回空数组', async () => {
      const result = await archiveService.queryHistory(
        'tag-noop',
        new Date('2024-01-01'),
        new Date('2024-01-02'),
      );
      expect(result).toEqual([]);
    });
  });
});
