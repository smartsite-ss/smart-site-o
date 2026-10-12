// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as fs from 'fs';
import { DictionaryLoaderService } from '../dict/dict-loader.service';
import { Logger } from '@nestjs/common';
import { DictTable } from '../dict/dict.types';

// Mock fs to prevent file system writes during tests
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(false),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    readdirSync: jest.fn().mockReturnValue([]),
    readFileSync: jest.fn().mockReturnValue(''),
    statSync: jest.fn().mockReturnValue({ isDirectory: () => true }),
  };
});

describe('DictionaryLoaderService', () => {
  let service: DictionaryLoaderService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new DictionaryLoaderService({
      resolve: jest.fn((p: string) => require('path').resolve(p)),
      getProjectRoot: jest.fn(() => process.cwd()),
      resolveEnv: jest.fn((_env: string, d: string) => require('path').resolve(d)),
    } as any);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('TC-DICT-001: load dicts on init', () => {
    it('should load embedded default dicts on module init', () => {
      const allDicts = service.getAllDicts();
      expect(allDicts.length).toBeGreaterThan(0);
      expect(allDicts.some((d) => d.dictId === 'sys_yes_no')).toBe(true);
    });
  });

  describe('TC-DICT-002: get dict by id', () => {
    it('should return the correct dict for a valid dictId', () => {
      const dict = service.getDict('sys_yes_no');
      expect(dict).not.toBeNull();
      expect(dict!.dictId).toBe('sys_yes_no');
      expect(dict!.dictName).toBe('是/否');
      expect(dict!.items.length).toBe(2);
    });
  });

  describe('TC-DICT-003: get all dicts', () => {
    it('should return all dicts for the default locale', () => {
      const allDicts = service.getAllDicts();
      expect(Array.isArray(allDicts)).toBe(true);
      expect(allDicts.length).toBeGreaterThanOrEqual(6);
      allDicts.forEach((dict) => {
        expect(dict).toHaveProperty('dictId');
        expect(dict).toHaveProperty('dictName');
        expect(dict).toHaveProperty('category');
        expect(dict).toHaveProperty('items');
        expect(Array.isArray(dict.items)).toBe(true);
      });
    });
  });

  describe('TC-DICT-004: get categories tree', () => {
    it('should return dicts organized by category', () => {
      const categories = service.getCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      categories.forEach((cat) => {
        expect(cat).toHaveProperty('category');
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('tables');
        expect(Array.isArray(cat.tables)).toBe(true);
        cat.tables.forEach((table) => {
          expect(table.category).toBe(cat.category);
        });
      });
    });
  });

  describe('TC-DICT-005: locale fallback to zh-CN', () => {
    it('should return zh-CN dicts when locale is zh-CN', () => {
      const dict = service.getDict('sys_yes_no', 'zh-CN');
      expect(dict).not.toBeNull();
      expect(dict!.dictName).toBe('是/否');
    });

    it('should return en-US dicts when locale is en-US', () => {
      const dict = service.getDict('sys_yes_no', 'en-US');
      expect(dict).not.toBeNull();
      expect(dict!.dictName).toBe('Yes/No');
    });

    it('should fallback to zh-CN when locale is not found', () => {
      const dict = service.getDict('sys_yes_no', 'fr-FR');
      expect(dict).not.toBeNull();
      expect(dict!.dictName).toBe('是/否');
    });
  });

  describe('TC-DICT-006: unknown dict returns null', () => {
    it('should return null for an unknown dictId', () => {
      const dict = service.getDict('non_existent_dict');
      expect(dict).toBeNull();
    });

    it('should return empty array for getAllDicts with unknown locale', () => {
      // Clear cache and set to empty to simulate no locale
      const emptyService = new DictionaryLoaderService({
        resolve: jest.fn((p: string) => require('path').resolve(p)),
        getProjectRoot: jest.fn(() => process.cwd()),
        resolveEnv: jest.fn((_env: string, d: string) => require('path').resolve(d)),
      } as any);
      // Skip init to avoid loading embedded dicts
      const allDicts = emptyService.getAllDicts('fr-FR');
      expect(Array.isArray(allDicts)).toBe(true);
    });
  });

  describe('TC-DICT-007: reload dicts', () => {
    it('should reload dicts without error', () => {
      expect(() => service.reloadDicts()).not.toThrow();
    });

    it('should have dicts available after reload', () => {
      service.reloadDicts();
      const dict = service.getDict('sys_yes_no');
      expect(dict).not.toBeNull();
      expect(dict!.dictId).toBe('sys_yes_no');
    });
  });

  describe('TC-DICT-008: get categories with correct structure', () => {
    it('should group dicts by their category field', () => {
      const categories = service.getCategories();

      const systemCategory = categories.find((c) => c.category === 'system');
      expect(systemCategory).toBeDefined();
      expect(systemCategory!.tables.length).toBeGreaterThanOrEqual(4);
      expect(systemCategory!.tables.some((t) => t.dictId === 'sys_yes_no')).toBe(true);

      const businessCategory = categories.find((c) => c.category === 'business');
      expect(businessCategory).toBeDefined();
      expect(businessCategory!.tables.length).toBeGreaterThanOrEqual(2);
      expect(businessCategory!.tables.some((t) => t.dictId === 'biz_device_status')).toBe(true);
    });
  });

  // ==================== CRUD: Dict operations ====================

  describe('TC-DICT-101: addDict - create new dictionary', () => {
    it('should add a new dict to the cache', () => {
      const newDict: DictTable = {
        dictId: 'test_new_dict',
        dictName: 'Test New Dict',
        category: 'test',
        items: [{ value: '1', label: 'One', sortOrder: 1 }],
      };

      const result = service.addDict(newDict);

      expect(result).toBe(true);
      const added = service.getDict('test_new_dict');
      expect(added).not.toBeNull();
      expect(added!.dictId).toBe('test_new_dict');
      expect(added!.dictName).toBe('Test New Dict');
      expect(added!.items).toHaveLength(1);
    });

    it('should return false when dictId already exists', () => {
      const duplicate: DictTable = {
        dictId: 'sys_yes_no',
        dictName: 'Duplicate',
        category: 'system',
        items: [],
      };

      const result = service.addDict(duplicate);

      expect(result).toBe(false);
    });

    it('should add dict with explicit locale', () => {
      const newDict: DictTable = {
        dictId: 'en_only_dict',
        dictName: 'EN Only',
        category: 'test',
        items: [{ value: '1', label: 'One', sortOrder: 1 }],
      };

      const result = service.addDict(newDict, 'en-US');

      expect(result).toBe(true);
      const added = service.getDict('en_only_dict', 'en-US');
      expect(added).not.toBeNull();
      expect(added!.dictName).toBe('EN Only');
      // Should not exist in default zh-CN locale
      const zhCN = service.getDict('en_only_dict', 'zh-CN');
      expect(zhCN).toBeNull();
    });
  });

  describe('TC-DICT-102: updateDict - update dictionary metadata', () => {
    it('should update dict metadata (dictName, description)', () => {
      const result = service.updateDict('sys_yes_no', {
        dictName: 'Updated Yes/No',
      });

      expect(result).toBe(true);
      const updated = service.getDict('sys_yes_no');
      expect(updated).not.toBeNull();
      expect(updated!.dictName).toBe('Updated Yes/No');
      // dictId should remain unchanged
      expect(updated!.dictId).toBe('sys_yes_no');
    });

    it('should update dict items array', () => {
      const newItems = [
        { value: 'true', label: 'True', sortOrder: 1 },
        { value: 'false', label: 'False', sortOrder: 2 },
      ];

      const result = service.updateDict('sys_yes_no', { items: newItems });

      expect(result).toBe(true);
      const updated = service.getDict('sys_yes_no');
      expect(updated!.items).toHaveLength(2);
      expect(updated!.items[0].value).toBe('true');
    });

    it('should preserve dictId even when updates contain dictId', () => {
      const result = service.updateDict('sys_yes_no', { dictId: 'hacked_id' } as any);

      expect(result).toBe(true);
      const updated = service.getDict('sys_yes_no');
      expect(updated!.dictId).toBe('sys_yes_no');
    });

    it('should return false when dict does not exist', () => {
      const result = service.updateDict('non_existent', { dictName: 'X' });

      expect(result).toBe(false);
    });

    it('should update dict in specific locale', () => {
      const result = service.updateDict('sys_yes_no', { dictName: 'EN Updated' }, 'en-US');

      expect(result).toBe(true);
      const enDict = service.getDict('sys_yes_no', 'en-US');
      expect(enDict!.dictName).toBe('EN Updated');
      // zh-CN should remain unchanged
      const zhDict = service.getDict('sys_yes_no', 'zh-CN');
      expect(zhDict!.dictName).toBe('是/否');
    });
  });

  describe('TC-DICT-103: deleteDict - delete dictionary', () => {
    it('should delete an existing dict', () => {
      const before = service.getDict('biz_alarm_level');
      expect(before).not.toBeNull();

      const result = service.deleteDict('biz_alarm_level');

      expect(result).toBe(true);
      const after = service.getDict('biz_alarm_level');
      expect(after).toBeNull();
    });

    it('should return false when dict does not exist', () => {
      const result = service.deleteDict('non_existent');

      expect(result).toBe(false);
    });

    it('should delete dict in specific locale only', () => {
      const result = service.deleteDict('sys_yes_no', 'en-US');

      expect(result).toBe(true);
      // en-US should be deleted
      const enDict = service.getDict('sys_yes_no', 'en-US');
      expect(enDict).toBeNull();
      // zh-CN should still exist
      const zhDict = service.getDict('sys_yes_no', 'zh-CN');
      expect(zhDict).not.toBeNull();
    });
  });

  // ==================== CRUD: Dict item operations ====================

  describe('TC-DICT-104: addDictItem - add item to dictionary', () => {
    it('should add a new item to an existing dict', () => {
      const result = service.addDictItem('sys_yes_no', {
        value: '2',
        label: '未知',
        sortOrder: 3,
      });

      expect(result).toBe(true);
      const dict = service.getDict('sys_yes_no');
      expect(dict!.items).toHaveLength(3);
      expect(dict!.items.some((i) => i.value === '2')).toBe(true);
    });

    it('should auto-assign sortOrder when not provided', () => {
      const result = service.addDictItem('sys_yes_no', {
        value: '3',
        label: 'Three',
      });

      expect(result).toBe(true);
      const dict = service.getDict('sys_yes_no');
      const added = dict!.items.find((i) => i.value === '3');
      expect(added).toBeDefined();
      expect(added!.sortOrder).toBeGreaterThan(0);
    });

    it('should return false when dict does not exist', () => {
      const result = service.addDictItem('non_existent', {
        value: '1',
        label: 'One',
      });

      expect(result).toBe(false);
    });
  });

  describe('TC-DICT-105: updateDictItem - update dict item', () => {
    it('should update item label', () => {
      const result = service.updateDictItem('sys_yes_no', '1', { label: '是（更新）' });

      expect(result).toBe(true);
      const dict = service.getDict('sys_yes_no');
      const item = dict!.items.find((i) => i.value === '1');
      expect(item!.label).toBe('是（更新）');
    });

    it('should update item sortOrder', () => {
      const result = service.updateDictItem('sys_yes_no', '1', { sortOrder: 99 });

      expect(result).toBe(true);
      const dict = service.getDict('sys_yes_no');
      const item = dict!.items.find((i) => i.value === '1');
      expect(item!.sortOrder).toBe(99);
    });

    it('should return false when dict does not exist', () => {
      const result = service.updateDictItem('non_existent', '1', { label: 'X' });

      expect(result).toBe(false);
    });

    it('should return false when item value not found', () => {
      const result = service.updateDictItem('sys_yes_no', '999', { label: 'X' });

      expect(result).toBe(false);
    });
  });

  describe('TC-DICT-106: deleteDictItem - delete dict item', () => {
    it('should delete an item from an existing dict', () => {
      const before = service.getDict('sys_yes_no')!.items.length;

      const result = service.deleteDictItem('sys_yes_no', '1');

      expect(result).toBe(true);
      const dict = service.getDict('sys_yes_no');
      expect(dict!.items).toHaveLength(before - 1);
      expect(dict!.items.some((i) => i.value === '1')).toBe(false);
    });

    it('should return false when dict does not exist', () => {
      const result = service.deleteDictItem('non_existent', '1');

      expect(result).toBe(false);
    });

    it('should return false when item value not found', () => {
      const result = service.deleteDictItem('sys_yes_no', '999');

      expect(result).toBe(false);
    });
  });

  // ==================== File system loading ====================

  describe('TC-DICT-009: load dicts from file system', () => {
    const validDictJson = JSON.stringify({
      dictId: 'fs_test_dict',
      dictName: 'FS Test',
      category: 'test',
      items: [{ value: '1', label: 'One', sortOrder: 1 }],
    });

    afterEach(() => {
      // Reset fs mocks to defaults so embedded-dict path is used again
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      (fs.readFileSync as jest.Mock).mockReturnValue('');
    });

    it('should load dicts from file system when directory exists', () => {
      const mockLocaleDir = { isDirectory: () => true, name: 'zh-CN' };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      // 1st call: scan locale dirs; 2nd call: list files under locale dir
      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce([mockLocaleDir])
        .mockReturnValueOnce(['fs_test_dict.json']);
      (fs.readFileSync as jest.Mock).mockReturnValue(validDictJson);

      const svc = new DictionaryLoaderService({
        resolve: jest.fn((p: string) => require('path').resolve(p)),
        getProjectRoot: jest.fn(() => process.cwd()),
        resolveEnv: jest.fn((_env: string, d: string) => require('path').resolve(d)),
      } as any);
      svc.onModuleInit();

      const dict = svc.getDict('fs_test_dict', 'zh-CN');
      expect(dict).not.toBeNull();
      expect(dict!.dictName).toBe('FS Test');
      expect(dict!.items).toHaveLength(1);
    });

    it('should skip dict file missing dictId or items', () => {
      const mockLocaleDir = { isDirectory: () => true, name: 'zh-CN' };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce([mockLocaleDir])
        .mockReturnValueOnce(['bad.json', 'good.json']);
      (fs.readFileSync as jest.Mock)
        .mockReturnValueOnce(JSON.stringify({ dictName: 'NoId', items: [] })) // missing dictId
        .mockReturnValueOnce(validDictJson);

      const svc = new DictionaryLoaderService({
        resolve: jest.fn((p: string) => require('path').resolve(p)),
        getProjectRoot: jest.fn(() => process.cwd()),
        resolveEnv: jest.fn((_env: string, d: string) => require('path').resolve(d)),
      } as any);
      svc.onModuleInit();

      expect(svc.getDict('bad')).toBeNull();
      expect(svc.getDict('fs_test_dict')).not.toBeNull();
    });

    it('should skip dict file with invalid JSON without throwing', () => {
      const mockLocaleDir = { isDirectory: () => true, name: 'zh-CN' };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce([mockLocaleDir])
        .mockReturnValueOnce(['broken.json']);
      (fs.readFileSync as jest.Mock).mockReturnValue('{ invalid json }');

      const svc = new DictionaryLoaderService({
        resolve: jest.fn((p: string) => require('path').resolve(p)),
        getProjectRoot: jest.fn(() => process.cwd()),
        resolveEnv: jest.fn((_env: string, d: string) => require('path').resolve(d)),
      } as any);
      expect(() => svc.onModuleInit()).not.toThrow();
      expect(svc.getDict('broken')).toBeNull();
    });
  });

  // ==================== Persistence ====================

  describe('TC-DICT-107: persistence to file system', () => {
    afterEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      (fs.readFileSync as jest.Mock).mockReturnValue('');
    });

    it('should write dict to file when addDict is called', () => {
      const newDict: DictTable = {
        dictId: 'persist_test',
        dictName: 'Persist Test',
        category: 'test',
        items: [{ value: '1', label: 'One', sortOrder: 1 }],
      };

      service.addDict(newDict);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('persist_test.json'),
      );
      expect(writeCall).toBeDefined();
      expect(writeCall![1]).toContain('persist_test');
    });

    it('should delete dict file when deleteDict is called', () => {
      const newDict: DictTable = {
        dictId: 'del_persist',
        dictName: 'Del Test',
        category: 'test',
        items: [],
      };
      service.addDict(newDict);

      // Pretend the file exists so unlink is invoked
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      service.deleteDict('del_persist');

      expect(fs.unlinkSync).toHaveBeenCalled();
      const unlinkCall = (fs.unlinkSync as jest.Mock).mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('del_persist.json'),
      );
      expect(unlinkCall).toBeDefined();
    });
  });
});
