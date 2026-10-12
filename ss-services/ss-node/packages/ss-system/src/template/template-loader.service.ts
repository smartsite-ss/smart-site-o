// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TemplateVariable } from '../entities/device-tag-template.entity';
import { TemplateIndexService, TemplateTreeIndex } from './template-index.service';

export interface LoadedTemplate {
  id: string;
  name: string;
  description?: string;
  deviceType: string;
  deviceModel: string;
  industry: string;
  category: string;
  version: string;
  status: string;
  isDefault: boolean;
  variableCount: number;
  variables: TemplateVariable[];
  tags: string[];
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class TemplateLoaderService implements OnModuleInit {
  private readonly logger = new Logger(TemplateLoaderService.name);

  // ✨ 从单层缓存改为 locale → (id → LoadedTemplate) 两级缓存
  private readonly localeCaches = new Map<string, Map<string, LoadedTemplate>>();
  // ✨ 从单个 index 改为 locale → index
  private readonly localeIndexes = new Map<string, TemplateTreeIndex>();
  // ✨ 已识别的语言列表
  private supportedLocales: string[] = [];

  private templatesBasePath: string;

  constructor(private readonly indexService: TemplateIndexService) {
    this.templatesBasePath = this.indexService.getBasePath();
  }

  async onModuleInit(): Promise<void> {
    await this.loadAllLocales();
  }

  // ============ ✨ 多语言入口 ============

  /** 扫描 templates/ 下的一级目录，识别 BCP 47 语言代码并全部加载 */
  async loadAllLocales(): Promise<void> {
    this.supportedLocales = [];
    this.localeCaches.clear();
    this.localeIndexes.clear();

    // 扫描根目录，识别 BCP 47 格式的语言目录（如 zh-CN, en-US, ja-JP）
    if (fs.existsSync(this.templatesBasePath)) {
      const entries = fs.readdirSync(this.templatesBasePath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && /^[a-z]{2}-[A-Z]{2}$/.test(entry.name)) {
          this.supportedLocales.push(entry.name);
        }
      }
    }

    // 按语言逐个加载
    for (const locale of this.supportedLocales) {
      await this.loadLocale(locale);
    }

    this.logger.log(
      `多语言模板库加载完成: ${this.supportedLocales.length} 种语言 [${this.supportedLocales.join(', ')}]`,
    );
  }

  /** 加载指定语言的模板（所有语言均使用 templates/{locale}/ 子目录） */
  async loadLocale(locale: string): Promise<void> {
    const localePath = path.join(this.templatesBasePath, locale);

    if (!fs.existsSync(localePath)) {
      this.logger.warn(`语言目录不存在: ${localePath}，降级使用 zh-CN`);
      return;
    }

    // 加载该语言的 index.json
    const index = this.loadLocaleIndex(localePath, locale);
    this.localeIndexes.set(locale, index);

    const cache = new Map<string, LoadedTemplate>();
    if (index?.industries) {
      let loadedCount = 0;
      for (const industry of index.industries) {
        for (const category of industry.categories) {
          for (const entry of category.templates) {
            const relativePath = entry.relativePath || (entry as any).filePath || '';
            if (!relativePath) continue;

            const filePath = path.join(localePath, relativePath);
            try {
              const template = this.loadTemplateFile(filePath, entry, industry.name, category.name);
              if (template) {
                cache.set(template.id, template);
                loadedCount++;
              }
            } catch (err: any) {
              this.logger.warn(`[${locale}] 模板加载失败: ${relativePath} - ${err.message}`);
            }
          }
        }
      }
      this.logger.log(`[${locale}] 模板加载完成: ${loadedCount} 个`);
    }

    this.localeCaches.set(locale, cache);
  }

