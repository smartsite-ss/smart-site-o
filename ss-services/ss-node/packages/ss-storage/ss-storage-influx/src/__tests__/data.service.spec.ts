// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataService } from '../data.service';
import { HistoricalData } from '../entities/historical-data.entity';
import { Repository, Between } from 'typeorm';

describe('DataService', () => {
  let service: DataService;
  let mockRepo: jest.Mocked<Pick<Repository<HistoricalData>, 'find' | 'findOne'>>;

  const createHistoricalData = (overrides: Partial<HistoricalData> = {}): HistoricalData => {
    return {
      id: 'uuid-1',
      tagId: 'tag-001',
      numericValue: 42.5,
      stringValue: null,
      booleanValue: null,
      metadata: {},
      timestamp: new Date('2025-01-15T10:30:00Z'),
      tag: undefined as any,
      ...overrides,
    } as HistoricalData;
  };

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    service = new DataService(mockRepo as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────── getHistoricalData ────────────

  describe('getHistoricalData', () => {
    const tagId = 'tag-001';
    const startTime = new Date('2025-01-01T00:00:00Z');
    const endTime = new Date('2025-01-31T23:59:59Z');

    it('TC-DAS-001: should return historical data within time range ordered by ASC', async () => {
      const records = [
        createHistoricalData({ timestamp: new Date('2025-01-10T10:00:00Z') }),
        createHistoricalData({ timestamp: new Date('2025-01-15T10:30:00Z') }),
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.getHistoricalData(tagId, startTime, endTime);

      expect(mockRepo.find).toHaveBeenCalledTimes(1);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { tagId, timestamp: Between(startTime, endTime) },
        order: { timestamp: 'ASC' },
      });
      expect(result).toEqual(records);
      expect(result.length).toBe(2);
    });

    it('TC-DAS-002: should return empty array when no data in time range', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.getHistoricalData('no-data-tag', startTime, endTime);

      expect(mockRepo.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('TC-DAS-003: should propagate repository errors', async () => {
      const dbError = new Error('Database connection failed');
      mockRepo.find.mockRejectedValue(dbError);

      await expect(service.getHistoricalData(tagId, startTime, endTime)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockRepo.find).toHaveBeenCalledTimes(1);
    });

    it('TC-DAS-004: should pass correct date boundaries to Between operator', async () => {
      const exactStart = new Date('2025-03-01T00:00:00.000Z');
      const exactEnd = new Date('2025-03-15T23:59:59.999Z');
      mockRepo.find.mockResolvedValue([]);

      await service.getHistoricalData('tag-002', exactStart, exactEnd);

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { tagId: 'tag-002', timestamp: Between(exactStart, exactEnd) },
        order: { timestamp: 'ASC' },
      });
    });
  });

  // ──────────── getLatestData ────────────

  describe('getLatestData', () => {
    const tagId = 'tag-001';

    it('TC-DAS-005: should return latest record ordered by timestamp DESC', async () => {
      const latestRecord = createHistoricalData({
        id: 'latest-uuid',
        timestamp: new Date('2025-06-01T12:00:00Z'),
        numericValue: 99.9,
      });
      mockRepo.findOne.mockResolvedValue(latestRecord);

      const result = await service.getLatestData(tagId);

      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { tagId },
        order: { timestamp: 'DESC' },
      });
      expect(result).toEqual(latestRecord);
      expect(result!.numericValue).toBe(99.9);
      expect(result!.tagId).toBe('tag-001');
    });

    it('TC-DAS-006: should return null when no data exists for tag', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.getLatestData('non-existent-tag');

      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('TC-DAS-007: should propagate repository errors from findOne', async () => {
      mockRepo.findOne.mockRejectedValue(new Error('Query timeout'));

      await expect(service.getLatestData(tagId)).rejects.toThrow('Query timeout');

      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('TC-DAS-008: should handle tagId with special characters', async () => {
      const specialTagId = 'tag/with:special=chars';
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.getLatestData(specialTagId);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { tagId: specialTagId },
        order: { timestamp: 'DESC' },
      });
      expect(result).toBeNull();
    });
  });
});
