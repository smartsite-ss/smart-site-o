// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { PathResolverService } from '@ss-node/ss-core';

export interface SavePageResult {
  pageId: string;
  pageName: string;
  path: string;
}

export interface SaveAllPagesResult {
  success: boolean;
  projectName: string;
  savedCount: number;
  pages: SavePageResult[];
}

export interface ProjectsDirInfo {
  projectsDir: string;
  exists: boolean;
}

export interface PageFileInfo {
  name: string;
  fileName: string;
  filePath: string;
  updatedAt: string;
}

export interface PageListResult {
  success: boolean;
  projectName: string;
  pages: PageFileInfo[];
}

export interface PageReadResult {
  success: boolean;
  data: Record<string, any> | null;
}

export interface PageWithData {
  name: string;
  data: Record<string, any> | null;
  groupName?: string;
}

export interface ReadAllPagesResult {
  success: boolean;
  projectName: string;
  pages: PageWithData[];
}

export interface BatchReadPagesResult {
  success: boolean;
  projectName: string;
  pages: PageWithData[];
}

// ── 大纲相关类型（按需加载） ──

export interface OutlinePageItem {
  /** page.json 中的唯一 ID（如 page-xxx），仅在文件存在且包含 id 字段时填充 */
  id?: string;
  /** 页面名称（文件夹名去掉 p_ 前缀） */
  name: string;
  updatedAt: string;
  /** 预览小图的相对 URL（preview_small.png），仅在文件存在时填充 */
  previewSmallUrl?: string;
  /** 页面背景色，从 page.json 读取 */
  backgroundColor?: string;
  /** 页面背景图路径（相对路径，如 bg.png），从 page.json 读取 */
  backgroundImage?: string;
  /** 页面宽度，从 page.json 读取 */
  width?: number;
  /** 页面高度，从 page.json 读取 */
  height?: number;
}

export interface OutlineGroupItem {
  name: string;
  pages: OutlinePageItem[];
}

export interface ProjectOutlineResult {
  success: boolean;
  projectName: string;
  rootPages: OutlinePageItem[];
  groups: OutlineGroupItem[];
  totalPageCount: number;
}

export interface PageSaveResult {
  success: boolean;
  pageName: string;
  folderPath: string;
}

export interface PageDeleteResult {
  success: boolean;
  pageName: string;
}

export interface GroupInfo {
  name: string;
  path: string;
  pageCount: number;
  createdAt: string;
}

export interface GroupListResult {
  success: boolean;
  projectName: string;
  groups: GroupInfo[];
}

export interface GroupCreateResult {
  success: boolean;
  groupName: string;
  path: string;
}

export interface GroupDeleteResult {
  success: boolean;
  groupName: string;
}

export interface ResourceUploadResult {
  success: boolean;
  pageName: string;
  resourceType: string;
  filePath: string;
}

/**
 * 清理旧版遗留的 backgroundImage 路径。
 * 旧版（< 7.0）将背景图存储在 pages/<page>/resources/bg.jpg 下，
 * 新版统一存储在 pages/p_<page>/bg.png 下。
 * 此函数用于在读取 page.json 时自动修正旧路径，确保前端始终使用正确 URL。
 */
function sanitizeBackgroundImage(bg: string | undefined): string | undefined {
  if (!bg) return undefined;
  // 旧版遗留路径：resources/bg.jpg → bg.png（后端 uploadPageBackground 统一保存为 bg.png）
  const resourcesMatch = bg.match(/resources\/(.+?)$/);
  if (resourcesMatch) {
    const fileName = resourcesMatch[1];
    const baseName = path.parse(fileName).name;
    return baseName === 'bg' ? 'bg.png' : fileName;
  }
  // 处理旧版全路径情况：/api/v1/projects/xxx/pages/xxx/resources/bg.jpg → bg.png
  const fullPathMatch = bg.match(/\/resources\/(.+?)$/);
  if (fullPathMatch) {
    const fileName = fullPathMatch[1];
    const baseName = path.parse(fileName).name;
    return baseName === 'bg' ? 'bg.png' : fileName;
  }
  // 已经是正确格式的相对路径（bg.png 等），直接返回
  if (isRelativePath(bg)) return bg;
  // 新/旧版绝对 API 路径（/api/v1/projects/.../bg.png）→ 提取文件名
  return bg.split('/').pop() || 'bg.png';
}

/** 判断是否为相对资源文件名（如 bg.png、preview.png） */
function isRelativePath(path: string): boolean {
  return !path.startsWith('/') && !path.startsWith('http://') && !path.startsWith('https://') && !path.startsWith('data:') && !path.startsWith('blob:');
}