  /** 读取指定路径下的 index.json */
  private loadLocaleIndex(localePath: string, locale: string): TemplateTreeIndex {
    const indexPath = path.join(localePath, 'index.json');
    if (!fs.existsSync(indexPath)) {
      this.logger.warn(`[${locale}] index.json 不存在: ${indexPath}`);
      // 降级：使用 zh-CN 的索引
      if (locale !== 'zh-CN') {
        const zhIndex = this.localeIndexes.get('zh-CN');
        if (zhIndex) {
          this.logger.warn(`[${locale}] 降级使用 zh-CN 索引`);
          return zhIndex;
        }
      }
      // 尝试从目录结构重建
      return this.createEmptyIndex(locale);
    }
    const content = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(content) as TemplateTreeIndex;
    // 注入 locale 标识
    (index as any)._locale = locale;
    return index;
  }

  private createEmptyIndex(locale: string): TemplateTreeIndex {
    return {
      schemaVersion: '2.0',
      lastUpdated: new Date().toISOString(),
      totalTemplates: 0,
      totalIndustries: 0,
      totalCategories: 0,
      description: `Template index (${locale})`,
      rootPath: '',
      industries: [],
    } as TemplateTreeIndex;
  }

  // ============ ✨ 语言感知查询方法 ============

  /** 获取默认语言 */
  getDefaultLocale(): string {
    return 'zh-CN';
  }

  /** 获取支持的语言列表 */
  getSupportedLocales(): string[] {
    return [...this.supportedLocales];
  }

  /** 解析 locale：校验并降级 */
  resolveLocale(locale?: string): string {
    if (locale && this.supportedLocales.includes(locale)) return locale;
    return this.getDefaultLocale();
  }

  /** 获取指定语言的模板（带降级） */
  getTemplate(id: string, locale?: string): LoadedTemplate | undefined {
    const lang = this.resolveLocale(locale);
    const cache = this.localeCaches.get(lang);
    let tpl = cache?.get(id);

    // ✨ 降级：当前语言无此模板时，fallback 到 zh-CN
    if (!tpl && lang !== 'zh-CN') {
      tpl = this.localeCaches.get('zh-CN')?.get(id);
    }
    return tpl;
  }

  /** 获取指定语言的所有模板 */
  getAllTemplates(locale?: string): LoadedTemplate[] {
    const lang = this.resolveLocale(locale);
    const cache = this.localeCaches.get(lang);
    return cache ? Array.from(cache.values()) : [];
  }

  /** 获取指定语言的索引 */
  getIndex(locale?: string): TemplateTreeIndex | null {
    const lang = this.resolveLocale(locale);
    return this.localeIndexes.get(lang) ?? null;
  }

  /** 热重载：重新扫描所有语言目录 */
  async reload(): Promise<{ locales: string[]; count: number }> {
    await this.loadAllLocales();
    let total = 0;
    this.localeCaches.forEach((cache) => (total += cache.size));
    return { locales: [...this.supportedLocales], count: total };
  }

  /** 强制重新加载指定语言的索引和模板（从现有 index.json） */
  async rebuildAndReload(locale?: string): Promise<TemplateTreeIndex> {
    const lang = this.resolveLocale(locale);
    await this.loadLocale(lang);
    return this.localeIndexes.get(lang)!;
  }

  // ============ 原有查询方法（保持向后兼容，默认使用 zh-CN）============

  getTemplatesByIndustry(industry: string, locale?: string): LoadedTemplate[] {
    return this.getAllTemplates(locale).filter((t) => t.industry === industry);
  }

  getTemplatesByDeviceType(deviceType: string, locale?: string): LoadedTemplate[] {
    return this.getAllTemplates(locale).filter((t) => t.deviceType === deviceType);
  }

  getTemplatesByProtocol(protocol: string, locale?: string): LoadedTemplate[] {
    return this.getAllTemplates(locale).filter((t) => t.deviceType === protocol);
  }

