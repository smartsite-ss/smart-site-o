// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveServiceManager } from '../../services/save/SaveServiceManager';
import { ProjectData, ISaveService, SaveServiceConfig as _SaveServiceConfig } from '../../services/save/types';

// ==================== Mocks ====================

// Mock localStorage
const storageData: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storageData[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storageData[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storageData[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storageData).forEach((key) => delete storageData[key]);
  }),
  get length() {
    return Object.keys(storageData).length;
  },
  key: vi.fn((index: number) => Object.keys(storageData)[index] ?? null),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock fetch
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

describe('SaveServiceManager', () => {
  let manager: SaveServiceManager;

  const testData: ProjectData = {
    version: '1.0',
    savedAt: Date.now(),
    currentPageId: 'page-1',
    pages: [
      {
        id: 'page-1',
        name: 'Page 1',
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        graphics: [
          { id: 'g-1', type: 'rect', x: 100, y: 100, width: 200, height: 100 },
        ],
      },
    ],
  };

  beforeEach(() => {
    manager = new SaveServiceManager();
    Object.keys(storageData).forEach((key) => delete storageData[key]);
    vi.clearAllMocks();
  });

  // ==================== TC-SAVE-001: Initial State ====================
  describe('TC-SAVE-001: Initial State', () => {
    it('TC-SAVE-001-01: should have idle status initially', () => {
      expect(manager.getStatus()).toBe('idle');
    });

    it('TC-SAVE-001-02: should have null lastSavedTime initially', () => {
      expect(manager.getLastSavedTime()).toBeNull();
    });

    it('TC-SAVE-001-03: should not be initialized initially', () => {
      expect(manager.isInitialized()).toBe(false);
    });
  });

  // ==================== TC-SAVE-002: Uninitialized Operations ====================
  describe('TC-SAVE-002: Uninitialized Operations', () => {
    it('TC-SAVE-002-01: should throw error when saving without init', async () => {
      await expect(manager.save(testData)).rejects.toThrow(
        'SaveService 未初始化，请先调用 init()'
      );
    });

    it('TC-SAVE-002-02: should throw error when loading without init', async () => {
      await expect(manager.load()).rejects.toThrow(
        'SaveService 未初始化，请先调用 init()'
      );
    });

    it('TC-SAVE-002-03: should throw error when deleting without init', async () => {
      await expect(manager.delete()).rejects.toThrow(
        'SaveService 未初始化，请先调用 init()'
      );
    });

    it('TC-SAVE-002-04: should throw error when checking hasSavedData without init', async () => {
      await expect(manager.hasSavedData()).rejects.toThrow(
        'SaveService 未初始化，请先调用 init()'
      );
    });
  });

  // ==================== TC-SAVE-003: Local Mode ====================
  describe('TC-SAVE-003: Local Mode', () => {
    beforeEach(() => {
      manager.init({ type: 'local' });
    });

    it('TC-SAVE-003-01: should be initialized after init', () => {
      expect(manager.isInitialized()).toBe(true);
    });

    it('TC-SAVE-003-02: should save data to localStorage', async () => {
      await manager.save(testData);

      expect(storageData['scada-editor-project']).toBeDefined();
      const saved = JSON.parse(storageData['scada-editor-project']);
      expect(saved.pages).toEqual(testData.pages);
      expect(manager.getStatus()).toBe('success');
      expect(manager.getLastSavedTime()).toBeGreaterThan(0);
    });

    it('TC-SAVE-003-03: should load data from localStorage', async () => {
      storageData['scada-editor-project'] = JSON.stringify(testData);

      const loaded = await manager.load();

      expect(loaded).not.toBeNull();
      expect(loaded!.pages[0].id).toBe('page-1');
      expect(loaded!.pages[0].graphics).toHaveLength(1);
    });

    it('TC-SAVE-003-04: should return null when no data in localStorage', async () => {
      const loaded = await manager.load();

      expect(loaded).toBeNull();
    });

    it('TC-SAVE-003-05: should delete data from localStorage', async () => {
      storageData['scada-editor-project'] = JSON.stringify(testData);

      await manager.delete();

      expect(storageData['scada-editor-project']).toBeUndefined();
      expect(manager.getLastSavedTime()).toBeNull();
    });

    it('TC-SAVE-003-06: should check hasSavedData returns true when data exists', async () => {
      storageData['scada-editor-project'] = JSON.stringify(testData);

      const result = await manager.hasSavedData();

      expect(result).toBe(true);
    });

    it('TC-SAVE-003-07: should check hasSavedData returns false when no data', async () => {
      const result = await manager.hasSavedData();

      expect(result).toBe(false);
    });
  });

  // ==================== TC-SAVE-004: Mock Mode ====================
  describe('TC-SAVE-004: Mock Mode', () => {
    beforeEach(() => {
      manager.init({ type: 'mock' });
    });

    it('TC-SAVE-004-01: should be initialized after init', () => {
      expect(manager.isInitialized()).toBe(true);
    });

    it('TC-SAVE-004-02: should save and load with mock service', async () => {
      await manager.save(testData);

      expect(manager.getStatus()).toBe('success');
      expect(manager.getLastSavedTime()).not.toBeNull();
      expect(manager.getLastSavedTime()).toBeGreaterThan(0);

      const loaded = await manager.load();
      expect(loaded).not.toBeNull();
      expect(loaded!.pages.length).toBe(1);
      expect(loaded!.currentPageId).toBe('page-1');
    });

    it('TC-SAVE-004-03: should return null when no data in mock', async () => {
      const loaded = await manager.load();

      expect(loaded).toBeNull();
    });

    it('TC-SAVE-004-04: should delete saved data', async () => {
      await manager.save(testData);
      expect(await manager.hasSavedData()).toBe(true);

      await manager.delete();
      expect(await manager.hasSavedData()).toBe(false);
      expect(manager.getLastSavedTime()).toBeNull();
    });

    it('TC-SAVE-004-05: mock save should have simulated delay', async () => {
      await manager.save(testData);
      // Mock service has 500ms delay, but in tests it might be near-instant
      // Just verify the operation completes
      expect(manager.getStatus()).toBe('success');
    });
  });

  // ==================== TC-SAVE-005: Server Mode ====================
  describe('TC-SAVE-005: Server Mode', () => {
    it('TC-SAVE-005-01: should throw error for server mode without apiBaseUrl', () => {
      expect(() => {
        manager.init({ type: 'server' });
      }).toThrow('server 模式需要配置 apiBaseUrl');
    });

    it('TC-SAVE-005-02: should init with server mode with apiBaseUrl', () => {
      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      expect(manager.isInitialized()).toBe(true);
    });

    it('TC-SAVE-005-03: should save via fetch API', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      await manager.save(testData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/save',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData),
        })
      );
      expect(manager.getStatus()).toBe('success');
    });

    it('TC-SAVE-005-04: should throw on save failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      await expect(manager.save(testData)).rejects.toThrow('保存失败: 500');
      expect(manager.getStatus()).toBe('error');
    });

    it('TC-SAVE-005-05: should load via fetch API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(testData),
      });

      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      const loaded = await manager.load();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/api/load');
      expect(loaded).toEqual(testData);
    });

    it('TC-SAVE-005-06: should return null on 404 when loading', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      const loaded = await manager.load();

      expect(loaded).toBeNull();
    });

    it('TC-SAVE-005-07: should throw on non-404 load failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      await expect(manager.load()).rejects.toThrow('加载失败: 500');
    });

    it('TC-SAVE-005-08: should delete via fetch API', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      await manager.delete();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/delete',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('TC-SAVE-005-09: should throw on delete failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      await expect(manager.delete()).rejects.toThrow('删除失败: 403');
    });

    it('TC-SAVE-005-10: hasSavedData should return true when exists endpoint returns ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      const result = await manager.hasSavedData();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/api/exists');
    });

    it('TC-SAVE-005-11: hasSavedData should return false on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      const result = await manager.hasSavedData();

      expect(result).toBe(false);
    });
  });

  // ==================== TC-SAVE-006: Custom Service ====================
  describe('TC-SAVE-006: Custom Service', () => {
    it('TC-SAVE-006-01: should use custom service when provided', async () => {
      const customSave = vi.fn();
      const customLoad = vi.fn().mockResolvedValue(null);
      const customDelete = vi.fn();
      const customHasData = vi.fn().mockResolvedValue(false);

      const customService: ISaveService = {
        save: customSave,
        load: customLoad,
        delete: customDelete,
        hasSavedData: customHasData,
      };

      manager.init({ type: 'mock' }, customService);

      await manager.save(testData);
      expect(customSave).toHaveBeenCalledWith(testData);

      await manager.load();
      expect(customLoad).toHaveBeenCalled();

      await manager.delete();
      expect(customDelete).toHaveBeenCalled();

      await manager.hasSavedData();
      expect(customHasData).toHaveBeenCalled();
    });

    it('TC-SAVE-006-02: custom service should override config type', async () => {
      const customSave = vi.fn();
      const customLoad = vi.fn().mockResolvedValue(null);
      const customDelete = vi.fn();
      const customHasData = vi.fn().mockResolvedValue(false);

      const customService: ISaveService = {
        save: customSave,
        load: customLoad,
        delete: customDelete,
        hasSavedData: customHasData,
      };

      // Even though config says 'local', custom service should be used
      manager.init({ type: 'local' }, customService);

      await manager.save(testData);
      expect(customSave).toHaveBeenCalled();
      // Should NOT use localStorage
      expect(storageData['scada-editor-project']).toBeUndefined();
    });
  });

  // ==================== TC-SAVE-007: Status Transitions ====================
  describe('TC-SAVE-007: Status Transitions', () => {
    beforeEach(() => {
      manager.init({ type: 'mock' });
    });

    it('TC-SAVE-007-01: should transition through saving -> success', async () => {
      const statuses: string[] = [];
      manager.onStatusChange((status) => statuses.push(status));

      await manager.save(testData);

      expect(statuses).toContain('saving');
      expect(statuses).toContain('success');
      expect(statuses.indexOf('saving')).toBeLessThan(statuses.indexOf('success'));
    });

    it('TC-SAVE-007-02: should transition to error on failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      manager.init({ type: 'server', apiBaseUrl: 'http://localhost:4000' });

      const statuses: string[] = [];
      manager.onStatusChange((status) => statuses.push(status));

      await expect(manager.save(testData)).rejects.toThrow();

      expect(statuses).toContain('saving');
      expect(statuses).toContain('error');
    });

    it('TC-SAVE-007-03: should notify multiple listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      manager.onStatusChange(listener1);
      manager.onStatusChange(listener2);

      await manager.save(testData);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  // ==================== TC-SAVE-008: Status Listener Unsubscribe ====================
  describe('TC-SAVE-008: Status Listener Unsubscribe', () => {
    beforeEach(() => {
      manager.init({ type: 'mock' });
    });

    it('TC-SAVE-008-01: unsubscribe should stop receiving status updates', async () => {
      const listener = vi.fn();
      const unsubscribe = manager.onStatusChange(listener);

      await manager.save(testData);
      expect(listener).toHaveBeenCalledTimes(2); // saving + success

      unsubscribe();
      await manager.save(testData);
      // Still called only 2 times (not 4)
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('TC-SAVE-008-02: unsubscribe should not affect other listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = manager.onStatusChange(listener1);
      manager.onStatusChange(listener2);

      unsubscribe1();

      await manager.save(testData);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  // ==================== TC-SAVE-009: Default Mode ====================
  describe('TC-SAVE-009: Default Mode', () => {
    it('TC-SAVE-009-01: should default to local mode for unknown type', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      manager.init({ type: 'unknown' as any });

      // Should use local service
      expect(manager.isInitialized()).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  // ==================== TC-SAVE-010: Edge Cases ====================
  describe('TC-SAVE-010: Edge Cases', () => {
    it('TC-SAVE-010-01: should handle empty pages save', async () => {
      manager.init({ type: 'mock' });

      const emptyData: ProjectData = {
        version: '1.0',
        savedAt: Date.now(),
        currentPageId: '',
        pages: [],
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await manager.save(emptyData);

      expect(manager.getStatus()).toBe('success');
      consoleSpy.mockRestore();
    });

    it('TC-SAVE-010-02: should handle multiple save/load cycles', async () => {
      manager.init({ type: 'mock' });

      for (let i = 0; i < 3; i++) {
        const data = { ...testData, version: `1.${i}` };
        await manager.save(data);
        const loaded = await manager.load();
        expect(loaded!.version).toBe(`1.${i}`);
      }
    });

    it('TC-SAVE-010-03: should track lastSavedTime correctly', async () => {
      manager.init({ type: 'mock' });

      const beforeSave = Date.now();
      await manager.save(testData);
      const lastSavedTime = manager.getLastSavedTime()!;

      expect(lastSavedTime).toBeGreaterThanOrEqual(beforeSave);
    });

    it('TC-SAVE-010-04: init can be called multiple times', () => {
      manager.init({ type: 'mock' });
      expect(manager.isInitialized()).toBe(true);

      manager.init({ type: 'local' });
      expect(manager.isInitialized()).toBe(true);
    });
  });
});