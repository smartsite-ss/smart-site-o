// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PathResolverService } from '@ss-node/ss-core';
import { TemplateIndexService } from '../template/template-index.service';
import * as fs from 'fs';
import * as path from 'path';

// 创建测试用的临时目录结构
const TEST_BASE = path.join(__dirname, '__temp_templates__');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath: string, content: object) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
}

function cleanupTestDir() {
  if (fs.existsSync(TEST_BASE)) {
    fs.rmSync(TEST_BASE, { recursive: true, force: true });
  }
}

// 模拟模板 JSON 文件数据
function makeTemplateData(overrides: Record<string, any> = {}) {
  return {
    schemaVersion: '1.0',
    templateType: 'device_tag_template',
    id: 'tpl-test-001',
    name: 'Test Template',
    description: 'A test template',
    deviceType: 'modbus_tcp',
    deviceModel: 'TEST_MODEL',
    version: '1.0.0',
    status: 'published',
    isDefault: true,
    author: 'system',
    tags: ['test', 'modbus'],
    industry: '工业自动化',
    category: 'PLC控制器',
    protocol: { type: 'modbus_tcp', config: {} },
    variables: [
      { order: 1, name: 'Var1', address: '40001', dataType: 'float32' },
      { order: 2, name: 'Var2', address: '40003', dataType: 'float32' },
    ],
    metadata: {
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      linkedDevices: 0,
      usageCount: 0,
      rating: 5.0,
    },
    ...overrides,
  };
}

