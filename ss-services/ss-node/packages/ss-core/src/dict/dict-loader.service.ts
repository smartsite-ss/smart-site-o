// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DictTable, DictCategory } from './dict.types';
import { PathResolverService } from '../path/path-resolver.service';

const DEFAULT_LOCALE = 'zh-CN';

/**
 * 内嵌默认数据字典，在文件系统不存在字典文件时使用
 */
const EMBEDDED_DICTS: Record<string, DictTable[]> = {
  'zh-CN': [
    {
      dictId: 'sys_yes_no',
      dictName: '是/否',
      category: 'system',
      items: [
        { value: '1', label: '是', sortOrder: 1 },
        { value: '0', label: '否', sortOrder: 2 },
      ],
    },
    {
      dictId: 'sys_normal_disable',
      dictName: '系统状态',
      category: 'system',
      items: [
        { value: '0', label: '正常', sortOrder: 1 },
        { value: '1', label: '停用', sortOrder: 2 },
      ],
    },
    {
      dictId: 'sys_show_hide',
      dictName: '显示状态',
      category: 'system',
      items: [
        { value: '0', label: '显示', sortOrder: 1 },
        { value: '1', label: '隐藏', sortOrder: 2 },
      ],
    },
    {
      dictId: 'sys_job_status',
      dictName: '任务状态',
      category: 'system',
      items: [
        { value: '0', label: '成功', sortOrder: 1 },
        { value: '1', label: '失败', sortOrder: 2 },
      ],
    },
    {
      dictId: 'biz_device_status',
      dictName: '设备状态',
      category: 'business',
      items: [
        { value: '0', label: '在线', sortOrder: 1 },
        { value: '1', label: '离线', sortOrder: 2 },
        { value: '2', label: '故障', sortOrder: 3 },
        { value: '3', label: '维护中', sortOrder: 4 },
      ],
    },
    {
      dictId: 'biz_alarm_level',
      dictName: '告警级别',
      category: 'business',
      items: [
        { value: '1', label: '紧急', sortOrder: 1 },
        { value: '2', label: '重要', sortOrder: 2 },
        { value: '3', label: '一般', sortOrder: 3 },
        { value: '4', label: '提示', sortOrder: 4 },
      ],
    },
    {
      dictId: 'variableCategory',
      dictName: '变量分类',
      category: 'business',
      items: [
        { value: 'AI', label: 'AI（模拟量输入）', sortOrder: 1 },
        { value: 'AO', label: 'AO（模拟量输出）', sortOrder: 2 },
        { value: 'DI', label: 'DI（数字量输入）', sortOrder: 3 },
        { value: 'DO', label: 'DO（数字量输出）', sortOrder: 4 },
        { value: 'control', label: '控制变量', sortOrder: 5 },
        { value: 'param', label: '参数', sortOrder: 6 },
      ],
    },
  ],
  'en-US': [
    {
      dictId: 'sys_yes_no',
      dictName: 'Yes/No',
      category: 'system',
      items: [
        { value: '1', label: 'Yes', sortOrder: 1 },
        { value: '0', label: 'No', sortOrder: 2 },
      ],
    },
    {
      dictId: 'sys_normal_disable',
      dictName: 'System Status',
      category: 'system',
      items: [
        { value: '0', label: 'Normal', sortOrder: 1 },
        { value: '1', label: 'Disabled', sortOrder: 2 },
      ],
    },
    {
      dictId: 'sys_show_hide',
      dictName: 'Display Status',
      category: 'system',
      items: [
        { value: '0', label: 'Show', sortOrder: 1 },
        { value: '1', label: 'Hide', sortOrder: 2 },
      ],
    },
    {
      dictId: 'sys_job_status',
      dictName: 'Job Status',
      category: 'system',
      items: [
        { value: '0', label: 'Success', sortOrder: 1 },
        { value: '1', label: 'Failed', sortOrder: 2 },
      ],
    },
    {
      dictId: 'biz_device_status',
      dictName: 'Device Status',
      category: 'business',
      items: [
        { value: '0', label: 'Online', sortOrder: 1 },
        { value: '1', label: 'Offline', sortOrder: 2 },
        { value: '2', label: 'Fault', sortOrder: 3 },
        { value: '3', label: 'Maintenance', sortOrder: 4 },
      ],
    },
    {
      dictId: 'biz_alarm_level',
      dictName: 'Alarm Level',
      category: 'business',
      items: [
        { value: '1', label: 'Critical', sortOrder: 1 },
        { value: '2', label: 'Major', sortOrder: 2 },
        { value: '3', label: 'Minor', sortOrder: 3 },
        { value: '4', label: 'Info', sortOrder: 4 },
      ],
    },
    {
      dictId: 'variableCategory',
      dictName: 'Variable Category',
      category: 'business',
      items: [
        { value: 'AI', label: 'AI (Analog Input)', sortOrder: 1 },
        { value: 'AO', label: 'AO (Analog Output)', sortOrder: 2 },
        { value: 'DI', label: 'DI (Digital Input)', sortOrder: 3 },
        { value: 'DO', label: 'DO (Digital Output)', sortOrder: 4 },
        { value: 'control', label: 'Control Variable', sortOrder: 5 },
        { value: 'param', label: 'Parameter', sortOrder: 6 },
      ],
    },
  ],
};

