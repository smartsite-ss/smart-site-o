// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_LOCALE = 'zh-CN';
const LOCALE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/;

/** 字典条目 */
export interface DictItem {
  value: string;
  label: string;
  sortOrder: number;
  description: string;
}

/** 字典表定义 */
export interface DictTable {
  dictId: string;
  dictName: string;
  category: string;
  description: string;
  version: string;
  sortOrder: number;
  items: DictItem[];
}

/** 字典分类（一级目录） */
export interface DictCategory {
  category: string;
  tables: DictTable[];
}

@Injectable()
export class DictionaryLoaderService implements OnModuleInit {
  private readonly logger = new Logger(DictionaryLoaderService.name);
  private dictsBasePath: string;

  /** locale → (dictId → DictTable) */
  private cache = new Map<string, Map<string, DictTable>>();
  /** locale → categories[] */
  private categoryCache = new Map<string, DictCategory[]>();
  /** 支持的语言列表 */
  private supportedLocales: string[] = [];

  constructor(
    configService: ConfigService,
    private readonly pathResolver: PathResolverService,
  ) {
    const dictsDir = configService.get<string>('DICTS_DIR') || '../../data/dicts';
    this.dictsBasePath = this.resolvePath(dictsDir);
    this.logger.log(`数据字典目录: ${this.dictsBasePath}`);
  }

  /**
   * 将相对路径解析为绝对路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node（本文件位于 packages/ss-system/dist/dict/）
   *   .env.dev 中 DICTS_DIR 相对于 ss-services/ss-node 解析
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *   .env 中 DICTS_DIR=../../data/dicts 相对于该目录解析
   *
   * 与 app.module.ts getDatabaseConfig()、backup.service.ts getProjectRoot() 保持一致。
   */
  private resolvePath(p: string): string {
    return this.pathResolver.resolve(p);
  }

  async onModuleInit() {
    await this.reloadAll();
  }

  /**
   * 重新加载所有语言的所有字典
   */
  async reloadAll(): Promise<void> {
    this.cache.clear();
    this.categoryCache.clear();

    if (!fs.existsSync(this.dictsBasePath)) {
      this.logger.warn(`字典目录不存在: ${this.dictsBasePath}`);
      return;
    }

    // 扫描根目录，识别 locale 子目录
    this.supportedLocales = fs
      .readdirSync(this.dictsBasePath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => LOCALE_PATTERN.test(name))
      .sort();

    if (this.supportedLocales.length === 0) {
      this.logger.warn(`未找到语言目录 (zh-CN, en-US 等): ${this.dictsBasePath}`);
      return;
    }

    for (const locale of this.supportedLocales) {
      await this.reloadLocale(locale);
    }

    this.logger.log(
      `数据字典加载完成: 支持 ${this.supportedLocales.length} 种语言 [${this.supportedLocales.join(', ')}]`,
    );
  }