@Injectable()
export class PageSaveService {
  private readonly logger = new Logger(PageSaveService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly pathResolver: PathResolverService,
  ) {}

  getProjectsDir(): string {
    const configuredDir = this.configService.get<string>('PROJECTS_DIR') || './data/projects';
    return this.pathResolver.resolve(configuredDir);
  }

  private getPagesDir(projectName: string): string {
    const projectsDir = this.getProjectsDir();
    return path.join(projectsDir, projectName, 'pages');
  }

  private getPageFolderPath(projectName: string, pageName: string, groupName?: string): string {
    const pagesDir = this.getPagesDir(projectName);
    const normalizedPageName = this.normalizePageName(pageName);
    // 安全去前缀：确保输入中不携带 p_/g_ 前缀（幂等）
    const cleanPageName = normalizedPageName.replace(/^(p_|g_)/, '');
    if (groupName) {
      const cleanGroupName = groupName.replace(/^(p_|g_)/, '');
      const normalizedGroupName = this.normalizePageName(cleanGroupName);
      return path.join(pagesDir, `g_${normalizedGroupName}`, `p_${cleanPageName}`);
    }
    return path.join(pagesDir, `p_${cleanPageName}`);
  }

  /**
   * 获取页面预览图文件路径（preview.png / preview_small.png），仅文件存在时返回。
   * 供 GET preview_small.png 读取接口使用；复用 getPageFolderPath 的规范化与
   * p_/g_ 前缀清理逻辑，防止目录穿越。
   */
  getPreviewImagePath(
    projectName: string,
    pageName: string,
    groupName: string | undefined,
    resourceType: 'preview' | 'preview_small',
  ): string | null {
    const folderPath = this.getPageFolderPath(projectName, pageName, groupName);
    const fileName = resourceType === 'preview' ? 'preview.png' : 'preview_small.png';
    const filePath = path.join(folderPath, fileName);
    return fs.existsSync(filePath) ? filePath : null;
  }