@Injectable()
export class DictionaryLoaderService implements OnModuleInit {
  private readonly logger = new Logger(DictionaryLoaderService.name);

  /** 内存缓存：locale -> dictId -> DictTable */
  private cache: Map<string, Map<string, DictTable>> = new Map();

  /** 字典文件目录 */
  private readonly dictsBaseDir: string;

  constructor(private readonly pathResolver: PathResolverService) {
    this.dictsBaseDir = this.resolveDictsDir();
  }

  /**
   * 解析字典文件目录为绝对路径
   *
   * 优先级：
   * 1. DICTS_DIR 环境变量（与 ss-system 的 dictionary-loader.service.ts 保持一致）
   * 2. RUN_DIR 环境变量 + ss/data/dicts（env 文件中定义的是 RUN_DIR）
   * 3. SS_RUN_DIR 环境变量 + ss/data/dicts（向后兼容，旧变量名）
   * 4. fallback：项目根 + ss-run/ss/data/dicts
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node（本文件位于 packages/ss-core/dist/dict/）
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *
   * 修复历史：之前用 process.cwd()/ss-run 作为 fallback，dev 模式下 cwd = apps/ss-node-server，
   * 解析为 apps/ss-node-server/ss-run/ss/data/dicts（不存在），导致字典加载失败。
   * 之前用 SS_RUN_DIR，但 env 文件中定义的是 RUN_DIR，导致总是 fallback。
   */
  private resolveDictsDir(): string {
    // 1. DICTS_DIR 环境变量（推荐方式，与 ss-system 一致）
    const dictsDir = process.env.DICTS_DIR;
    if (dictsDir) {
      return this.resolvePath(dictsDir);
    }
    // 2. RUN_DIR 环境变量 + ss/data/dicts（env 文件中定义的是 RUN_DIR）
    const runDir = process.env.RUN_DIR;
    if (runDir) {
      return path.resolve(this.resolvePath(runDir), 'ss', 'data', 'dicts');
    }
    // 3. SS_RUN_DIR 环境变量 + ss/data/dicts（向后兼容，旧变量名）
    const ssRunDir = process.env.SS_RUN_DIR;
    if (ssRunDir) {
      return path.resolve(this.resolvePath(ssRunDir), 'ss', 'data', 'dicts');
    }
    // 4. fallback：项目根 + ss-run/ss/data/dicts
    return path.resolve(this.getProjectRoot(), 'ss-run', 'ss', 'data', 'dicts');
  }

  private getProjectRoot(): string {
    return this.pathResolver.getProjectRoot();
  }

  private resolvePath(p: string): string {
    return this.pathResolver.resolve(p);
  }

  onModuleInit(): void {
    this.logger.log('DictionaryLoaderService initializing...');
    this.loadDicts();
    this.logger.log('DictionaryLoaderService initialized');
  }

