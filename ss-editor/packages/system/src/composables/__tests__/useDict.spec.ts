// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ======================== Mock dictApi ========================
const mockGetDict = vi.fn();

vi.mock('../../api/modules/dict.api', () => ({
  dictApi: {
    getDict: mockGetDict,
  },
}));

// ======================== Test data ========================
const mockDictTable: any = {
  dictId: 'priority',
  dictName: '优先级',
  category: 'common',
  description: '优先级字典',
  version: '1.0',
  sortOrder: 1,
  items: [
    { value: 'high', label: '高', sortOrder: 1, description: '' },
    { value: 'medium', label: '中', sortOrder: 2, description: '' },
    { value: 'low', label: '低', sortOrder: 3, description: '' },
  ],
};

const mockStatusDict: any = {
  dictId: 'status',
  dictName: '状态',
  category: 'common',
  description: '状态字典',
  version: '1.0',
  sortOrder: 1,
  items: [
    { value: 'active', label: '启用', sortOrder: 1, description: '' },
    { value: 'inactive', label: '停用', sortOrder: 2, description: '' },
  ],
};

// ======================== Import after mock ========================
async function importUseDict() {
  const mod = await import('../useDict');
  return mod.useDict;
}

describe('useDict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadDict - lazy loading', () => {
    it('should load a dictionary when not cached', async () => {
      const useDict = await importUseDict();
      const { loadDict, dicts, loading } = useDict();

      mockGetDict.mockResolvedValueOnce({ data: mockDictTable });

      const result = await loadDict('priority', 'zh-CN');

      expect(mockGetDict).toHaveBeenCalledWith('priority', 'zh-CN');
      expect(result).toEqual(mockDictTable);
      expect(dicts['priority']).toEqual(mockDictTable);
      expect(loading.value).toBe(false);
    });

    it('should return cached dictionary without making API call', async () => {
      const useDict = await importUseDict();
      const { loadDict, dicts } = useDict();

      mockGetDict.mockResolvedValueOnce({ data: mockDictTable });

      // First call: should hit API
      await loadDict('priority', 'zh-CN');
      expect(mockGetDict).toHaveBeenCalledTimes(1);

      // Second call: should return from cache
      const result = await loadDict('priority', 'zh-CN');
      expect(mockGetDict).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDictTable);
      expect(dicts['priority']).toEqual(mockDictTable);
    });
  });

  describe('loadDicts - batch loading', () => {
    it('should load multiple dictionaries in parallel', async () => {
      const useDict = await importUseDict();
      const { loadDicts, dicts } = useDict();

      mockGetDict
        .mockResolvedValueOnce({ data: mockDictTable })
        .mockResolvedValueOnce({ data: mockStatusDict });

      await loadDicts(['priority', 'status'], 'zh-CN');

      expect(mockGetDict).toHaveBeenCalledTimes(2);
      expect(mockGetDict).toHaveBeenCalledWith('priority', 'zh-CN');
      expect(mockGetDict).toHaveBeenCalledWith('status', 'zh-CN');
      expect(dicts['priority']).toEqual(mockDictTable);
      expect(dicts['status']).toEqual(mockStatusDict);
    });
  });

  describe('getLabel', () => {
    it('should return the label for a given value', async () => {
      const useDict = await importUseDict();
      const { loadDict, getLabel } = useDict();

      mockGetDict.mockResolvedValueOnce({ data: mockDictTable });
      await loadDict('priority', 'zh-CN');

      expect(getLabel('priority', 'high')).toBe('高');
      expect(getLabel('priority', 'medium')).toBe('中');
      expect(getLabel('priority', 'low')).toBe('低');
    });

    it('should return fallback text when value is not found', async () => {
      const useDict = await importUseDict();
      const { loadDict, getLabel } = useDict();

      mockGetDict.mockResolvedValueOnce({ data: mockDictTable });
      await loadDict('priority', 'zh-CN');

      expect(getLabel('priority', 'unknown', '未知')).toBe('未知');
    });

    it('should return the value itself when dict is not loaded and no fallback given', async () => {
      const useDict = await importUseDict();
      const { getLabel } = useDict();

      const result = getLabel('notLoaded', 'someValue');
      expect(result).toBe('someValue');
    });

    it('should return the value itself when dict item not found and no fallback given', async () => {
      const useDict = await importUseDict();
      const { loadDict, getLabel } = useDict();

      mockGetDict.mockResolvedValueOnce({ data: mockDictTable });
      await loadDict('priority', 'zh-CN');

      const result = getLabel('priority', 'notFound');
      expect(result).toBe('notFound');
    });
  });

  describe('getOptions', () => {
    it('should return sorted options array for a loaded dict', async () => {
      const useDict = await importUseDict();
      const { loadDict, getOptions } = useDict();

      mockGetDict.mockResolvedValueOnce({ data: mockDictTable });
      await loadDict('priority', 'zh-CN');

      const options = getOptions('priority');
      expect(options).toHaveLength(3);
      expect(options).toEqual([
        { value: 'high', label: '高' },
        { value: 'medium', label: '中' },
        { value: 'low', label: '低' },
      ]);
    });

    it('should return empty array when dict is not loaded', async () => {
      const useDict = await importUseDict();
      const { getOptions } = useDict();

      const options = getOptions('notLoaded');
      expect(options).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached dictionaries', async () => {
      const useDict = await importUseDict();
      const { loadDict, clearCache, dicts } = useDict();

      mockGetDict.mockResolvedValueOnce({ data: mockDictTable });
      await loadDict('priority', 'zh-CN');
      expect(dicts['priority']).toBeDefined();

      clearCache();
      expect(dicts['priority']).toBeUndefined();
    });
  });

  describe('getDict', () => {
    it('should return the cached dict', async () => {
      const useDict = await importUseDict();
      const { loadDict, getDict } = useDict();

      mockGetDict.mockResolvedValueOnce({ data: mockDictTable });
      await loadDict('priority', 'zh-CN');

      const dict = getDict('priority');
      expect(dict).toEqual(mockDictTable);
    });

    it('should return undefined when dict is not cached', async () => {
      const useDict = await importUseDict();
      const { getDict } = useDict();

      const dict = getDict('notLoaded');
      expect(dict).toBeUndefined();
    });
  });
});