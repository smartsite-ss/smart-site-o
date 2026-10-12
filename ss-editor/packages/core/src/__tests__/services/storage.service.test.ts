// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ==================== Mocks ====================

// Mock errorService
const mockRecord = vi.fn();
vi.mock('../../utils/core/errors', () => ({
  StorageError: class StorageError extends Error {
    public operation: string;
    constructor(operation: string, reason: string) {
      super(`Storage operation failed: ${operation} - ${reason}`);
      this.name = 'StorageError';
      this.operation = operation;
    }
  },
  errorService: {
    record: (...args: any[]) => mockRecord(...args),
  },
}));

// Setup localStorage mock
const storageData: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => {
    return storageData[key] ?? null;
  }),
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
  key: vi.fn((index: number) => {
    return Object.keys(storageData)[index] ?? null;
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

import * as StorageService from '../../services/storage.service';

describe('StorageService', () => {
  beforeEach(() => {
    // Clear storage
    Object.keys(storageData).forEach((key) => delete storageData[key]);
    vi.clearAllMocks();
    // Reset mock implementations to default behavior
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      storageData[key] = value;
    });
    localStorageMock.getItem.mockImplementation((key: string) => {
      return storageData[key] ?? null;
    });
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete storageData[key];
    });
    localStorageMock.clear.mockImplementation(() => {
      Object.keys(storageData).forEach((key) => delete storageData[key]);
    });
  });

  // ==================== TC-STORAGE-001: saveToStorage ====================
  describe('TC-STORAGE-001: saveToStorage', () => {
    it('TC-STORAGE-001-01: should serialize and save data to localStorage', () => {
      const data = { name: 'test', value: 123 };

      StorageService.saveToStorage('test-key', data);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(data));
      expect(storageData['test-key']).toBe(JSON.stringify(data));
    });

    it('TC-STORAGE-001-02: should handle primitive values', () => {
      StorageService.saveToStorage('string-key', 'hello');
      StorageService.saveToStorage('number-key', 42);
      StorageService.saveToStorage('bool-key', true);

      expect(storageData['string-key']).toBe('"hello"');
      expect(storageData['number-key']).toBe('42');
      expect(storageData['bool-key']).toBe('true');
    });

    it('TC-STORAGE-001-03: should handle arrays', () => {
      const data = [1, 2, 3, { a: 'b' }];

      StorageService.saveToStorage('array-key', data);

      expect(storageData['array-key']).toBe(JSON.stringify(data));
    });

    it('TC-STORAGE-001-04: should handle null values', () => {
      StorageService.saveToStorage('null-key', null);

      expect(storageData['null-key']).toBe('null');
    });

    it('TC-STORAGE-001-05: should throw on error when throwOnError is true', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(() => {
        StorageService.saveToStorage('bad-key', 'data', true);
      }).toThrow('Storage operation failed: save - Storage full');
    });

    it('TC-STORAGE-001-06: should not throw on error when throwOnError is false', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        StorageService.saveToStorage('bad-key', 'data');
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('TC-STORAGE-001-07: should handle circular references gracefully', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        StorageService.saveToStorage('circular-key', circular);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  // ==================== TC-STORAGE-002: loadFromStorage ====================
  describe('TC-STORAGE-002: loadFromStorage', () => {
    it('TC-STORAGE-002-01: should load and parse data from localStorage', () => {
      storageData['test-key'] = JSON.stringify({ name: 'test', value: 123 });

      const result = StorageService.loadFromStorage('test-key');

      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('TC-STORAGE-002-02: should return null for non-existent key', () => {
      const result = StorageService.loadFromStorage('non-existent');

      expect(result).toBeNull();
    });

    it('TC-STORAGE-002-03: should handle primitives', () => {
      storageData['string-key'] = '"hello"';
      storageData['number-key'] = '42';
      storageData['bool-key'] = 'true';

      expect(StorageService.loadFromStorage('string-key')).toBe('hello');
      expect(StorageService.loadFromStorage('number-key')).toBe(42);
      expect(StorageService.loadFromStorage('bool-key')).toBe(true);
    });

    it('TC-STORAGE-002-04: should handle arrays', () => {
      storageData['array-key'] = JSON.stringify([1, 2, { a: 'b' }]);

      const result = StorageService.loadFromStorage('array-key');

      expect(result).toEqual([1, 2, { a: 'b' }]);
    });

    it('TC-STORAGE-002-05: should return null for null stored value', () => {
      storageData['null-key'] = 'null';

      const result = StorageService.loadFromStorage('null-key');

      expect(result).toBeNull();
    });

    it('TC-STORAGE-002-06: should throw on JSON parse error when throwOnError is true', () => {
      storageData['bad-key'] = 'not valid json{{{';

      expect(() => {
        StorageService.loadFromStorage('bad-key', true);
      }).toThrow(/Storage operation failed/);
    });

    it('TC-STORAGE-002-07: should return null on JSON parse error when throwOnError is false', () => {
      storageData['bad-key'] = 'not valid json{{{';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = StorageService.loadFromStorage('bad-key');

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  // ==================== TC-STORAGE-003: removeFromStorage ====================
  describe('TC-STORAGE-003: removeFromStorage', () => {
    it('TC-STORAGE-003-01: should remove data from localStorage', () => {
      storageData['test-key'] = JSON.stringify({ data: 'test' });

      StorageService.removeFromStorage('test-key');

      expect(storageData['test-key']).toBeUndefined();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('TC-STORAGE-003-02: should not throw when removing non-existent key', () => {
      expect(() => {
        StorageService.removeFromStorage('non-existent');
      }).not.toThrow();
    });

    it('TC-STORAGE-003-03: should throw on error when throwOnError is true', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        StorageService.removeFromStorage('bad-key', true);
      }).toThrow(/Storage operation failed/);
    });
  });

  // ==================== TC-STORAGE-004: clearStorage ====================
  describe('TC-STORAGE-004: clearStorage', () => {
    it('TC-STORAGE-004-01: should clear all localStorage data', () => {
      storageData['key1'] = 'value1';
      storageData['key2'] = 'value2';

      StorageService.clearStorage();

      expect(storageData['key1']).toBeUndefined();
      expect(storageData['key2']).toBeUndefined();
      expect(localStorageMock.clear).toHaveBeenCalled();
    });

    it('TC-STORAGE-004-02: should not throw when storage is already empty', () => {
      expect(() => {
        StorageService.clearStorage();
      }).not.toThrow();
    });

    it('TC-STORAGE-004-03: should throw on error when throwOnError is true', () => {
      localStorageMock.clear.mockImplementation(() => {
        throw new Error('Clear failed');
      });

      expect(() => {
        StorageService.clearStorage(true);
      }).toThrow(/Storage operation failed/);
    });
  });

  // ==================== TC-STORAGE-005: Project Operations ====================
  describe('TC-STORAGE-005: Project Operations', () => {
    it('TC-STORAGE-005-01: saveProject should save with PROJECT key', () => {
      const project = { name: 'Test Project', pages: [] };

      StorageService.saveProject(project);

      expect(storageData['scada-editor-project']).toBe(JSON.stringify(project));
    });

    it('TC-STORAGE-005-02: loadProject should load from PROJECT key', () => {
      const project = { name: 'Test Project', pages: [] };
      storageData['scada-editor-project'] = JSON.stringify(project);

      const result = StorageService.loadProject();

      expect(result).toEqual(project);
    });

    it('TC-STORAGE-005-03: loadProject should return null when no project saved', () => {
      const result = StorageService.loadProject();

      expect(result).toBeNull();
    });
  });

  // ==================== TC-STORAGE-006: Auto Save Operations ====================
  describe('TC-STORAGE-006: Auto Save Operations', () => {
    it('TC-STORAGE-006-01: saveAutoSave should save with AUTO_SAVE key', () => {
      const data = { pages: [], currentPageId: 'page-1' };

      StorageService.saveAutoSave(data);

      expect(storageData['scada-editor-auto-save']).toBe(JSON.stringify(data));
    });

    it('TC-STORAGE-006-02: loadAutoSave should load from AUTO_SAVE key', () => {
      const data = { pages: [], currentPageId: 'page-1' };
      storageData['scada-editor-auto-save'] = JSON.stringify(data);

      const result = StorageService.loadAutoSave();

      expect(result).toEqual(data);
    });

    it('TC-STORAGE-006-03: loadAutoSave should return null when no auto save', () => {
      const result = StorageService.loadAutoSave();

      expect(result).toBeNull();
    });

    it('TC-STORAGE-006-04: clearAutoSave should remove AUTO_SAVE key', () => {
      storageData['scada-editor-auto-save'] = JSON.stringify({ data: 'test' });

      StorageService.clearAutoSave();

      expect(storageData['scada-editor-auto-save']).toBeUndefined();
    });
  });

  // ==================== TC-STORAGE-007: Settings Operations ====================
  describe('TC-STORAGE-007: Settings Operations', () => {
    it('TC-STORAGE-007-01: saveSettings should save with SETTINGS key', () => {
      const settings = { autoSave: true, autoSaveInterval: 60000 };

      StorageService.saveSettings(settings);

      expect(storageData['scada-editor-settings']).toBe(JSON.stringify(settings));
    });

    it('TC-STORAGE-007-02: loadSettings should return saved settings', () => {
      const settings = { autoSave: true, autoSaveInterval: 60000 };
      storageData['scada-editor-settings'] = JSON.stringify(settings);

      const result = StorageService.loadSettings();

      expect(result).toEqual(settings);
    });

    it('TC-STORAGE-007-03: loadSettings should return defaults when no settings saved', () => {
      const result = StorageService.loadSettings();

      expect(result).toEqual({
        autoSave: true,
        autoSaveInterval: 30000,
      });
    });
  });

  // ==================== TC-STORAGE-008: Projects List Operations ====================
  describe('TC-STORAGE-008: Projects List Operations', () => {
    it('TC-STORAGE-008-01: saveProjects should save with PROJECTS key', () => {
      const projects = [
        { name: 'Project 1', pages: [] },
        { name: 'Project 2', pages: [] },
      ];

      StorageService.saveProjects(projects);

      expect(storageData['scada-editor-projects']).toBe(JSON.stringify(projects));
    });

    it('TC-STORAGE-008-02: loadProjects should return saved projects', () => {
      const projects = [{ name: 'Project 1' }];
      storageData['scada-editor-projects'] = JSON.stringify(projects);

      const result = StorageService.loadProjects();

      expect(result).toEqual(projects);
    });

    it('TC-STORAGE-008-03: loadProjects should return empty array when no projects saved', () => {
      const result = StorageService.loadProjects();

      expect(result).toEqual([]);
    });
  });

  // ==================== TC-STORAGE-009: Templates Operations ====================
  describe('TC-STORAGE-009: Templates Operations', () => {
    it('TC-STORAGE-009-01: saveTemplates should save with TEMPLATES key', () => {
      const templates = [
        { name: 'Template 1', graphics: [] },
        { name: 'Template 2', graphics: [] },
      ];

      StorageService.saveTemplates(templates);

      expect(storageData['scada-editor-templates']).toBe(JSON.stringify(templates));
    });

    it('TC-STORAGE-009-02: loadTemplates should return saved templates', () => {
      const templates = [{ name: 'Template 1' }];
      storageData['scada-editor-templates'] = JSON.stringify(templates);

      const result = StorageService.loadTemplates();

      expect(result).toEqual(templates);
    });

    it('TC-STORAGE-009-03: loadTemplates should return empty array when no templates saved', () => {
      const result = StorageService.loadTemplates();

      expect(result).toEqual([]);
    });
  });

  // ==================== TC-STORAGE-010: Edge Cases ====================
  describe('TC-STORAGE-010: Edge Cases', () => {
    it('TC-STORAGE-010-01: should handle saving and loading empty object', () => {
      StorageService.saveToStorage('empty', {});

      const result = StorageService.loadFromStorage('empty');

      expect(result).toEqual({});
    });

    it('TC-STORAGE-010-02: should handle saving and loading empty array', () => {
      StorageService.saveToStorage('empty-array', []);

      const result = StorageService.loadFromStorage('empty-array');

      expect(result).toEqual([]);
    });

    it('TC-STORAGE-010-03: should handle saving and loading empty string', () => {
      StorageService.saveToStorage('empty-string', '');

      const result = StorageService.loadFromStorage('empty-string');

      expect(result).toBe('');
    });

    it('TC-STORAGE-010-04: should handle saving and loading zero', () => {
      StorageService.saveToStorage('zero', 0);

      const result = StorageService.loadFromStorage('zero');

      expect(result).toBe(0);
    });

    it('TC-STORAGE-010-05: should handle saving and loading false', () => {
      StorageService.saveToStorage('false', false);

      const result = StorageService.loadFromStorage('false');

      expect(result).toBe(false);
    });

    it('TC-STORAGE-010-06: should handle deeply nested objects', () => {
      const deep = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
              array: [1, { nested: true }],
            },
          },
        },
      };

      StorageService.saveToStorage('deep', deep);

      const result = StorageService.loadFromStorage('deep');

      expect(result).toEqual(deep);
    });

    it('TC-STORAGE-010-07: should handle special characters in keys and values', () => {
      const data = { name: 'test with special chars: !@#$%^&*()', description: 'emoji: 🎉' };

      StorageService.saveToStorage('special-chars', data);

      const result = StorageService.loadFromStorage('special-chars');

      expect(result).toEqual(data);
    });
  });

  // ==================== TC-STORAGE-011: throwOnError Behaviors ====================
  describe('TC-STORAGE-011: throwOnError Behaviors', () => {
    it('TC-STORAGE-011-01: saveProject with throwOnError should throw on error', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(() => {
        StorageService.saveProject({ name: 'test' }, true);
      }).toThrow();
    });

    it('TC-STORAGE-011-02: loadProject with throwOnError should throw on error', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Read error');
      });

      expect(() => {
        StorageService.loadProject(true);
      }).toThrow();
    });

    it('TC-STORAGE-011-03: clearAutoSave with throwOnError should throw on error', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Remove error');
      });

      expect(() => {
        StorageService.clearAutoSave(true);
      }).toThrow();
    });
  });
});