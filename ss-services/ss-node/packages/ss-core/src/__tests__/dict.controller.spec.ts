// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DictController } from '../dict/dict.controller';
import { DictionaryLoaderService } from '../dict/dict-loader.service';
import { DictTable, DictCategory } from '../dict/dict.types';

type MockDictLoader = Partial<Record<keyof DictionaryLoaderService, jest.Mock>>;

function createMockDictLoader(): MockDictLoader {
  return {
    getCategories: jest.fn(),
    getAllDicts: jest.fn(),
    getDict: jest.fn(),
    reloadDicts: jest.fn(),
    addDict: jest.fn(),
    updateDict: jest.fn(),
    deleteDict: jest.fn(),
    addDictItem: jest.fn(),
    updateDictItem: jest.fn(),
    deleteDictItem: jest.fn(),
  };
}

function makeDictTable(overrides: Partial<DictTable> = {}): DictTable {
  return {
    dictId: 'test_dict',
    dictName: 'Test Dict',
    category: 'test',
    items: [{ value: '1', label: 'Test Item' }],
    ...overrides,
  };
}

function makeCategories(): DictCategory[] {
  return [
    {
      category: 'system',
      name: 'system',
      tables: [makeDictTable({ dictId: 'sys_yes_no', category: 'system' })],
    },
    {
      category: 'business',
      name: 'business',
      tables: [makeDictTable({ dictId: 'biz_device_status', category: 'business' })],
    },
  ];
}

