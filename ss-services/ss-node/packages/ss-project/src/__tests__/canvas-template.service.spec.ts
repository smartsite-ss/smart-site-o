// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * CanvasTemplateService 单元测试
 *
 * 核心验证点：
 * 1. getTemplatesDir 返回项目级 / 系统级正确路径
 * 2. createTemplate 写入文件到正确目录
 * 3. 文件实际存在于磁盘
 * 4. 项目级与系统级模板隔离
 * 5. listTemplates / readTemplate 正确读取
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CanvasTemplateService, CanvasTemplateData } from '../canvas-template.service';
import { ConfigService } from '@nestjs/config';
import { PathResolverService } from '@ss-node/ss-core';

// ─── Mock PathResolverService ───

jest.mock('@ss-node/ss-core', () => {
  const actual = jest.requireActual('@ss-node/ss-core');
  return {
    ...actual,
    PathResolverService: class {
      resolve = jest.fn((p: string) => path.resolve(p));
    },
  };
});

// ─── 测试辅助 ───

function createMockTemplate(overrides: Partial<CanvasTemplateData> = {}): CanvasTemplateData {
  return {
    id: `tpl-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '测试模板',
    description: '单元测试',
    category: 'custom',
    icon: '📋',
    source: 'user',
    author: 'test-user',
    version: '1.0.0',
    pageConfig: { width: 1920, height: 1080, backgroundColor: '#808080', layout: 'free' },
    graphics: [{ type: 'rect', x: 0, y: 0, width: 100, height: 100 }],
    tags: ['test'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// ─── 测试套件 ───

describe('CanvasTemplateService', () => {
  let service: CanvasTemplateService;
  let tempDir: string;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    tempDir = path.join(
      os.tmpdir(),
      `canvas-template-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );

    mockConfigService = {
      get: jest.fn().mockReturnValue(tempDir),
    } as unknown as ConfigService;

    service = new CanvasTemplateService(mockConfigService, new PathResolverService() as any);
  });

  afterEach(() => {
    // 清理项目级目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    // 清理系统级模板目录（位于 tempDir 上层，不会被 tempDir 递归删除覆盖）
    const systemDir = path.join(path.dirname(tempDir), 'canvas-templates');
    if (fs.existsSync(systemDir)) {
      fs.rmSync(systemDir, { recursive: true, force: true });
    }
  });

  // ─── getTemplatesDir ───

  describe('getTemplatesDir', () => {
    it('系统级路径 → {PROJECTS_DIR}/../canvas-templates/pages/', () => {
      const dir = service.getTemplatesDir();
      expect(dir).toBe(path.join(path.dirname(tempDir), 'canvas-templates', 'pages'));
    });

    it('项目级路径 → {PROJECTS_DIR}/{projectId}/canvas-templates/pages/', () => {
      const dir = service.getTemplatesDir('my-project');
      expect(dir).toBe(path.join(tempDir, 'my-project', 'canvas-templates', 'pages'));
    });

    it('不同 projectId 返回不同的项目级路径', () => {
      const dir1 = service.getTemplatesDir('project-a');
      const dir2 = service.getTemplatesDir('project-b');
      expect(dir1).toContain('project-a');
      expect(dir2).toContain('project-b');
      expect(dir1).not.toBe(dir2);
    });
  });

  // ─── createTemplate — 文件实际写入 ───

  describe('createTemplate — 文件写入', () => {
    it('项目级模板 → 写入 {PROJECTS_DIR}/{projectId}/canvas-templates/pages/{id}.json', () => {
      const template = createMockTemplate({ id: 'tpl-proj-test' });
      const result = service.createTemplate(template, 'demo-project');

      expect(result.success).toBe(true);

      // 验证文件存在于正确位置
      const expectedPath = path.join(tempDir, 'demo-project', 'canvas-templates', 'pages', 'tpl-proj-test.json');
      expect(fs.existsSync(expectedPath)).toBe(true);

      // 验证文件内容可读
      const raw = fs.readFileSync(expectedPath, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.id).toBe('tpl-proj-test');
      expect(parsed.name).toBe('测试模板');
      expect(parsed.source).toBe('user');
      expect(parsed.pageConfig.width).toBe(1920);
    });

    it('系统级模板 → 写入 data/canvas-templates/pages/{id}.json', () => {
      const template = createMockTemplate({ id: 'tpl-sys-test' });
      const result = service.createTemplate(template);

      expect(result.success).toBe(true);

      // 验证文件存在于正确位置
      const expectedPath = path.join(path.dirname(tempDir), 'canvas-templates', 'pages', 'tpl-sys-test.json');
      expect(fs.existsSync(expectedPath)).toBe(true);

      const raw = fs.readFileSync(expectedPath, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.id).toBe('tpl-sys-test');
    });

    it('项目级模板 → 不在系统级目录出现', () => {
      const template = createMockTemplate({ id: 'tpl-proj-isolated' });
      service.createTemplate(template, 'demo-project');

      const systemDir = path.join(path.dirname(tempDir), 'canvas-templates', 'pages');
      // 系统级目录可能不存在，或存在但不含该项目模板
      if (fs.existsSync(systemDir)) {
        const files = fs.readdirSync(systemDir);
        expect(files).not.toContain('tpl-proj-isolated.json');
      }
    });

    it('系统级模板 → 不在项目级目录出现', () => {
      const template = createMockTemplate({ id: 'tpl-sys-isolated' });
      service.createTemplate(template);

      const projectDir = path.join(tempDir, 'demo-project', 'canvas-templates', 'pages');
      // 如果项目级目录不存在则说明隔离正确
      if (fs.existsSync(projectDir)) {
        const files = fs.readdirSync(projectDir);
        expect(files).not.toContain('tpl-sys-isolated.json');
      }
    });

    it('自动生成 id 如果未提供', () => {
      const template = createMockTemplate();
      delete (template as any).id;

      const result = service.createTemplate(template);
      expect(result.success).toBe(true);
      expect(result.data.id).toMatch(/^tpl-/);
      expect(result.data.id.length).toBeGreaterThan(4);
    });

    it('重复 id 抛出错误', () => {
      const template = createMockTemplate({ id: 'tpl-dup' });
      service.createTemplate(template);

      expect(() => {
        service.createTemplate(createMockTemplate({ id: 'tpl-dup' }));
      }).toThrow('模板 ID 已存在');
    });
  });

  // ─── listTemplates — 读取列表 ───

  describe('listTemplates — 模板列表', () => {
    it('创建后 listTemplates 能列出项目级模板', () => {
      const template = createMockTemplate({ id: 'tpl-list-proj', name: '列表测试模板' });
      service.createTemplate(template, 'demo-project');

      const result = service.listTemplates(undefined, undefined, 'demo-project');
      expect(result.success).toBe(true);
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].id).toBe('tpl-list-proj');
      expect(result.templates[0].name).toBe('列表测试模板');
    });

    it('空目录返回空列表', () => {
      // 不创建任何模板直接查询
      const result = service.listTemplates(undefined, undefined, 'empty-project');
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      expect(result.templates).toEqual([]);
    });

    it('按 category 筛选', () => {
      service.createTemplate(createMockTemplate({ id: 'tpl-cat1', category: 'dashboard' }));
      service.createTemplate(createMockTemplate({ id: 'tpl-cat2', category: 'blank' }));

      const result = service.listTemplates('dashboard');
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].id).toBe('tpl-cat1');
    });

    it('按 source 筛选', () => {
      service.createTemplate(createMockTemplate({ id: 'tpl-src1', source: 'user' }));
      service.createTemplate(createMockTemplate({ id: 'tpl-src2', source: 'builtin' }));

      const userResult = service.listTemplates(undefined, 'user');
      expect(userResult.templates).toHaveLength(1);
      expect(userResult.templates[0].id).toBe('tpl-src1');

      const builtinResult = service.listTemplates(undefined, 'builtin');
      expect(builtinResult.templates).toHaveLength(1);
      expect(builtinResult.templates[0].id).toBe('tpl-src2');
    });
  });

  // ─── readTemplate — 读取单个 ───

  describe('readTemplate — 读取单个', () => {
    it('能读取已创建的项目级模板', () => {
      const template = createMockTemplate({ id: 'tpl-read-proj', name: '读取测试' });
      service.createTemplate(template, 'demo-project');

      const result = service.readTemplate('tpl-read-proj', 'demo-project');
      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data!.name).toBe('读取测试');
      expect(result.data!.pageConfig.width).toBe(1920);
    });

    it('不存在的模板返回 success=false', () => {
      const result = service.readTemplate('nonexistent-template');
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
    });
  });

  // ─── deleteTemplate — 删除模板 ───

  describe('deleteTemplate — 删除', () => {
    it('删除模板后文件不存在', () => {
      const template = createMockTemplate({ id: 'tpl-del-proj' });
      service.createTemplate(template, 'demo-project');

      const filePath = path.join(tempDir, 'demo-project', 'canvas-templates', 'pages', 'tpl-del-proj.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const result = service.deleteTemplate('tpl-del-proj', 'demo-project');
      expect(result.success).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('删除不存在的模板抛出错误', () => {
      expect(() => {
        service.deleteTemplate('nonexistent');
      }).toThrow();
    });

    it('禁止删除系统级内置模板', () => {
      // 创建一个 source=builtin 的系统级模板
      const template = createMockTemplate({ id: 'builtin-test', source: 'builtin' });
      service.createTemplate(template);

      expect(() => {
        service.deleteTemplate('builtin-test');
      }).toThrow('不允许删除内置模板');
    });

    it('允许删除项目级模板（即使是 builtin source）', () => {
      const template = createMockTemplate({ id: 'tpl-proj-del-ok', source: 'builtin' });
      service.createTemplate(template, 'demo-project');

      const result = service.deleteTemplate('tpl-proj-del-ok', 'demo-project');
      expect(result.success).toBe(true);
    });
  });

  // ─── 集成场景：项目页面保存为模板完整流程 ───

  describe('集成场景：项目页面保存为模板', () => {
    it('完整流程：创建 → 文件存在 → 列表可见 → 读取正确 → 删除清理', () => {
      const projectId = 'real-project';
      const templateId = 'tpl-integration';

      // 1. 创建项目级模板
      const template = createMockTemplate({
        id: templateId,
        name: '集成测试模板',
        pageConfig: { width: 1920, height: 1080, backgroundColor: '#333', layout: 'free' },
        graphics: [{ type: 'rect', x: 10, y: 20, width: 200, height: 100 }],
      });
      const createResult = service.createTemplate(template, projectId);
      expect(createResult.success).toBe(true);

      // 2. 验证文件存在于磁盘
      const filePath = path.join(tempDir, projectId, 'canvas-templates', 'pages', `${templateId}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      // 3. 验证文件内容完整性
      const raw = fs.readFileSync(filePath, 'utf-8');
      const diskData = JSON.parse(raw);
      expect(diskData.id).toBe(templateId);
      expect(diskData.name).toBe('集成测试模板');
      expect(diskData.pageConfig.backgroundColor).toBe('#333');
      expect(diskData.graphics).toHaveLength(1);
      expect(diskData.graphics[0].type).toBe('rect');

      // 4. 验证列表可查
      const listResult = service.listTemplates(undefined, undefined, projectId);
      expect(listResult.templates).toHaveLength(1);
      expect(listResult.templates[0].id).toBe(templateId);

      // 5. 验证单个读取
      const readResult = service.readTemplate(templateId, projectId);
      expect(readResult.success).toBe(true);
      expect(readResult.data!.name).toBe('集成测试模板');

      // 6. 删除后文件不存在
      service.deleteTemplate(templateId, projectId);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });
});
