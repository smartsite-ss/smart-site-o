// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { PathResolverService } from '@ss-node/ss-core';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DEFAULT_PRODUCT_ID } from '../knowledge/knowledge.manifest';

/**
 * KnowledgeService 单元测试 — v2.0 多产品架构
 *
 * 覆盖场景：
 *  1. 服务初始化（自动创建多产品目录 + manifest.json）
 *  2. getProducts（产品列表）
 *  3. getLangs（按产品的语言统计）
 *  4. getTree（目录树构建 + 产品过滤 + Fallback 降级）
 *  5. getArticle（读取 + 产品隔离 + Fallback + frontmatter 解析）
 *  6. updateArticle（更新 + 产品参数 + frontmatter 写入）
 *  7. matchRoute（精确匹配 + 通配符 + 产品隔离 + Fallback）
 *  8. search（全文搜索 + 产品+语言隔离）
 *  9. uploadImage（图片上传 + 产品+语言隔离）
 * 10. 路径遍历防护（assertSafeId）
 * 11. resolveImagePath（图片路径解析 + 产品隔离）
 * 12. manifest 缓存 + v1.0 兼容
 */
describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let tempDir: string;
  let kbRoot: string;
  let mockConfigService: {
    get: jest.Mock;
  };
  let mockPathResolver: {
    resolve: jest.Mock;
    getProjectRoot: jest.Mock;
    resolveEnv: jest.Mock;
  };

  beforeAll(() => {
    tempDir = path.join(
      os.tmpdir(),
      `kb-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    kbRoot = path.join(tempDir, 'faq');
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // 每个测试前清理 kbRoot（保留目录本身）
    if (fs.existsSync(kbRoot)) {
      fs.rmSync(kbRoot, { recursive: true, force: true });
    }

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'KB_ROOT') return kbRoot;
        if (key === 'KB_DEFAULT_LANG') return 'zh-CN';
        if (key === 'KB_SUPPORTED_LANGS') return 'zh-CN,en-US';
        return undefined;
      }),
    };

    mockPathResolver = {
      resolve: jest.fn((p: string) => path.resolve(p)),
      getProjectRoot: jest.fn(() => process.cwd()),
      resolveEnv: jest.fn((_env: string, d: string) => path.resolve(d)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PathResolverService, useValue: mockPathResolver },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
    await service.onModuleInit();
  });

  // ==================== 1. 初始化 ====================

  describe('onModuleInit', () => {
    it('应创建 KB_ROOT 目录和各语言+产品子目录', () => {
      expect(fs.existsSync(kbRoot)).toBe(true);
      // v2.0: 每个语言下有产品目录
      expect(fs.existsSync(path.join(kbRoot, 'zh-CN', 'ss-data'))).toBe(true);
      expect(fs.existsSync(path.join(kbRoot, 'zh-CN', 'ss-scada'))).toBe(true);
      expect(fs.existsSync(path.join(kbRoot, 'en-US', 'ss-data'))).toBe(true);
      expect(fs.existsSync(path.join(kbRoot, 'en-US', 'ss-scada'))).toBe(true);
    });

    it('应自动创建默认 manifest.json（v2.0 多产品结构）', () => {
      const manifestPath = path.join(kbRoot, 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.version).toBe('2.0');
      expect(manifest.products).toBeDefined();
      expect(Array.isArray(manifest.products)).toBe(true);
      expect(manifest.products.length).toBe(2);
      // ss-data 产品应有 19 个模块（17 功能 + 2 全局章节）
      const ssData = manifest.products.find((p: any) => p.id === 'ss-data');
      expect(ssData.modules.length).toBe(19);
      expect(ssData.routeMap.length).toBe(10);
      // ss-scada 产品应有 10 个模块（8 功能 + 2 全局章节）
      const ssScada = manifest.products.find((p: any) => p.id === 'ss-scada');
      expect(ssScada.modules.length).toBe(10);
    });

    it('每个产品应包含全局章节模块（00-overview + 00-manual）', () => {
      const manifestPath = path.join(kbRoot, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      for (const product of manifest.products) {
        const overview = product.modules.find((m: any) => m.id === '00-overview');
        const manual = product.modules.find((m: any) => m.id === '00-manual');
        expect(overview).toBeDefined();
        expect(overview.isGlobal).toBe(true);
        expect(overview.globalType).toBe('overview');
        expect(manual).toBeDefined();
        expect(manual.isGlobal).toBe(true);
        expect(manual.globalType).toBe('manual');
      }
    });

    it('manifest 已存在时不覆盖', async () => {
      const customManifest = {
        version: '2.0-custom',
        products: [
          {
            id: 'custom-product',
            name: 'Custom',
            order: 1,
            modules: [{ id: 'test', name: 'Test', order: 1 }],
            routeMap: [],
          },
        ],
      };
      fs.writeFileSync(path.join(kbRoot, 'manifest.json'), JSON.stringify(customManifest), 'utf-8');
      const module2: TestingModule = await Test.createTestingModule({
        providers: [
          KnowledgeService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: PathResolverService, useValue: mockPathResolver },
        ],
      }).compile();
      const service2 = module2.get<KnowledgeService>(KnowledgeService);
      await service2.onModuleInit();

      const manifest = JSON.parse(fs.readFileSync(path.join(kbRoot, 'manifest.json'), 'utf-8'));
      expect(manifest.version).toBe('2.0-custom');
    });
  });

  // ==================== 2. getProducts ====================

  describe('getProducts', () => {
    it('应返回所有产品列表', async () => {
      const result = await service.getProducts();
      expect(result.products.length).toBe(2);
      expect(result.defaultProduct).toBe(DEFAULT_PRODUCT_ID);
      const ids = result.products.map((p) => p.id);
      expect(ids).toContain('ss-data');
      expect(ids).toContain('ss-scada');
    });

    it('产品应按 order 排序', async () => {
      const result = await service.getProducts();
      const orders = result.products.map((p) => p.order);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
      }
    });

    it('应返回每个产品的模块数', async () => {
      const result = await service.getProducts();
      const ssData = result.products.find((p) => p.id === 'ss-data');
      expect(ssData?.moduleCount).toBe(19);
      const ssScada = result.products.find((p) => p.id === 'ss-scada');
      expect(ssScada?.moduleCount).toBe(10);
    });
  });

  // ==================== 3. getLangs ====================

  describe('getLangs', () => {
    beforeEach(() => {
      // 在 ss-data 产品的 zh-CN 下创建 03-device 模块
      const modDir = path.join(kbRoot, 'zh-CN', 'ss-data', '03-device');
      fs.mkdirSync(modDir, { recursive: true });
      fs.writeFileSync(
        path.join(modDir, 'README.md'),
        matterString('03-device', '设备管理概述', 'zh-CN', 'ss-data', '03-device'),
        'utf-8',
      );
      fs.writeFileSync(
        path.join(modDir, 'getting-started.md'),
        matterString('03-device/getting-started', '快速入门', 'zh-CN', 'ss-data', '03-device'),
        'utf-8',
      );
    });

    it('应返回支持的语言列表和默认语言', async () => {
      const result = await service.getLangs('ss-data');
      expect(result.defaultLang).toBe('zh-CN');
      expect(result.supportedLangs).toEqual(['zh-CN', 'en-US']);
    });

    it('应按产品统计文章数和模块数', async () => {
      const result = await service.getLangs('ss-data');
      const zhStat = result.stats.find((s) => s.lang === 'zh-CN');
      const enStat = result.stats.find((s) => s.lang === 'en-US');
      expect(zhStat?.articleCount).toBe(2);
      expect(zhStat?.moduleCount).toBe(1);
      expect(enStat?.articleCount).toBe(0);
      expect(enStat?.moduleCount).toBe(0);
    });

    it('不传 product 时应使用默认产品', async () => {
      const result = await service.getLangs();
      const zhStat = result.stats.find((s) => s.lang === 'zh-CN');
      expect(zhStat?.articleCount).toBe(2);
    });
  });

  // ==================== 4. getTree ====================

  describe('getTree', () => {
    beforeEach(() => {
      // ss-data 产品 zh-CN 有 03-device 模块
      const modDir = path.join(kbRoot, 'zh-CN', 'ss-data', '03-device');
      const opsDir = path.join(modDir, 'operations');
      fs.mkdirSync(opsDir, { recursive: true });
      fs.writeFileSync(
        path.join(modDir, 'README.md'),
        matterString('03-device', '设备管理概述', 'zh-CN', 'ss-data', '03-device', { order: 1 }),
        'utf-8',
      );
      fs.writeFileSync(
        path.join(opsDir, 'create-device.md'),
        matterString(
          '03-device/operations/create-device',
          '创建设备',
          'zh-CN',
          'ss-data',
          '03-device',
          { order: 2 },
        ),
        'utf-8',
      );
    });

    it('应返回指定产品的目录树', async () => {
      const tree = await service.getTree('ss-data', 'zh-CN');
      expect(tree.length).toBe(1);
      const deviceNode = tree.find((n) => n.id === '03-device');
      expect(deviceNode).toBeDefined();
      expect(deviceNode?.type).toBe('folder');
      expect(deviceNode?.product).toBe('ss-data');
      expect(deviceNode?.fallback).toBe(false);
      expect(deviceNode?.children?.length).toBe(2);
    });

    it('不同产品的目录树应隔离', async () => {
      // ss-scada 产品无内容
      const scadaTree = await service.getTree('ss-scada', 'zh-CN');
      const dataTree = await service.getTree('ss-data', 'zh-CN');
      expect(dataTree.length).toBeGreaterThan(0);
      // ss-scada 目录为空（模块目录未创建）
      const scadaHasContent = scadaTree.some((n) => n.children && n.children.length > 0);
      expect(scadaHasContent).toBe(false);
    });

    it('en-US 缺失时应 Fallback 到 zh-CN 并标记 fallback:true', async () => {
      const tree = await service.getTree('ss-data', 'en-US');
      const deviceNode = tree.find((n) => n.id === '03-device');
      expect(deviceNode).toBeDefined();
      expect(deviceNode?.fallback).toBe(true);
      expect(deviceNode?.lang).toBe('zh-CN');
    });

    it('应按 order 排序', async () => {
      const tree = await service.getTree('ss-data', 'zh-CN');
      const deviceNode = tree.find((n) => n.id === '03-device');
      const children = deviceNode?.children || [];
      const orders = children.map((c) => c.order ?? 999);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
      }
    });

    it('不传参数时应使用默认产品和默认语言', async () => {
      const tree = await service.getTree();
      const deviceNode = tree.find((n) => n.id === '03-device');
      expect(deviceNode?.lang).toBe('zh-CN');
      expect(deviceNode?.product).toBe(DEFAULT_PRODUCT_ID);
    });

    it('全局章节节点应标记 isGlobal 和 globalType', async () => {
      // 创建 00-overview 目录
      const overviewDir = path.join(kbRoot, 'zh-CN', 'ss-data', '00-overview');
      fs.mkdirSync(overviewDir, { recursive: true });
      fs.writeFileSync(
        path.join(overviewDir, 'README.md'),
        matterString('00-overview', '系统概述', 'zh-CN', 'ss-data', '00-overview'),
        'utf-8',
      );
      const tree = await service.getTree('ss-data', 'zh-CN');
      const overviewNode = tree.find((n) => n.id === '00-overview');
      expect(overviewNode).toBeDefined();
      expect(overviewNode?.isGlobal).toBe(true);
      expect(overviewNode?.globalType).toBe('overview');
    });
  });

  // ==================== 5. getArticle ====================

  describe('getArticle', () => {
    beforeEach(() => {
      const modDir = path.join(kbRoot, 'zh-CN', 'ss-data', '03-device');
      fs.mkdirSync(modDir, { recursive: true });
      fs.writeFileSync(
        path.join(modDir, 'getting-started.md'),
        matterString('03-device/getting-started', '快速入门', 'zh-CN', 'ss-data', '03-device', {
          content: '# 快速入门\n\n创建设备的步骤。',
        }),
        'utf-8',
      );
    });

    it('应读取指定产品的文章并解析 frontmatter', async () => {
      const article = await service.getArticle('03-device/getting-started', 'ss-data', 'zh-CN');
      expect(article.id).toBe('03-device/getting-started');
      expect(article.title).toBe('快速入门');
      expect(article.lang).toBe('zh-CN');
      expect(article.product).toBe('ss-data');
      expect(article.module).toBe('03-device');
      expect(article.content).toContain('# 快速入门');
      expect(article.fallback).toBe(false);
    });

    it('en-US 不存在时应 Fallback 到 zh-CN', async () => {
      const article = await service.getArticle('03-device/getting-started', 'ss-data', 'en-US');
      expect(article.lang).toBe('zh-CN');
      expect(article.fallback).toBe(true);
      expect(article.requestedLang).toBe('en-US');
    });

    it('不传 product 时应使用默认产品', async () => {
      const article = await service.getArticle('03-device/getting-started');
      expect(article.product).toBe(DEFAULT_PRODUCT_ID);
    });

    it('文章不存在时应抛出 NotFoundException', async () => {
      await expect(service.getArticle('non-existent/article', 'ss-data', 'zh-CN')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('不同产品的文章应隔离（ss-scada 无此文章）', async () => {
      await expect(
        service.getArticle('03-device/getting-started', 'ss-scada', 'zh-CN'),
      ).rejects.toThrow(NotFoundException);
    });

    it('非法 lang 应回退到默认语言', async () => {
      const article = await service.getArticle('03-device/getting-started', 'ss-data', 'fr-FR');
      expect(article.lang).toBe('zh-CN');
    });
  });

  // ==================== 6. updateArticle ====================

  describe('updateArticle', () => {
    it('应写入文章到指定产品目录并更新 frontmatter', async () => {
      const content = '---\ntitle: 测试文章\n---\n# 测试内容';
      const article = await service.updateArticle(
        '03-device/test-article',
        content,
        'admin',
        'zh-CN',
        'ss-data',
      );
      expect(article.title).toBe('测试文章');
      expect(article.updatedBy).toBe('admin');
      expect(article.product).toBe('ss-data');
      // 验证文件写入到 ss-data 产品目录
      const filePath = path.join(kbRoot, 'zh-CN', 'ss-data', '03-device', 'test-article.md');
      expect(fs.existsSync(filePath)).toBe(true);
      const raw = fs.readFileSync(filePath, 'utf-8');
      expect(raw).toContain('updatedBy: admin');
      expect(raw).toContain('product: ss-data');
    });

    it('不传 product 时应写入默认产品目录', async () => {
      const content = '# 测试';
      await service.updateArticle('03-device/test', content, 'admin', 'zh-CN');
      const filePath = path.join(kbRoot, 'zh-CN', DEFAULT_PRODUCT_ID, '03-device', 'test.md');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('应拒绝非法 lang', async () => {
      await expect(
        service.updateArticle('03-device/test', '# test', 'admin', 'fr-FR', 'ss-data'),
      ).rejects.toThrow(BadRequestException);
    });

    it('应支持更新已有文章', async () => {
      await service.updateArticle(
        '03-device/update-test',
        '---\ntitle: 原标题\ntags: [a]\n---\n# 原内容',
        'user1',
        'zh-CN',
        'ss-data',
      );
      const updated = await service.updateArticle(
        '03-device/update-test',
        '---\ntitle: 新标题\ntags: [b]\n---\n# 新内容',
        'user2',
        'zh-CN',
        'ss-data',
      );
      expect(updated.title).toBe('新标题');
      expect(updated.updatedBy).toBe('user2');
    });
  });

  // ==================== 7. matchRoute ====================

  describe('matchRoute', () => {
    beforeEach(() => {
      const modDir = path.join(kbRoot, 'zh-CN', 'ss-data', '03-device');
      fs.mkdirSync(modDir, { recursive: true });
      fs.writeFileSync(
        path.join(modDir, 'README.md'),
        matterString('03-device', '设备管理', 'zh-CN', 'ss-data', '03-device'),
        'utf-8',
      );
    });

    it('应精确匹配 ss-data 产品的路由', async () => {
      const result = await service.matchRoute('/system/devices', 'ss-data', 'zh-CN');
      expect(result).not.toBeNull();
      expect(result?.knowledgePath).toBe('03-device');
      expect(result?.product).toBe('ss-data');
      expect(result?.lang).toBe('zh-CN');
      expect(result?.fallback).toBe(false);
    });

    it('应支持通配符匹配', async () => {
      const result = await service.matchRoute('/system/devices/dev-001', 'ss-data', 'zh-CN');
      expect(result).not.toBeNull();
      expect(result?.knowledgePath).toBe('03-device/device-detail');
    });

    it('en-US 无文章时应 Fallback 到 zh-CN', async () => {
      const result = await service.matchRoute('/system/devices', 'ss-data', 'en-US');
      expect(result?.fallback).toBe(true);
      expect(result?.lang).toBe('zh-CN');
    });

    it('不同产品的路由映射应隔离', async () => {
      // ss-scada 有 /editor 路由
      const scadaResult = await service.matchRoute('/editor', 'ss-scada', 'zh-CN');
      expect(scadaResult).not.toBeNull();
      expect(scadaResult?.product).toBe('ss-scada');
      // ss-data 无 /editor 路由
      const dataResult = await service.matchRoute('/editor', 'ss-data', 'zh-CN');
      expect(dataResult).toBeNull();
    });

    it('未匹配的路由应返回 null', async () => {
      const result = await service.matchRoute('/system/unknown', 'ss-data', 'zh-CN');
      expect(result).toBeNull();
    });
  });

  // ==================== 8. search ====================

  describe('search', () => {
    beforeEach(() => {
      // ss-data zh-CN 有"设备"关键词
      const zhDir = path.join(kbRoot, 'zh-CN', 'ss-data', '03-device');
      fs.mkdirSync(zhDir, { recursive: true });
      fs.writeFileSync(
        path.join(zhDir, 'README.md'),
        matterString('03-device', '设备管理', 'zh-CN', 'ss-data', '03-device', {
          content: '# 设备管理\n\n管理工业设备。',
        }),
        'utf-8',
      );
      // ss-data en-US 有"device"关键词
      const enDir = path.join(kbRoot, 'en-US', 'ss-data', '03-device');
      fs.mkdirSync(enDir, { recursive: true });
      fs.writeFileSync(
        path.join(enDir, 'README.md'),
        matterString('03-device', 'Device Management', 'en-US', 'ss-data', '03-device', {
          content: '# Device Management\n\nManage industrial devices.',
        }),
        'utf-8',
      );
    });

    it('应仅在指定产品+语言目录内搜索', async () => {
      const results = await service.search('设备', 'ss-data', 'zh-CN');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every((r) => r.lang === 'zh-CN')).toBe(true);
      expect(results.every((r) => r.product === 'ss-data')).toBe(true);
    });

    it('搜索结果应包含 product 字段', async () => {
      const results = await service.search('设备', 'ss-data', 'zh-CN');
      expect(results[0].product).toBe('ss-data');
    });

    it('ss-scada 产品搜索不应返回 ss-data 的结果', async () => {
      const results = await service.search('设备', 'ss-scada', 'zh-CN');
      expect(results.length).toBe(0);
    });

    it('空查询应返回空数组', async () => {
      const results = await service.search('', 'ss-data', 'zh-CN');
      expect(results).toEqual([]);
    });
  });

  // ==================== 9. uploadImage ====================

  describe('uploadImage', () => {
    it('应按语言+产品+模块目录隔离存储图片', async () => {
      const buffer = Buffer.from('fake-image-data');
      const url = await service.uploadImage(buffer, 'test.png', '03-device', 'zh-CN', 'ss-data');
      expect(url).toBe('03-device/images/test.png');
      // 文件应在 ss-data 产品目录下
      const filePath = path.join(kbRoot, 'zh-CN', 'ss-data', '03-device', 'images', 'test.png');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath)).toEqual(buffer);
    });

    it('不同产品的图片应隔离存储', async () => {
      await service.uploadImage(Buffer.from('data1'), 'img.png', '03-device', 'zh-CN', 'ss-data');
      await service.uploadImage(Buffer.from('data2'), 'img.png', '01-canvas', 'zh-CN', 'ss-scada');
      const dataPath = path.join(kbRoot, 'zh-CN', 'ss-data', '03-device', 'images', 'img.png');
      const scadaPath = path.join(kbRoot, 'zh-CN', 'ss-scada', '01-canvas', 'images', 'img.png');
      expect(fs.existsSync(dataPath)).toBe(true);
      expect(fs.existsSync(scadaPath)).toBe(true);
      expect(fs.readFileSync(dataPath).toString()).toBe('data1');
      expect(fs.readFileSync(scadaPath).toString()).toBe('data2');
    });

    it('应拒绝非法 lang', async () => {
      await expect(
        service.uploadImage(Buffer.from('x'), 'test.png', '03-device', 'fr-FR', 'ss-data'),
      ).rejects.toThrow(BadRequestException);
    });

    it('应对文件名做安全清理', async () => {
      const url = await service.uploadImage(
        Buffer.from('data'),
        '../../etc/passwd.png',
        '03-device',
        'zh-CN',
        'ss-data',
      );
      expect(url).not.toContain('..');
      expect(url).toBe('03-device/images/passwd.png');
    });
  });

  // ==================== 10. resolveImagePath ====================

  describe('resolveImagePath', () => {
    it('应解析到正确的产品+语言目录', async () => {
      const abs = await service.resolveImagePath('03-device/images/foo.png', 'zh-CN', 'ss-data');
      const expected = path.join(kbRoot, 'zh-CN', 'ss-data', '03-device', 'images', 'foo.png');
      expect(abs).toBe(expected);
    });

    it('应过滤路径遍历字符（.. 被移除，路径被清理）', async () => {
      // 服务设计为过滤 .. 片段，而非拒绝
      const abs = await service.resolveImagePath('../../../etc/passwd', 'zh-CN', 'ss-data');
      // .. 被过滤，结果为 kbRoot/zh-CN/ss-data/etc/passwd（仍在产品根下）
      const expected = path.join(kbRoot, 'zh-CN', 'ss-data', 'etc', 'passwd');
      expect(abs).toBe(expected);
    });

    it('应过滤嵌套路径遍历字符', async () => {
      const abs = await service.resolveImagePath(
        '03-device/../../../etc/passwd',
        'zh-CN',
        'ss-data',
      );
      // .. 被过滤，结果为 kbRoot/zh-CN/ss-data/03-device/etc/passwd
      const expected = path.join(kbRoot, 'zh-CN', 'ss-data', '03-device', 'etc', 'passwd');
      expect(abs).toBe(expected);
    });

    it('空路径应抛出 BadRequestException', async () => {
      await expect(service.resolveImagePath('', 'zh-CN', 'ss-data')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('仅含 .. 的路径应抛出 BadRequestException', async () => {
      await expect(service.resolveImagePath('../..', 'zh-CN', 'ss-data')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== 11. 路径遍历防护 ====================

  describe('路径遍历防护', () => {
    it('应拒绝包含 .. 的文章 ID', async () => {
      await expect(service.getArticle('../../../etc/passwd', 'ss-data', 'zh-CN')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应拒绝绝对路径的文章 ID', async () => {
      await expect(service.getArticle('/etc/passwd', 'ss-data', 'zh-CN')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== 12. manifest 缓存 + v1.0 兼容 ====================

  describe('manifest 缓存', () => {
    it('1 分钟内应使用缓存', async () => {
      const modDir = path.join(kbRoot, 'zh-CN', 'ss-data', '01-permission');
      fs.mkdirSync(modDir, { recursive: true });
      fs.writeFileSync(
        path.join(modDir, 'README.md'),
        matterString('01-permission', '权限管理', 'zh-CN', 'ss-data', '01-permission'),
        'utf-8',
      );
      await service.getTree('ss-data', 'zh-CN');
      // 修改 manifest
      const manifestPath = path.join(kbRoot, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const ssData = manifest.products.find((p: any) => p.id === 'ss-data');
      const permModule = ssData.modules.find((m: any) => m.id === '01-permission');
      permModule.name = '已修改的名称';
      fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf-8');
      // 立即读取（应返回缓存）
      const tree = await service.getTree('ss-data', 'zh-CN');
      const permNode = tree.find((n) => n.id === '01-permission');
      expect(permNode?.title).not.toBe('已修改的名称');
    });
  });

  describe('v1.0 manifest 兼容', () => {
    it('应自动迁移 v1.0 manifest 到 v2.0 结构', async () => {
      // 写入 v1.0 格式的 manifest
      const v1Manifest = {
        version: '1.0',
        modules: [{ id: 'legacy-mod', name: 'Legacy', order: 1 }],
        routeMap: [{ routePattern: '/legacy', knowledgePath: 'legacy-mod' }],
      };
      fs.writeFileSync(path.join(kbRoot, 'manifest.json'), JSON.stringify(v1Manifest), 'utf-8');
      // 创建 legacy-mod 目录在旧位置（无产品目录）
      const modDir = path.join(kbRoot, 'zh-CN', 'legacy-mod');
      fs.mkdirSync(modDir, { recursive: true });
      fs.writeFileSync(
        path.join(modDir, 'README.md'),
        matterString('legacy-mod', 'Legacy Module', 'zh-CN', DEFAULT_PRODUCT_ID, 'legacy-mod'),
        'utf-8',
      );
      // 重新初始化服务（触发迁移）
      const module2: TestingModule = await Test.createTestingModule({
        providers: [
          KnowledgeService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: PathResolverService, useValue: mockPathResolver },
        ],
      }).compile();
      const service2 = module2.get<KnowledgeService>(KnowledgeService);
      await service2.onModuleInit();
      // getProducts 应返回迁移后的产品
      const products = await service2.getProducts();
      expect(products.products.length).toBeGreaterThanOrEqual(1);
      // 默认产品应包含 legacy-mod 模块
      const defaultProduct = products.products.find((p) => p.id === DEFAULT_PRODUCT_ID);
      expect(defaultProduct).toBeDefined();
      expect(defaultProduct?.moduleCount).toBeGreaterThanOrEqual(1);
    });
  });
});

// ==================== 辅助函数 ====================

/**
 * 生成带 frontmatter 的 Markdown 字符串（v2.0 含 product 字段）
 */
function matterString(
  id: string,
  title: string,
  lang: string,
  product: string,
  module: string,
  opts?: { order?: number; content?: string; tags?: string[] },
): string {
  const lines = ['---'];
  lines.push(`id: ${id}`);
  lines.push(`title: ${title}`);
  lines.push(`lang: ${lang}`);
  lines.push(`product: ${product}`);
  lines.push(`module: ${module}`);
  if (opts?.order !== undefined) lines.push(`order: ${opts.order}`);
  if (opts?.tags) lines.push(`tags: [${opts.tags.join(', ')}]`);
  lines.push('---');
  lines.push('');
  lines.push(opts?.content || `# ${title}`);
  return lines.join('\n');
}
