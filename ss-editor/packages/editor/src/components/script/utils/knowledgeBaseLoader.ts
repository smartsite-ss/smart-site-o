// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 知识库加载工具函数
 *
 * 提供 fetch、解析、验证、版本检查等底层能力。
 */

import { getKnowledgeBaseUrl, getVersionsUrl, getAppVersion, knowledgeBaseConfig } from '../../../config/knowledgeBase.config';
import type { ApiMethodDef } from '../rules/script-api-registry';
import type { ScriptExample } from '../rules/types';

// ═══════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════

/** 知识库元信息 */
export interface KbMeta {
  version: string;
  appVersion: string;
  updatedAt: string;
  apiCount: number;
  apiNames: string[];
}

/** 知识库示例分类 */
export interface KbExampleCategory {
  category: string;
  label: string;
  icon: string;
  items: ScriptExample[];
}

/** 图元属性字段定义 */
export interface GraphicFieldDef {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'color' | 'select' | 'textarea';
  label: string;
  description?: string;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  group?: string;
}

/** 图元属性模式 */
export interface GraphicSchema {
  pluginType: string;
  displayName: string;
  category: string;
  fields: GraphicFieldDef[];
  schemaVersion?: string;
}

/** 知识库完整数据结构 */
export interface KnowledgeBaseJson {
  meta: KbMeta;
  apiRegistry: ApiMethodDef[];
  examples?: KbExampleCategory[];
  /** 图元属性模式（各图元类型支持的 customProps 定义） */
  graphicSchemas?: GraphicSchema[];
  quickStart?: {
    steps: { step: number; action: string; description: string }[];
    minimalExample: { title: string; code: string; expected: string };
  };
  triggerModes?: { mode: string; description: string; scenario: string }[];
  errorScenarios?: { api: string; error: string; symptom: string; suggestion: string }[];
  bestPractices?: { title: string; content: string }[];
}

/** 版本清单项 */
export interface VersionInfo {
  version: string;
  path: string;
  updatedAt: string;
  appVersionRange: string;
  changes: string[];
}

/** 版本清单 */
export interface VersionsJson {
  latest: string;
  versions: VersionInfo[];
}

/** 加载结果 */
export interface LoadResult {
  success: boolean;
  data?: KnowledgeBaseJson;
  error?: string;
  fromCache?: boolean;
  fromFallback?: boolean;
}

/** 版本检查结果 */
export interface VersionCheckResult {
  compatible: boolean;
  kbVersion: string;
  appVersion: string;
  requiredAppVersion: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// 加载函数
// ═══════════════════════════════════════════════════════════════

/**
 * 从指定 URL 获取知识库数据
 */
export async function fetchKnowledgeBase(url?: string): Promise<LoadResult> {
  const targetUrl = url || getKnowledgeBaseUrl();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), knowledgeBaseConfig.timeout);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as KnowledgeBaseJson;

    // 基础结构验证
    if (!data.meta || !data.apiRegistry || !Array.isArray(data.apiRegistry)) {
      return {
        success: false,
        error: 'Invalid knowledge base format: missing meta or apiRegistry',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to fetch knowledge base: ${errorMessage}`,
    };
  }
}

/**
 * 获取版本清单
 */
export async function fetchVersions(): Promise<VersionsJson | null> {
  try {
    const response = await fetch(getVersionsUrl(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return null;

    return await response.json() as VersionsJson;
  } catch {
    return null;
  }
}

/**
 * 解析知识库数据（基础验证）
 */
export function parseKnowledgeBase(data: unknown): KnowledgeBaseJson | null {
  if (!data || typeof data !== 'object') return null;

  const kb = data as Partial<KnowledgeBaseJson>;

  if (!kb.meta || !kb.apiRegistry || !Array.isArray(kb.apiRegistry)) {
    return null;
  }

  return kb as KnowledgeBaseJson;
}

// ═══════════════════════════════════════════════════════════════
// 版本验证
// ═══════════════════════════════════════════════════════════════

/**
 * 检查版本兼容性
 * 支持语义化版本范围：>=1.5.0, ^1.5.0, ~1.5.0, 1.5.0
 */
export function validateVersion(kbMeta: KbMeta, appVersion: string = getAppVersion()): VersionCheckResult {
  const requiredVersion = kbMeta.appVersion || '*';

  // 通配符，兼容所有版本
  if (requiredVersion === '*') {
    return {
      compatible: true,
      kbVersion: kbMeta.version,
      appVersion,
      requiredAppVersion: requiredVersion,
      message: 'Compatible (no version restriction)',
    };
  }

  const isCompatible = checkVersionRange(appVersion, requiredVersion);

  return {
    compatible: isCompatible,
    kbVersion: kbMeta.version,
    appVersion,
    requiredAppVersion: requiredVersion,
    message: isCompatible
      ? `Compatible: app ${appVersion} satisfies ${requiredVersion}`
      : `Incompatible: app ${appVersion} does not satisfy ${requiredVersion}`,
  };
}

/**
 * 检查版本是否满足范围要求
 */
function checkVersionRange(version: string, range: string): boolean {
  // 简单实现，支持 >=, >, <=, <, = 前缀
  const cleanVersion = version.replace(/^v/, '');
  const cleanRange = range.replace(/^v/, '');

  if (cleanRange.startsWith('>=')) {
    return compareVersion(cleanVersion, cleanRange.slice(2)) >= 0;
  }
  if (cleanRange.startsWith('>')) {
    return compareVersion(cleanVersion, cleanRange.slice(1)) > 0;
  }
  if (cleanRange.startsWith('<=')) {
    return compareVersion(cleanVersion, cleanRange.slice(2)) <= 0;
  }
  if (cleanRange.startsWith('<')) {
    return compareVersion(cleanVersion, cleanRange.slice(1)) < 0;
  }
  if (cleanRange.startsWith('=')) {
    return compareVersion(cleanVersion, cleanRange.slice(1)) === 0;
  }

  // 默认精确匹配
  return compareVersion(cleanVersion, cleanRange) === 0;
}

/**
 * 比较两个版本号
 * @returns -1: v1 < v2, 0: v1 === v2, 1: v1 > v2
 */
function compareVersion(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;

    if (a < b) return -1;
    if (a > b) return 1;
  }

  return 0;
}

// ═══════════════════════════════════════════════════════════════
// 本地缓存
// ═══════════════════════════════════════════════════════════════

/** 缓存数据结构 */
interface CacheEntry {
  data: KnowledgeBaseJson;
  timestamp: number;
}

/**
 * 从 localStorage 读取缓存
 */
export function loadFromCache(): KnowledgeBaseJson | null {
  if (!knowledgeBaseConfig.enableCache) return null;

  try {
    const raw = localStorage.getItem(knowledgeBaseConfig.localStorageKey);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry;
    const now = Date.now();

    // 检查缓存是否过期
    if (now - entry.timestamp > knowledgeBaseConfig.cacheTtl) {
      localStorage.removeItem(knowledgeBaseConfig.localStorageKey);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * 保存到 localStorage 缓存
 */
export function saveToCache(data: KnowledgeBaseJson): void {
  if (!knowledgeBaseConfig.enableCache) return;

  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(knowledgeBaseConfig.localStorageKey, JSON.stringify(entry));
  } catch {
    // 忽略 localStorage 写入错误（如存储空间不足）
  }
}

/**
 * 清除本地缓存
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(knowledgeBaseConfig.localStorageKey);
  } catch {
    // 忽略错误
  }
}