describe('DictController', () => {
  let controller: DictController;
  let mockDictLoader: MockDictLoader;

  beforeEach(() => {
    mockDictLoader = createMockDictLoader();
    controller = new DictController(mockDictLoader as any);
  });

  describe('TC-DICT-010: GET /dicts returns categories', () => {
    it('should return categories tree with default locale', () => {
      const categories = makeCategories();
      mockDictLoader.getCategories!.mockReturnValue(categories);

      const result = controller.getCategories();

      expect(mockDictLoader.getCategories).toHaveBeenCalledWith(undefined);
      expect(result.code).toBe(0);
      expect(result.data).toEqual(categories);
      expect(result.message).toBe('ok');
    });

    it('should pass locale query parameter', () => {
      const categories = makeCategories();
      mockDictLoader.getCategories!.mockReturnValue(categories);

      controller.getCategories('en-US');

      expect(mockDictLoader.getCategories).toHaveBeenCalledWith('en-US');
    });
  });

  describe('TC-DICT-011: GET /dicts/all returns all dicts', () => {
    it('should return all dicts with default locale', () => {
      const dicts = [makeDictTable()];
      mockDictLoader.getAllDicts!.mockReturnValue(dicts);

      const result = controller.getAllDicts();

      expect(mockDictLoader.getAllDicts).toHaveBeenCalledWith(undefined);
      expect(result.code).toBe(0);
      expect(result.data).toEqual(dicts);
      expect(result.message).toBe('ok');
    });

    it('should pass locale query parameter', () => {
      const dicts = [makeDictTable()];
      mockDictLoader.getAllDicts!.mockReturnValue(dicts);

      controller.getAllDicts('en-US');

      expect(mockDictLoader.getAllDicts).toHaveBeenCalledWith('en-US');
    });
  });

  describe('TC-DICT-012: GET /dicts/:dictId with locale', () => {
    it('should return a single dict when found', () => {
      const dict = makeDictTable({ dictId: 'sys_yes_no' });
      mockDictLoader.getDict!.mockReturnValue(dict);

      const result = controller.getDict('sys_yes_no', 'zh-CN');

      expect(mockDictLoader.getDict).toHaveBeenCalledWith('sys_yes_no', 'zh-CN');
      expect(result.code).toBe(0);
      expect(result.data).toEqual(dict);
      expect(result.message).toBe('ok');
    });

    it('should return 404 when dict not found', () => {
      mockDictLoader.getDict!.mockReturnValue(null);

      const result = controller.getDict('unknown', 'zh-CN');

      expect(result.code).toBe(404);
      expect(result.data).toBeNull();
      expect(result.message).toContain('Dict not found');
    });

    it('should use default locale when not provided', () => {
      const dict = makeDictTable();
      mockDictLoader.getDict!.mockReturnValue(dict);

      controller.getDict('test_dict');

      expect(mockDictLoader.getDict).toHaveBeenCalledWith('test_dict', undefined);
    });
  });

  describe('TC-DICT-013: POST /dicts/reload', () => {
    it('should call reloadDicts and return success', () => {
      const result = controller.reloadDicts();

      expect(mockDictLoader.reloadDicts).toHaveBeenCalled();
      expect(result.code).toBe(0);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Dicts reloaded successfully');
    });
  });

  // ==================== CRUD: Dict endpoints ====================

  describe('TC-DICT-110: POST /dicts - create dict', () => {
    it('should create a new dictionary and return 201', () => {
      const newDict = makeDictTable({ dictId: 'new_dict' });
      mockDictLoader.addDict!.mockReturnValue(true);

      const result = controller.createDict(newDict);

      expect(mockDictLoader.addDict).toHaveBeenCalledWith(newDict, undefined);
      expect(result.code).toBe(0);
      expect(result.data).toEqual(newDict);
      expect(result.message).toBe('Dict created successfully');
    });

    it('should return 409 when dict already exists', () => {
      const duplicate = makeDictTable({ dictId: 'existing' });
      mockDictLoader.addDict!.mockReturnValue(false);

      const result = controller.createDict(duplicate);

      expect(result.code).toBe(409);
      expect(result.data).toBeNull();
      expect(result.message).toContain('Dict already exists');
    });

    it('should pass locale query parameter', () => {
      const newDict = makeDictTable();
      mockDictLoader.addDict!.mockReturnValue(true);

      controller.createDict(newDict, 'en-US');

      expect(mockDictLoader.addDict).toHaveBeenCalledWith(newDict, 'en-US');
    });
  });

  describe('TC-DICT-111: PUT /dicts/:dictId - update dict', () => {
    it('should update an existing dictionary', () => {
      const updates = { dictName: 'Updated Name' };
      const updated = makeDictTable({ dictId: 'test_dict', dictName: 'Updated Name' });
      mockDictLoader.updateDict!.mockReturnValue(true);
      mockDictLoader.getDict!.mockReturnValue(updated);

      const result = controller.updateDict('test_dict', updates);

      expect(mockDictLoader.updateDict).toHaveBeenCalledWith('test_dict', updates, undefined);
      expect(result.code).toBe(0);
      expect(result.data).toEqual(updated);
      expect(result.message).toBe('Dict updated successfully');
    });

    it('should return 404 when dict not found', () => {
      mockDictLoader.updateDict!.mockReturnValue(false);

      const result = controller.updateDict('unknown', { dictName: 'X' });

      expect(result.code).toBe(404);
      expect(result.data).toBeNull();
      expect(result.message).toContain('Dict not found');
    });

    it('should pass locale query parameter', () => {
      mockDictLoader.updateDict!.mockReturnValue(true);
      mockDictLoader.getDict!.mockReturnValue(makeDictTable());

      controller.updateDict('test_dict', { dictName: 'EN' }, 'en-US');

      expect(mockDictLoader.updateDict).toHaveBeenCalledWith(
        'test_dict',
        { dictName: 'EN' },
        'en-US',
      );
    });
  });

  describe('TC-DICT-112: DELETE /dicts/:dictId - delete dict', () => {
    it('should delete an existing dictionary', () => {
      mockDictLoader.deleteDict!.mockReturnValue(true);

      const result = controller.deleteDict('test_dict');

      expect(mockDictLoader.deleteDict).toHaveBeenCalledWith('test_dict', undefined);
      expect(result.code).toBe(0);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Dict deleted successfully');
    });

    it('should return 404 when dict not found', () => {
      mockDictLoader.deleteDict!.mockReturnValue(false);

      const result = controller.deleteDict('unknown');

      expect(result.code).toBe(404);
      expect(result.data).toBeNull();
      expect(result.message).toContain('Dict not found');
    });

    it('should pass locale query parameter', () => {
      mockDictLoader.deleteDict!.mockReturnValue(true);

      controller.deleteDict('test_dict', 'en-US');

      expect(mockDictLoader.deleteDict).toHaveBeenCalledWith('test_dict', 'en-US');
    });
  });

  // ==================== CRUD: Dict item endpoints ====================

  describe('TC-DICT-113: POST /dicts/:dictId/items - add dict item', () => {
    it('should add an item to a dict and return 201', () => {
      const item = { value: 'new_val', label: 'New Label' };
      mockDictLoader.addDictItem!.mockReturnValue(true);

      const result = controller.addDictItem('test_dict', item);

      expect(mockDictLoader.addDictItem).toHaveBeenCalledWith('test_dict', item, undefined);
      expect(result.code).toBe(0);
      expect(result.data).toEqual(item);
      expect(result.message).toBe('Dict item added successfully');
    });

    it('should return 404 when dict not found', () => {
      mockDictLoader.addDictItem!.mockReturnValue(false);

      const result = controller.addDictItem('unknown', { value: 'x', label: 'X' });

      expect(result.code).toBe(404);
      expect(result.data).toBeNull();
      expect(result.message).toContain('Dict not found');
    });

    it('should pass locale query parameter', () => {
      const item = { value: 'v', label: 'L' };
      mockDictLoader.addDictItem!.mockReturnValue(true);

      controller.addDictItem('test_dict', item, 'en-US');

      expect(mockDictLoader.addDictItem).toHaveBeenCalledWith('test_dict', item, 'en-US');
    });
  });

  describe('TC-DICT-114: PUT /dicts/:dictId/items/:itemValue - update dict item', () => {
    it('should update a dict item', () => {
      const updates = { label: 'Updated Label' };
      mockDictLoader.updateDictItem!.mockReturnValue(true);

      const result = controller.updateDictItem('test_dict', 'old_val', updates);

      expect(mockDictLoader.updateDictItem).toHaveBeenCalledWith(
        'test_dict',
        'old_val',
        updates,
        undefined,
      );
      expect(result.code).toBe(0);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Dict item updated successfully');
    });

    it('should return 404 when dict or item not found', () => {
      mockDictLoader.updateDictItem!.mockReturnValue(false);

      const result = controller.updateDictItem('test_dict', 'unknown_val', { label: 'X' });

      expect(result.code).toBe(404);
      expect(result.data).toBeNull();
      expect(result.message).toContain('Dict item not found');
    });

    it('should pass locale query parameter', () => {
      mockDictLoader.updateDictItem!.mockReturnValue(true);

      controller.updateDictItem('test_dict', 'val', { label: 'EN' }, 'en-US');

      expect(mockDictLoader.updateDictItem).toHaveBeenCalledWith(
        'test_dict',
        'val',
        { label: 'EN' },
        'en-US',
      );
    });
  });

  describe('TC-DICT-115: DELETE /dicts/:dictId/items/:itemValue - delete dict item', () => {
    it('should delete a dict item', () => {
      mockDictLoader.deleteDictItem!.mockReturnValue(true);

      const result = controller.deleteDictItem('test_dict', 'old_val');

      expect(mockDictLoader.deleteDictItem).toHaveBeenCalledWith('test_dict', 'old_val', undefined);
      expect(result.code).toBe(0);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Dict item deleted successfully');
    });

    it('should return 404 when dict or item not found', () => {
      mockDictLoader.deleteDictItem!.mockReturnValue(false);

      const result = controller.deleteDictItem('test_dict', 'unknown_val');

      expect(result.code).toBe(404);
      expect(result.data).toBeNull();
      expect(result.message).toContain('Dict item not found');
    });

    it('should pass locale query parameter', () => {
      mockDictLoader.deleteDictItem!.mockReturnValue(true);

      controller.deleteDictItem('test_dict', 'val', 'en-US');

      expect(mockDictLoader.deleteDictItem).toHaveBeenCalledWith('test_dict', 'val', 'en-US');
    });
  });
});
