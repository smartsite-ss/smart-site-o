// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { SqlitePersistWriter } from '../sqlite-persist-writer';
import { HistoricalData } from '../entities/historical-data.entity';
import { Repository } from 'typeorm';
import { DataPoint, PersistWriterRegistry } from '@ss-node/ss-collector-sdk';

describe('SqlitePersistWriter', () => {
  let writer: SqlitePersistWriter;
  let mockRepo: jest.Mocked<Pick<Repository<HistoricalData>, 'create' | 'save'>>;
  let mockProjectDbService: { getSystemDb: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  const createDataPoint = (overrides: Partial<DataPoint> = {}): DataPoint => ({
    tagId: 'tag-001',
    deviceId: 'device-001',
    projectId: 'project-001',
    value: 42.5,
    quality: 'good',
    timestamp: new Date('2025-06-01T12:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    mockRepo = {
      create: jest.fn().mockImplementation((entity) => entity as HistoricalData),
      save: jest.fn().mockResolvedValue([]),
    };

    mockConfigService = {
      // enable SQLite writer for these tests
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'HISTORICAL_DATA_BACKEND') return 'sqlite';
        return defaultValue;
      }),
    };

    // SqlitePersistWriter 构造函数第一个参数是 ProjectDatabaseService，
    // 通过 getSystemDb(projectId) 获取项目级 DataSource，再取 Repository。
    // 使用 mockImplementation 确保每次调用都返回当前最新的 mockRepo 引用
    // （部分测试用例会重新赋值 mockRepo）。
    const mockDataSource = {
      getRepository: jest.fn().mockImplementation(() => mockRepo),
    };
    mockProjectDbService = {
      getSystemDb: jest.fn().mockResolvedValue(mockDataSource),
    };

    const mockRegistry = new PersistWriterRegistry();
    jest.spyOn(mockRegistry, 'register').mockImplementation(() => undefined);

    writer = new SqlitePersistWriter(mockProjectDbService as any, mockRegistry, mockConfigService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ──────────── Name ────────────

  describe('name', () => {
    it('TC-SPW-001: should have name "SQLite"', () => {
      expect(writer.name).toBe('SQLite');
    });
  });

  // ──────────── write ────────────

  describe('write', () => {
    it('TC-SPW-002: should create a HistoricalData record and buffer it', async () => {
      const dataPoint = createDataPoint();

      await writer.write(dataPoint);

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(mockRepo.create).toHaveBeenCalledWith({
        tagId: 'tag-001',
        numericValue: 42.5,
        stringValue: null,
        booleanValue: null,
        timestamp: dataPoint.timestamp,
      });
      // save should NOT be called yet (batch size is 100, only 1 buffered)
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('TC-SPW-003: should flush automatically when buffer reaches batch size of 100', async () => {
      jest.useFakeTimers();
      // Recreate writer with fresh mock for this test
      mockRepo = {
        create: jest.fn().mockImplementation((entity) => entity as HistoricalData),
        save: jest.fn().mockResolvedValue([]),
      };
      writer = new SqlitePersistWriter(
        mockProjectDbService as any,
        new PersistWriterRegistry(),
        mockConfigService as any,
      );

      for (let i = 0; i < 100; i++) {
        await writer.write(createDataPoint({ tagId: `tag-${i}`, value: i }));
      }

      // Advance timers to allow flush to complete
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ tagId: 'tag-0' })]),
      );
    });

    it('TC-SPW-004: should set a flush timer when buffer has items but not full', async () => {
      jest.useFakeTimers();
      mockRepo = {
        create: jest.fn().mockImplementation((entity) => entity as HistoricalData),
        save: jest.fn().mockResolvedValue([]),
      };
      writer = new SqlitePersistWriter(
        mockProjectDbService as any,
        new PersistWriterRegistry(),
        mockConfigService as any,
      );

      await writer.write(createDataPoint());

      // Advance timer past flushIntervalMs (5000ms)
      jest.advanceTimersByTime(5000);
      // flush() 由 setTimeout 触发且为 async，链式 await（getRepo→save）
      // 需多次刷新微任务队列使整条 Promise 链完全 resolve。
      // 注意：fake timers 下 setImmediate 也被 mock，只能用 Promise.resolve()
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Flush should have been triggered via timer
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('TC-SPW-005: should buffer multiple writes without flushing for small batches', async () => {
      jest.useFakeTimers();
      mockRepo = {
        create: jest.fn().mockImplementation((entity) => entity as HistoricalData),
        save: jest.fn().mockResolvedValue([]),
      };
      writer = new SqlitePersistWriter(
        mockProjectDbService as any,
        new PersistWriterRegistry(),
        mockConfigService as any,
      );

      await writer.write(createDataPoint({ tagId: 'a' }));
      await writer.write(createDataPoint({ tagId: 'b' }));
      await writer.write(createDataPoint({ tagId: 'c' }));

      // Only 3 items - no flush triggered
      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalledTimes(3);
    });
  });

  // ──────────── writeBatch ────────────

  describe('writeBatch', () => {
    it('TC-SPW-006: should bulk save multiple records to repository', async () => {
      const dataPoints = [
        createDataPoint({ tagId: 'batch-a', value: 10 }),
        createDataPoint({ tagId: 'batch-b', value: 20 }),
        createDataPoint({ tagId: 'batch-c', value: 30 }),
      ];

      await writer.writeBatch(dataPoints);

      expect(mockRepo.create).toHaveBeenCalledTimes(3);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ tagId: 'batch-a', numericValue: 10 }),
          expect.objectContaining({ tagId: 'batch-b', numericValue: 20 }),
          expect.objectContaining({ tagId: 'batch-c', numericValue: 30 }),
        ]),
      );
    });

    it('TC-SPW-007: should handle empty batch gracefully', async () => {
      await writer.writeBatch([]);

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('TC-SPW-008: should set stringValue and booleanValue to null for all records', async () => {
      const dataPoints = [createDataPoint({ tagId: 'null-check' })];

      await writer.writeBatch(dataPoints);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stringValue: null,
          booleanValue: null,
        }),
      );
    });

    it('TC-SPW-009: should throw and re-throw save errors', async () => {
      const saveError = new Error('SQLite disk full');
      mockRepo.save.mockRejectedValue(saveError);

      await expect(writer.writeBatch([createDataPoint()])).rejects.toThrow('SQLite disk full');
    });

    it('TC-SPW-010: should handle non-Error save failures', async () => {
      mockRepo.save.mockRejectedValue('String error');

      await expect(writer.writeBatch([createDataPoint()])).rejects.toBe('String error');
    });
  });

  // ──────────── flush ────────────

  describe('flush', () => {
    it('TC-SPW-011: should flush buffered records when buffer is non-empty', async () => {
      // Write some points first to populate the buffer
      await writer.write(createDataPoint({ tagId: 'flush-a' }));
      await writer.write(createDataPoint({ tagId: 'flush-b' }));

      // Reset save mock to track flush calls
      jest.clearAllMocks();
      // Need to re-setup create for flush's internal writeBatchFromRecords
      mockRepo.create.mockImplementation((entity) => entity as HistoricalData);
      mockRepo.save.mockResolvedValue([] as any);

      await writer.flush();

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('TC-SPW-012: should do nothing when buffer is empty', async () => {
      await writer.flush();

      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('TC-SPW-013: should clear the flush timer on manual flush', async () => {
      jest.useFakeTimers();
      mockRepo = {
        create: jest.fn().mockImplementation((entity) => entity as HistoricalData),
        save: jest.fn().mockResolvedValue([]),
      };
      writer = new SqlitePersistWriter(
        mockProjectDbService as any,
        new PersistWriterRegistry(),
        mockConfigService as any,
      );

      await writer.write(createDataPoint());
      jest.clearAllMocks();

      // Flush manually, which clears the timer
      mockRepo.save.mockResolvedValue([] as any);
      await writer.flush();

      // Advance the timer - should NOT trigger another flush
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(mockRepo.save).toHaveBeenCalledTimes(1); // only the manual flush
    });

    it('TC-SPW-014: should be idempotent (calling flush multiple times on empty buffer)', async () => {
      await writer.write(createDataPoint());
      jest.clearAllMocks();
      mockRepo.save.mockResolvedValue([] as any);

      await writer.flush(); // first flush - clears buffer
      await writer.flush(); // second flush - should do nothing

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────── Error recovery ────────────

  describe('flush error recovery', () => {
    it('TC-SPW-015: should re-queue records on flush failure (unshift back to buffer)', async () => {
      const saveError = new Error('SQLite flush failed');
      mockRepo.save.mockRejectedValueOnce(saveError);

      await writer.write(createDataPoint({ tagId: 'recover-1' }));
      await writer.write(createDataPoint({ tagId: 'recover-2' }));

      // Flush will fail and re-queue records. Mock save to succeed on retry.
      // The error is swallowed inside flush() (writeBatchFromRecords catches it),
      // so flush() itself won't throw.
      await writer.flush();

      // Records should have been unshifted back to buffer.
      // Now mock save to succeed for a retry
      mockRepo.save.mockResolvedValue([] as any);
      await writer.flush();

      expect(mockRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  // ──────────── Edge cases ────────────

  describe('edge cases', () => {
    it('TC-SPW-016: should handle DataPoint with null value', async () => {
      const nullValuePoint = createDataPoint({ value: null });

      await writer.write(nullValuePoint);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ numericValue: null }));
    });

    it('TC-SPW-017: should handle very large batch (exceeding batch size)', async () => {
      jest.useFakeTimers();
      mockRepo = {
        create: jest.fn().mockImplementation((entity) => entity as HistoricalData),
        save: jest.fn().mockResolvedValue([]),
      };
      writer = new SqlitePersistWriter(
        mockProjectDbService as any,
        new PersistWriterRegistry(),
        mockConfigService as any,
      );

      // Write 250 points, which should trigger at least 2 flushes
      for (let i = 0; i < 250; i++) {
        await writer.write(createDataPoint({ tagId: `big-${i}`, value: i }));
      }

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(mockRepo.save).toHaveBeenCalledTimes(2);
    });

    it('TC-SPW-018: should preserve timestamp in created entities', async () => {
      const specificDate = new Date('2025-07-15T09:45:30.500Z');
      const dataPoint = createDataPoint({ timestamp: specificDate });

      await writer.write(dataPoint);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ timestamp: specificDate }),
      );
    });

    it('TC-SPW-019: should handle Unicode characters in tagId', async () => {
      const dataPoint = createDataPoint({ tagId: '中文标签-测试' });

      await writer.writeBatch([dataPoint]);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tagId: '中文标签-测试' }),
      );
    });
  });
});
