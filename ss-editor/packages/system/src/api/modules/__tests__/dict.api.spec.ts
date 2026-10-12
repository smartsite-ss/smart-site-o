// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';

// ======================== Mock axios client ========================
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

const mockClient = {
  get: mockGet,
  post: mockPost,
  patch: mockPatch,
  put: mockPut,
  delete: mockDelete,
} as unknown as AxiosInstance;

vi.mock('../../client', () => ({
  default: mockClient,
}));

// ======================== Import after mock ========================
async function importDictApi() {
  const mod = await import('../dict.api');
  return mod.dictApi;
}

// ======================== Test data ========================
const mockCategory: any = {
  category: 'alarm',
  tables: [
    {
      dictId: 'alarmStatus',
      dictName: '告警状态',
      category: 'alarm',
      description: '告警状态字典',
      version: '1.0',
      sortOrder: 1,
      items: [
        { value: 'active', label: '活跃', sortOrder: 1, description: '' },
        { value: 'cleared', label: '已清除', sortOrder: 2, description: '' },
      ],
    },
  ],
};

const mockTable: any = {
  dictId: 'alarmStatus',
  dictName: '告警状态',
  category: 'alarm',
  description: '告警状态字典',
  version: '1.0',
  sortOrder: 1,
  items: [],
};

describe('dictApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should call GET /dicts and return categories', async () => {
      const dictApi = await importDictApi();
      const mockResponse = { data: { code: 0, data: [mockCategory], message: 'ok' } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await dictApi.getCategories('zh-CN');

      expect(mockGet).toHaveBeenCalledWith('/dicts', { params: { locale: 'zh-CN' } });
      expect(result).toEqual(mockResponse.data);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].category).toBe('alarm');
    });

    it('should call GET /dicts without locale parameter when not provided', async () => {
      const dictApi = await importDictApi();
      const mockResponse = { data: { code: 0, data: [], message: 'ok' } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await dictApi.getCategories();

      expect(mockGet).toHaveBeenCalledWith('/dicts', { params: { locale: undefined } });
      expect(result.data).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should call GET /dicts/all and return flat list of tables', async () => {
      const dictApi = await importDictApi();
      const mockResponse = { data: { code: 0, data: [mockTable], message: 'ok' } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await dictApi.getAll('en');

      expect(mockGet).toHaveBeenCalledWith('/dicts/all', { params: { locale: 'en' } });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].dictId).toBe('alarmStatus');
    });
  });

  describe('getDict', () => {
    it('should call GET /dicts/:dictId and return dict detail', async () => {
      const dictApi = await importDictApi();
      const mockResponse = { data: { code: 0, data: mockTable, message: 'ok' } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await dictApi.getDict('alarmStatus', 'zh-CN');

      expect(mockGet).toHaveBeenCalledWith('/dicts/alarmStatus', { params: { locale: 'zh-CN' } });
      expect(result.data).toEqual(mockTable);
      expect(result.data!.dictId).toBe('alarmStatus');
    });
  });

  describe('CRUD operations', () => {
    it('should call POST /dicts/categories to create a category', async () => {
      const dictApi = await importDictApi();
      const mockResponse = { data: { code: 0, data: null, message: 'ok' } };
      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await dictApi.createCategory('zh-CN', 'testCategory');

      expect(mockPost).toHaveBeenCalledWith('/dicts/categories', { locale: 'zh-CN', name: 'testCategory' });
      expect(result).toEqual(mockResponse.data);
    });

    it('should call PATCH /dicts/categories to rename a category', async () => {
      const dictApi = await importDictApi();
      const mockResponse = { data: { code: 0, data: null, message: 'ok' } };
      mockPatch.mockResolvedValueOnce(mockResponse);

      const result = await dictApi.renameCategory('zh-CN', 'oldName', 'newName');

      expect(mockPatch).toHaveBeenCalledWith('/dicts/categories', { locale: 'zh-CN', oldName: 'oldName', newName: 'newName' });
      expect(result).toEqual(mockResponse.data);
    });

    it('should call DELETE /dicts/categories to delete a category', async () => {
      const dictApi = await importDictApi();
      const mockResponse = { data: { code: 0, data: null, message: 'ok' } };
      mockDelete.mockResolvedValueOnce(mockResponse);

      const result = await dictApi.deleteCategory('zh-CN', 'testCategory');

      expect(mockDelete).toHaveBeenCalledWith('/dicts/categories', { data: { locale: 'zh-CN', name: 'testCategory' } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should call POST /dicts/tables to create a table', async () => {
      const dictApi = await importDictApi();
      const mockResponse = { data: { code: 0, data: null, message: 'ok' } };
      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await dictApi.createTable('zh-CN', 'alarm', mockTable);

      expect(mockPost).toHaveBeenCalledWith('/dicts/tables', { locale: 'zh-CN', category: 'alarm', table: mockTable });
      expect(result).toEqual(mockResponse.data);
    });

    it('should call PUT /dicts/tables/:dictId to update a table', async () => {
      const dictApi = await importDictApi();
      const mockResponse = { data: { code: 0, data: null, message: 'ok' } };
      mockPut.mockResolvedValueOnce(mockResponse);

      const update = { dictName: 'Updated Name' };
      const result = await dictApi.updateTable('zh-CN', 'alarm', 'alarmStatus', update);

      expect(mockPut).toHaveBeenCalledWith('/dicts/tables/alarmStatus', { table: update }, { params: { locale: 'zh-CN', category: 'alarm' } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should call DELETE /dicts/tables/:dictId to delete a table', async () => {
      const dictApi = await importDictApi();
      const mockResponse = { data: { code: 0, data: null, message: 'ok' } };
      mockDelete.mockResolvedValueOnce(mockResponse);

      const result = await dictApi.deleteTable('zh-CN', 'alarm', 'alarmStatus');

      expect(mockDelete).toHaveBeenCalledWith('/dicts/tables/alarmStatus', { data: { locale: 'zh-CN', category: 'alarm' } });
      expect(result).toEqual(mockResponse.data);
    });
  });
});