  /**
   * 重新加载指定语言
   */
  async reloadLocale(locale: string): Promise<void> {
    const localePath = path.join(this.dictsBasePath, locale);

    if (!fs.existsSync(localePath)) {
      this.logger.warn(`语言目录不存在: ${localePath}`);
      return;
    }

    // 初始化该语言的缓存
    const localeCache = new Map<string, DictTable>();
    const localeCategories: DictCategory[] = [];

    const categoryDirs = fs
      .readdirSync(localePath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .sort();

    for (const category of categoryDirs) {
      const categoryDir = path.join(localePath, category);
      const tableFiles = fs
        .readdirSync(categoryDir)
        .filter((f) => f.endsWith('.json'))
        .sort();

      const tables: DictTable[] = [];
      for (const file of tableFiles) {
        const filePath = path.join(categoryDir, file);
        try {
          let content = fs.readFileSync(filePath, 'utf-8');
          // 去除 UTF-8 BOM（\uFEFF），避免 JSON.parse 失败
          if (content.charCodeAt(0) === 0xfeff) {
            content = content.slice(1);
          }
          const table = JSON.parse(content) as DictTable;
          if (table.dictId && table.dictName && Array.isArray(table.items)) {
            localeCache.set(table.dictId, table);
            tables.push(table);
          } else {
            this.logger.warn(`字典文件格式无效: ${filePath}`);
          }
        } catch (e: any) {
          this.logger.error(`加载字典文件失败: ${filePath}`, e.message);
        }
      }

      if (tables.length > 0) {
        localeCategories.push({ category, tables });
      }
    }

    this.cache.set(locale, localeCache);
    this.categoryCache.set(locale, localeCategories);

    this.logger.log(
      `语言 ${locale} 加载完成: ${localeCache.size} 个字典表, ${categoryDirs.length} 个分类`,
    );
  }

  /**
   * 根据 dictId 获取字典表
   * @param dictId 字典标识
   * @param locale 语言，默认 zh-CN
   */
  getDict(dictId: string, locale: string = DEFAULT_LOCALE): DictTable | undefined {
    const localeCache = this.cache.get(locale);
    if (!localeCache) {
      // 降级到默认语言
      const defaultCache = this.cache.get(DEFAULT_LOCALE);
      return defaultCache?.get(dictId);
    }
    return localeCache.get(dictId);
  }

  /**
   * 获取所有字典分类（按分类分组）
   * @param locale 语言，默认 zh-CN
   */
  getAllCategories(locale: string = DEFAULT_LOCALE): DictCategory[] {
    return this.categoryCache.get(locale) || this.categoryCache.get(DEFAULT_LOCALE) || [];
  }

  /**
   * 获取所有字典表（平铺列表）
   * @param locale 语言，默认 zh-CN
   */
  getAllDicts(locale: string = DEFAULT_LOCALE): DictTable[] {
    const localeCache = this.cache.get(locale) || this.cache.get(DEFAULT_LOCALE);
    return localeCache ? Array.from(localeCache.values()) : [];
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLocales(): string[] {
    return [...this.supportedLocales];
  }

  /**
   * 获取字典基础路径
   */
  getBasePath(): string {
    return this.dictsBasePath;
  }

  /**
   * 查找并加载单个字典表（缓存未命中时从磁盘扫描）
   *
   * 当某个字典文件是在服务启动后才添加时，缓存中没有该字典。
   * 此方法会扫描该 locale 下所有分类目录，找到匹配的文件并加载到缓存中。
   *
   * @param dictId 字典标识
   * @param locale 语言
   * @returns 找到的字典表，或 undefined
   */
  loadSingleDict(dictId: string, locale: string = DEFAULT_LOCALE): DictTable | undefined {
    // 1. 先查缓存
    const localeCache = this.cache.get(locale);
    if (localeCache?.has(dictId)) {
      return localeCache.get(dictId);
    }

    // 2. 缓存未命中，扫描磁盘
    const localePath = path.join(this.dictsBasePath, locale);
    if (!fs.existsSync(localePath)) {
      return undefined;
    }

    const categoryDirs = fs
      .readdirSync(localePath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const category of categoryDirs) {
      const categoryDir = path.join(localePath, category);
      const tableFiles = fs.readdirSync(categoryDir).filter((f) => f.endsWith('.json'));

      for (const file of tableFiles) {
        const filePath = path.join(categoryDir, file);
        try {
          let content = fs.readFileSync(filePath, 'utf-8');
          if (content.charCodeAt(0) === 0xfeff) {
            content = content.slice(1);
          }
          const table = JSON.parse(content) as DictTable;
          if (table.dictId === dictId && table.dictName && Array.isArray(table.items)) {
            // 加载到缓存
            if (!localeCache) {
              const newCache = new Map<string, DictTable>();
              newCache.set(dictId, table);
              this.cache.set(locale, newCache);
            } else {
              localeCache.set(dictId, table);
            }
            // 同时更新 categoryCache
            this.updateCategoryCache(locale, category, table);
            this.logger.log(`从磁盘加载单个字典: ${locale}/${category}/${file}`);
            return table;
          }
        } catch (e: any) {
          this.logger.warn(`扫描单个字典文件失败: ${filePath}`, e.message);
        }
      }
    }

    return undefined;
  }

  /** 将单个字典表追加到分类缓存中 */
  private updateCategoryCache(locale: string, category: string, table: DictTable): void {
    let categories = this.categoryCache.get(locale);
    if (!categories) {
      categories = [];
      this.categoryCache.set(locale, categories);
    }
    let cat = categories.find((c) => c.category === category);
    if (!cat) {
      cat = { category, tables: [] };
      categories.push(cat);
    }
    if (!cat.tables.find((t) => t.dictId === table.dictId)) {
      cat.tables.push(table);
    }
  }

  // ==================== 写操作 ====================

  /** camelCase → kebab-case，用于文件名 */
  private toFileName(id: string): string {
    return id.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /** 获取某个 locale 下的分类目录路径 */
  private getCategoryDir(locale: string, category: string): string {
    return path.join(this.dictsBasePath, locale, category);
  }

  /** 获取某个字典表的文件路径 */
  private getTablePath(locale: string, category: string, dictId: string): string {
    return path.join(this.dictsBasePath, locale, category, `${this.toFileName(dictId)}.json`);
  }

  /**
   * 创建分类（目录）
   */
  createCategory(locale: string, categoryName: string): void {
    const dir = this.getCategoryDir(locale, categoryName);
    if (fs.existsSync(dir)) {
      throw new Error(`分类 "${categoryName}" 已存在`);
    }
    fs.mkdirSync(dir, { recursive: true });
    // 更新缓存，使前端刷新能获取到新分类
    let categories = this.categoryCache.get(locale);
    if (!categories) {
      categories = [];
      this.categoryCache.set(locale, categories);
    }
    if (!categories.find((c) => c.category === categoryName)) {
      categories.push({ category: categoryName, tables: [] });
    }
    this.logger.log(`创建分类: ${locale}/${categoryName}`);
  }

  /**
   * 重命名分类（目录）
   */
  renameCategory(locale: string, oldName: string, newName: string): void {
    const oldDir = this.getCategoryDir(locale, oldName);
    const newDir = this.getCategoryDir(locale, newName);
    if (!fs.existsSync(oldDir)) {
      throw new Error(`分类 "${oldName}" 不存在`);
    }
    if (fs.existsSync(newDir)) {
      throw new Error(`分类 "${newName}" 已存在`);
    }
    fs.renameSync(oldDir, newDir);
    // 更新缓存
    const categories = this.categoryCache.get(locale);
    if (categories) {
      const cat = categories.find((c) => c.category === oldName);
      if (cat) {
        cat.category = newName;
        cat.tables.forEach((t) => (t.category = newName));
      }
    }
    this.logger.log(`重命名分类: ${locale}/${oldName} → ${newName}`);
  }

  /**
   * 删除分类（目录及所有字典文件）
   */
  deleteCategory(locale: string, categoryName: string): void {
    const dir = this.getCategoryDir(locale, categoryName);
    if (!fs.existsSync(dir)) {
      throw new Error(`分类 "${categoryName}" 不存在`);
    }
    fs.rmSync(dir, { recursive: true, force: true });
    // 更新缓存
    const categories = this.categoryCache.get(locale);
    if (categories) {
      const idx = categories.findIndex((c) => c.category === categoryName);
      if (idx >= 0) {
        categories.splice(idx, 1);
      }
    }
    this.logger.log(`删除分类: ${locale}/${categoryName}`);
  }

  /**
   * 创建字典表（JSON 文件）
   */
  createTable(locale: string, category: string, table: DictTable): void {
    const filePath = this.getTablePath(locale, category, table.dictId);
    if (fs.existsSync(filePath)) {
      throw new Error(`字典表 "${table.dictId}" 已存在`);
    }
    // 确保分类目录存在
    const dir = this.getCategoryDir(locale, category);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(table, null, 2), 'utf-8');
    this.logger.log(`创建字典表: ${locale}/${category}/${table.dictId}`);
  }

  /**
   * 更新字典表（覆盖 JSON 文件）
   */
  updateTable(locale: string, category: string, dictId: string, table: Partial<DictTable>): void {
    const filePath = this.getTablePath(locale, category, dictId);
    if (!fs.existsSync(filePath)) {
      throw new Error(`字典表 "${dictId}" 不存在`);
    }
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    const existing = JSON.parse(content) as DictTable;
    const merged = { ...existing, ...table, dictId }; // 保证 dictId 不变
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
    this.logger.log(`更新字典表: ${locale}/${category}/${dictId}`);
  }

  /**
   * 删除字典表（删除 JSON 文件）
   */
  deleteTable(locale: string, category: string, dictId: string): void {
    const filePath = this.getTablePath(locale, category, dictId);
    if (!fs.existsSync(filePath)) {
      throw new Error(`字典表 "${dictId}" 不存在`);
    }
    fs.unlinkSync(filePath);
    this.logger.log(`删除字典表: ${locale}/${category}/${dictId}`);
  }

  /**
   * 导出字典表（返回原始 JSON 对象）
   */
  exportTable(locale: string, category: string, dictId: string): DictTable {
    const filePath = this.getTablePath(locale, category, dictId);
    if (!fs.existsSync(filePath)) {
      throw new Error(`字典表 "${dictId}" 不存在`);
    }
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    return JSON.parse(content) as DictTable;
  }

  /**
   * 导入字典表（创建或覆盖 JSON 文件）
   */
  importTable(locale: string, category: string, dictId: string, table: DictTable): void {
    const dir = this.getCategoryDir(locale, category);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = this.getTablePath(locale, category, dictId);
    fs.writeFileSync(filePath, JSON.stringify(table, null, 2), 'utf-8');
    this.logger.log(`导入字典表: ${locale}/${category}/${dictId}`);
  }
}
