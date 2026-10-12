// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';

// ===== 树形索引类型（匹配目录结构）=====

export interface TemplateEntry {
  type: 'template';
  id: string;
  name: string;
  fileName: string;
  relativePath: string;
  deviceType: string;
  deviceModel: string;
  version: string;
  status: string;
  isDefault: boolean;
  variableCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryNode {
  type: 'category';
  name: string;
  path: string;
  templateCount: number;
  templates: TemplateEntry[];
}

export interface IndustryNode {
  type: 'industry';
  name: string;
  path: string;
  templateCount: number;
  categories: CategoryNode[];
}

export interface TemplateTreeIndex {
  schemaVersion: string;
  lastUpdated: string;
  totalTemplates: number;
  totalIndustries: number;
  totalCategories: number;
  description: string;
  rootPath: string;
  industries: IndustryNode[];
}

// ===== 目录结构操作 DTO =====

export interface CreateCategoryDto {
  industryName: string;
  categoryName: string;
}

export interface RenameCategoryDto {
  industryName: string;
  oldCategoryName: string;
  newCategoryName: string;
}

export interface DeleteCategoryDto {
  industryName: string;
  categoryName: string;
}

@Injectable()
export class TemplateIndexService {
  private readonly logger = new Logger(TemplateIndexService.name);
  private templatesBasePath: string;

  constructor(
    configService: ConfigService,
    private readonly pathResolver: PathResolverService,
  ) {
    const templatesDir = configService.get<string>('TEMPLATES_DIR') || '../../data/templates';
    this.templatesBasePath = this.resolvePath(templatesDir);
    this.logger.log(`设备模板目录: ${this.templatesBasePath}`);
  }

  /**
   * 将相对路径解析为绝对路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node（本文件位于 packages/ss-system/dist/template/）
   *   .env.dev 中 TEMPLATES_DIR 相对于 ss-services/ss-node 解析
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *   .env 中 TEMPLATES_DIR=../../data/templates 相对于该目录解析
   *
   * 与 app.module.ts getDatabaseConfig()、backup.service.ts getProjectRoot() 保持一致。
   */
  private resolvePath(p: string): string {
    return this.pathResolver.resolve(p);
  }

  getBasePath(): string {
    return this.templatesBasePath;
  }

  /**
   * 从目录结构重建 index.json
   * 遍历 templates/ 目录，构建树形索引
   * ✨ 同时为每个 BCP 47 语言子目录（zh-CN, en-US 等）重建各自的 index.json
   */
  rebuildIndex(): TemplateTreeIndex {
    if (!fs.existsSync(this.templatesBasePath)) {
      this.logger.warn(`模板目录不存在: ${this.templatesBasePath}`);
      return this.createEmptyIndex();
    }

    // 1. 重建根目录 index.json（向后兼容）
    const index = this.rebuildIndexAtPath(this.templatesBasePath, '根目录');
    const indexPath = path.join(this.templatesBasePath, 'index.json');
    this.writeIndexFile(indexPath, index);

    // 2. ✨ 遍历 BCP 47 语言子目录，为每种语言重建 index.json
    const dirEntries = fs.readdirSync(this.templatesBasePath, { withFileTypes: true });
    for (const entry of dirEntries) {
      if (entry.isDirectory() && /^[a-z]{2}-[A-Z]{2}$/.test(entry.name)) {
        const localePath = path.join(this.templatesBasePath, entry.name);
        const localeIndex = this.rebuildIndexAtPath(localePath, entry.name);
        const localeIndexPath = path.join(localePath, 'index.json');
        this.writeIndexFile(localeIndexPath, localeIndex);
        this.logger.log(
          `[${entry.name}] index.json 重建完成: ${localeIndex.totalTemplates} 个模板, ${localeIndex.totalIndustries} 个行业`,
        );
      }
    }

    return index;
  }

  /**
   * 在指定路径下扫描目录结构，构建索引对象（不写入文件）
   */
  private rebuildIndexAtPath(basePath: string, label: string): TemplateTreeIndex {
    const industries = this.scanDirectory(basePath);

    const totalTemplates = industries.reduce(
      (sum, ind) => sum + ind.categories.reduce((s, cat) => s + cat.templates.length, 0),
      0,
    );

    return {
      schemaVersion: '2.0',
      lastUpdated: new Date().toISOString(),
      totalTemplates,
      totalIndustries: industries.length,
      totalCategories: industries.reduce((sum, ind) => sum + ind.categories.length, 0),
      description: 'Smart SCADA 设备模板库树形索引 - 按行业/设备类型双级目录组织',
      rootPath: basePath,
      industries,
    };
  }