describe('TemplateIndexService', () => {
  let indexService: TemplateIndexService;

  beforeAll(() => {
    cleanupTestDir();
  });

  afterAll(() => {
    cleanupTestDir();
  });

  beforeEach(() => {
    cleanupTestDir();
    ensureDir(TEST_BASE);
    // 注入测试路径 - 传入 mock configService 并覆盖 basePath
    const mockConfigService = { get: jest.fn().mockReturnValue(undefined) };
    const mockPathResolverService = {
      resolve: jest.fn((p: string) => p),
      getProjectRoot: jest.fn().mockReturnValue('/fake/project-root'),
    };
    indexService = new TemplateIndexService(mockConfigService as any, mockPathResolverService as any);
    (indexService as any).templatesBasePath = TEST_BASE;
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('rebuildIndex', () => {
    it('TC-IDX-001: should build index from directory structure', () => {
      // 创建目录结构
      writeFile(
        path.join(TEST_BASE, '工业自动化', 'PLC控制器', 'siemens-s7-1200.json'),
        makeTemplateData({
          id: 'tpl-s7-1200',
          name: '西门子 S7-1200',
          variables: Array(10).fill({ order: 1, name: 'x', address: '40001', dataType: 'float32' }),
          tags: ['西门子', 'PLC'],
        }),
      );
      writeFile(
        path.join(TEST_BASE, '能源电力', '电能计量', 'three-phase-meter.json'),
        makeTemplateData({
          id: 'tpl-meter',
          name: '三相电表',
          deviceType: 'modbus_tcp',
          variables: Array(5).fill({ order: 1, name: 'x', address: '40001', dataType: 'float32' }),
          tags: ['电表', '能源'],
        }),
      );

      const index = indexService.rebuildIndex();

      expect(index.schemaVersion).toBe('2.0');
      expect(index.totalIndustries).toBe(2);
      expect(index.totalTemplates).toBe(2);

      // 验证行业排序
      expect(index.industries[0].name).toBe('工业自动化');
      expect(index.industries[1].name).toBe('能源电力');

      // 验证分类
      const automation = index.industries[0];
      expect(automation.categories).toHaveLength(1);
      expect(automation.categories[0].name).toBe('PLC控制器');
      expect(automation.categories[0].templateCount).toBe(1);
      expect(automation.templateCount).toBe(1);

      // 验证模板
      const tpl1 = automation.categories[0].templates[0];
      expect(tpl1.id).toBe('tpl-s7-1200');
      expect(tpl1.name).toBe('西门子 S7-1200');
      expect(tpl1.variableCount).toBe(10);
      expect(tpl1.tags).toEqual(['西门子', 'PLC']);
      expect(tpl1.relativePath).toBe('工业自动化/PLC控制器/siemens-s7-1200.json');

      // 验证 index.json 文件已写入
      const indexPath = path.join(TEST_BASE, 'index.json');
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('TC-IDX-002: should return empty index when directory is empty', () => {
      const index = indexService.rebuildIndex();

      expect(index.totalTemplates).toBe(0);
      expect(index.totalIndustries).toBe(0);
      expect(index.industries).toEqual([]);
    });

    it('TC-IDX-003: should handle nested categories correctly', () => {
      // 同一行业多个分类
      writeFile(
        path.join(TEST_BASE, '工业自动化', 'PLC控制器', 'tpl1.json'),
        makeTemplateData({
          id: 'tpl1',
          name: 'TPL1',
          variables: Array(2).fill({}),
        }),
      );
      writeFile(
        path.join(TEST_BASE, '工业自动化', 'DCS分散控制系统', 'tpl2.json'),
        makeTemplateData({
          id: 'tpl2',
          name: 'TPL2',
          variables: Array(3).fill({}),
        }),
      );

      const index = indexService.rebuildIndex();

      expect(index.totalIndustries).toBe(1);
      const industry = index.industries[0];
      expect(industry.name).toBe('工业自动化');
      expect(industry.categories).toHaveLength(2);
      expect(industry.templateCount).toBe(2);
    });

    it('TC-IDX-004: should handle empty category directories', () => {
      // 空分类目录（无模板文件）
      ensureDir(path.join(TEST_BASE, '工业自动化', '空分类'));
      writeFile(
        path.join(TEST_BASE, '工业自动化', 'PLC控制器', 'tpl.json'),
        makeTemplateData({
          id: 'tpl1',
          name: 'TPL1',
          variables: Array(1).fill({}),
        }),
      );

      const index = indexService.rebuildIndex();

      const industry = index.industries[0];
      const categories = industry.categories.map((c) => c.name);
      expect(categories).toContain('空分类');
      expect(categories).toContain('PLC控制器');

      const emptyCat = industry.categories.find((c) => c.name === '空分类');
      expect(emptyCat!.templateCount).toBe(0);
      expect(emptyCat!.templates).toEqual([]);
    });

    it('TC-IDX-005: should handle template JSON parse errors gracefully', () => {
      // 创建包含无效 JSON 的目录
      const dir = path.join(TEST_BASE, '工业自动化', 'PLC控制器');
      ensureDir(dir);
      fs.writeFileSync(path.join(dir, 'bad.json'), 'not valid json', 'utf-8');
      // 再创建一个有效的模板
      writeFile(
        path.join(dir, 'good.json'),
        makeTemplateData({
          id: 'good',
          name: 'Good Template',
          variables: Array(1).fill({}),
        }),
      );

      const index = indexService.rebuildIndex();

      expect(index.totalTemplates).toBe(1);
      const templates = index.industries[0].categories[0].templates;
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('good');
    });
  });

  describe('loadIndex', () => {
    it('TC-IDX-010: should load existing index.json', () => {
      // 先构建一个
      writeFile(
        path.join(TEST_BASE, '工业自动化', 'PLC控制器', 'tpl.json'),
        makeTemplateData({
          id: 'tpl1',
          name: 'TPL1',
          variables: Array(1).fill({}),
        }),
      );
      indexService.rebuildIndex();

      // 重新加载
      const loaded = indexService.loadIndex();
      expect(loaded).not.toBeNull();
      expect(loaded!.totalTemplates).toBe(1);
      expect(loaded!.industries[0].name).toBe('工业自动化');
    });

    it('TC-IDX-011: should return null when index.json does not exist', () => {
      const result = indexService.loadIndex();
      expect(result).toBeNull();
    });
  });

  describe('createCategory', () => {
    it('TC-IDX-020: should create category directory and rebuild index', async () => {
      // 确保行业目录存在
      ensureDir(path.join(TEST_BASE, '工业自动化'));

      const result = await indexService.createCategory({
        industryName: '工业自动化',
        categoryName: '新分类',
      });

      expect(result.success).toBe(true);
      expect(result.path).toBe('工业自动化/新分类');

      // 验证目录创建
      expect(fs.existsSync(path.join(TEST_BASE, '工业自动化', '新分类'))).toBe(true);

      // 验证索引已更新
      const index = indexService.loadIndex()!;
      const industry = index.industries.find((i) => i.name === '工业自动化')!;
      expect(industry.categories.some((c) => c.name === '新分类')).toBe(true);
    });

    it('TC-IDX-021: should throw when category already exists', async () => {
      const dir = path.join(TEST_BASE, '工业自动化', '已存在分类');
      ensureDir(dir);

      await expect(
        indexService.createCategory({ industryName: '工业自动化', categoryName: '已存在分类' }),
      ).rejects.toThrow('分类目录已存在');
    });
  });

  describe('renameCategory', () => {
    it('TC-IDX-030: should rename category directory', async () => {
      writeFile(
        path.join(TEST_BASE, '工业自动化', '旧分类', 'tpl.json'),
        makeTemplateData({ id: 'tpl1', name: 'TPL1', variables: Array(1).fill({}) }),
      );

      const result = await indexService.renameCategory({
        industryName: '工业自动化',
        oldCategoryName: '旧分类',
        newCategoryName: '新分类',
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(TEST_BASE, '工业自动化', '旧分类'))).toBe(false);
      expect(fs.existsSync(path.join(TEST_BASE, '工业自动化', '新分类'))).toBe(true);

      // 验证模板文件的 industry/category 已更新
      const tplPath = path.join(TEST_BASE, '工业自动化', '新分类', 'tpl.json');
      const tplContent = JSON.parse(fs.readFileSync(tplPath, 'utf-8'));
      expect(tplContent.industry).toBe('工业自动化');
      expect(tplContent.category).toBe('新分类');
    });

    it('TC-IDX-031: should throw when old category does not exist', async () => {
      await expect(
        indexService.renameCategory({
          industryName: '工业自动化',
          oldCategoryName: '不存在的分类',
          newCategoryName: '新分类',
        }),
      ).rejects.toThrow('分类目录不存在');
    });
  });

  describe('deleteCategory', () => {
    it('TC-IDX-040: should delete empty category directory', async () => {
      ensureDir(path.join(TEST_BASE, '工业自动化', '待删除分类'));

      const result = await indexService.deleteCategory({
        industryName: '工业自动化',
        categoryName: '待删除分类',
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(TEST_BASE, '工业自动化', '待删除分类'))).toBe(false);
    });

    it('TC-IDX-041: should throw when category has template files', async () => {
      writeFile(
        path.join(TEST_BASE, '工业自动化', '有模板的分类', 'tpl.json'),
        makeTemplateData({ id: 'tpl1', name: 'TPL1', variables: Array(1).fill({}) }),
      );

      await expect(
        indexService.deleteCategory({
          industryName: '工业自动化',
          categoryName: '有模板的分类',
        }),
      ).rejects.toThrow('分类目录下存在');
    });

    it('TC-IDX-042: should throw when category does not exist', async () => {
      await expect(
        indexService.deleteCategory({
          industryName: '工业自动化',
          categoryName: '不存在的分类',
        }),
      ).rejects.toThrow('分类目录不存在');
    });
  });

  describe('getDirectoryStructure', () => {
    it('TC-IDX-050: should return tree structure', () => {
      writeFile(
        path.join(TEST_BASE, '工业自动化', 'PLC控制器', 'tpl.json'),
        makeTemplateData({
          id: 'tpl1',
          name: 'TPL1',
          variables: Array(2).fill({}),
        }),
      );

      const structure = indexService.getDirectoryStructure();

      expect(Array.isArray(structure)).toBe(true);
      expect(structure[0].type).toBe('industry');
      expect(structure[0].name).toBe('工业自动化');
      expect(structure[0].categories[0].type).toBe('category');
      expect(structure[0].categories[0].templates[0].type).toBe('template');
    });
  });
});
