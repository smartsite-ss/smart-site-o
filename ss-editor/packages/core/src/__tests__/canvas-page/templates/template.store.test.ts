// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * canvas-page template.store 单元测试
 *
 * 核心验证点：
 * 1. setCurrentProjectId 正确设置项目上下文
 * 2. saveAsTemplate 根据项目上下文 + saveToSystem 决定 API 路径
 * 3. 保存成功后将模板加入正确的列表（systemTemplates / projectTemplates）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTemplateStore } from '../../../canvas-page/templates/template.store';
import type { PageTemplate } from '../../../canvas-page/templates/types';

// ─── 测试辅助 ───

const mockPageConfig: PageTemplate['pageConfig'] = {
  width: 1920,
  height: 1080,
  backgroundColor: '#808080',
  layout: 'free',
};

const mockGraphics = [
  { type: 'rect', x: 100, y: 200, width: 300, height: 150 },
];

const mockTemplateInfo = {
  name: '测试模板',
  description: '单元测试模板',
  category: 'custom' as const,
  pageConfig: mockPageConfig,
  graphics: mockGraphics,
  tags: ['test'],
};

function mockFetchResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  } as Response);
}

function mockFetchError(message: string) {
  return Promise.resolve({
    ok: false,
    status: 500,
    text: () => Promise.resolve(message),
    json: () => Promise.reject(new Error(message)),
  } as Response);
}

// ─── 测试套件 ───

