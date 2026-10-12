// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PageSaveService } from '../page-save.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PathResolverService } from '@ss-node/ss-core';

jest.mock('@ss-node/ss-core', () => {
  const actual = jest.requireActual('@ss-node/ss-core');
  return {
    ...actual,
    PathResolverService: class {
      resolve = jest.fn((p: string) => require('path').resolve(p));
      getProjectRoot = jest.fn(() => process.cwd());
      resolveEnv = jest.fn((_env: string, defaultValue: string) => defaultValue);
    },
  };
});

describe('PageSaveService', () => {
  let service: PageSaveService;
  let tempDir: string;
  let testProjectName: string;
  const mockPreview = Buffer.from('mock-preview-png-data');
  const mockPreviewSmall = Buffer.from('mock-preview-small-png-data');

  // ── 辅助：返回带有 p_ 前缀的页面路径 ──
  function pagePath(...segments: string[]) {
    return path.join(tempDir, testProjectName, 'pages', ...segments);
  }
  function p(name: string) {
    return `p_${name}`;
  }
  function g(name: string) {
    return `g_${name}`;
  }

  beforeEach(() => {
    tempDir = path.join(
      os.tmpdir(),
      `page-save-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    testProjectName = 'test-project';

    const mockConfigService = {
      get: jest.fn().mockReturnValue(tempDir),
    } as unknown as ConfigService;

    service = new PageSaveService(mockConfigService, new PathResolverService() as any);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getProjectsDir', () => {
    it('should return the configured projects directory', () => {
      const dir = service.getProjectsDir();
      expect(dir).toContain(tempDir);
    });
  });

  describe('normalizePageName', () => {
    it('should trim whitespace', () => {
      const result = (service as any).normalizePageName('  PageName  ');
      expect(result).toBe('PageName');
    });

    it('should replace spaces with hyphens', () => {
      const result = (service as any).normalizePageName('Page 1');
      expect(result).toBe('Page-1');
    });

    it('should replace illegal characters with hyphens', () => {
      const result = (service as any).normalizePageName('a/b:c*d?e<f>g|h');
      expect(result).toBe('a-b-c-d-e-f-g-h');
    });

    it('should collapse multiple consecutive hyphens', () => {
      const result = (service as any).normalizePageName('A---B---C');
      expect(result).toBe('A-B-C');
    });

    it('should remove leading and trailing hyphens', () => {
      const result = (service as any).normalizePageName('-PageName-');
      expect(result).toBe('PageName');
    });

    it('should return "unnamed" for empty string after normalization', () => {
      const result = (service as any).normalizePageName('   ');
      expect(result).toBe('unnamed');
    });
  });

  describe('createGroup', () => {
    it('should create a group directory with g_ prefix under pages', () => {
      const result = service.createGroup(testProjectName, 'group1');

      expect(result.success).toBe(true);
      expect(result.groupName).toBe('group1');

      const expectedPath = pagePath(g('group1'));
      expect(fs.existsSync(expectedPath)).toBe(true);
    });

    it('should sanitize invalid characters in group name', () => {
      const result = service.createGroup(testProjectName, 'group/a:b?c');

      expect(result.success).toBe(true);
      expect(result.groupName).toBe('group-a-b-c');

      const expectedPath = pagePath(g('group-a-b-c'));
      expect(fs.existsSync(expectedPath)).toBe(true);
    });

    it('should normalize spaces in group name', () => {
      const result = service.createGroup(testProjectName, 'My Group');

      expect(result.success).toBe(true);
      expect(result.groupName).toBe('My-Group');

      const expectedPath = pagePath(g('My-Group'));
      expect(fs.existsSync(expectedPath)).toBe(true);
    });

    it('should throw BadRequestException when group already exists', () => {
      service.createGroup(testProjectName, 'group1');

      expect(() => {
        service.createGroup(testProjectName, 'group1');
      }).toThrow(BadRequestException);
    });
  });

  describe('deleteGroup', () => {
    it('should delete an existing group directory', () => {
      service.createGroup(testProjectName, 'group1');
      const groupPath = pagePath(g('group1'));
      expect(fs.existsSync(groupPath)).toBe(true);

      const result = service.deleteGroup(testProjectName, 'group1');

      expect(result.success).toBe(true);
      expect(result.groupName).toBe('group1');
      expect(fs.existsSync(groupPath)).toBe(false);
    });

    it('should throw NotFoundException when group does not exist', () => {
      expect(() => {
        service.deleteGroup(testProjectName, 'nonexistent');
      }).toThrow(NotFoundException);
    });
  });

  describe('listGroups', () => {
    it('should return empty list when no groups exist', () => {
      const result = service.listGroups(testProjectName);

      expect(result.success).toBe(true);
      expect(result.groups).toEqual([]);
    });

    it('should list all created groups with page counts and strip g_ prefix from name', () => {
      service.createGroup(testProjectName, 'group1');
      service.createGroup(testProjectName, 'group2');

      const result = service.listGroups(testProjectName);

      expect(result.success).toBe(true);
      expect(result.projectName).toBe(testProjectName);
      expect(result.groups).toHaveLength(2);
      expect(result.groups.map((g) => g.name)).toEqual(
        expect.arrayContaining(['group1', 'group2']),
      );
      expect(result.groups[0].pageCount).toBe(0);
    });

    it('should count pages inside groups (p_ prefixed dirs)', () => {
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'page1', { id: '1' }, 'group1', mockPreview);

      const result = service.listGroups(testProjectName);

      const group1 = result.groups.find((g) => g.name === 'group1');
      expect(group1?.pageCount).toBe(1);
    });
  });

  describe('savePage', () => {
    it('【要求1】保存页面时应创建以 p_ 前缀命名的文件夹', () => {
      const pageData = { id: 'page1', name: 'MainPage', widgets: [] };
      const result = service.savePage(
        testProjectName,
        'MainPage',
        pageData,
        undefined,
        mockPreview,
      );

      expect(result.success).toBe(true);
      expect(result.pageName).toBe('MainPage');

      const pageDir = pagePath(p('MainPage'));
      expect(fs.existsSync(pageDir)).toBe(true);
      expect(fs.statSync(pageDir).isDirectory()).toBe(true);
    });

    it('【要求2】保存页面时应将 page.json 保存到 p_ 前缀文件夹中', () => {
      const pageData = { id: 'page1', name: 'MainPage', widgets: [] };
      service.savePage(testProjectName, 'MainPage', pageData, undefined, mockPreview);

      const jsonPath = pagePath(p('MainPage'), 'page.json');
      expect(fs.existsSync(jsonPath)).toBe(true);

      const savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(savedData.id).toBe('page1');
      expect(savedData.name).toBe('MainPage');
      expect(savedData.widgets).toEqual([]);
      expect(savedData.updatedAt).toBeDefined();
    });

    it('【要求3】保存页面时应将运行态截图 preview.png 保存到文件夹中', () => {
      const pageData = { id: 'page1', name: 'MainPage', widgets: [] };
      service.savePage(testProjectName, 'MainPage', pageData, undefined, mockPreview);

      const previewPath = pagePath(p('MainPage'), 'preview.png');
      expect(fs.existsSync(previewPath)).toBe(true);
      expect(fs.readFileSync(previewPath)).toEqual(mockPreview);
    });

    it('一次 savePage 调用应同时创建文件夹、保存 page.json 和 preview.png', () => {
      const pageData = { id: 'page1', name: 'MainPage', widgets: [] };
      service.savePage(testProjectName, 'MainPage', pageData, undefined, mockPreview);

      const pageDir = pagePath(p('MainPage'));

      // 文件夹存在
      expect(fs.existsSync(pageDir)).toBe(true);
      expect(fs.statSync(pageDir).isDirectory()).toBe(true);

      // page.json 存在
      const jsonPath = pagePath(p('MainPage'), 'page.json');
      expect(fs.existsSync(jsonPath)).toBe(true);
      const savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(savedData.id).toBe('page1');

      // preview.png 存在
      const previewPath = pagePath(p('MainPage'), 'preview.png');
      expect(fs.existsSync(previewPath)).toBe(true);
      expect(fs.readFileSync(previewPath)).toEqual(mockPreview);

      // 文件夹只有这两个文件（不含其他）
      const files = fs.readdirSync(pageDir);
      expect(files).toEqual(expect.arrayContaining(['page.json', 'preview.png']));
      expect(files.length).toBe(2);
    });

    it('应在分组内（g_ 前缀）创建 p_ 前缀文件夹并保存 page.json 和 preview.png', () => {
      service.createGroup(testProjectName, 'group1');
      const pageData = { id: 'page1', name: 'GroupPage' };
      service.savePage(testProjectName, 'GroupPage', pageData, 'group1', mockPreview);

      const pageDir = pagePath(g('group1'), p('GroupPage'));

      expect(fs.existsSync(pageDir)).toBe(true);
      expect(fs.existsSync(path.join(pageDir, 'page.json'))).toBe(true);
      expect(fs.existsSync(path.join(pageDir, 'preview.png'))).toBe(true);
    });

    it('previewBuffer 为空时只保存 page.json，不创建 preview.png', () => {
      const pageData = { id: 'page1' };
      service.savePage(testProjectName, 'page1', pageData);

      const pageDir = pagePath(p('page1'));
      expect(fs.existsSync(path.join(pageDir, 'page.json'))).toBe(true);
      expect(fs.existsSync(path.join(pageDir, 'preview.png'))).toBe(false);
      expect(fs.existsSync(path.join(pageDir, 'preview_small.png'))).toBe(false);
    });

    it('previewSmallBuffer 提供时应在同目录下保存 preview_small.png', () => {
      const pageData = { id: 'page1' };
      service.savePage(
        testProjectName,
        'page1',
        pageData,
        undefined,
        mockPreview,
        mockPreviewSmall,
      );

      const pageDir = pagePath(p('page1'));
      expect(fs.existsSync(path.join(pageDir, 'preview.png'))).toBe(true);
      expect(fs.readFileSync(path.join(pageDir, 'preview.png'))).toEqual(mockPreview);
      expect(fs.existsSync(path.join(pageDir, 'preview_small.png'))).toBe(true);
      expect(fs.readFileSync(path.join(pageDir, 'preview_small.png'))).toEqual(mockPreviewSmall);
    });

    it('仅提供 previewSmallBuffer（无 preview）时只保存 preview_small.png', () => {
      const pageData = { id: 'page1' };
      service.savePage(testProjectName, 'page1', pageData, undefined, undefined, mockPreviewSmall);

      const pageDir = pagePath(p('page1'));
      expect(fs.existsSync(path.join(pageDir, 'preview.png'))).toBe(false);
      expect(fs.existsSync(path.join(pageDir, 'preview_small.png'))).toBe(true);
    });

    it('提供 previewSmallBuffer 时应兼容分组目录', () => {
      service.createGroup(testProjectName, 'group1');
      const pageData = { id: 'page1' };
      service.savePage(testProjectName, 'page1', pageData, 'group1', mockPreview, mockPreviewSmall);

      const pageDir = pagePath(g('group1'), p('page1'));
      expect(fs.existsSync(path.join(pageDir, 'preview_small.png'))).toBe(true);
    });

    it('应添加 updatedAt 时间戳', () => {
      const pageData = { id: 'page1' };
      service.savePage(testProjectName, 'page1', pageData, undefined, mockPreview);

      const jsonPath = pagePath(p('page1'), 'page.json');
      const savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(savedData.updatedAt).toBeDefined();
      expect(new Date(savedData.updatedAt).getTime()).not.toBeNaN();
    });

    it('页面名中的空格应被规范化为 -', () => {
      const pageData = { id: '1', name: 'Page 1' };
      service.savePage(testProjectName, 'Page 1', pageData);

      const jsonPath = pagePath(p('Page-1'), 'page.json');
      expect(fs.existsSync(jsonPath)).toBe(true);
    });

    it('【ID 保护】page.json 已有 id 时，savePage 应保留原始 id 不被覆盖', () => {
      // 第一次保存：写入 id = "page-abc"
      const originalData = { id: 'page-abc', name: 'ProtectedPage', widgets: ['w1'] };
      service.savePage(testProjectName, 'ProtectedPage', originalData);

      const jsonPath = pagePath(p('ProtectedPage'), 'page.json');
      let savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(savedData.id).toBe('page-abc');

      // 第二次保存：传入不同的 id（模拟前端用 name 覆盖 id）
      const updateData = { id: 'ProtectedPage', name: 'ProtectedPage', widgets: ['w2'] };
      service.savePage(testProjectName, 'ProtectedPage', updateData);

      savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      // ID 应保持不变
      expect(savedData.id).toBe('page-abc');
      // 其他字段应更新
      expect(savedData.widgets).toEqual(['w2']);
      expect(savedData.name).toBe('ProtectedPage');
    });

    it('【ID 保护】savePage 保留 id 在分组目录中也应生效', () => {
      service.createGroup(testProjectName, 'g1');
      const originalData = { id: 'page-xyz', name: 'GPage' };
      service.savePage(testProjectName, 'GPage', originalData, 'g1');

      const jsonPath = pagePath(g('g1'), p('GPage'), 'page.json');
      let savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(savedData.id).toBe('page-xyz');

      const updateData = { id: 'GPage', name: 'GPage', widgets: ['updated'] };
      service.savePage(testProjectName, 'GPage', updateData, 'g1');

      savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(savedData.id).toBe('page-xyz');
      expect(savedData.widgets).toEqual(['updated']);
    });
  });

  describe('saveAllPages', () => {
    it('should save multiple pages with p_ prefix', async () => {
      const pages = [
        { id: '1', name: 'Page1' },
        { id: '2', name: 'Page2' },
        { id: '3', name: 'Page3' },
      ];

      const result = await service.saveAllPages(testProjectName, pages);

      expect(result.success).toBe(true);
      expect(result.savedCount).toBe(3);
      expect(result.pages).toHaveLength(3);

      for (const page of pages) {
        const jsonPath = pagePath(p(page.name), 'page.json');
        expect(fs.existsSync(jsonPath)).toBe(true);
      }
    });

    it('should save multiple pages inside a group (g_/p_ prefix)', async () => {
      service.createGroup(testProjectName, 'group1');
      const pages = [
        { id: '1', name: 'GroupPage1' },
        { id: '2', name: 'GroupPage2' },
      ];

      const result = await service.saveAllPages(testProjectName, pages, 'group1');

      expect(result.success).toBe(true);
      expect(result.savedCount).toBe(2);

      for (const page of pages) {
        const jsonPath = pagePath(g('group1'), p(page.name), 'page.json');
        expect(fs.existsSync(jsonPath)).toBe(true);
      }
    });

    it('should throw BadRequestException when pages is not an array', async () => {
      await expect(service.saveAllPages(testProjectName, null as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.saveAllPages(testProjectName, 'not-array' as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should save preview.png and preview_small.png for the specified page when previews provided', async () => {
      const pages = [
        { id: '1', name: 'PageA' },
        { id: '2', name: 'PageB' },
      ];
      const previews = {
        PageA: { preview: mockPreview, previewSmall: mockPreviewSmall },
      };

      const result = await service.saveAllPages(testProjectName, pages, undefined, previews);
      expect(result.success).toBe(true);
      expect(result.savedCount).toBe(2);

      const pageADir = pagePath(p('PageA'));
      const pageBDir = pagePath(p('PageB'));
      expect(fs.existsSync(path.join(pageADir, 'preview.png'))).toBe(true);
      expect(fs.existsSync(path.join(pageADir, 'preview_small.png'))).toBe(true);
      expect(fs.readFileSync(path.join(pageADir, 'preview.png'))).toEqual(mockPreview);
      expect(fs.readFileSync(path.join(pageADir, 'preview_small.png'))).toEqual(mockPreviewSmall);

      // 其它页不应有预览
      expect(fs.existsSync(path.join(pageBDir, 'preview.png'))).toBe(false);
      expect(fs.existsSync(path.join(pageBDir, 'preview_small.png'))).toBe(false);
    });

    it('should save preview_small.png inside group folder when groupName provided', async () => {
      const pages = [{ id: '1', name: 'GroupPage' }];
      const previews = { GroupPage: { preview: mockPreview, previewSmall: mockPreviewSmall } };

      await service.saveAllPages(testProjectName, pages, 'groupA', previews);

      const dir = pagePath(g('groupA'), p('GroupPage'));
      expect(fs.existsSync(path.join(dir, 'preview_small.png'))).toBe(true);
      expect(fs.readFileSync(path.join(dir, 'preview_small.png'))).toEqual(mockPreviewSmall);
    });

    it('【ID 保护】saveAllPages 应保留 page.json 中已有的 id', async () => {
      // 第一次保存：写入真实 ID
      const pages1 = [{ id: 'page-uuid-001', name: 'IDPage' }];
      await service.saveAllPages(testProjectName, pages1);

      const jsonPath = pagePath(p('IDPage'), 'page.json');
      let savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(savedData.id).toBe('page-uuid-001');

      // 第二次保存：用 name 覆盖 id
      const pages2 = [{ id: 'IDPage', name: 'IDPage', widgets: ['new'] }];
      await service.saveAllPages(testProjectName, pages2);

      savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      // ID 应保持原始值
      expect(savedData.id).toBe('page-uuid-001');
      expect(savedData.widgets).toEqual(['new']);
    });

    it('【ID 保护】saveAllPages 保留 id 在分组目录中也应生效', async () => {
      service.createGroup(testProjectName, 'g2');

      const pages1 = [{ id: 'page-uuid-002', name: 'GroupIDPage' }];
      await service.saveAllPages(testProjectName, pages1, 'g2');

      const jsonPath = pagePath(g('g2'), p('GroupIDPage'), 'page.json');
      let savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(savedData.id).toBe('page-uuid-002');

      const pages2 = [{ id: 'GroupIDPage', name: 'GroupIDPage' }];
      await service.saveAllPages(testProjectName, pages2, 'g2');

      savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(savedData.id).toBe('page-uuid-002');
    });
  });

  describe('listPages', () => {
    it('should return empty list when no pages exist', () => {
      const result = service.listPages(testProjectName);

      expect(result.success).toBe(true);
      expect(result.pages).toEqual([]);
    });

    it('should list saved pages at root level (strip p_ prefix from name)', () => {
      service.savePage(testProjectName, 'Page1', { id: '1' }, undefined, mockPreview);
      service.savePage(testProjectName, 'Page2', { id: '2' }, undefined, mockPreview);

      const result = service.listPages(testProjectName);

      expect(result.pages).toHaveLength(2);
      expect(result.pages.map((p) => p.name)).toEqual(expect.arrayContaining(['Page1', 'Page2']));
      expect(result.pages[0].fileName).toBe('page.json');
      expect(result.pages[0].updatedAt).toBeDefined();
    });

    it('should list pages inside a specific group (g_ prefixed dir)', () => {
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'GroupPage1', { id: '1' }, 'group1', mockPreview);
      service.savePage(testProjectName, 'RootPage', { id: '2' }, undefined, mockPreview);

      const groupResult = service.listPages(testProjectName, 'group1');
      expect(groupResult.pages).toHaveLength(1);
      expect(groupResult.pages[0].name).toBe('GroupPage1');

      const rootResult = service.listPages(testProjectName);
      expect(rootResult.pages).toHaveLength(1);
      expect(rootResult.pages[0].name).toBe('RootPage');
    });
  });

  describe('listAllPages', () => {
    it('should return empty list when no pages exist', () => {
      const result = service.listAllPages(testProjectName);

      expect(result.success).toBe(true);
      expect(result.pages).toEqual([]);
    });

    it('should include pages from root and all groups', () => {
      // 根目录页面
      service.savePage(testProjectName, 'RootPage', { id: '1' });
      // 分组页面
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'GroupPage', { id: '2' }, 'group1');
      service.createGroup(testProjectName, 'group2');
      service.savePage(testProjectName, 'AnotherGroupPage', { id: '3' }, 'group2');

      const result = service.listAllPages(testProjectName);

      expect(result.success).toBe(true);
      expect(result.projectName).toBe(testProjectName);
      expect(result.pages).toHaveLength(3);
      expect(result.pages.map((p) => p.name)).toEqual(
        expect.arrayContaining(['RootPage', 'GroupPage', 'AnotherGroupPage']),
      );
    });

    it('should deduplicate pages with the same name (root page takes priority)', () => {
      // 在根目录和分组中各保存一个同名页面
      service.savePage(testProjectName, 'SameName', { id: '1', content: 'root' });
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'SameName', { id: '2', content: 'group' }, 'group1');

      const result = service.listAllPages(testProjectName);

      // 应该去重，只保留 1 个
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].name).toBe('SameName');

      // 验证路径指向根目录（首次出现优先）
      expect(result.pages[0].filePath).toContain(path.join('pages', p('SameName'), 'page.json'));
      expect(result.pages[0].filePath).not.toContain('group1');
    });

    it('should deduplicate pages with the same name across multiple groups', () => {
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'DupPage', { id: '1' }, 'group1');
      service.createGroup(testProjectName, 'group2');
      service.savePage(testProjectName, 'DupPage', { id: '2' }, 'group2');

      const result = service.listAllPages(testProjectName);

      // 应该只保留第一个 group 中的页面
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].name).toBe('DupPage');
    });

    it('should handle multiple pages with mixed duplicates across root and groups', () => {
      // 根目录页面
      service.savePage(testProjectName, 'PageA', { id: '1' });
      service.savePage(testProjectName, 'PageB', { id: '2' });

      // 分组页面（包含一个与根目录同名的 PageA，以及一个独有的 PageC）
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'PageA', { id: '3' }, 'group1'); // 重复
      service.savePage(testProjectName, 'PageC', { id: '4' }, 'group1'); // 独有

      // 另一个分组（包含与 group1 同名的 PageC，以及独有的 PageD）
      service.createGroup(testProjectName, 'group2');
      service.savePage(testProjectName, 'PageC', { id: '5' }, 'group2'); // 重复
      service.savePage(testProjectName, 'PageD', { id: '6' }, 'group2'); // 独有

      const result = service.listAllPages(testProjectName);

      // 应有 4 个不重复页面：PageA(根), PageB, PageC(group1), PageD
      expect(result.pages).toHaveLength(4);

      const pageNames = result.pages.map((p) => p.name);
      expect(pageNames).toEqual(expect.arrayContaining(['PageA', 'PageB', 'PageC', 'PageD']));
      expect(pageNames.length).toBe(4);
    });

    it('should not include pages that exist only in groups when root has same name', () => {
      // 根目录有 UniquePage，分组有一个同名页面
      service.savePage(testProjectName, 'UniquePage', { id: '1' });
      service.createGroup(testProjectName, 'group1');
      service.savePage(
        testProjectName,
        'UniquePage',
        { id: '2', extra: 'should be ignored' },
        'group1',
      );
      // 分组有独立的页面
      service.savePage(testProjectName, 'IndependentPage', { id: '3' }, 'group1');

      const result = service.listAllPages(testProjectName);

      // 只应有 2 个页面：UniquePage(根), IndependentPage(分组)
      expect(result.pages).toHaveLength(2);

      const rootUnique = result.pages.find((p) => p.name === 'UniquePage');
      expect(rootUnique).toBeDefined();
      expect(rootUnique!.filePath).toContain(path.join('pages', p('UniquePage')));
      expect(rootUnique!.filePath).not.toContain('group1');

      expect(result.pages.find((p) => p.name === 'IndependentPage')).toBeDefined();
    });
  });

  describe('readAllPages', () => {
    it('should return empty pages when no pages exist', () => {
      const result = service.readAllPages(testProjectName);

      expect(result.success).toBe(true);
      expect(result.pages).toEqual([]);
    });

    it('should return all pages with full data from root and groups', () => {
      service.savePage(testProjectName, 'RootPage', { id: '1', content: 'root' });
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'GroupPage', { id: '2', content: 'group-data' }, 'group1');

      const result = service.readAllPages(testProjectName);

      expect(result.success).toBe(true);
      expect(result.pages).toHaveLength(2);

      const rootPage = result.pages.find((p) => p.name === 'RootPage');
      expect(rootPage).toBeDefined();
      expect(rootPage!.data).toBeDefined();
      expect(rootPage!.data!.id).toBe('1');
      expect(rootPage!.data!.content).toBe('root');
      expect(rootPage!.groupName).toBeUndefined();

      const groupPage = result.pages.find((p) => p.name === 'GroupPage');
      expect(groupPage).toBeDefined();
      expect(groupPage!.data).toBeDefined();
      expect(groupPage!.data!.id).toBe('2');
      expect(groupPage!.data!.content).toBe('group-data');
      expect(groupPage!.groupName).toBe('group1');
    });

    it('should deduplicate pages with same name (root takes priority)', () => {
      service.savePage(testProjectName, 'DupPage', { id: '1', source: 'root' });
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'DupPage', { id: '2', source: 'group' }, 'group1');

      const result = service.readAllPages(testProjectName);

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].name).toBe('DupPage');
      expect(result.pages[0].data!.id).toBe('1');
      expect(result.pages[0].data!.source).toBe('root');
      expect(result.pages[0].groupName).toBeUndefined();
    });

    it('should handle page read failure gracefully', () => {
      service.savePage(testProjectName, 'GoodPage', { id: '1' });
      service.createGroup(testProjectName, 'group1');

      const result = service.readAllPages(testProjectName);

      // GoodPage should be present with data
      expect(result.pages.length).toBeGreaterThan(0);
      const goodPage = result.pages.find((p) => p.name === 'GoodPage');
      expect(goodPage).toBeDefined();
      expect(goodPage!.data).toBeDefined();
    });
  });

  describe('batchReadPages', () => {
    it('should read multiple pages in the same group', () => {
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'PageA', { id: '1' }, 'group1');
      service.savePage(testProjectName, 'PageB', { id: '2' }, 'group1');

      const result = service.batchReadPages(testProjectName, ['PageA', 'PageB'], 'group1');

      expect(result.success).toBe(true);
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].name).toBe('PageA');
      expect(result.pages[0].data!.id).toBe('1');
      expect(result.pages[1].name).toBe('PageB');
      expect(result.pages[1].data!.id).toBe('2');
    });

    it('should read root pages when no group specified', () => {
      service.savePage(testProjectName, 'Root1', { id: '1' });
      service.savePage(testProjectName, 'Root2', { id: '2' });

      const result = service.batchReadPages(testProjectName, ['Root1', 'Root2']);

      expect(result.success).toBe(true);
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].data!.id).toBe('1');
      expect(result.pages[1].data!.id).toBe('2');
    });

    it('should return null data for non-existent page', () => {
      service.savePage(testProjectName, 'ExistPage', { id: '1' });

      const result = service.batchReadPages(testProjectName, ['ExistPage', 'NotExist']);

      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].data).toBeDefined();
      expect(result.pages[0].data!.id).toBe('1');
      expect(result.pages[1].data).toBeNull();
    });

    it('should handle empty names array', () => {
      const result = service.batchReadPages(testProjectName, []);

      expect(result.success).toBe(true);
      expect(result.pages).toEqual([]);
    });
  });

  describe('readPage', () => {
    it('should read a saved page without group', () => {
      service.savePage(
        testProjectName,
        'MainPage',
        { id: '1', widgets: ['w1'] },
        undefined,
        mockPreview,
      );

      const result = service.readPage(testProjectName, 'MainPage');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe('1');
      expect(result.data!.widgets).toEqual(['w1']);
    });

    it('should read a saved page with group', () => {
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'GroupPage', { id: '2' }, 'group1', mockPreview);

      const result = service.readPage(testProjectName, 'GroupPage', 'group1');

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe('2');
    });

    it('should throw NotFoundException when page does not exist', () => {
      expect(() => {
        service.readPage(testProjectName, 'NotExist');
      }).toThrow(NotFoundException);
    });
  });

  describe('deletePage', () => {
    it('should delete a saved page folder including all files', () => {
      service.savePage(testProjectName, 'Page1', { id: '1' }, undefined, mockPreview);
      const pagePathDir = pagePath(p('Page1'));
      expect(fs.existsSync(pagePathDir)).toBe(true);
      expect(fs.existsSync(path.join(pagePathDir, 'page.json'))).toBe(true);
      expect(fs.existsSync(path.join(pagePathDir, 'preview.png'))).toBe(true);

      const result = service.deletePage(testProjectName, 'Page1');

      expect(result.success).toBe(true);
      expect(result.pageName).toBe('Page1');
      expect(fs.existsSync(pagePathDir)).toBe(false);
    });

    it('should delete a page inside a group', () => {
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'GroupPage', { id: '1' }, 'group1', mockPreview);
      const pagePathDir = pagePath(g('group1'), p('GroupPage'));
      expect(fs.existsSync(pagePathDir)).toBe(true);

      const result = service.deletePage(testProjectName, 'GroupPage', 'group1');

      expect(result.success).toBe(true);
      expect(fs.existsSync(pagePathDir)).toBe(false);
    });

    it('should throw NotFoundException when page does not exist', () => {
      expect(() => {
        service.deletePage(testProjectName, 'NotExist');
      }).toThrow(NotFoundException);
    });
  });

  describe('renamePage', () => {
    it('should rename a page folder (p_ prefix) and preserve all files', () => {
      service.savePage(testProjectName, 'OldPage', { id: '1' }, undefined, mockPreview);

      const result = service.renamePage(testProjectName, 'OldPage', 'NewPage');

      expect(result.success).toBe(true);
      expect(result.pageName).toBe('NewPage');

      const oldPath = pagePath(p('OldPage'));
      const newPath = pagePath(p('NewPage'));
      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(newPath)).toBe(true);
      expect(fs.existsSync(path.join(newPath, 'page.json'))).toBe(true);
      expect(fs.existsSync(path.join(newPath, 'preview.png'))).toBe(true);
    });

    it('should rename a page inside a group', () => {
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'OldPage', { id: '1' }, 'group1', mockPreview);

      const result = service.renamePage(testProjectName, 'OldPage', 'NewPage', 'group1');

      expect(result.success).toBe(true);

      const oldPath = pagePath(g('group1'), p('OldPage'));
      const newPath = pagePath(g('group1'), p('NewPage'));
      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(newPath)).toBe(true);
    });

    it('should throw NotFoundException when page does not exist', () => {
      expect(() => {
        service.renamePage(testProjectName, 'NotExist', 'NewName');
      }).toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new name conflicts', () => {
      service.savePage(testProjectName, 'Page1', { id: '1' }, undefined, mockPreview);
      service.savePage(testProjectName, 'Page2', { id: '2' }, undefined, mockPreview);

      expect(() => {
        service.renamePage(testProjectName, 'Page1', 'Page2');
      }).toThrow(BadRequestException);
    });
  });

  describe('movePage', () => {
    it('should move a page from root to a group with all files intact', () => {
      service.savePage(testProjectName, 'MovePage', { id: '1' }, undefined, mockPreview);
      service.createGroup(testProjectName, 'targetGroup');

      const result = service.movePage(testProjectName, 'MovePage', undefined, 'targetGroup');

      expect(result.success).toBe(true);

      const oldPath = pagePath(p('MovePage'));
      const newPath = pagePath(g('targetGroup'), p('MovePage'));
      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(newPath)).toBe(true);
      expect(fs.existsSync(path.join(newPath, 'page.json'))).toBe(true);
      expect(fs.existsSync(path.join(newPath, 'preview.png'))).toBe(true);
    });

    it('should move a page from a group to root', () => {
      service.createGroup(testProjectName, 'sourceGroup');
      service.savePage(testProjectName, 'MovePage', { id: '1' }, 'sourceGroup', mockPreview);

      const result = service.movePage(testProjectName, 'MovePage', 'sourceGroup', undefined);

      expect(result.success).toBe(true);

      const oldPath = pagePath(g('sourceGroup'), p('MovePage'));
      const newPath = pagePath(p('MovePage'));
      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(newPath)).toBe(true);
    });

    it('should throw NotFoundException when page does not exist', () => {
      expect(() => {
        service.movePage(testProjectName, 'NotExist', undefined, 'targetGroup');
      }).toThrow(NotFoundException);
    });
  });

  describe('uploadPagePreview', () => {
    it('should save a preview.png file independently', () => {
      const buffer = Buffer.from('separate-preview-data');
      service.savePage(testProjectName, 'PreviewPage', { id: '1' });

      const result = service.uploadPagePreview(testProjectName, 'PreviewPage', buffer);

      expect(result.success).toBe(true);
      expect(result.resourceType).toBe('preview');

      const previewPath = pagePath(p('PreviewPage'), 'preview.png');
      expect(fs.existsSync(previewPath)).toBe(true);
      expect(fs.readFileSync(previewPath)).toEqual(buffer);
    });
  });

  describe('uploadPageBackground', () => {
    it('should save a background image as bg.png regardless of original extension', () => {
      const buffer = Buffer.from('fake-bg-data');
      service.savePage(testProjectName, 'BgPage', { id: '1' });

      const result = service.uploadPageBackground(testProjectName, 'BgPage', buffer, 'bg.png');

      expect(result.success).toBe(true);
      expect(result.resourceType).toBe('background');

      const bgPath = pagePath(p('BgPage'), 'bg.png');
      expect(fs.existsSync(bgPath)).toBe(true);
      expect(fs.readFileSync(bgPath)).toEqual(buffer);
    });

    it('should always save as bg.png even when uploaded with other extensions', () => {
      const buffer = Buffer.from('fake-bg-data');
      service.savePage(testProjectName, 'BgPage', { id: '1' });

      service.uploadPageBackground(testProjectName, 'BgPage', buffer, 'dangerous.exe');

      const bgPath = pagePath(p('BgPage'), 'bg.png');
      expect(fs.existsSync(bgPath)).toBe(true);
      // bg.exe 不再存在（统一为 bg.png）
      const bgExePath = pagePath(p('BgPage'), 'bg.exe');
      expect(fs.existsSync(bgExePath)).toBe(false);
    });
  });

  describe('getProjectsDirInfo', () => {
    it('should return projects dir info', () => {
      const info = service.getProjectsDirInfo();

      expect(info.projectsDir).toContain(tempDir);
    });

    it('should report exists as false when dir not created yet', () => {
      const info = service.getProjectsDirInfo();

      expect(info.exists).toBe(false);
    });
  });

  describe('migrateProject', () => {
    it('should migrate page directories to p_ prefix', () => {
      // 创建存量页面（无前缀）
      const pagesDir = path.join(tempDir, testProjectName, 'pages');
      const oldPageDir = path.join(pagesDir, 'MyPage');
      fs.mkdirSync(oldPageDir, { recursive: true });
      fs.writeFileSync(path.join(oldPageDir, 'page.json'), JSON.stringify({ id: '1' }));

      const result = service.migrateProject(testProjectName);

      expect(result.migratedPages).toBe(1);
      expect(result.migratedGroups).toBe(0);

      // 验证已重命名为 p_MyPage
      expect(fs.existsSync(oldPageDir)).toBe(false);
      expect(fs.existsSync(pagePath(p('MyPage')))).toBe(true);
    });

    it('should migrate group directories to g_ prefix', () => {
      const pagesDir = path.join(tempDir, testProjectName, 'pages');
      // 创建存量分组（无前缀）
      const oldGroupDir = path.join(pagesDir, 'MyGroup');
      const oldPageDir = path.join(oldGroupDir, 'MyPage');
      fs.mkdirSync(oldPageDir, { recursive: true });
      fs.writeFileSync(path.join(oldPageDir, 'page.json'), JSON.stringify({ id: '1' }));

      const result = service.migrateProject(testProjectName);

      expect(result.migratedPages).toBe(1);
      expect(result.migratedGroups).toBe(1);

      // 验证分组和页面都已重命名
      expect(fs.existsSync(oldGroupDir)).toBe(false);
      expect(fs.existsSync(pagePath(g('MyGroup')))).toBe(true);
      expect(fs.existsSync(pagePath(g('MyGroup'), p('MyPage')))).toBe(true);
    });

    it('should remove duplicate pages during migration', () => {
      const pagesDir = path.join(tempDir, testProjectName, 'pages');
      // 创建两个同名页面（规范化后同名）
      // "Duplicate-Page" 和 "Duplicate  Page"（双空格）规范化后都是 "Duplicate-Page"
      const page1 = path.join(pagesDir, 'Duplicate-Page');
      const page2 = path.join(pagesDir, 'Duplicate  Page');
      fs.mkdirSync(page1, { recursive: true });
      fs.mkdirSync(page2, { recursive: true });
      fs.writeFileSync(path.join(page1, 'page.json'), JSON.stringify({ id: '1' }));
      fs.writeFileSync(path.join(page2, 'page.json'), JSON.stringify({ id: '2' }));

      // 先规范化 page1（手动创建 p_ 前缀）
      const newPage1 = path.join(pagesDir, p('Duplicate-Page'));
      fs.renameSync(page1, newPage1);

      const result = service.migrateProject(testProjectName);

      // page2（Duplicate  Page）规范化后为 Duplicate-Page，即 p_Duplicate-Page 已存在，应被删除
      expect(result.migratedPages).toBe(0);
      expect(result.migratedGroups).toBe(0);
      expect(result.removedDuplicates).toBe(1);
    });

    it('should skip already migrated entries', () => {
      const _pagesDir = path.join(tempDir, testProjectName, 'pages');
      // 创建已迁移的页面
      fs.mkdirSync(pagePath(p('AlreadyMigrated')), { recursive: true });
      fs.writeFileSync(pagePath(p('AlreadyMigrated'), 'page.json'), JSON.stringify({ id: '1' }));

      const result = service.migrateProject(testProjectName);

      expect(result.migratedPages).toBe(0);
      expect(result.migratedGroups).toBe(0);
      expect(result.removedDuplicates).toBe(0);
    });

    it('should return zeros when pages directory does not exist', () => {
      const result = service.migrateProject(testProjectName);

      expect(result.migratedPages).toBe(0);
      expect(result.migratedGroups).toBe(0);
      expect(result.removedDuplicates).toBe(0);
    });
  });

  describe('getProjectOutline', () => {
    it('should return empty outline when pages directory does not exist', () => {
      const result = service.getProjectOutline(testProjectName);

      expect(result.success).toBe(true);
      expect(result.projectName).toBe(testProjectName);
      expect(result.rootPages).toEqual([]);
      expect(result.groups).toEqual([]);
      expect(result.totalPageCount).toBe(0);
    });

    it('should return root pages in rootPages array (p_ prefix stripped from name)', () => {
      service.savePage(testProjectName, 'PageA', { id: '1' });
      service.savePage(testProjectName, 'PageB', { id: '2' });

      const result = service.getProjectOutline(testProjectName);

      expect(result.success).toBe(true);
      expect(result.rootPages).toHaveLength(2);
      expect(result.rootPages.map((p) => p.name)).toEqual(
        expect.arrayContaining(['PageA', 'PageB']),
      );
      expect(result.groups).toEqual([]);
      expect(result.totalPageCount).toBe(2);

      // 验证每个页面都有更新时间
      for (const page of result.rootPages) {
        expect(page.updatedAt).toBeDefined();
        expect(new Date(page.updatedAt).getTime()).not.toBeNaN();
      }
    });

    it('should return groups with their pages', () => {
      service.createGroup(testProjectName, 'Area1');
      service.savePage(testProjectName, 'PageX', { id: '1' }, 'Area1');
      service.savePage(testProjectName, 'PageY', { id: '2' }, 'Area1');

      const result = service.getProjectOutline(testProjectName);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].name).toBe('Area1');
      expect(result.groups[0].pages).toHaveLength(2);
      expect(result.groups[0].pages.map((p) => p.name)).toEqual(
        expect.arrayContaining(['PageX', 'PageY']),
      );
      expect(result.rootPages).toEqual([]);
      expect(result.totalPageCount).toBe(2);
    });

    it('should show same-name pages in both root and groups when they have different IDs', () => {
      service.savePage(testProjectName, 'DupPage', { id: '1', source: 'root' });
      service.createGroup(testProjectName, 'group1');
      service.savePage(testProjectName, 'DupPage', { id: '2', source: 'group' }, 'group1');

      const result = service.getProjectOutline(testProjectName);

      // 根目录和分组的页面 ID 不同（'1' vs '2'），两者都应出现在 outline 中
      expect(result.rootPages).toHaveLength(1);
      expect(result.rootPages[0].name).toBe('DupPage');
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].pages).toHaveLength(1);
      expect(result.groups[0].pages[0].name).toBe('DupPage');
      expect(result.totalPageCount).toBe(2);
    });

    it('【ID 字段】outline 应返回 page.json 中的 id', () => {
      service.savePage(testProjectName, 'IDPage', { id: 'page-uuid-abc', name: 'IDPage' });

      const result = service.getProjectOutline(testProjectName);

      expect(result.rootPages).toHaveLength(1);
      expect(result.rootPages[0].id).toBe('page-uuid-abc');
      expect(result.rootPages[0].name).toBe('IDPage');
    });

    it('【ID 字段】分组内页面也应返回 id', () => {
      service.createGroup(testProjectName, 'myGroup');
      service.savePage(testProjectName, 'GIDPage', { id: 'page-uuid-xyz' }, 'myGroup');

      const result = service.getProjectOutline(testProjectName);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].pages).toHaveLength(1);
      expect(result.groups[0].pages[0].id).toBe('page-uuid-xyz');
      expect(result.groups[0].pages[0].name).toBe('GIDPage');
    });

    it('【去重】outline 使用 id 去重，相同 id 的页面只出现一次（第一个出现位置）', () => {
      // 手动创建两个 page.json 具有相同 id（模拟异常情况）
      service.savePage(testProjectName, 'First', { id: 'same-uuid', name: 'First' });
      // 在另一个目录写入相同 id（模拟异常情况）
      const pagesDir = path.join(tempDir, testProjectName, 'pages');
      const dupDir = path.join(pagesDir, 'p_Second');
      fs.mkdirSync(dupDir, { recursive: true });
      fs.writeFileSync(
        path.join(dupDir, 'page.json'),
        JSON.stringify({ id: 'same-uuid', name: 'Second' }),
        'utf-8',
      );

      const result = service.getProjectOutline(testProjectName);

      // 相同 id 的页面应只出现一次
      expect(result.rootPages).toHaveLength(1);
      expect(result.rootPages[0].name).toBe('First');
      expect(result.totalPageCount).toBe(1);
    });

    it('should combine root pages and group pages in totalPageCount (deduped)', () => {
      service.savePage(testProjectName, 'RootOnly', { id: '1' });
      service.createGroup(testProjectName, 'g1');
      service.savePage(testProjectName, 'InGroup', { id: '2' }, 'g1');
      service.savePage(testProjectName, 'AlsoInGroup', { id: '3' }, 'g1');

      const result = service.getProjectOutline(testProjectName);

      expect(result.rootPages).toHaveLength(1);
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].pages).toHaveLength(2);
      expect(result.totalPageCount).toBe(3);
    });

    it('should not read any page.json content (only metadata)', () => {
      // 保存带大数据的页面，验证大纲不解析 page.json 内容
      const largeData = { id: '1', data: 'x'.repeat(10000) };
      service.savePage(testProjectName, 'LargePage', largeData);

      const result = service.getProjectOutline(testProjectName);

      expect(result.rootPages).toHaveLength(1);
      expect(result.rootPages[0].name).toBe('LargePage');
      expect(result.rootPages[0].updatedAt).toBeDefined();
      // 确认响应中不包含 page.json 的数据字段
      expect((result as any).pages).toBeUndefined();
      expect((result as any).data).toBeUndefined();
    });
  });

  describe('端到端：前缀命名规范目录结构', () => {
    it('应生成符合 p_ / g_ 前缀规范的目录结构', () => {
      // MainPage — 保存时同时写入 page.json 和 preview.png
      service.savePage(
        testProjectName,
        'MainPage',
        { id: '1', name: 'MainPage', widgets: [] },
        undefined,
        Buffer.from('preview-main'),
      );

      const mainPageDir = pagePath(p('MainPage'));
      expect(fs.readdirSync(mainPageDir)).toEqual(
        expect.arrayContaining(['page.json', 'preview.png']),
      );

      // SubPage — 保存时同时写入 page.json 和 preview.png
      service.savePage(
        testProjectName,
        'SubPage',
        { id: '2', name: 'SubPage', widgets: [] },
        undefined,
        Buffer.from('preview-sub'),
      );

      const subPageDir = pagePath(p('SubPage'));
      expect(fs.readdirSync(subPageDir)).toEqual(
        expect.arrayContaining(['page.json', 'preview.png']),
      );

      // group1/GroupPage — 分组内页面保存
      service.createGroup(testProjectName, 'group1');
      service.savePage(
        testProjectName,
        'GroupPage',
        { id: '3', name: 'GroupPage', widgets: [] },
        'group1',
        Buffer.from('preview-group'),
      );

      const groupPageDir = pagePath(g('group1'), p('GroupPage'));
      expect(fs.readdirSync(groupPageDir)).toEqual(
        expect.arrayContaining(['page.json', 'preview.png']),
      );

      // 验证完整目录树：
      // pages/
      //   p_MainPage/page.json + preview.png
      //   p_SubPage/page.json + preview.png
      //   g_group1/p_GroupPage/page.json + preview.png
      const pagesEntries = fs.readdirSync(pagePath(), { withFileTypes: true });

      const pagesDirs = pagesEntries.filter((e) => e.isDirectory()).map((e) => e.name);
      expect(pagesDirs).toEqual(expect.arrayContaining([p('MainPage'), p('SubPage'), g('group1')]));

      const groupEntries = fs.readdirSync(pagePath(g('group1')), { withFileTypes: true });
      const groupDirs = groupEntries.filter((e) => e.isDirectory()).map((e) => e.name);
      expect(groupDirs).toEqual([p('GroupPage')]);

      // 确认每个页面文件夹内刚好包含 page.json + preview.png
      const verifyPageDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        expect(files).toHaveLength(2);
        expect(files).toEqual(expect.arrayContaining(['page.json', 'preview.png']));
      };
      verifyPageDir(mainPageDir);
      verifyPageDir(subPageDir);
      verifyPageDir(groupPageDir);
    });
  });

  describe('getPreviewImagePath', () => {
    it('应返回存在的 preview_small.png 路径（无分组）', () => {
      service.savePage(
        testProjectName,
        'page1',
        { id: '1', name: 'page1' },
        undefined,
        undefined,
        mockPreviewSmall,
      );

      const filePath = service.getPreviewImagePath(
        testProjectName,
        'page1',
        undefined,
        'preview_small',
      );

      expect(filePath).toBe(pagePath(p('page1'), 'preview_small.png'));
      expect(fs.existsSync(filePath as string)).toBe(true);
    });

    it('应返回分组目录下的 preview.png 路径', () => {
      service.createGroup(testProjectName, 'group1');
      service.savePage(
        testProjectName,
        'page2',
        { id: '2', name: 'page2' },
        'group1',
        mockPreview,
      );

      const filePath = service.getPreviewImagePath(testProjectName, 'page2', 'group1', 'preview');

      expect(filePath).toBe(pagePath(g('group1'), p('page2'), 'preview.png'));
      expect(fs.existsSync(filePath as string)).toBe(true);
    });

    it('文件不存在时应返回 null', () => {
      expect(
        service.getPreviewImagePath(testProjectName, 'missing', undefined, 'preview_small'),
      ).toBeNull();
    });

    it('应幂等清理 p_ 前缀', () => {
      service.savePage(
        testProjectName,
        'page3',
        { id: '3', name: 'page3' },
        undefined,
        undefined,
        mockPreviewSmall,
      );

      const filePath = service.getPreviewImagePath(
        testProjectName,
        'p_page3',
        undefined,
        'preview_small',
      );

      expect(filePath).toBe(pagePath(p('page3'), 'preview_small.png'));
    });
  });
});
