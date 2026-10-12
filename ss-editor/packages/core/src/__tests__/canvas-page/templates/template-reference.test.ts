// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { BasePage } from '../../../graphic-editing/graphic/base/BasePage';
import { usePageStore } from '../../../store/page.store';
import type { PageTemplate } from '../../../canvas-page/templates/types';

/** 模拟模板数据 */
const mockTemplate: PageTemplate = {
  id: 'builtin-dashboard',
  name: '仪表盘',
  description: '工业仪表盘模板',
  category: 'dashboard',
  source: 'builtin',
  version: '1.0.0',
  pageConfig: {
    width: 1920,
    height: 1080,
    backgroundColor: '#0a1a2e',
    layout: 'free',
  },
  graphics: [
    { type: 'rect', config: { geometry: { x: 0, y: 0, width: 100, height: 50 } } },
    { type: 'text', config: { text: 'Hello' } },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('模板引用 — BasePage getter/setter', () => {
  let page: BasePage;

  beforeEach(() => {
    page = new BasePage();
    page.init({
      id: 'test-page-1',
      name: '测试页面',
      width: 1920,
      height: 1080,
      backgroundColor: '#808080',
    });
  });

  it('设置 templateId 后应可通过 getter 读取', () => {
    page.templateId = 'builtin-dashboard';
    expect(page.templateId).toBe('builtin-dashboard');
  });

  it('设置 templateMode 后应可通过 getter 读取', () => {
    page.templateMode = 'reference';
    expect(page.templateMode).toBe('reference');
  });

  it('初始 templateId/templateMode 应为 undefined', () => {
    expect(page.templateId).toBeUndefined();
    expect(page.templateMode).toBeUndefined();
  });

  it('可设为 copy 模式', () => {
    page.templateMode = 'copy';
    expect(page.templateMode).toBe('copy');
  });
});

describe('模板引用 — toJSON 序列化', () => {
  it('toJSON 应包含 templateId 和 templateMode（设置后）', () => {
    const page = new BasePage();
    page.init({ id: 'p1', name: 'P1', width: 800, height: 600, backgroundColor: '#fff' });
    page.templateId = 'builtin-dashboard';
    page.templateMode = 'reference';

    const json = page.toJSON();
    expect(json).toHaveProperty('templateId', 'builtin-dashboard');
    expect(json).toHaveProperty('templateMode', 'reference');
  });

  it('toJSON 的 templateId 应为 undefined（未设置时）', () => {
    const page = new BasePage();
    page.init({ id: 'p2', name: 'P2', width: 800, height: 600, backgroundColor: '#fff' });
    const json = page.toJSON();
    expect(json.templateId).toBeUndefined();
    expect(json.templateMode).toBeUndefined();
  });

  it('JSON.stringify 后应包含 templateId 字段', () => {
    const page = new BasePage();
    page.init({ id: 'p3', name: 'P3', width: 800, height: 600, backgroundColor: '#fff' });
    page.templateId = 'builtin-dashboard';
    page.templateMode = 'reference';

    const jsonString = JSON.stringify(page.toJSON());
    const parsed = JSON.parse(jsonString);
    expect(parsed.templateId).toBe('builtin-dashboard');
    expect(parsed.templateMode).toBe('reference');
  });

  it('toJSONAsync 应包含 templateId', async () => {
    const page = new BasePage();
    page.init({ id: 'p4', name: 'P4', width: 800, height: 600, backgroundColor: '#fff' });
    page.templateId = 'builtin-dashboard';
    page.templateMode = 'reference';
    const json = await page.toJSONAsync();
    expect(json).toHaveProperty('templateId', 'builtin-dashboard');
    expect(json).toHaveProperty('templateMode', 'reference');
  });
});

describe('模板引用 — fromJSON 反序列化', () => {
  it('fromJSON 应还原 templateId/templateMode', () => {
    const page = new BasePage();
    page.fromJSON({
      id: 'page-x',
      name: '还原测试',
      width: 1920,
      height: 1080,
      backgroundColor: '#000',
      templateId: 'builtin-dashboard',
      templateMode: 'reference',
    });
    expect(page.templateId).toBe('builtin-dashboard');
    expect(page.templateMode).toBe('reference');
  });

  it('toJSON + fromJSON 往返后 templateId/templateMode 一致', () => {
    const page = new BasePage();
    page.init({ id: 'roundtrip', name: '往返', width: 800, height: 600, backgroundColor: '#fff' });
    page.templateId = 'builtin-dashboard';
    page.templateMode = 'reference';

    const json = page.toJSON();
    const restored = new BasePage();
    restored.fromJSON(json);

    expect(restored.templateId).toBe('builtin-dashboard');
    expect(restored.templateMode).toBe('reference');
    expect(restored.toJSON()).toMatchObject({
      templateId: 'builtin-dashboard',
      templateMode: 'reference',
    });
  });
});

describe('模板引用 — 模拟 handleTemplateCreate 完整代码流', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('✅ 从模板创建：addPage → 设 pageConfig → 设 templateId/templateMode → 复制图元', () => {
    const pageStore = usePageStore();
    pageStore.pages = [];

    // ── 完全模拟 PageTabs.handleTemplateCreate 的代码 ──

    // Step 1: 创建页面
    const pageName = mockTemplate.name || '新页面';
    const newPage = pageStore.addPage(pageName);
    const page = newPage; // BasePage 实例

    // Step 2: 设置页面尺寸和背景色
    if (mockTemplate.pageConfig) {
      page.width = mockTemplate.pageConfig.width;
      page.height = mockTemplate.pageConfig.height;
      page.backgroundColor = mockTemplate.pageConfig.backgroundColor;
    }

    // Step 3: 引用模式 → 记录模板 ID
    // 等价于: if (templateStore.configMode === 'reference') { ... }
    page.templateId = mockTemplate.id;
    page.templateMode = 'reference';

    // Step 4: 复制图元（通过 addGraphic，这里省略 GraphicFactory）

    // ── 验证 ──

    expect(page.width).toBe(1920);
    expect(page.height).toBe(1080);
    expect(page.backgroundColor).toBe('#0a1a2e');

    // ★ 核心断言：templateId/templateMode 已设置
    expect(page.templateId).toBe('builtin-dashboard');
    expect(page.templateMode).toBe('reference');

    // ★ 通过 store.pages 获得的 Proxy 也应正确
    const proxyPage = pageStore.pages[0];
    expect(proxyPage.templateId).toBe('builtin-dashboard');
    expect(proxyPage.templateMode).toBe('reference');

    // ★ toJSON 输出应包含两字段
    const json = proxyPage.toJSON();
    expect(json).toMatchObject({
      name: '仪表盘',
      width: 1920,
      height: 1080,
      backgroundColor: '#0a1a2e',
      templateId: 'builtin-dashboard',
      templateMode: 'reference',
    });
  });

  it('✅ 复制模式（configMode=copy）：不设 templateId/templateMode', () => {
    const pageStore = usePageStore();
    pageStore.pages = [];

    const page = pageStore.addPage('Page1');

    // 复制模式：不设置 templateId/templateMode
    const json = page.toJSON();
    expect(json.templateId).toBeUndefined();
    expect(json.templateMode).toBeUndefined();
  });

  it('✅ JSON.stringify 输出包含 templateId 字段（模拟 page.json 内容）', () => {
    const pageStore = usePageStore();
    pageStore.pages = [];

    const page = pageStore.addPage('仪表盘');
    page.templateId = 'builtin-dashboard';
    page.templateMode = 'reference';

    const jsonStr = JSON.stringify(page.toJSON(), null, 2);

    expect(jsonStr).toContain('"templateId"');
    expect(jsonStr).toContain('"builtin-dashboard"');
    expect(jsonStr).toContain('"templateMode"');
    expect(jsonStr).toContain('"reference"');
  });

  it('✅ 多页面隔离：各自 templateId 不互相干扰', () => {
    const pageStore = usePageStore();
    pageStore.pages = [];

    const p1 = pageStore.addPage('页面1');
    p1.templateId = 'tpl-a';
    p1.templateMode = 'reference';

    const p2 = pageStore.addPage('页面2');
    // page2 不设 templateId

    expect(pageStore.pages[0].toJSON().templateId).toBe('tpl-a');
    expect(pageStore.pages[0].toJSON().templateMode).toBe('reference');
    expect(pageStore.pages[1].toJSON().templateId).toBeUndefined();
    expect(pageStore.pages[1].toJSON().templateMode).toBeUndefined();
  });

  it('✅ 完整往返：创建 → toJSON(保存) → fromJSON(加载) → templateId 不丢失', () => {
    const pageStore = usePageStore();
    pageStore.pages = [];

    const page = pageStore.addPage('大屏');
    page.templateId = 'builtin-dashboard';
    page.templateMode = 'reference';

    // 保存
    const saveJson = page.toJSON();
    expect(saveJson.templateId).toBe('builtin-dashboard');

    // 加载
    page.fromJSON(saveJson);
    expect(page.templateId).toBe('builtin-dashboard');
    expect(page.templateMode).toBe('reference');

    // 再次保存
    const resaveJson = page.toJSON();
    expect(resaveJson.templateId).toBe('builtin-dashboard');
    expect(resaveJson.templateMode).toBe('reference');
  });

  it('✅ collectProjectData 模拟：所有页面 toJSON 含 templateId', () => {
    const pageStore = usePageStore();
    pageStore.pages = [];

    const p1 = pageStore.addPage('Dashboard');
    p1.templateId = 'builtin-dashboard';
    p1.templateMode = 'reference';

    const p2 = pageStore.addPage('Login');
    p2.templateId = 'builtin-login';
    p2.templateMode = 'reference';

    // 模拟 collectProjectData: pageStore.pages.map(p => p.toJSON())
    const pagesJson = pageStore.pages.map(p => p.toJSON());

    expect(pagesJson[0].templateId).toBe('builtin-dashboard');
    expect(pagesJson[0].templateMode).toBe('reference');
    expect(pagesJson[1].templateId).toBe('builtin-login');
    expect(pagesJson[1].templateMode).toBe('reference');
  });

  it('✅ 通过 store.pages 取得的 Pinia Proxy toJSON 含 templateId', () => {
    const pageStore = usePageStore();
    pageStore.pages = [];

    pageStore.addPage('测试').templateId = 'tpl-test';
    const proxyPage = pageStore.pages[0];

    expect(proxyPage.templateId).toBe('tpl-test');
    expect(proxyPage.toJSON().templateId).toBe('tpl-test');
  });
});