describe('canvas-page template.store', () => {
  let store: ReturnType<typeof useTemplateStore>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useTemplateStore();
    // 重置模块级 currentProjectId，防止测试间泄漏
    store.setCurrentProjectId(null);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 初始状态 ───

  describe('初始状态', () => {
    it('systemTemplates 和 projectTemplates 初始为空数组', () => {
      expect(store.systemTemplates).toEqual([]);
      expect(store.projectTemplates).toEqual([]);
    });

    it('isLoading 初始为 false', () => {
      expect(store.isLoading).toBe(false);
    });
  });

  // ─── setCurrentProjectId ───

  describe('setCurrentProjectId', () => {
    it('设置项目 ID 后，saveAsTemplate 使用项目级 API', async () => {
      store.setCurrentProjectId('demo-project');

      const savedTemplate = { success: true, data: { ...mockTemplateInfo, id: 'tpl-1', source: 'user' } };
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(savedTemplate) as any);

      await store.saveAsTemplate(mockTemplateInfo);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/projects/demo-project/canvas-templates');
    });

    it('设置 null 后，saveAsTemplate 使用系统级 API', async () => {
      store.setCurrentProjectId(null);

      const savedTemplate = { success: true, data: { ...mockTemplateInfo, id: 'tpl-2', source: 'user' } };
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(savedTemplate) as any);

      await store.saveAsTemplate(mockTemplateInfo);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/canvas-templates');
      expect(url).not.toContain('/projects/');
    });
  });

  // ─── saveAsTemplate — API 路径分派 ───

  describe('saveAsTemplate — API 路径分派', () => {
    it('saveToSystem=false + currentProjectId 已设置 → 使用项目级 API', async () => {
      store.setCurrentProjectId('my-project');

      const saved = { success: true, data: { ...mockTemplateInfo, id: 'tpl-p1', source: 'user' } };
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(saved) as any);

      await store.saveAsTemplate(mockTemplateInfo, false);

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('/api/v1/projects/my-project/canvas-templates');
      expect(options?.method).toBe('POST');
    });

    it('saveToSystem=true → 始终使用系统级 API，忽略 currentProjectId', async () => {
      store.setCurrentProjectId('my-project');

      const saved = { success: true, data: { ...mockTemplateInfo, id: 'tpl-s1', source: 'user' } };
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(saved) as any);

      await store.saveAsTemplate(mockTemplateInfo, true);

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe('/api/v1/canvas-templates');
    });

    it('currentProjectId 未设置 → 即使 saveToSystem=false 也回退系统级 API', async () => {
      // 不调用 setCurrentProjectId，模拟未打开 TemplateGallery 的场景

      const saved = { success: true, data: { ...mockTemplateInfo, id: 'tpl-fallback', source: 'user' } };
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(saved) as any);

      await store.saveAsTemplate(mockTemplateInfo, false);

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe('/api/v1/canvas-templates');
    });
  });

  // ─── saveAsTemplate — 模板归类 ───

  describe('saveAsTemplate — 模板归类', () => {
    it('项目级保存 → 加入 projectTemplates', async () => {
      store.setCurrentProjectId('demo-project');

      const saved = { success: true, data: { ...mockTemplateInfo, id: 'tpl-proj-1', source: 'user' } };
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(saved) as any);

      const result = await store.saveAsTemplate(mockTemplateInfo, false);

      expect(result).not.toBeNull();
      expect(store.projectTemplates).toHaveLength(1);
      expect(store.projectTemplates[0].id).toBe('tpl-proj-1');
      expect(store.systemTemplates).toHaveLength(0);
    });

    it('系统级保存 → 加入 systemTemplates', async () => {
      const saved = { success: true, data: { ...mockTemplateInfo, id: 'tpl-sys-1', source: 'user' } };
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(saved) as any);

      const result = await store.saveAsTemplate(mockTemplateInfo, true);

      expect(result).not.toBeNull();
      expect(store.systemTemplates).toHaveLength(1);
      expect(store.systemTemplates[0].id).toBe('tpl-sys-1');
      expect(store.projectTemplates).toHaveLength(0);
    });

    it('currentProjectId=null 时保存 → 加入 systemTemplates（回退行为）', async () => {
      const saved = { success: true, data: { ...mockTemplateInfo, id: 'tpl-fb-1', source: 'user' } };
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(saved) as any);

      await store.saveAsTemplate(mockTemplateInfo, false);

      expect(store.systemTemplates).toHaveLength(1);
      expect(store.projectTemplates).toHaveLength(0);
    });
  });

  // ─── saveAsTemplate — API 失败降级 ───

  describe('saveAsTemplate — API 失败降级', () => {
    it('API 失败时降级到 localStorage（systemTemplates）', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchError('Server Error') as any);

      const result = await store.saveAsTemplate(mockTemplateInfo, true);

      // 降级到 localStorage 时仍返回模板对象
      expect(result).not.toBeNull();
      expect(result!.name).toBe('测试模板');
      // 降级时统一加入 systemTemplates
      expect(store.systemTemplates).toHaveLength(1);
      expect(store.projectTemplates).toHaveLength(0);
    });

    it('API 返回 success=false 时也降级', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ success: false, message: 'error' }) as any);

      const result = await store.saveAsTemplate(mockTemplateInfo, false);

      expect(result).not.toBeNull();
      expect(store.systemTemplates).toHaveLength(1);
    });
  });

  // ─── 集成场景：PageTabs → TemplateSaveDialog 完整流程 ───

  describe('集成场景：右键菜单保存为模板', () => {
    it('PageTabs 先设置 projectId → 再保存 → 正确使用项目级 API', async () => {
      // 模拟 PageTabs.openSaveAsTemplateDialog 的行为：
      // templateStore.setCurrentProjectId(props.projectId || null);
      store.setCurrentProjectId('real-project');

      // 模拟用户在 TemplateSaveDialog 中保存（saveToSystem=false 为默认值）
      const saved = { success: true, data: { ...mockTemplateInfo, id: 'tpl-integration-1', source: 'user' } };
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(saved) as any);

      await store.saveAsTemplate(mockTemplateInfo, false);

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe('/api/v1/projects/real-project/canvas-templates');
      expect(store.projectTemplates).toHaveLength(1);
    });

    it('即使 projectId 设置后，用户选择保存到系统级也正确', async () => {
      store.setCurrentProjectId('real-project');

      const saved = { success: true, data: { ...mockTemplateInfo, id: 'tpl-integration-2', source: 'user' } };
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(saved) as any);

      // 用户在 TemplateSaveDialog 下拉中选择了"系统级"
      await store.saveAsTemplate(mockTemplateInfo, true);

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe('/api/v1/canvas-templates');
      expect(store.systemTemplates).toHaveLength(1);
    });
  });
});
