// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 知识库 Composable
 *
 * 提供知识库的加载、缓存、查询、刷新等能力。
 * 作为 Vue 组合式函数，可在组件中复用。
 */

import { ref, computed, readonly, type DeepReadonly } from 'vue';
import {
  fetchKnowledgeBase,
  fetchVersions,
  validateVersion,
  loadFromCache,
  saveToCache,
  clearCache,
} from '../utils/knowledgeBaseLoader';
import type {
  KnowledgeBaseJson,
  KbMeta,
  KbExampleCategory,
  GraphicSchema,
  VersionCheckResult,
  VersionsJson,
} from '../utils/knowledgeBaseLoader';
import type { ApiMethodDef } from '../rules/script-api-registry';
import type { ScriptExample } from '../rules/types';
import { API_REGISTRY } from '../rules/script-api-registry';

// ═══════════════════════════════════════════════════════════════
// 全局状态（单例）
// ═══════════════════════════════════════════════════════════════

/** 知识库数据 */
const kbData = ref<KnowledgeBaseJson | null>(null);
/** 加载状态 */
const isLoading = ref(false);
/** 加载错误 */
const loadError = ref<string | null>(null);
/** 版本检查结果 */
const versionCheck = ref<VersionCheckResult | null>(null);
/** 是否从缓存加载 */
const fromCache = ref(false);
/** 是否从 fallback 加载 */
const fromFallback = ref(false);
/** 版本清单 */
const versionsInfo = ref<VersionsJson | null>(null);

// ═══════════════════════════════════════════════════════════════
// 计算属性
// ═══════════════════════════════════════════════════════════════

/** 是否已加载 */
const isLoaded = computed(() => kbData.value !== null);

/** 元信息 */
const meta = computed<KbMeta | null>(() => kbData.value?.meta ?? null);

/** API 注册表 */
const apiRegistry = computed<ApiMethodDef[]>(() => {
  if (kbData.value?.apiRegistry) {
    return kbData.value.apiRegistry;
  }
  // fallback：使用内置注册表
  return API_REGISTRY;
});

/** 示例分类 */
const examples = computed<KbExampleCategory[]>(() => kbData.value?.examples ?? []);

/** 所有示例（扁平化） */
const allExamples = computed<ScriptExample[]>(() => {
  const result: ScriptExample[] = [];
  for (const category of examples.value) {
    result.push(...category.items);
  }
  return result;
});

/** API 按分类分组 */
const apiByCategory = computed(() => {
  const groups: Record<string, ApiMethodDef[]> = {};
  for (const api of apiRegistry.value) {
    const label = getCategoryLabel(api.category);
    if (!groups[label]) groups[label] = [];
    groups[label].push(api);
  }
  return groups;
});

/** 图元 Schema */
const graphicSchemas = computed(() => kbData.value?.graphicSchemas ?? []);

/** 知识库版本 */
const kbVersion = computed(() => meta.value?.version ?? 'unknown');

// ═══════════════════════════════════════════════════════════════
// 核心方法
// ═══════════════════════════════════════════════════════════════

/**
 * 加载知识库
 * @param forceRefresh 是否强制刷新（忽略缓存）
 * @param url 自定义 URL（可选）
 */
async function loadKb(forceRefresh = false, url?: string): Promise<boolean> {
  // 如果已加载且不强制刷新，直接返回
  if (isLoaded.value && !forceRefresh) {
    return true;
  }

  isLoading.value = true;
  loadError.value = null;
  fromCache.value = false;
  fromFallback.value = false;

  try {
    // 步骤 1：尝试从缓存加载（如果不强制刷新）
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        kbData.value = cached;
        fromCache.value = true;
        versionCheck.value = validateVersion(cached.meta);
        isLoading.value = false;
        return true;
      }
    }

    // 步骤 2：从远程加载
    const result = await fetchKnowledgeBase(url);

    if (result.success && result.data) {
      kbData.value = result.data;
      fromCache.value = false;

      // 保存到缓存
      saveToCache(result.data);

      // 版本检查
      versionCheck.value = validateVersion(result.data.meta);

      isLoading.value = false;
      return true;
    }

    // 步骤 3：远程加载失败，尝试 fallback（内置数据）
    console.warn('[KnowledgeBase] Remote load failed:', result.error);

    // 使用内置注册表构建最小知识库
    const fallbackData = buildFallbackKb();
    kbData.value = fallbackData;
    fromFallback.value = true;
    versionCheck.value = validateVersion(fallbackData.meta);

    isLoading.value = false;
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    loadError.value = message;
    console.error('[KnowledgeBase] Load error:', message);
    isLoading.value = false;
    return false;
  }
}