  private normalizePageName(name: string): string {
    // 规范化页面/分组名称：去空格、去非法字符、合并连续 -
    return (
      name
        .trim()
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') || 'unnamed'
    );
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private checkPageNameConflict(
    projectName: string,
    pageName: string,
    groupName?: string,
    excludePageName?: string,
  ): void {
    const targetDir = this.getPagesDir(projectName);
    const baseDir = groupName
      ? path.join(targetDir, `g_${this.normalizePageName(groupName)}`)
      : targetDir;

    const prefixedName = `p_${this.normalizePageName(pageName)}`;
    if (prefixedName === `p_${this.normalizePageName(excludePageName || '')}`) return;

    if (fs.existsSync(baseDir)) {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name === prefixedName) {
          throw new BadRequestException(`页面名称已存在: ${pageName}`);
        }
      }
    }
  }

  listGroups(projectName: string): GroupListResult {
    const pagesDir = this.getPagesDir(projectName);

    if (!fs.existsSync(pagesDir)) {
      return { success: true, projectName, groups: [] };
    }

    const entries = fs.readdirSync(pagesDir, { withFileTypes: true });
    const groups: GroupInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('g_')) continue;

      const groupPath = path.join(pagesDir, entry.name);
      const stat = fs.statSync(groupPath);
      const subEntries = fs.readdirSync(groupPath, { withFileTypes: true });
      const pageCount = subEntries.filter(
        (e) =>
          e.isDirectory() &&
          e.name.startsWith('p_') &&
          fs.existsSync(path.join(groupPath, e.name, 'page.json')),
      ).length;

      groups.push({
        name: entry.name.slice(2), // strip g_ prefix
        path: groupPath,
        pageCount,
        createdAt: stat.birthtime.toISOString(),
      });
    }

    return { success: true, projectName, groups };
  }

  createGroup(projectName: string, groupName: string): GroupCreateResult {
    const pagesDir = this.getPagesDir(projectName);
    const safeName = this.normalizePageName(groupName);

    this.ensureDir(pagesDir);

    const groupPath = path.join(pagesDir, `g_${safeName}`);
    if (fs.existsSync(groupPath)) {
      throw new BadRequestException(`分组已存在: ${safeName}`);
    }

    fs.mkdirSync(groupPath, { recursive: true });
    this.logger.log(`Group created: ${projectName}/pages/g_${safeName}`);

    return { success: true, groupName: safeName, path: groupPath };
  }

  deleteGroup(projectName: string, groupName: string): GroupDeleteResult {
    const pagesDir = this.getPagesDir(projectName);
    const safeName = this.normalizePageName(groupName);
    const groupPath = path.join(pagesDir, `g_${safeName}`);

    if (!fs.existsSync(groupPath)) {
      throw new NotFoundException(`分组不存在: ${projectName}/pages/g_${safeName}`);
    }

    fs.rmSync(groupPath, { recursive: true, force: true });
    this.logger.log(`Group deleted: ${projectName}/pages/g_${safeName}`);

    return { success: true, groupName: safeName };
  }

  listPages(projectName: string, groupName?: string): PageListResult {
    const pagesDir = groupName
      ? path.join(this.getPagesDir(projectName), `g_${this.normalizePageName(groupName)}`)
      : this.getPagesDir(projectName);

    if (!fs.existsSync(pagesDir)) {
      return { success: true, projectName, pages: [] };
    }

    const entries = fs.readdirSync(pagesDir, { withFileTypes: true });
    const pages: PageFileInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('p_')) continue;

      const pageJsonPath = path.join(pagesDir, entry.name, 'page.json');
      if (!fs.existsSync(pageJsonPath)) continue;

      const stat = fs.statSync(pageJsonPath);

      pages.push({
        name: entry.name.slice(2), // strip p_ prefix
        fileName: 'page.json',
        filePath: pageJsonPath,
        updatedAt: stat.mtime.toISOString(),
      });
    }

    pages.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return { success: true, projectName, pages };
  }

  /**
   * 列出项目所有页面（包括根目录和所有分组），按页面名称去重
   * 去重规则：保留首次出现的页面（根目录优先于分组中的同名页面）
   */
  listAllPages(projectName: string): PageListResult {
    const seenNames = new Set<string>();
    const allPages: PageFileInfo[] = [];

    // 1. 先收集根目录页面
    const rootResult = this.listPages(projectName);
    for (const page of rootResult.pages) {
      if (!seenNames.has(page.name)) {
        seenNames.add(page.name);
        allPages.push(page);
      }
    }

    // 2. 获取所有分组，逐个收集分组页面（跳过已存在的同名页面）
    const groupsResult = this.listGroups(projectName);
    for (const group of groupsResult.groups) {
      const groupResult = this.listPages(projectName, group.name);
      for (const page of groupResult.pages) {
        if (!seenNames.has(page.name)) {
          seenNames.add(page.name);
          allPages.push(page);
        }
      }
    }

    return { success: true, projectName, pages: allPages };
  }

  /**
   * P4: 获取项目大纲（分组 + 页面结构），不含 page.json 数据。
   * 仅扫描目录结构，返回分组及其页面列表、根目录页面列表。
   * 用于编辑器「先加载大纲 → 按需加载页面数据」的按需加载策略。
   */
  getProjectOutline(projectName: string): ProjectOutlineResult {
    const pagesDir = this.getPagesDir(projectName);

    if (!fs.existsSync(pagesDir)) {
      return { success: true, projectName, rootPages: [], groups: [], totalPageCount: 0 };
    }

    const entries = fs.readdirSync(pagesDir, { withFileTypes: true });
    const rootPages: OutlinePageItem[] = [];
    const groups: OutlineGroupItem[] = [];
    const seenIds = new Set<string>();

    // 从 page.json 中读取元数据字段
    function readPageMeta(pageJsonPath: string): {
      id?: string;
      backgroundColor?: string;
      backgroundImage?: string;
      width?: number;
      height?: number;
    } {
      try {
        const content = fs.readFileSync(pageJsonPath, 'utf-8');
        const data = JSON.parse(content);
        return {
          id: data.id || undefined,
          backgroundColor: data.backgroundColor || undefined,
          backgroundImage: sanitizeBackgroundImage(data.backgroundImage),
          width: data.width !== undefined ? Number(data.width) : undefined,
          height: data.height !== undefined ? Number(data.height) : undefined,
        };
      } catch {
        return {};
      }
    }

    // 构建 OutlinePageItem
    function buildPageItem(
      pageJsonPath: string,
      pageName: string,
      groupName: string | undefined,
    ): OutlinePageItem | null {
      if (!fs.existsSync(pageJsonPath)) return null;

      const meta = readPageMeta(pageJsonPath);
      // 根目录和分组各自独立，允许同名页面存在于不同分组中
      // 但使用 id 去重，防止同一页面被重复添加
      if (meta.id && seenIds.has(meta.id)) return null;
      if (meta.id) seenIds.add(meta.id);

      const stat = fs.statSync(pageJsonPath);
      const previewSmallPath = path.join(path.dirname(pageJsonPath), 'preview_small.png');
      const hasPreviewSmall = fs.existsSync(previewSmallPath);

      const item: OutlinePageItem = {
        ...(meta.id ? { id: meta.id } : {}),
        name: pageName,
        updatedAt: stat.mtime.toISOString(),
      };

      if (hasPreviewSmall) {
        const encodedName = encodeURIComponent(pageName);
        if (groupName) {
          const encodedGroup = encodeURIComponent(groupName);
          item.previewSmallUrl = `/api/v1/projects/${projectName}/pages/${encodedName}/preview_small.png?group=${encodedGroup}`;
        } else {
          item.previewSmallUrl = `/api/v1/projects/${projectName}/pages/${encodedName}/preview_small.png`;
        }
      }

      // 传递 page.json 中的元数据
      if (meta.backgroundColor) item.backgroundColor = meta.backgroundColor;
      if (meta.backgroundImage) item.backgroundImage = meta.backgroundImage;
      if (meta.width !== undefined) item.width = meta.width;
      if (meta.height !== undefined) item.height = meta.height;

      return item;
    }

    // 处理根目录页面（p_ 前缀）
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('p_')) continue;

      const pageJsonPath = path.join(pagesDir, entry.name, 'page.json');
      const pageName = entry.name.slice(2);
      const item = buildPageItem(pageJsonPath, pageName, undefined);
      if (item) rootPages.push(item);
    }

    // 处理分组（g_ 前缀）
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('g_')) continue;

      const groupPath = path.join(pagesDir, entry.name);
      const groupName = entry.name.slice(2);
      const groupPages: OutlinePageItem[] = [];

      const subEntries = fs.readdirSync(groupPath, { withFileTypes: true });
      for (const sub of subEntries) {
        if (!sub.isDirectory() || !sub.name.startsWith('p_')) continue;

        const pageJsonPath = path.join(groupPath, sub.name, 'page.json');
        const pageName = sub.name.slice(2);
        const item = buildPageItem(pageJsonPath, pageName, groupName);
        if (item) groupPages.push(item);
      }

      groups.push({ name: groupName, pages: groupPages });
    }

    const totalPageCount = rootPages.length + groups.reduce((sum, g) => sum + g.pages.length, 0);

    return {
      success: true,
      projectName,
      rootPages,
      groups,
      totalPageCount,
    };
  }

  /**
   * P3: 获取项目所有页面完整数据（包括根目录和所有分组），按页面名称去重。
   * 一次调用即返回所有页面的完整 page.json 数据，无需额外逐个 readPage。
   */
  readAllPages(projectName: string): ReadAllPagesResult {
    const seenNames = new Set<string>();
    const pages: PageWithData[] = [];

    // 1. 根目录页面
    const rootResult = this.listPages(projectName);
    for (const info of rootResult.pages) {
      if (!seenNames.has(info.name)) {
        seenNames.add(info.name);
        try {
          const pageResult = this.readPage(projectName, info.name);
          pages.push({ name: info.name, data: pageResult.data });
        } catch {
          pages.push({ name: info.name, data: null });
        }
      }
    }

    // 2. 分组页面
    const groupsResult = this.listGroups(projectName);
    for (const group of groupsResult.groups) {
      const groupResult = this.listPages(projectName, group.name);
      for (const info of groupResult.pages) {
        if (!seenNames.has(info.name)) {
          seenNames.add(info.name);
          try {
            const pageResult = this.readPage(projectName, info.name, group.name);
            pages.push({ name: info.name, groupName: group.name, data: pageResult.data });
          } catch {
            pages.push({ name: info.name, groupName: group.name, data: null });
          }
        }
      }
    }

    return { success: true, projectName, pages };
  }

  /**
   * P2: 批量读取指定页面的完整数据（同一分组下）。
   * 替代逐个串行 readPage 的 N 次 HTTP 请求，合并为 1 次。
   */
  batchReadPages(projectName: string, names: string[], groupName?: string): BatchReadPagesResult {
    const pages: PageWithData[] = [];
    for (const name of names) {
      try {
        const result = this.readPage(projectName, name, groupName);
        pages.push({ name, groupName, data: result.data });
      } catch {
        pages.push({ name, groupName, data: null });
      }
    }
    return { success: true, projectName, pages };
  }

  readPage(projectName: string, pageName: string, groupName?: string): PageReadResult {
    const folderPath = this.getPageFolderPath(projectName, pageName, groupName);
    const filePath = path.join(folderPath, 'page.json');

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`页面文件不存在: ${projectName}/pages/${pageName}/page.json`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // 清理旧版遗留的 backgroundImage 路径（resources/ 前缀）
    if (data.backgroundImage) {
      data.backgroundImage = sanitizeBackgroundImage(data.backgroundImage) || data.backgroundImage;
    }

    return { success: true, data };
  }

  savePage(
    projectName: string,
    pageName: string,
    pageData: Record<string, any>,
    groupName?: string,
    previewBuffer?: Buffer,
    previewSmallBuffer?: Buffer,
  ): PageSaveResult {
    if (!pageData) {
      throw new BadRequestException('缺少页面数据');
    }

    const safeName = this.normalizePageName(pageName);
    const folderPath = this.getPageFolderPath(projectName, pageName, groupName);
    this.ensureDir(folderPath);

    const filePath = path.join(folderPath, 'page.json');

    const dataToSave: Record<string, any> = {
      ...pageData,
      updatedAt: new Date().toISOString(),
    };

    // 保留原始 page.json 中的 id，防止前端发送懒页面数据时用 name 覆盖真实 id
    if (fs.existsSync(filePath)) {
      try {
        const existingContent = fs.readFileSync(filePath, 'utf-8');
        const existingData = JSON.parse(existingContent);
        if (existingData.id && existingData.id !== pageData.id) {
          dataToSave.id = existingData.id;
        }
      } catch {
        // 读取失败时不阻塞保存流程
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    this.logger.log(`Page saved: ${projectName}/pages/${safeName}/page.json`);

    if (previewBuffer) {
      const previewPath = path.join(folderPath, 'preview.png');
      fs.writeFileSync(previewPath, previewBuffer);
      this.logger.log(`Preview saved: ${projectName}/pages/${safeName}/preview.png`);
    }

    if (previewSmallBuffer) {
      const previewSmallPath = path.join(folderPath, 'preview_small.png');
      fs.writeFileSync(previewSmallPath, previewSmallBuffer);
      this.logger.log(`Preview small saved: ${projectName}/pages/${safeName}/preview_small.png`);
    }

    return { success: true, pageName, folderPath };
  }

  deletePage(projectName: string, pageName: string, groupName?: string): PageDeleteResult {
    const folderPath = this.getPageFolderPath(projectName, pageName, groupName);

    if (!fs.existsSync(folderPath)) {
      throw new NotFoundException(`页面文件夹不存在: ${projectName}/pages/${pageName}`);
    }

    fs.rmSync(folderPath, { recursive: true, force: true });
    this.logger.log(`Page deleted: ${projectName}/pages/${pageName}`);

    return { success: true, pageName };
  }

  async saveAllPages(
    projectName: string,
    pages: Array<Record<string, any>>,
    groupName?: string,
    // 当前页可选预览图：键为 pageName，值含 preview / previewSmall 的 Buffer
    previews?: Record<string, { preview?: Buffer; previewSmall?: Buffer }>,
  ): Promise<SaveAllPagesResult> {
    if (!pages || !Array.isArray(pages)) {
      throw new BadRequestException('缺少 pages 数据');
    }

    const pagesDir = this.getPagesDir(projectName);
    this.ensureDir(pagesDir);

    const baseDir = groupName
      ? path.join(pagesDir, `g_${this.normalizePageName(groupName)}`)
      : pagesDir;

    this.ensureDir(baseDir);

    const results: SavePageResult[] = [];
    for (const page of pages) {
      const pageId = page.id;
      const pageName = page.name || pageId;
      const safeName = this.normalizePageName(pageName);
      const folderPath = path.join(baseDir, `p_${safeName}`);
      this.ensureDir(folderPath);

      const filePath = path.join(folderPath, 'page.json');

      const pageData: Record<string, any> = {
        ...page,
        updatedAt: new Date().toISOString(),
      };

      // 保留原始 page.json 中的 id，防止前端发送懒页面数据时用 name 覆盖真实 id
      if (fs.existsSync(filePath)) {
        try {
          const existingContent = fs.readFileSync(filePath, 'utf-8');
          const existingData = JSON.parse(existingContent);
          if (existingData.id && existingData.id !== page.id) {
            pageData.id = existingData.id;
          }
        } catch {
          // 读取失败时不阻塞保存流程
        }
      }

      fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2), 'utf-8');
      this.logger.log(`Page saved: ${projectName}/pages/${safeName}/page.json`);

      // 同步落盘预览图（如有）
      const pagePreviews = previews?.[pageName] || previews?.[pageId];
      if (pagePreviews?.preview) {
        const previewPath = path.join(folderPath, 'preview.png');
        fs.writeFileSync(previewPath, pagePreviews.preview);
        this.logger.log(`Preview saved: ${projectName}/pages/${safeName}/preview.png`);
      }
      if (pagePreviews?.previewSmall) {
        const previewSmallPath = path.join(folderPath, 'preview_small.png');
        fs.writeFileSync(previewSmallPath, pagePreviews.previewSmall);
        this.logger.log(`Preview small saved: ${projectName}/pages/${safeName}/preview_small.png`);
      }

      results.push({ pageId, pageName, path: folderPath });
    }

    return { success: true, projectName, savedCount: results.length, pages: results };
  }

  uploadPageBackground(
    projectName: string,
    pageName: string,
    buffer: Buffer,
    _originalName: string,
    groupName?: string,
  ): ResourceUploadResult {
    const folderPath = this.getPageFolderPath(projectName, pageName, groupName);
    this.ensureDir(folderPath);

    // 统一背景图格式为 bg.png（无论上传的是什么格式）
    const fileName = 'bg.png';
    const filePath = path.join(folderPath, fileName);

    fs.writeFileSync(filePath, buffer);
    const displayName = pageName;
    this.logger.log(`Background saved: ${displayName}/${fileName}`);

    return { success: true, pageName, resourceType: 'background', filePath };
  }

  uploadPagePreview(
    projectName: string,
    pageName: string,
    buffer: Buffer,
    smallBuffer?: Buffer,
    groupName?: string,
  ): ResourceUploadResult {
    const folderPath = this.getPageFolderPath(projectName, pageName, groupName);
    this.ensureDir(folderPath);

    const filePath = path.join(folderPath, 'preview.png');
    fs.writeFileSync(filePath, buffer);
    this.logger.log(`Preview saved: ${projectName}/pages/${pageName}/preview.png`);

    if (smallBuffer) {
      const smallPath = path.join(folderPath, 'preview_small.png');
      fs.writeFileSync(smallPath, smallBuffer);
      this.logger.log(`Preview small saved: ${projectName}/pages/${pageName}/preview_small.png`);
    }

    return { success: true, pageName, resourceType: 'preview', filePath };
  }

  getResourceFilePath(
    projectName: string,
    pageName: string,
    fileName: string,
    groupName?: string,
  ): string | null {
    const folderPath = this.getPageFolderPath(projectName, pageName, groupName);
    const safeName = path.basename(fileName);
    const filePath = path.join(folderPath, safeName);

    if (fs.existsSync(filePath)) {
      return filePath;
    }

    // 备用查找：如果 groupName 带 g_ 前缀导致路径错误，尝试去掉前缀重试
    if (groupName && groupName.startsWith('g_')) {
      const altPath = this.getPageFolderPath(projectName, pageName, groupName.slice(2));
      const altFilePath = path.join(altPath, safeName);
      if (fs.existsSync(altFilePath)) return altFilePath;
    }

    // 备用查找：如果 pageName 带 p_/g_ 前缀，尝试去掉前缀重试
    if (/^(p_|g_)/.test(pageName)) {
      const cleanName = pageName.replace(/^(p_|g_)/, '');
      const altPath = this.getPageFolderPath(projectName, cleanName, groupName);
      const altFilePath = path.join(altPath, safeName);
      if (fs.existsSync(altFilePath)) return altFilePath;
    }

    return null;
  }

  renamePage(
    projectName: string,
    oldPageName: string,
    newPageName: string,
    groupName?: string,
  ): PageSaveResult {
    const oldFolderPath = this.getPageFolderPath(projectName, oldPageName, groupName);

    if (!fs.existsSync(oldFolderPath)) {
      throw new NotFoundException(`页面文件夹不存在: ${projectName}/pages/${oldPageName}`);
    }

    this.checkPageNameConflict(projectName, newPageName, groupName, oldPageName);

    const newFolderPath = this.getPageFolderPath(projectName, newPageName, groupName);

    fs.renameSync(oldFolderPath, newFolderPath);
    this.logger.log(`Page renamed: ${oldPageName} -> ${newPageName}`);

    return { success: true, pageName: newPageName, folderPath: newFolderPath };
  }

  /**
   * 将存量项目数据迁移到新的前缀命名规范（p_ / g_）
   * 页面目录: {pageName}/ → p_{normalized}/
   * 分组目录: {groupName}/ → g_{normalized}/ 且内部页面 p_{normalized}/
   * 去重: 同名页面只保留首次出现（根目录优先于分组）
   */
  migrateProject(projectName: string): {
    migratedPages: number;
    migratedGroups: number;
    removedDuplicates: number;
  } {
    const pagesDir = this.getPagesDir(projectName);
    if (!fs.existsSync(pagesDir)) {
      return { migratedPages: 0, migratedGroups: 0, removedDuplicates: 0 };
    }

    let migratedPages = 0;
    let migratedGroups = 0;
    let removedDuplicates = 0;

    const entries = fs.readdirSync(pagesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // 跳过已迁移的
      if (entry.name.startsWith('p_') || entry.name.startsWith('g_')) continue;

      const fullPath = path.join(pagesDir, entry.name);

      // 判断是分组还是页面：分组目录下有子目录含 page.json
      const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
      const hasSubPages = subEntries.some(
        (e) => e.isDirectory() && fs.existsSync(path.join(fullPath, e.name, 'page.json')),
      );

      if (hasSubPages) {
        // 这是一个分组 → 重命名为 g_{name}
        const normalizedName = this.normalizePageName(entry.name);
        const newGroupName = `g_${normalizedName}`;
        const newGroupPath = path.join(pagesDir, newGroupName);

        if (entry.name !== newGroupName) {
          fs.renameSync(fullPath, newGroupPath);
          this.logger.log(`Migrate: group "${entry.name}" → "${newGroupName}"`);
        }
        migratedGroups++;

        // 迁移分组内页面
        const migrated = this.migratePagesInsideDir(newGroupPath);
        migratedPages += migrated.migratedPages;
        removedDuplicates += migrated.removedDuplicates;
      } else {
        // 这是一个页面 → 重命名为 p_{name}（规范化名称）
        const normalizedName = this.normalizePageName(entry.name);
        const newPageName = `p_${normalizedName}`;
        const newPagePath = path.join(pagesDir, newPageName);

        if (fs.existsSync(newPagePath)) {
          // 目标已存在（同名页面），删除当前重复项
          fs.rmSync(fullPath, { recursive: true, force: true });
          removedDuplicates++;
          this.logger.warn(
            `Migrate: removed duplicate page "${entry.name}" (already exists as "${newPageName}")`,
          );
        } else {
          fs.renameSync(fullPath, newPagePath);
          migratedPages++;
          this.logger.log(`Migrate: page "${entry.name}" → "${newPageName}"`);
        }
      }
    }

    this.logger.log(
      `Migration completed: ${projectName} — ${migratedPages} pages, ${migratedGroups} groups, ${removedDuplicates} duplicates removed`,
    );
    return { migratedPages, migratedGroups, removedDuplicates };
  }

  private migratePagesInsideDir(dirPath: string): {
    migratedPages: number;
    removedDuplicates: number;
  } {
    let migratedPages = 0;
    let removedDuplicates = 0;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // 跳过已迁移的
      if (entry.name.startsWith('p_')) continue;

      const fullPath = path.join(dirPath, entry.name);
      if (!fs.existsSync(path.join(fullPath, 'page.json'))) continue;

      const normalizedName = this.normalizePageName(entry.name);
      const newPageName = `p_${normalizedName}`;
      const newPagePath = path.join(dirPath, newPageName);

      if (fs.existsSync(newPagePath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        removedDuplicates++;
        this.logger.warn(
          `Migrate: removed duplicate page "${entry.name}" in group (already exists as "${newPageName}")`,
        );
      } else {
        fs.renameSync(fullPath, newPagePath);
        migratedPages++;
        this.logger.log(`Migrate: page "${entry.name}" → "${newPageName}"`);
      }
    }

    return { migratedPages, removedDuplicates };
  }

  movePage(
    projectName: string,
    pageName: string,
    fromGroupName: string | undefined,
    toGroupName: string | undefined,
  ): PageSaveResult {
    const oldFolderPath = this.getPageFolderPath(projectName, pageName, fromGroupName);

    if (!fs.existsSync(oldFolderPath)) {
      throw new NotFoundException(`页面文件夹不存在: ${projectName}/pages/${pageName}`);
    }

    this.checkPageNameConflict(projectName, pageName, toGroupName);

    const newFolderPath = this.getPageFolderPath(projectName, pageName, toGroupName);
    this.ensureDir(path.dirname(newFolderPath));

    fs.renameSync(oldFolderPath, newFolderPath);
    this.logger.log(
      `Page moved: ${pageName} ${fromGroupName || '(root)'} -> ${toGroupName || '(root)'}`,
    );

    return { success: true, pageName, folderPath: newFolderPath };
  }

  getProjectsDirInfo(): ProjectsDirInfo {
    const projectsDir = this.getProjectsDir();
    const exists = fs.existsSync(projectsDir);

    return { projectsDir, exists };
  }

  /**
   * 导出所有页面为 ZIP 文件
   * 打包整个 pages 目录（包括分组子目录）
   */
  async exportPagesZip(projectName: string): Promise<{ filePath: string; fileName: string }> {
    const pagesDir = this.getPagesDir(projectName);

    if (!fs.existsSync(pagesDir)) {
      throw new NotFoundException(`项目 "${projectName}" 的 pages 目录不存在`);
    }

    const tmpDir = os.tmpdir();
    const zipFileName = `${projectName}_pages_${Date.now()}.zip`;
    const zipFilePath = path.join(tmpDir, zipFileName);

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        this.logger.log(
          `Pages exported: ${projectName} -> ${zipFileName} (${archive.pointer()} bytes)`,
        );
        resolve();
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // 打包 pages 目录，保留内部结构（分组/页面文件夹）
      archive.directory(pagesDir, 'pages');

      archive.finalize();
    });

    return { filePath: zipFilePath, fileName: zipFileName };
  }

  /**
   * 从 ZIP 文件导入页面
   * 支持两种格式：
   *   1. 包含 pages 根目录的 ZIP（解压后合并到 pages 目录）
   *   2. 直接包含页面文件夹/JSON 文件的 ZIP
   */
  async importPagesZip(
    projectName: string,
    zipBuffer: Buffer,
    options?: { overwrite?: boolean },
  ): Promise<{ importedCount: number; warnings: string[] }> {
    const warnings: string[] = [];
    const tmpDir = path.join(os.tmpdir(), `pages_import_${Date.now()}`);

    try {
      fs.mkdirSync(tmpDir, { recursive: true });

      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();

      if (entries.length === 0) {
        throw new BadRequestException('ZIP 文件为空');
      }

      // 解压到临时目录
      zip.extractAllTo(tmpDir, true);

      const pagesDir = this.getPagesDir(projectName);
      this.ensureDir(pagesDir);

      // 检测 ZIP 结构：是否包含 "pages/" 根目录
      const extractedRoot = path.join(tmpDir, 'pages');
      const sourceDir =
        fs.existsSync(extractedRoot) && fs.statSync(extractedRoot).isDirectory()
          ? extractedRoot
          : tmpDir;

      let importedCount = 0;

      // 递归导入页面文件
      const importFromDir = (srcDir: string, targetBaseDir: string) => {
        const srcEntries = fs.readdirSync(srcDir, { withFileTypes: true });

        for (const entry of srcEntries) {
          const srcPath = path.join(srcDir, entry.name);
          const destPath = path.join(targetBaseDir, entry.name);

          if (entry.isDirectory()) {
            // 检查是否是页面文件夹（包含 page.json）
            const pageJsonPath = path.join(srcPath, 'page.json');
            if (fs.existsSync(pageJsonPath)) {
              // 这是一个页面文件夹
              if (fs.existsSync(destPath)) {
                if (options?.overwrite) {
                  fs.rmSync(destPath, { recursive: true, force: true });
                  warnings.push(`已覆盖页面: ${entry.name}`);
                } else {
                  warnings.push(`跳过已存在的页面: ${entry.name}`);
                  continue;
                }
              }
              this.copyDirSync(srcPath, destPath);
              importedCount++;
              this.logger.log(`Page imported: ${projectName}/pages/${entry.name}`);
            } else {
              // 这是一个分组目录，递归处理
              this.ensureDir(destPath);
              importFromDir(srcPath, destPath);
            }
          } else if (entry.name.endsWith('.json')) {
            // 单独的 JSON 文件视为页面数据
            const pageName = entry.name.replace('.json', '');
            const safeName = this.normalizePageName(pageName);
            const pageFolder = path.join(targetBaseDir, `p_${safeName}`);

            if (fs.existsSync(pageFolder)) {
              if (options?.overwrite) {
                fs.rmSync(pageFolder, { recursive: true, force: true });
                warnings.push(`已覆盖页面: ${pageName}`);
              } else {
                warnings.push(`跳过已存在的页面: ${pageName}`);
                continue;
              }
            }

            this.ensureDir(pageFolder);
            const content = fs.readFileSync(srcPath, 'utf-8');
            fs.writeFileSync(path.join(pageFolder, 'page.json'), content, 'utf-8');
            importedCount++;
            this.logger.log(`Page imported from JSON: ${projectName}/pages/${safeName}`);
          }
        }
      };

      importFromDir(sourceDir, pagesDir);

      if (importedCount === 0 && warnings.length === 0) {
        warnings.push('ZIP 文件中没有找到有效的页面数据');
      }

      this.logger.log(`Pages import completed: ${projectName}, imported ${importedCount} pages`);
      return { importedCount, warnings };
    } finally {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  }

  private copyDirSync(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
