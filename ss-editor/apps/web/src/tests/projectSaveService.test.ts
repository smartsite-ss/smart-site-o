// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock `@scada-editor/system` -> pageApi
// vi.mock is hoisted to top of file; factory runs at hoisted position
// vi.fn() calls inside factory are valid at hoisted position
// ---------------------------------------------------------------------------
const mockStore: Record<string, any> = {};

vi.mock('@scada-editor/system', () => {
  const getProjectOutline = vi.fn((..._args: any[]) =>
    mockStore.getProjectOutlineResult ?? { data: { success: true, rootPages: [], groups: [], totalPageCount: 0 } },
  );
  const readPage = vi.fn((..._args: any[]) =>
    mockStore.readPageResult ?? { data: { data: null } },
  );
  const listGroups = vi.fn((..._args: any[]) =>
    mockStore.listGroupsResult ?? { data: { groups: [] } },
  );
  const listPages = vi.fn((..._args: any[]) =>
    mockStore.listPagesResult ?? { data: { pages: [] } },
  );
  const saveAllPages = vi.fn((..._args: any[]) =>
    mockStore.saveAllPagesResult ?? { data: { success: true, savedCount: 0 } },
  );
  const savePage = vi.fn((..._args: any[]) =>
    mockStore.savePageResult ?? { data: { success: true, pageName: '' } },
  );

  vi.mocked(getProjectOutline).mockName('pageApi.getProjectOutline');
  vi.mocked(readPage).mockName('pageApi.readPage');
  vi.mocked(listGroups).mockName('pageApi.listGroups');
  vi.mocked(listPages).mockName('pageApi.listPages');
  vi.mocked(saveAllPages).mockName('pageApi.saveAllPages');
  vi.mocked(savePage).mockName('pageApi.savePage');

  return {
    pageApi: {
      getProjectOutline,
      readPage,
      listGroups,
      listPages,
      saveAllPages,
      savePage,
    },
  };
});

// ---------------------------------------------------------------------------
// Subject under test
// ---------------------------------------------------------------------------
import { createProjectSaveService, getPageGroupMapping } from '../services/projectSaveService';

function setupMock(data: {
  getProjectOutline?: any;
  readPage?: any;
  listGroups?: any;
  listPages?: any;
}): void {
  mockStore.getProjectOutlineResult = data.getProjectOutline;
  mockStore.readPageResult = data.readPage;
  mockStore.listGroupsResult = data.listGroups;
  mockStore.listPagesResult = data.listPages;
}