  /**
   * 加载所有字典数据
   * 优先从文件系统加载，失败时回退到内嵌默认字典
   */
  loadDicts(): void {
    const newCache: Map<string, Map<string, DictTable>> = new Map();

    const loaded = this.loadFromDirectory(newCache);

    if (!loaded) {
      this.logger.warn('Failed to load dicts from file system, using embedded defaults');
      this.loadEmbeddedDicts(newCache);
    }

    this.cache = newCache;

    const localeCount = this.cache.size;
    let totalDicts = 0;
    this.cache.forEach((dictMap) => {
      totalDicts += dictMap.size;
    });

    this.logger.log(`Loaded ${totalDicts} dicts across ${localeCount} locales`);
  }

  /**
   * 从文件系统目录加载字典 JSON 文件
   */
  private loadFromDirectory(cache: Map<string, Map<string, DictTable>>): boolean {
    try {
      if (!fs.existsSync(this.dictsBaseDir)) {
        this.logger.warn(`Dicts directory not found: ${this.dictsBaseDir}`);
        return false;
      }

      const localeDirs = fs.readdirSync(this.dictsBaseDir, {
        withFileTypes: true,
      });

      let loadedAny = false;

      for (const localeDir of localeDirs) {
        if (!localeDir.isDirectory()) continue;

        const locale = localeDir.name;
        const localePath = path.join(this.dictsBaseDir, locale);

        const files = fs.readdirSync(localePath);
        const jsonFiles = files.filter((f) => f.endsWith('.json'));

        if (jsonFiles.length === 0) continue;

        const dictMap = new Map<string, DictTable>();

        for (const file of jsonFiles) {
          try {
            const filePath = path.join(localePath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const dictTable: DictTable = JSON.parse(content);

            if (dictTable.dictId && dictTable.items) {
              dictMap.set(dictTable.dictId, dictTable);
            } else {
              this.logger.warn(`Skipping invalid dict file: ${filePath}`);
            }
          } catch (err) {
            this.logger.error(
              `Failed to parse dict file: ${path.join(localePath, file)} - ${(err as Error).message}`,
            );
          }
        }

        if (dictMap.size > 0) {
          cache.set(locale, dictMap);
          loadedAny = true;
        }
      }

      return loadedAny;
    } catch (err) {
      this.logger.error(`Error scanning dicts directory: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * 加载内嵌默认字典
   */
  private loadEmbeddedDicts(cache: Map<string, Map<string, DictTable>>): void {
    for (const [locale, tables] of Object.entries(EMBEDDED_DICTS)) {
      const dictMap = new Map<string, DictTable>();
      for (const table of tables) {
        dictMap.set(table.dictId, table);
      }
      cache.set(locale, dictMap);
    }
  }

  /**
   * 获取指定 locale 对应的字典 Map，自动回退到 zh-CN
   */
  private resolveLocaleMap(locale?: string): Map<string, DictTable> {
    const targetLocale = locale || DEFAULT_LOCALE;

    const directMap = this.cache.get(targetLocale);
    if (directMap) return directMap;

    // 回退到 zh-CN
    if (targetLocale !== DEFAULT_LOCALE) {
      const fallback = this.cache.get(DEFAULT_LOCALE);
      if (fallback) return fallback;
    }

    return new Map();
  }

  /**
   * 获取单个字典
   */
  getDict(dictId: string, locale?: string): DictTable | null {
    const localeMap = this.resolveLocaleMap(locale);
    return localeMap.get(dictId) || null;
  }

  /**
   * 获取所有字典
   */
  getAllDicts(locale?: string): DictTable[] {
    const localeMap = this.resolveLocaleMap(locale);
    return Array.from(localeMap.values());
  }

  /**
   * 获取分类树结构
   */
  getCategories(locale?: string): DictCategory[] {
    const localeMap = this.resolveLocaleMap(locale);
    const categoryMap = new Map<string, DictCategory>();

    for (const dictTable of localeMap.values()) {
      const cat = dictTable.category || 'default';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, {
          category: cat,
          name: cat,
          tables: [],
        });
      }
      categoryMap.get(cat)!.tables.push(dictTable);
    }

    return Array.from(categoryMap.values());
  }

  /**
   * 热重载所有字典
   */
  reloadDicts(): void {
    this.logger.log('Reloading dicts...');
    this.loadDicts();
    this.logger.log('Dicts reloaded successfully');
  }

  /**
   * Add a new dictionary table
   */
  addDict(dictTable: DictTable, locale?: string): boolean {
    const targetLocale = locale || 'zh-CN';
    let localeMap = this.cache.get(targetLocale);
    if (!localeMap) {
      localeMap = new Map();
      this.cache.set(targetLocale, localeMap);
    }
    if (localeMap.has(dictTable.dictId)) {
      return false; // already exists
    }
    localeMap.set(dictTable.dictId, dictTable);
    this.persistDict(targetLocale, dictTable);
    return true;
  }

  /**
   * Update an existing dictionary table
   */
  updateDict(dictId: string, updates: Partial<DictTable>, locale?: string): boolean {
    const targetLocale = locale || 'zh-CN';
    const localeMap = this.cache.get(targetLocale);
    if (!localeMap) return false;
    const existing = localeMap.get(dictId);
    if (!existing) return false;
    const updated = { ...existing, ...updates, dictId: existing.dictId };
    localeMap.set(dictId, updated);
    this.persistDict(targetLocale, updated);
    return true;
  }

  /**
   * Delete a dictionary table
   */
  deleteDict(dictId: string, locale?: string): boolean {
    const targetLocale = locale || 'zh-CN';
    const localeMap = this.cache.get(targetLocale);
    if (!localeMap) return false;
    const deleted = localeMap.delete(dictId);
    if (deleted) {
      this.deletePersistedDict(targetLocale, dictId);
    }
    return deleted;
  }

  /**
   * Add a dict item to an existing dictionary
   */
  addDictItem(
    dictId: string,
    item: { value: string; label: string; sortOrder?: number },
    locale?: string,
  ): boolean {
    const targetLocale = locale || 'zh-CN';
    const dict = this.getDict(dictId, targetLocale);
    if (!dict) return false;
    const newItem = { ...item, sortOrder: item.sortOrder ?? dict.items.length + 1 };
    dict.items.push(newItem);
    this.persistDict(targetLocale, dict);
    return true;
  }

  /**
   * Update a dict item
   */
  updateDictItem(
    dictId: string,
    itemValue: string,
    updates: Partial<{ label: string; sortOrder: number }>,
    locale?: string,
  ): boolean {
    const targetLocale = locale || 'zh-CN';
    const dict = this.getDict(dictId, targetLocale);
    if (!dict) return false;
    const item = dict.items.find((i) => i.value === itemValue);
    if (!item) return false;
    Object.assign(item, updates);
    this.persistDict(targetLocale, dict);
    return true;
  }

  /**
   * Delete a dict item
   */
  deleteDictItem(dictId: string, itemValue: string, locale?: string): boolean {
    const targetLocale = locale || 'zh-CN';
    const dict = this.getDict(dictId, targetLocale);
    if (!dict) return false;
    const idx = dict.items.findIndex((i) => i.value === itemValue);
    if (idx === -1) return false;
    dict.items.splice(idx, 1);
    this.persistDict(targetLocale, dict);
    return true;
  }

  /**
   * Persist dictionary to file system
   */
  private persistDict(locale: string, dictTable: DictTable): void {
    try {
      const localeDir = path.join(this.dictsBaseDir, locale);
      if (!fs.existsSync(localeDir)) {
        fs.mkdirSync(localeDir, { recursive: true });
      }
      const filePath = path.join(localeDir, `${dictTable.dictId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(dictTable, null, 2), 'utf-8');
      this.logger.log(`Persisted dict: ${dictTable.dictId} (${locale})`);
    } catch (err) {
      this.logger.error(`Failed to persist dict ${dictTable.dictId}: ${(err as Error).message}`);
    }
  }

  /**
   * Delete persisted dictionary file
   */
  private deletePersistedDict(locale: string, dictId: string): void {
    try {
      const filePath = path.join(this.dictsBaseDir, locale, `${dictId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted dict file: ${dictId} (${locale})`);
      }
    } catch (err) {
      this.logger.error(`Failed to delete dict file ${dictId}: ${(err as Error).message}`);
    }
  }
}
