// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { InfluxPersistWriter } from '../influx-persist-writer';
import { InfluxWriteService, InfluxWritePoint } from '../influx-write.service';
import { DataPoint, PersistWriterRegistry } from '@ss-node/ss-collector-sdk';

describe('InfluxPersistWriter', () => {
  let writer: InfluxPersistWriter;
  let mockInfluxWriteService: jest.Mocked<InfluxWriteService>;
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

  const expectedInfluxPoint = (point: DataPoint): InfluxWritePoint => ({
    measurement: 'tag_values',
    tags: {
      tagId: point.tagId,
      deviceId: point.deviceId,
      projectId: point.projectId,
    },
    fields: {
      value: point.value ?? 0,
      quality: point.quality,
    },
    timestamp: point.timestamp,
  });

  beforeEach(() => {
    mockInfluxWriteService = {
      writePoint: jest.fn().mockResolvedValue(undefined),
      writePoints: jest.fn().mockResolvedValue(undefined),
      flushAll: jest.fn(),
      configure: jest.fn(),
      getStats: jest.fn().mockReturnValue({}),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      isBackendReachable: true,
    } as any;

    mockConfigService = {
      // enable InfluxDB writer for these tests
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'HISTORICAL_DATA_BACKEND') return 'influxdb';
        return defaultValue;
      }),
    };

    const mockRegistry = new PersistWriterRegistry();
    jest.spyOn(mockRegistry, 'register').mockImplementation(() => undefined);

    writer = new InfluxPersistWriter(
      mockInfluxWriteService,
      mockRegistry,
      mockConfigService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────── Name ────────────

  describe('name', () => {
    it('TC-IPW-001: should have name "InfluxDB"', () => {
      expect(writer.name).toBe('InfluxDB');
    });
  });

  // ──────────── write ────────────

  describe('write', () => {
    it('TC-IPW-002: should convert DataPoint to InfluxWritePoint and delegate to writePoint', async () => {
      const dataPoint = createDataPoint();

      await writer.write(dataPoint);

      expect(mockInfluxWriteService.writePoint).toHaveBeenCalledTimes(1);
      expect(mockInfluxWriteService.writePoint).toHaveBeenCalledWith(
        expectedInfluxPoint(dataPoint),
      );
    });

    it('TC-IPW-003: should use measurement "tag_values" for all writes', async () => {
      const dataPoint = createDataPoint({ tagId: 'custom-tag' });

      await writer.write(dataPoint);

      const callArg = mockInfluxWriteService.writePoint.mock.calls[0][0];
      expect(callArg.measurement).toBe('tag_values');
    });

    it('TC-IPW-004: should default value to 0 when null', async () => {
      const dataPoint = createDataPoint({ value: null });

      await writer.write(dataPoint);

      const callArg = mockInfluxWriteService.writePoint.mock.calls[0][0];
      expect(callArg.fields.value).toBe(0);
    });

    it('TC-IPW-005: should delegate to writePoint and propagate errors', async () => {
      const writeError = new Error('Write failed');
      mockInfluxWriteService.writePoint.mockRejectedValue(writeError);

      await expect(writer.write(createDataPoint())).rejects.toThrow('Write failed');
      expect(mockInfluxWriteService.writePoint).toHaveBeenCalledTimes(1);
    });

    it('TC-IPW-006: should correctly map all DataPoint fields to InfluxWritePoint', async () => {
      const customPoint = createDataPoint({
        tagId: 'special-tag',
        deviceId: 'dev-abc-123',
        projectId: 'proj-xyz-789',
        value: -999.999,
        quality: 'bad',
        timestamp: new Date('2025-12-31T23:59:59.999Z'),
      });

      await writer.write(customPoint);

      const callArg: InfluxWritePoint = mockInfluxWriteService.writePoint.mock.calls[0][0];
      expect(callArg.tags.tagId).toBe('special-tag');
      expect(callArg.tags.deviceId).toBe('dev-abc-123');
      expect(callArg.tags.projectId).toBe('proj-xyz-789');
      expect(callArg.fields.value).toBe(-999.999);
      expect(callArg.fields.quality).toBe('bad');
      expect(callArg.timestamp).toEqual(new Date('2025-12-31T23:59:59.999Z'));
    });
  });

  // ──────────── writeBatch ────────────

  describe('writeBatch', () => {
    it('TC-IPW-007: should convert all DataPoints to InfluxWritePoints and delegate to writePoints', async () => {
      const dataPoints = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
        createDataPoint({ tagId: 'tag-c', value: 30 }),
      ];

      await writer.writeBatch(dataPoints);

      expect(mockInfluxWriteService.writePoints).toHaveBeenCalledTimes(1);
      expect(mockInfluxWriteService.writePoints).toHaveBeenCalledWith([
        expectedInfluxPoint(dataPoints[0]),
        expectedInfluxPoint(dataPoints[1]),
        expectedInfluxPoint(dataPoints[2]),
      ]);
    });

    it('TC-IPW-008: should be a no-op for empty batch', async () => {
      await writer.writeBatch([]);

      // Empty batch returns early, no writePoints call
      expect(mockInfluxWriteService.writePoints).not.toHaveBeenCalled();
    });

    it('TC-IPW-009: should propagate errors from writePoints', async () => {
      mockInfluxWriteService.writePoints.mockRejectedValue(new Error('Batch write failed'));

      await expect(writer.writeBatch([createDataPoint()])).rejects.toThrow('Batch write failed');
    });

    it('TC-IPW-010: should handle batch with null values', async () => {
      const dataPoints = [
        createDataPoint({ value: 10 }),
        createDataPoint({ value: null }),
        createDataPoint({ value: 30 }),
      ];

      await writer.writeBatch(dataPoints);

      const callArgs: InfluxWritePoint[] = mockInfluxWriteService.writePoints.mock.calls[0][0];
      expect(callArgs[0].fields.value).toBe(10);
      expect(callArgs[1].fields.value).toBe(0); // null → 0
      expect(callArgs[2].fields.value).toBe(30);
    });
  });

  // ──────────── flush ────────────

  describe('flush', () => {
    it('TC-IPW-011: should delegate to influxWriteService.flushAll', async () => {
      await writer.flush();

      expect(mockInfluxWriteService.flushAll).toHaveBeenCalledTimes(1);
    });

    it('TC-IPW-012: should handle flushAll errors', async () => {
      (mockInfluxWriteService.flushAll as jest.Mock).mockImplementation(() => {
        throw new Error('Flush error');
      });

      await expect(writer.flush()).rejects.toThrow('Flush error');
    });

    it('TC-IPW-013: should be idempotent (multiple flushes)', async () => {
      await writer.flush();
      await writer.flush();
      await writer.flush();

      expect(mockInfluxWriteService.flushAll).toHaveBeenCalledTimes(3);
    });
  });

  // ──────────── Integration patterns ────────────

  describe('write-writeBatch-flush sequence', () => {
    it('TC-IPW-014: should support write then flush pattern', async () => {
      await writer.write(createDataPoint({ tagId: 't1' }));
      await writer.write(createDataPoint({ tagId: 't2' }));
      await writer.flush();

      expect(mockInfluxWriteService.writePoint).toHaveBeenCalledTimes(2);
      expect(mockInfluxWriteService.flushAll).toHaveBeenCalledTimes(1);
    });

    it('TC-IPW-015: should support writeBatch then flush pattern', async () => {
      const batch = [createDataPoint(), createDataPoint()];
      await writer.writeBatch(batch);
      await writer.flush();

      expect(mockInfluxWriteService.writePoints).toHaveBeenCalledTimes(1);
      expect(mockInfluxWriteService.flushAll).toHaveBeenCalledTimes(1);
    });
  });
});