describe('projectSaveService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete mockStore.getProjectOutlineResult;
    delete mockStore.readPageResult;
    delete mockStore.listGroupsResult;
    delete mockStore.listPagesResult;
    delete mockStore.saveAllPagesResult;
    delete mockStore.savePageResult;
  });

  describe('load() - outline-based loading', () => {
    it('should load pages from outline rootPages', async () => {
      setupMock({
        getProjectOutline: {
          data: {
            success: true,
            projectName: 'test',
            rootPages: [
              { name: 'Page1', updatedAt: '2024-01-01T00:00:00.000Z' },
              { name: 'Page2', updatedAt: '2024-01-01T00:00:00.000Z' },
            ],
            groups: [],
            totalPageCount: 2,
          },
        },
      });

      const service = createProjectSaveService('test');
      const result = await service!.load();

      expect(result).not.toBeNull();
      expect(result!.pages).toHaveLength(2);
      expect(result!.pages.map((p: any) => p.id)).toEqual(['Page1', 'Page2']);
      // 验证延迟加载标记
      expect(result!.pages[0]._lazy).toBe(true);
      expect(result!.pages[0].graphics).toEqual([]);
    });

    it('should load pages from groups', async () => {
      setupMock({
        getProjectOutline: {
          data: {
            success: true,
            projectName: 'test',
            rootPages: [],
            groups: [
              {
                name: 'group-a',
                pages: [
                  { name: 'GroupPage1', updatedAt: '2024-01-01T00:00:00.000Z' },
                ],
              },
              {
                name: 'group-b',
                pages: [
                  { name: 'GroupPage2', updatedAt: '2024-01-01T00:00:00.000Z' },
                ],
              },
            ],
            totalPageCount: 2,
          },
        },
      });

      const service = createProjectSaveService('test');
      const result = await service!.load();

      expect(result).not.toBeNull();
      expect(result!.pages).toHaveLength(2);
      // 验证 pageGroups 和 groupNames
      expect((result!.pageGroups as Record<string, string>)['GroupPage1']).toBe('group-a');
      expect((result!.pageGroups as Record<string, string>)['GroupPage2']).toBe('group-b');
      expect((result!.groupNames as Record<string, string>)['group-a']).toBe('group-a');
      expect((result!.groupNames as Record<string, string>)['group-b']).toBe('group-b');
    });

    it('should populate pageGroupMapping for lazy loading', async () => {
      setupMock({
        getProjectOutline: {
          data: {
            success: true,
            projectName: 'test',
            rootPages: [{ name: 'RootPage', updatedAt: '2024-01-01T00:00:00.000Z' }],
            groups: [
              {
                name: 'prod',
                pages: [{ name: 'SensorPage', updatedAt: '2024-01-01T00:00:00.000Z' }],
              },
            ],
            totalPageCount: 2,
          },
        },
      });

      const service = createProjectSaveService('test');
      const result = await service!.load();

      expect(result).not.toBeNull();
      expect(result!.pages).toHaveLength(2);
      // 验证延迟加载映射
      const mapping = getPageGroupMapping();
      expect(mapping.get('RootPage')).toBeUndefined();
      expect(mapping.get('SensorPage')).toBe('prod');
    });

    it('【pageId 映射】outline 返回 pageId 时，pageGroupMapping 应以 pageId 为键', async () => {
      setupMock({
        getProjectOutline: {
          data: {
            success: true,
            projectName: 'test',
            rootPages: [{ name: 'Root', id: 'page-001', updatedAt: '2024-01-01T00:00:00.000Z' }],
            groups: [
              {
                name: 'g1',
                pages: [{ name: 'Grouped', id: 'page-002', updatedAt: '2024-01-01T00:00:00.000Z' }],
              },
            ],
            totalPageCount: 2,
          },
        },
      });

      const service = createProjectSaveService('test');
      await service!.load();

      const mapping = getPageGroupMapping();
      // pageId 作为键时，根页面映射为 undefined
      expect(mapping.get('page-001')).toBeUndefined();
      // 分组页面映射为分组名
      expect(mapping.get('page-002')).toBe('g1');
    });

    it('【同名不同组】不同分组的同名页面使用不同 pageId 时应各自映射', async () => {
      setupMock({
        getProjectOutline: {
          data: {
            success: true,
            projectName: 'test',
            rootPages: [{ name: 'Dashboard', id: 'page-root-001', updatedAt: '2024-01-01T00:00:00.000Z' }],
            groups: [
              {
                name: 'groupA',
                pages: [{ name: 'Dashboard', id: 'page-grpA-001', updatedAt: '2024-01-01T00:00:00.000Z' }],
              },
              {
                name: 'groupB',
                pages: [{ name: 'Dashboard', id: 'page-grpB-001', updatedAt: '2024-01-01T00:00:00.000Z' }],
              },
            ],
            totalPageCount: 3,
          },
        },
      });

      const service = createProjectSaveService('test');
      await service!.load();

      const mapping = getPageGroupMapping();
      // 三个同名的 "Dashboard" 页面因不同 pageId 而有独立的映射条目
      expect(mapping.get('page-root-001')).toBeUndefined();
      expect(mapping.get('page-grpA-001')).toBe('groupA');
      expect(mapping.get('page-grpB-001')).toBe('groupB');
    });

    it('【同名不同组】无 pageId 时回退到 pageName 作为键', async () => {
      setupMock({
        getProjectOutline: {
          data: {
            success: true,
            projectName: 'test',
            rootPages: [{ name: 'Page1', updatedAt: '2024-01-01T00:00:00.000Z' }],
            groups: [
              {
                name: 'group1',
                pages: [{ name: 'Page2', updatedAt: '2024-01-01T00:00:00.000Z' }],
              },
            ],
            totalPageCount: 2,
          },
        },
      });

      const service = createProjectSaveService('test');
      await service!.load();

      const mapping = getPageGroupMapping();
      // 没有 pageId 时使用 pageName 作为键
      expect(mapping.get('Page1')).toBeUndefined();
      expect(mapping.get('Page2')).toBe('group1');
    });

    it('should return null when outline has no pages', async () => {
      setupMock({
        getProjectOutline: {
          data: {
            success: true,
            projectName: 'test',
            rootPages: [],
            groups: [],
            totalPageCount: 0,
          },
        },
      });

      const service = createProjectSaveService('test');
      const result = await service!.load();

      expect(result).toBeNull();
    });

    it('should handle outline API failure gracefully', async () => {
      setupMock({
        getProjectOutline: Promise.reject(new Error('Network error')),
      });

      const service = createProjectSaveService('test');
      const result = await service!.load();

      expect(result).toBeNull();
    });
  });

  describe('loadPageData - lazy loading', () => {
    it('should load page data with group query param when page is in a group', async () => {
      // 先加载 outline 填充 pageGroupMapping
      setupMock({
        getProjectOutline: {
          data: {
            success: true,
            projectName: 'test',
            rootPages: [],
            groups: [
              {
                name: 'prod',
                pages: [{ name: 'SensorPage', updatedAt: '2024-01-01T00:00:00.000Z' }],
              },
            ],
            totalPageCount: 1,
          },
        },
      });

      const service = createProjectSaveService('test');
      await service!.load();

      // 模拟 readPage 返回
      const { pageApi } = await import('@scada-editor/system');
      (pageApi.readPage as any).mockResolvedValue({
        data: { success: true, data: { id: 'sensor-1', name: 'SensorPage', graphics: [{ type: 'shape' }] } },
      });

      // 按需加载
      const { loadPageData } = await import('../services/projectSaveService');
      const pageData = await loadPageData('test', 'SensorPage');

      expect(pageData).not.toBeNull();
      expect(pageData.id).toBe('sensor-1');
      expect(pageData.name).toBe('SensorPage');
      expect(pageData.graphics).toHaveLength(1);
      // 验证 readPage 被调用时传入了 group=prod
      expect(pageApi.readPage).toHaveBeenCalledWith('test', 'SensorPage', 'prod');
    });

    it('should return null when readPage fails', async () => {
      const { loadPageData } = await import('../services/projectSaveService');
      const { pageApi } = await import('@scada-editor/system');
      (pageApi.readPage as any).mockRejectedValue(new Error('Not found'));

      const pageData = await loadPageData('test', 'NonExistent');
      expect(pageData).toBeNull();
    });

    it('【loadPageData 传参】传入 pageId 时使用 pageId 查找分组映射', async () => {
      // 先加载 outline 填充 pageGroupMapping（使用 pageId 作为键）
      setupMock({
        getProjectOutline: {
          data: {
            success: true,
            projectName: 'test',
            rootPages: [],
            groups: [
              {
                name: 'prod',
                pages: [{ name: 'SensorPage', id: 'sensor-uuid', updatedAt: '2024-01-01T00:00:00.000Z' }],
              },
            ],
            totalPageCount: 1,
          },
        },
      });

      const service = createProjectSaveService('test');
      await service!.load();

      const { pageApi } = await import('@scada-editor/system');
      (pageApi.readPage as any).mockResolvedValue({
        data: { success: true, data: { id: 'sensor-uuid', name: 'SensorPage' } },
      });

      const { loadPageData } = await import('../services/projectSaveService');
      // 传入 pageId="sensor-uuid"，应正确查找分组 "prod"
      const pageData = await loadPageData('test', 'SensorPage', 'sensor-uuid');

      expect(pageData).not.toBeNull();
      expect(pageData.id).toBe('sensor-uuid');
      expect(pageApi.readPage).toHaveBeenCalledWith('test', 'SensorPage', 'prod');
    });

    it('【loadPageData 传参】不传 pageId 时回退到 pageName 查找', async () => {
      setupMock({
        getProjectOutline: {
          data: {
            success: true,
            projectName: 'test',
            rootPages: [{ name: 'RootPage', updatedAt: '2024-01-01T00:00:00.000Z' }],
            groups: [],
            totalPageCount: 1,
          },
        },
      });

      const service = createProjectSaveService('test');
      await service!.load();

      const { pageApi } = await import('@scada-editor/system');
      (pageApi.readPage as any).mockResolvedValue({
        data: { success: true, data: { id: 'root-uuid', name: 'RootPage' } },
      });

      const { loadPageData } = await import('../services/projectSaveService');
      // 不传 pageId，应回退到 pageName 查找
      const pageData = await loadPageData('test', 'RootPage');

      expect(pageData).not.toBeNull();
      expect(pageData.id).toBe('root-uuid');
      // 根页面无分组，group 为 undefined
      expect(pageApi.readPage).toHaveBeenCalledWith('test', 'RootPage', undefined);
    });
  });

  describe('save() - single page only', () => {
    it('【只保存当前页】有 previewPageName 时只发送匹配的页面', async () => {
      mockStore.saveAllPagesResult = Promise.resolve({ data: { success: true, savedCount: 1 } });

      const service = createProjectSaveService('test');

      const pages = [
        { id: 'page-001', name: 'CurrentPage', graphics: [{ type: 'rect' }] },
        { id: 'page-002', name: 'OtherPage', _lazy: true, graphics: [] },
      ];
      await service!.save({
        version: '1.0',
        savedAt: Date.now(),
        currentPageId: 'page-001',
        pages,
        previews: { previewPageName: 'CurrentPage', previewPageId: 'page-001' } as any,
      } as any);

      const { pageApi } = await import('@scada-editor/system');

      // 应只发送 1 个页面（CurrentPage），而非全部
      expect(pageApi.saveAllPages).toHaveBeenCalledTimes(1);
      const sentPages = (pageApi.saveAllPages as any).mock.calls[0][1];
      expect(sentPages).toHaveLength(1);
      expect(sentPages[0].id).toBe('page-001');
    });

    it('【只保存当前页】不传 previewPageName 时回退到保存全部页面', async () => {
      mockStore.saveAllPagesResult = Promise.resolve({ data: { success: true, savedCount: 2 } });

      const service = createProjectSaveService('test');

      const pages = [
        { id: 'page-001', name: 'Page1', graphics: [] },
        { id: 'page-002', name: 'Page2', graphics: [] },
      ];
      await service!.save({
        version: '1.0',
        savedAt: Date.now(),
        currentPageId: 'page-001',
        pages,
      } as any);

      const { pageApi } = await import('@scada-editor/system');

      expect(pageApi.saveAllPages).toHaveBeenCalledTimes(1);
      const sentPages = (pageApi.saveAllPages as any).mock.calls[0][1];
      // 没有 previewPageName 时保存全部页面
      expect(sentPages).toHaveLength(2);
    });

    it('【previewPageId 传递】saveAllPages 选项应包含 previewPageId', async () => {
      mockStore.saveAllPagesResult = Promise.resolve({ data: { success: true, savedCount: 1 } });

      const service = createProjectSaveService('test');

      const pages = [
        { id: 'page-uuid-999', name: 'MyPage', graphics: [{ type: 'circle' }] },
      ];
      await service!.save({
        version: '1.0',
        savedAt: Date.now(),
        currentPageId: 'page-uuid-999',
        pages,
        previews: {
          previewPageName: 'MyPage',
          previewPageId: 'page-uuid-999',
          preview: new Blob(['fake-preview'], { type: 'image/png' }),
        } as any,
      } as any);

      const { pageApi } = await import('@scada-editor/system');

      // 验证 saveAllPages 的 options 中包含 previewPageId
      const options = (pageApi.saveAllPages as any).mock.calls[0][2];
      expect(options.previewPageName).toBe('MyPage');
      expect(options.previewPageId).toBe('page-uuid-999');
      expect(options.preview).toBeDefined();
    });

    it('【只保存当前页】previewPageName 匹配不到页面时抛出错误', async () => {
      mockStore.saveAllPagesResult = Promise.resolve({ data: { success: true, savedCount: 0 } });

      const service = createProjectSaveService('test');

      const pages = [
        { id: 'page-001', name: 'PageA', graphics: [] },
        { id: 'page-002', name: 'PageB', _lazy: true, graphics: [] },
      ];

      // previewPageName=NonExistent 无法匹配任何页面
      await expect(service!.save({
        version: '1.0',
        savedAt: Date.now(),
        currentPageId: 'page-001',
        pages,
        previews: { previewPageName: 'NonExistent' } as any,
      } as any)).rejects.toThrow('未找到当前编辑页面的数据');
    });
  });

  describe('saveAll - 工程保存', () => {
    it('【__saveAll=true】保存所有已加载（非 _lazy）页面', async () => {
      mockStore.saveAllPagesResult = Promise.resolve({ data: { success: true, savedCount: 2 } });

      const service = createProjectSaveService('test');

      // _lazy=false 的页面有 2 个（第 3 个是 _lazy 占位符）
      const pages = [
        { id: 'page-a', name: 'PageA', _lazy: false, graphics: [{ type: 'rect' }] },
        { id: 'page-b', name: 'PageB', _lazy: false, graphics: [{ type: 'circle' }] },
        { id: 'page-c', name: 'PageC', _lazy: true, graphics: [] },
      ];
      await service!.save({
        version: '1.0',
        savedAt: Date.now(),
        currentPageId: 'page-a',
        pages,
        __saveAll: true,
      } as any);

      const { pageApi } = await import('@scada-editor/system');

      expect(pageApi.saveAllPages).toHaveBeenCalledTimes(1);
      const sentPages = (pageApi.saveAllPages as any).mock.calls[0][1];
      expect(sentPages).toHaveLength(2);
      // 应包含 PageA 和 PageB，不应包含 PageC（_lazy）
      expect(sentPages.map((p: any) => p.id)).toEqual(['page-a', 'page-b']);
    });

    it('【__saveAll=true】所有页面都是 _lazy 时抛出错误', async () => {
      mockStore.saveAllPagesResult = Promise.resolve({ data: { success: true, savedCount: 0 } });

      const service = createProjectSaveService('test');

      const pages = [
        { id: 'page-x', name: 'PageX', _lazy: true, graphics: [] },
        { id: 'page-y', name: 'PageY', _lazy: true, graphics: [] },
      ];

      await expect(service!.save({
        version: '1.0',
        savedAt: Date.now(),
        currentPageId: 'page-x',
        pages,
        __saveAll: true,
      } as any)).rejects.toThrow('没有已加载的页面数据可保存');
    });

    it('【__saveAll=true】与 previewPageName 并存时优先使用 __saveAll', async () => {
      mockStore.saveAllPagesResult = Promise.resolve({ data: { success: true, savedCount: 3 } });

      const service = createProjectSaveService('test');

      const pages = [
        { id: 'page-1', name: 'Page1', _lazy: false, graphics: [{ type: 'text' }] },
        { id: 'page-2', name: 'Page2', _lazy: false, graphics: [] },
        { id: 'page-3', name: 'Page3', _lazy: true, graphics: [] },
      ];
      // 虽然有 previewPageName=Page1，但 __saveAll=true 应保存所有非 _lazy 页面
      await service!.save({
        version: '1.0',
        savedAt: Date.now(),
        currentPageId: 'page-1',
        pages,
        __saveAll: true,
        previews: { previewPageName: 'Page1' } as any,
      } as any);

      const { pageApi } = await import('@scada-editor/system');

      expect(pageApi.saveAllPages).toHaveBeenCalledTimes(1);
      const sentPages = (pageApi.saveAllPages as any).mock.calls[0][1];
      expect(sentPages).toHaveLength(2); // Page1 + Page2（Page3 是 _lazy）
    });
  });
});