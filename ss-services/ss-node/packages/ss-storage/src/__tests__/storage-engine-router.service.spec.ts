// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { StorageEngineRouterService } from '../storage-engine-router.service';
import { StorageEngineConfigService } from '../storage-engine-config.service';
import { STORAGE_ENGINE_TYPES } from '../storage-engine-types';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';

describe('StorageEngineRouterService', () => {
  let router: StorageEngineRouterService;
  let mockConfigService: jest.Mocked<StorageEngineConfigService>;
  let mockInfluxAdapter: jest.Mocked<StorageAdapter>;
  let mockSqliteAdapter: jest.Mocked<StorageAdapter>;

  const createMockAdapter = (name: string): jest.Mocked<StorageAdapter> => ({
    name,
    engineType: name,
    capabilities: { delete: true, interpolation: false, aggregation: false },
    write: jest.fn().mockResolvedValue({ success: true, written: 0, failed: 0 }),
    read: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(0),
    health: jest.fn().mockResolvedValue({ status: 'healthy' }),
    close: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    mockConfigService = {
      getDefaultEngine: jest.fn().mockReturnValue(STORAGE_ENGINE_TYPES.INFLUXDB2),
      getProjectEngine: jest.fn().mockReturnValue(STORAGE_ENGINE_TYPES.INFLUXDB2),
      setProjectEngine: jest.fn(),
      removeProjectEngine: jest.fn(),
    } as any;

    mockInfluxAdapter = createMockAdapter('InfluxDB');
    mockSqliteAdapter = createMockAdapter('SQLite');

    router = new StorageEngineRouterService(mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────── registerAdapter ────────────

  describe('registerAdapter', () => {
    it('TC-STO-041: should register adapter for a given engine type', () => {
      router.registerAdapter(STORAGE_ENGINE_TYPES.INFLUXDB2, mockInfluxAdapter);

      const engines = router.getAvailableEngines();
      expect(engines).toContain(STORAGE_ENGINE_TYPES.INFLUXDB2);
    });

    it('should replace adapter when registering same engine type again', () => {
      const adapter1 = createMockAdapter('InfluxDB-v1');
      const adapter2 = createMockAdapter('InfluxDB-v2');

      router.registerAdapter(STORAGE_ENGINE_TYPES.INFLUXDB2, adapter1);
      router.registerAdapter(STORAGE_ENGINE_TYPES.INFLUXDB2, adapter2);

      const result = router.getAdapterForEngine(STORAGE_ENGINE_TYPES.INFLUXDB2);
      expect(result).toBe(adapter2);
      expect(result.name).toBe('InfluxDB-v2');
    });
  });

  // ──────────── getAvailableEngines ────────────

  describe('getAvailableEngines', () => {
    it('TC-STO-042: should return empty array when no adapters registered', () => {
      const engines = router.getAvailableEngines();

      expect(engines).toEqual([]);
    });

    it('should list all registered engine types', () => {
      router.registerAdapter(STORAGE_ENGINE_TYPES.INFLUXDB2, mockInfluxAdapter);
      router.registerAdapter(STORAGE_ENGINE_TYPES.SQLITE, mockSqliteAdapter);

      const engines = router.getAvailableEngines();

      expect(engines.length).toBe(2);
      expect(engines).toContain(STORAGE_ENGINE_TYPES.INFLUXDB2);
      expect(engines).toContain(STORAGE_ENGINE_TYPES.SQLITE);
    });
  });

  // ──────────── getAdapterForEngine ────────────

  describe('getAdapterForEngine', () => {
    it('TC-STO-040: should return correct adapter for a registered engine type', () => {
      router.registerAdapter(STORAGE_ENGINE_TYPES.INFLUXDB2, mockInfluxAdapter);
      router.registerAdapter(STORAGE_ENGINE_TYPES.SQLITE, mockSqliteAdapter);

      const result = router.getAdapterForEngine(STORAGE_ENGINE_TYPES.INFLUXDB2);

      expect(result).toBe(mockInfluxAdapter);
    });

    it('should normalize legacy influxdb alias to influxdb2 adapter', () => {
      router.registerAdapter(STORAGE_ENGINE_TYPES.INFLUXDB2, mockInfluxAdapter);

      const result = router.getAdapterForEngine('influxdb' as any);

      expect(result).toBe(mockInfluxAdapter);
    });

    it('TC-STO-043: should throw error for unknown engine type', () => {
      expect(() => router.getAdapterForEngine(STORAGE_ENGINE_TYPES.MYSQL)).toThrow(
        'No storage adapter registered for engine: mysql',
      );
    });
  });

  // ──────────── getAdapter ────────────

  describe('getAdapter', () => {
    it('TC-STO-044: should route to project-specific engine adapter', () => {
      mockConfigService.getProjectEngine.mockReturnValue(STORAGE_ENGINE_TYPES.SQLITE);
      router.registerAdapter(STORAGE_ENGINE_TYPES.INFLUXDB2, mockInfluxAdapter);
      router.registerAdapter(STORAGE_ENGINE_TYPES.SQLITE, mockSqliteAdapter);

      const result = router.getAdapter('proj-1');

      expect(result).toBe(mockSqliteAdapter);
      expect(mockConfigService.getProjectEngine).toHaveBeenCalledWith('proj-1');
    });

    it('should route to default engine adapter when no project config', () => {
      mockConfigService.getProjectEngine.mockReturnValue(STORAGE_ENGINE_TYPES.INFLUXDB2);
      router.registerAdapter(STORAGE_ENGINE_TYPES.INFLUXDB2, mockInfluxAdapter);

      const result = router.getAdapter('proj-unknown');

      expect(result).toBe(mockInfluxAdapter);
    });
  });
});
