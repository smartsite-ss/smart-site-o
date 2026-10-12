// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { StorageEngineConfigService } from '../storage-engine-config.service';
import { STORAGE_ENGINE_TYPES, resolveStorageEngineType } from '../storage-engine-types';

describe('StorageEngineConfigService', () => {
  let service: StorageEngineConfigService;

  beforeEach(() => {
    service = new StorageEngineConfigService();
  });

  afterEach(() => {
    delete process.env.STORAGE_DEFAULT_ENGINE;
    jest.clearAllMocks();
  });

  // ──────────── getDefaultEngine ────────────

  describe('getDefaultEngine', () => {
    it('TC-STO-030: should return INFLUXDB2 as default engine when no env configured', () => {
      delete process.env.STORAGE_DEFAULT_ENGINE;

      const result = service.getDefaultEngine();

      expect(result).toBe(STORAGE_ENGINE_TYPES.INFLUXDB2);
    });

    it('should return SQLITE when env is set to sqlite', () => {
      process.env.STORAGE_DEFAULT_ENGINE = 'sqlite';

      const result = service.getDefaultEngine();

      expect(result).toBe(STORAGE_ENGINE_TYPES.SQLITE);
    });

    it('should return MYSQL when env is set to mysql', () => {
      process.env.STORAGE_DEFAULT_ENGINE = 'mysql';

      const result = service.getDefaultEngine();

      expect(result).toBe(STORAGE_ENGINE_TYPES.MYSQL);
    });

    it('should return INFLUXDB3 when env is set to influxdb3', () => {
      process.env.STORAGE_DEFAULT_ENGINE = 'influxdb3';

      const result = service.getDefaultEngine();

      expect(result).toBe(STORAGE_ENGINE_TYPES.INFLUXDB3);
    });

    it('should return TDENGINE when env is set to tdengine', () => {
      process.env.STORAGE_DEFAULT_ENGINE = 'tdengine';

      const result = service.getDefaultEngine();

      expect(result).toBe(STORAGE_ENGINE_TYPES.TDENGINE);
    });

    it('should normalize legacy "influxdb" alias to influxdb2', () => {
      process.env.STORAGE_DEFAULT_ENGINE = 'influxdb';

      const result = service.getDefaultEngine();

      expect(result).toBe(STORAGE_ENGINE_TYPES.INFLUXDB2);
    });

    it('should fall back to influxdb2 on unknown engine value', () => {
      process.env.STORAGE_DEFAULT_ENGINE = 'oracle';

      const result = service.getDefaultEngine();

      expect(result).toBe(STORAGE_ENGINE_TYPES.INFLUXDB2);
    });
  });

  // ──────────── getProjectEngine / setProjectEngine ────────────

  describe('getProjectEngine / setProjectEngine', () => {
    it('TC-STO-031: should return project-specific engine when configured', () => {
      service.setProjectEngine('proj-1', STORAGE_ENGINE_TYPES.SQLITE);

      const result = service.getProjectEngine('proj-1');

      expect(result).toBe(STORAGE_ENGINE_TYPES.SQLITE);
    });

    it('TC-STO-032: should override project engine on subsequent set', () => {
      service.setProjectEngine('proj-1', STORAGE_ENGINE_TYPES.SQLITE);
      service.setProjectEngine('proj-1', STORAGE_ENGINE_TYPES.MYSQL);

      const result = service.getProjectEngine('proj-1');

      expect(result).toBe(STORAGE_ENGINE_TYPES.MYSQL);
    });

    it('TC-STO-033: should remove project engine config', () => {
      service.setProjectEngine('proj-1', STORAGE_ENGINE_TYPES.SQLITE);
      service.removeProjectEngine('proj-1');

      const result = service.getProjectEngine('proj-1');

      expect(result).toBe(STORAGE_ENGINE_TYPES.INFLUXDB2);
    });

    it('TC-STO-034: should fallback to default engine when no project config exists', () => {
      process.env.STORAGE_DEFAULT_ENGINE = 'mysql';

      const result = service.getProjectEngine('proj-unknown');

      expect(result).toBe(STORAGE_ENGINE_TYPES.MYSQL);
    });
  });

  // ──────────── removeProjectEngine ────────────

  describe('removeProjectEngine', () => {
    it('should not throw when removing non-existent project config', () => {
      expect(() => service.removeProjectEngine('non-existent')).not.toThrow();
    });
  });
});

// ──────────── 引擎类型注册表 ────────────

describe('storage-engine-types', () => {
  describe('resolveStorageEngineType', () => {
    it('should resolve all registered engine types', () => {
      expect(resolveStorageEngineType('influxdb2')).toBe(STORAGE_ENGINE_TYPES.INFLUXDB2);
      expect(resolveStorageEngineType('influxdb3')).toBe(STORAGE_ENGINE_TYPES.INFLUXDB3);
      expect(resolveStorageEngineType('tdengine')).toBe(STORAGE_ENGINE_TYPES.TDENGINE);
      expect(resolveStorageEngineType('sqlite')).toBe(STORAGE_ENGINE_TYPES.SQLITE);
      expect(resolveStorageEngineType('mysql')).toBe(STORAGE_ENGINE_TYPES.MYSQL);
    });

    it('should normalize legacy influxdb alias to influxdb2', () => {
      expect(resolveStorageEngineType('influxdb')).toBe(STORAGE_ENGINE_TYPES.INFLUXDB2);
      expect(resolveStorageEngineType('INFLUXDB')).toBe(STORAGE_ENGINE_TYPES.INFLUXDB2);
    });

    it('should return null for unknown engine type', () => {
      expect(resolveStorageEngineType('oracle')).toBeNull();
      expect(resolveStorageEngineType('')).toBeNull();
    });
  });
});