  /**
   * 读取当前 index.json
   */
  loadIndex(): TemplateTreeIndex | null {
    const indexPath = path.join(this.templatesBasePath, 'index.json');
    console.log('smart-data device template path: ', indexPath);
    if (!fs.existsSync(indexPath)) return null;

    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      return JSON.parse(content) as TemplateTreeIndex;
    } catch (err: any) {
      this.logger.error(`读取 index.json 失败: ${err.message}`);
      return null;
    }
  }

  /**
   * 创建空索引
   */
  private createEmptyIndex(): TemplateTreeIndex {
    return {
      schemaVersion: '2.0',
      lastUpdated: new Date().toISOString(),
      totalTemplates: 0,
      totalIndustries: 0,
      totalCategories: 0,
      description: 'Smart SCADA 设备模板库树形索引',
      rootPath: this.templatesBasePath,
      industries: [],
    };
  }

  /**
   * 递归扫描模板目录，构建行业树
   * @param basePath 扫描的根路径，默认为 templatesBasePath
   */
  private scanDirectory(basePath?: string): IndustryNode[] {
    const scanPath = basePath ?? this.templatesBasePath;
    const isRootScan = scanPath === this.templatesBasePath;
    const entries = fs.readdirSync(scanPath, { withFileTypes: true });
    const industries: IndustryNode[] = [];

    for (const entry of entries) {
      // 跳过非目录、跳过隐藏目录
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

      // 仅在扫描根目录时跳过 BCP 47 语言目录（如 zh-CN, en-US）
      // 扫描语言子目录内部时不跳过（否则无法扫描行业目录）
      if (isRootScan && /^[a-z]{2}-[A-Z]{2}$/.test(entry.name)) continue;

      const industryPath = path.join(scanPath, entry.name);
      const categories = this.scanIndustryDirectory(industryPath, entry.name);

      const templateCount = categories.reduce((sum, cat) => sum + cat.templates.length, 0);

      industries.push({
        type: 'industry',
        name: entry.name,
        path: entry.name,
        templateCount,
        categories,
      });
    }

    // 按名称排序
    industries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    return industries;
  }

  /**
   * 扫描行业目录下的所有分类子目录
   */
  private scanIndustryDirectory(dirPath: string, industryName: string): CategoryNode[] {
    if (!fs.statSync(dirPath).isDirectory()) return [];

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const categories: CategoryNode[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const categoryPath = path.join(dirPath, entry.name);
      const templates = this.scanCategoryDirectory(categoryPath, industryName, entry.name);

      categories.push({
        type: 'category',
        name: entry.name,
        path: path.join(industryName, entry.name).replace(/\\/g, '/'),
        templateCount: templates.length,
        templates,
      });
    }

    categories.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    return categories;
  }

  /**
   * 扫描分类目录下的所有模板JSON文件
   */
  private scanCategoryDirectory(
    dirPath: string,
    industryName: string,
    categoryName: string,
  ): TemplateEntry[] {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return [];

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const templates: TemplateEntry[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;

      const filePath = path.join(dirPath, entry.name);
      const relativePath = path.join(industryName, categoryName, entry.name).replace(/\\/g, '/');

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        const stat = fs.statSync(filePath);

        templates.push({
          type: 'template',
          id: json.id || '',
          name: json.name || entry.name,
          fileName: entry.name,
          relativePath,
          deviceType: json.deviceType || '',
          deviceModel: json.deviceModel || '',
          version: json.version || '0.0.0',
          status: json.status || 'published',
          isDefault: json.isDefault ?? false,
          variableCount: Array.isArray(json.variables) ? json.variables.length : 0,
          tags: json.tags || [],
          createdAt: json.metadata?.createdAt || json.createdAt || '',
          updatedAt: json.metadata?.updatedAt || json.updatedAt || stat.mtime.toISOString(),
        });
      } catch (err: any) {
        this.logger.warn(`解析模板文件失败: ${filePath} - ${err.message}`);
      }
    }