  searchTemplates(keyword: string, locale?: string): LoadedTemplate[] {
    const lower = keyword.toLowerCase();
    return this.getAllTemplates(locale).filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.description?.toLowerCase().includes(lower) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lower)),
    );
  }

  getCacheStats(locale?: string): { count: number; deviceTypes: string[]; industries: string[] } {
    const templates = this.getAllTemplates(locale);
    return {
      count: templates.length,
      deviceTypes: [...new Set(templates.map((t) => t.deviceType))],
      industries: [...new Set(templates.map((t) => t.industry))],
    };
  }

  // ============ 内部文件加载（保持不变）============

  private loadTemplateFile(
    filePath: string,
    indexEntry: any,
    industry: string,
    category: string,
  ): LoadedTemplate | null {
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`模板文件不存在: ${filePath}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);

    // ★ 向前兼容：为缺失 guid 的变量自动生成并写回 JSON 文件
    let hasGeneratedGuid = false;
    const variables: TemplateVariable[] = (json.variables || []).map((v: any, index: number) => {
      let varGuid = v.guid;
      if (!varGuid) {
        varGuid = crypto.randomUUID();
        v.guid = varGuid;
        hasGeneratedGuid = true;
        this.logger.log(
          `模板变量缺少 guid，自动生成: ${v.name || `[index=${index}]`} → ${varGuid}`,
        );
      }
      return {
        guid: varGuid,
        order: v.order ?? index,
        name: v.name || '',
        description: v.description,
        address: v.address || '',
        dataType: v.dataType || 'float32',
        direction: v.direction,
        byteOrder: v.byteOrder,
        registerCount: v.registerCount,
        scanRate: v.scanRate,
        timeout: v.timeout,
        retryCount: v.retryCount,
        priority: v.priority,
        enabled: v.enabled ?? true,
        scale: v.scale,
        offset: v.offset,
        conversionType: v.conversionType,
        conversionConfig: v.conversionConfig,
        unit: v.unit,
        displayFormat: v.displayFormat,
        minValue: v.minValue,
        maxValue: v.maxValue,
        engMinValue: v.engMinValue,
        engMaxValue: v.engMaxValue,
        deadbandMode: v.deadbandMode,
        deadbandValue: v.deadbandValue,
        deadbandPercent: v.deadbandPercent,
        deadbandTime: v.deadbandTime,
        alarmEnabled: v.alarmEnabled,
        alarmHighHigh: v.alarmHighHigh,
        alarmHigh: v.alarmHigh,
        alarmLow: v.alarmLow,
        alarmLowLow: v.alarmLowLow,
        alarmDeviation: v.alarmDeviation,
        qualityCheckEnabled: v.qualityCheckEnabled,
        maxAge: v.maxAge,
        archiveEnabled: v.archiveEnabled,
        archiveInterval: v.archiveInterval,
        retentionDays: v.retentionDays,
        category: v.category,
        tags: v.tags,
      };
    });

    // ★ 写回更新后的 JSON（补全了 guid）
    if (hasGeneratedGuid) {
      // 原子写入：先写临时文件，再 rename
      const tmpPath = filePath + '.tmp-' + crypto.randomBytes(4).toString('hex');
      fs.writeFileSync(tmpPath, JSON.stringify(json, null, 2), 'utf-8');
      fs.renameSync(tmpPath, filePath);
      this.logger.log(`模板文件已补全 guid 并写回: ${filePath}`);
    }

    return {
      id: indexEntry.id,
      name: json.name || indexEntry.name,
      description: json.description || indexEntry.name,
      deviceType: indexEntry.deviceType,
      deviceModel: indexEntry.deviceModel,
      industry,
      category,
      version: indexEntry.version,
      status: indexEntry.status,
      isDefault: indexEntry.isDefault,
      variableCount: variables.length,
      variables,
      tags: indexEntry.tags,
      filePath,
      createdAt: indexEntry.createdAt,
      updatedAt: indexEntry.updatedAt,
    };
  }
}
