// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { StoragePluginRegistryService } from '../services/storage-plugin-registry.service';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';

describe('StoragePluginRegistryService', () => {
  let registry: StoragePluginRegistryService;

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
    registry = new StoragePluginRegistryService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────── register ────────────

  describe('register', () => {
    it('TC-SPR-001: should register a new adapter and set it as default when first', () => {
      const adapter = createMockAdapter('InfluxDB');

      registry.register(adapter);

      expect(registry.get('InfluxDB')).toBe(adapter);
      expect(registry.getDefault()).toBe(adapter);
    });

    it('TC-SPR-002: should register multiple adapters', () => {
      const influx = createMockAdapter('InfluxDB');
      const sqlite = createMockAdapter('SQLite');

      registry.register(influx);
      registry.register(sqlite);

      expect(registry.list().length).toBe(2);
      // First registered adapter should remain default
      expect(registry.getDefault()).toBe(influx);
    });

    it('TC-SPR-003: should replace adapter when registering with same name', () => {
      const adapter1 = createMockAdapter('InfluxDB');
      const adapter2 = createMockAdapter('InfluxDB');

      registry.register(adapter1);
      registry.register(adapter2);

      expect(registry.get('InfluxDB')).toBe(adapter2);
    });
  });

  // ──────────── get ────────────

  describe('get', () => {
    it('TC-SPR-004: should return undefined for unregistered adapter', () => {
      const result = registry.get('unknown');
      expect(result).toBeUndefined();
    });

    it('TC-SPR-005: should return the correct adapter by name', () => {
      const influx = createMockAdapter('InfluxDB');
      const sqlite = createMockAdapter('SQLite');

      registry.register(influx);
      registry.register(sqlite);

      expect(registry.get('InfluxDB')).toBe(influx);
      expect(registry.get('SQLite')).toBe(sqlite);
    });
  });

  // ──────────── list ────────────

  describe('list', () => {
    it('TC-SPR-006: should return empty array when no adapters registered', () => {
      expect(registry.list()).toEqual([]);
    });

    it('TC-SPR-007: should return all registered adapters', () => {
      const influx = createMockAdapter('InfluxDB');
      const sqlite = createMockAdapter('SQLite');

      registry.register(influx);
      registry.register(sqlite);

      const list = registry.list();
      expect(list).toContain(influx);
      expect(list).toContain(sqlite);
    });
  });

  // ──────────── getDefault / setDefault ────────────

  describe('getDefault / setDefault', () => {
    it('TC-SPR-008: should throw when no default adapter is set', () => {
      expect(() => registry.getDefault()).toThrow('No default storage adapter configured');
    });

    it('TC-SPR-009: should change default adapter', () => {
      const influx = createMockAdapter('InfluxDB');
      const sqlite = createMockAdapter('SQLite');

      registry.register(influx);
      registry.register(sqlite);
      registry.setDefault('SQLite');

      expect(registry.getDefault()).toBe(sqlite);
    });

    it('TC-SPR-010: should throw when setting default to unregistered adapter', () => {
      expect(() => registry.setDefault('unknown')).toThrow('is not registered');
    });
  });

  // ──────────── unregister ────────────

  describe('unregister', () => {
    it('TC-SPR-011: should unregister an adapter and return true', () => {
      const adapter = createMockAdapter('InfluxDB');
      registry.register(adapter);

      const result = registry.unregister('InfluxDB');

      expect(result).toBe(true);
      expect(registry.get('InfluxDB')).toBeUndefined();
    });

    it('TC-SPR-012: should return false when unregistering non-existent adapter', () => {
      const result = registry.unregister('unknown');
      expect(result).toBe(false);
    });

    it('TC-SPR-013: should reset default when unregistering the default adapter', () => {
      const influx = createMockAdapter('InfluxDB');
      const sqlite = createMockAdapter('SQLite');

      registry.register(influx);
      registry.register(sqlite);

      registry.unregister('InfluxDB');

      expect(registry.getDefault()).toBe(sqlite);
    });
  });

  // ──────────── healthCheckAll ────────────

  describe('healthCheckAll', () => {
    it('TC-SPR-014: should return health status for all adapters', async () => {
      const influx = createMockAdapter('InfluxDB');
      const sqlite = createMockAdapter('SQLite');
      influx.health.mockResolvedValue({ status: 'healthy', details: { version: '2.7' } });
      sqlite.health.mockResolvedValue({ status: 'healthy' });

      registry.register(influx);
      registry.register(sqlite);

      const results = await registry.healthCheckAll();

      expect(results.size).toBe(2);
      expect(results.get('InfluxDB')!.status).toBe('healthy');
      expect(results.get('SQLite')!.status).toBe('healthy');
    });

    it('TC-SPR-015: should handle failing health checks gracefully', async () => {
      const influx = createMockAdapter('InfluxDB');
      influx.health.mockRejectedValue(new Error('Connection refused'));

      registry.register(influx);

      const results = await registry.healthCheckAll();

      expect(results.get('InfluxDB')!.status).toBe('unhealthy');
    });
  });

  // ──────────── closeAll ────────────

  describe('closeAll', () => {
    it('TC-SPR-016: should close all adapters and clear registry', async () => {
      const influx = createMockAdapter('InfluxDB');
      const sqlite = createMockAdapter('SQLite');

      registry.register(influx);
      registry.register(sqlite);

      await registry.closeAll();

      expect(influx.close).toHaveBeenCalledTimes(1);
      expect(sqlite.close).toHaveBeenCalledTimes(1);
      expect(registry.list().length).toBe(0);
    });

    it('TC-SPR-017: should handle close errors gracefully', async () => {
      const influx = createMockAdapter('InfluxDB');
      influx.close.mockRejectedValue(new Error('Close failed'));

      registry.register(influx);

      await expect(registry.closeAll()).resolves.toBeUndefined();
      expect(registry.list().length).toBe(0);
    });
  });
});