    templates.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    return templates;
  }

  /**
   * 写入索引文件
   */
  private writeIndexFile(indexPath: string, index: TemplateTreeIndex): void {
    const dir = path.dirname(indexPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 原子写入: 先写临时文件，再重命名
    const tmpPath = indexPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(index, null, 2), 'utf-8');
    fs.renameSync(tmpPath, indexPath);
  }

  // ===== 目录结构管理操作 =====

  /**
   * 创建分类目录（在行业下创建子目录）
   */
  async createCategory(dto: CreateCategoryDto): Promise<{ success: boolean; path: string }> {
    const dirPath = path.join(this.templatesBasePath, dto.industryName, dto.categoryName);

    if (fs.existsSync(dirPath)) {
      throw new Error(`分类目录已存在: ${dto.categoryName}`);
    }

    // 确保行业目录存在
    const industryPath = path.join(this.templatesBasePath, dto.industryName);
    if (!fs.existsSync(industryPath)) {
      fs.mkdirSync(industryPath, { recursive: true });
    }

    fs.mkdirSync(dirPath, { recursive: true });

    // 重建索引
    this.rebuildIndex();

    return {
      success: true,
      path: path.join(dto.industryName, dto.categoryName).replace(/\\/g, '/'),
    };
  }

  /**
   * 重命名分类目录
   */
  async renameCategory(
    dto: RenameCategoryDto,
  ): Promise<{ success: boolean; oldPath: string; newPath: string }> {
    const oldPath = path.join(this.templatesBasePath, dto.industryName, dto.oldCategoryName);
    const newPath = path.join(this.templatesBasePath, dto.industryName, dto.newCategoryName);

    if (!fs.existsSync(oldPath)) {
      throw new Error(`分类目录不存在: ${dto.oldCategoryName}`);
    }

    if (fs.existsSync(newPath)) {
      throw new Error(`目标分类目录已存在: ${dto.newCategoryName}`);
    }

    // 如果目录下有模板文件，需要更新它们的 industry/category 字段
    this.updateTemplateFilesMetadata(oldPath, dto.industryName, dto.newCategoryName);

    fs.renameSync(oldPath, newPath);

    // 重建索引
    this.rebuildIndex();

    return {
      success: true,
      oldPath: path.join(dto.industryName, dto.oldCategoryName).replace(/\\/g, '/'),
      newPath: path.join(dto.industryName, dto.newCategoryName).replace(/\\/g, '/'),
    };
  }

  /**
   * 删除分类目录
   */
  async deleteCategory(dto: DeleteCategoryDto): Promise<{ success: boolean }> {
    const dirPath = path.join(this.templatesBasePath, dto.industryName, dto.categoryName);

    if (!fs.existsSync(dirPath)) {
      throw new Error(`分类目录不存在: ${dto.categoryName}`);
    }

    // 检查目录下是否有模板文件
    const files = fs.readdirSync(dirPath);
    const templateFiles = files.filter((f) => f.endsWith('.json'));
    if (templateFiles.length > 0) {
      throw new Error(`分类目录下存在 ${templateFiles.length} 个模板文件，请先删除模板文件`);
    }

    fs.rmdirSync(dirPath);

    // 重建索引
    this.rebuildIndex();

    return { success: true };
  }

  /**
   * 更新目录下所有模板文件的 industry/category 元数据
   */
  private updateTemplateFilesMetadata(
    dirPath: string,
    industryName: string,
    newCategoryName: string,
  ): void {
    if (!fs.existsSync(dirPath)) return;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;

      const filePath = path.join(dirPath, entry.name);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);

        json.industry = industryName;
        json.category = newCategoryName;
        json.metadata = json.metadata || {};
        json.metadata.updatedAt = new Date().toISOString();

        fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
      } catch (err: any) {
        this.logger.warn(`更新模板文件元数据失败: ${filePath} - ${err.message}`);
      }
    }
  }

  /**
   * 获取目录结构（可用于UI展示）
   */
  getDirectoryStructure(): IndustryNode[] {
    const index = this.loadIndex();
    if (!index) {
      // 如果没有index.json，尝试重建
      return this.rebuildIndex().industries;
    }
    return index.industries;
  }
}