/**
 * 刷新知识库（清除缓存并重新加载）
 */
async function refreshKb(): Promise<boolean> {
  clearCache();
  kbData.value = null;
  versionCheck.value = null;
  return loadKb(true);
}

/**
 * 获取指定名称的 API
 */
function getApiByName(name: string): ApiMethodDef | undefined {
  return apiRegistry.value.find((api) => api.name === name);
}

/**
 * 按分类获取 API 列表
 */
function getApiByCategory(category: string): ApiMethodDef[] {
  return apiRegistry.value.filter((api) => api.category === category);
}

/**
 * 搜索 API
 */
function searchApi(keyword: string): ApiMethodDef[] {
  const lower = keyword.toLowerCase();
  return apiRegistry.value.filter(
    (api) =>
      api.name.toLowerCase().includes(lower) ||
      api.summary.toLowerCase().includes(lower) ||
      api.description.toLowerCase().includes(lower)
  );
}

/**
 * 搜索示例
 */
function searchExamples(keyword: string): ScriptExample[] {
  const lower = keyword.toLowerCase();
  return allExamples.value.filter(
    (ex) =>
      ex.title.toLowerCase().includes(lower) ||
      ex.description.toLowerCase().includes(lower) ||
      ex.code.toLowerCase().includes(lower) ||
      ex.tags.some((tag) => tag.toLowerCase().includes(lower))
  );
}

/**
 * 按分类获取示例
 */
function getExamplesByCategory(category: string): ScriptExample[] {
  const cat = examples.value.find((c) => c.category === category);
  return cat?.items ?? [];
}

/**
 * 获取版本清单
 */
async function loadVersions(): Promise<void> {
  versionsInfo.value = await fetchVersions();
}

/**
 * 根据图元插件类型获取其属性 Schema
 */
function getGraphicSchema(pluginType: string): GraphicSchema | undefined {
  return graphicSchemas.value.find((s) => s.pluginType === pluginType);
}

/**
 * 搜索图元类型
 */
function searchGraphicSchema(keyword: string): GraphicSchema[] {
  const lower = keyword.toLowerCase();
  return graphicSchemas.value.filter(
    (s) =>
      s.pluginType.toLowerCase().includes(lower) ||
      s.displayName.toLowerCase().includes(lower) ||
      s.category.toLowerCase().includes(lower)
  );
}

/**
 * 获取所有图元类型列表
 */
function getAllGraphicTypes(): { pluginType: string; displayName: string; category: string }[] {
  return graphicSchemas.value.map((s) => ({
    pluginType: s.pluginType,
    displayName: s.displayName,
    category: s.category,
  }));
}

// ═══════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════

/** 获取分类中文标签 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    data: '数据读写',
    graphic: '图元操作',
    alarm: '告警操作',
    page: '页面操作',
    network: '网络请求',
    timer: '定时器',
    utility: '工具函数',
  };
  return labels[category] || category;
}

/** 构建 fallback 知识库（使用内置数据） */
function buildFallbackKb(): KnowledgeBaseJson {
  return {
    meta: {
      version: 'builtin',
      appVersion: '*',
      updatedAt: new Date().toISOString(),
      apiCount: API_REGISTRY.length,
      apiNames: API_REGISTRY.map((a) => a.name),
    },
    apiRegistry: API_REGISTRY,
    examples: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// Composable 导出
// ═══════════════════════════════════════════════════════════════

export function useKnowledgeBase() {
  return {
    // 状态
    kbData: readonly(kbData) as DeepReadonly<typeof kbData>,
    isLoading: readonly(isLoading),
    loadError: readonly(loadError),
    versionCheck: readonly(versionCheck),
    fromCache: readonly(fromCache),
    fromFallback: readonly(fromFallback),
    versionsInfo: readonly(versionsInfo),

    // 计算属性
    isLoaded,
    meta,
    apiRegistry,
    examples,
    allExamples,
    graphicSchemas,
    apiByCategory,
    kbVersion,

    // 方法
    loadKb,
    refreshKb,
    getApiByName,
    getApiByCategory,
    searchApi,
    searchExamples,
    getExamplesByCategory,
    loadVersions,
    getGraphicSchema,
    searchGraphicSchema,
    getAllGraphicTypes,
    clearCache,
  };
}

export type UseKnowledgeBaseReturn = ReturnType<typeof useKnowledgeBase>;
