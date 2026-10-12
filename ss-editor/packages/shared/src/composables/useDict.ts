// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref } from 'vue';

/**
 * 字典条目
 */
export interface DictItem {
  value: string;
  label: string;
  sortOrder: number;
  description: string;
}

/**
 * 字典表
 */
export interface DictTable {
  dictId: string;
  dictName: string;
  category: string;
  description: string;
  version: string;
  sortOrder: number;
  items: DictItem[];
}

/**
 * 下拉选项
 */
export interface DictOption {
  label: string;
  value: string;
}

// ===== 模块级缓存（跨组件共享，避免重复请求） =====

/** dictId → 字典条目列表 */
const dictCache = new Map<string, DictItem[]>();

/** dictId → 正在进行中的加载 Promise（防止并发重复请求） */
const loadingPromises = new Map<string, Promise<DictItem[]>>();

const API_BASE = '/api/v1';
const TOKEN_KEY = 'scada_access_token';

/**
 * 从后端加载字典表数据
 * 已缓存时直接返回，正在加载时复用同一 Promise
 */
function fetchDict(dictId: string): Promise<DictItem[]> {
  if (dictCache.has(dictId)) {
    return Promise.resolve(dictCache.get(dictId)!);
  }
  if (loadingPromises.has(dictId)) {
    return loadingPromises.get(dictId)!;
  }

  const promise = (async (): Promise<DictItem[]> => {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/dicts/${encodeURIComponent(dictId)}`, {
      headers,
    });
    if (!response.ok) {
      throw new Error(`加载字典 "${dictId}" 失败: ${response.status}`);
    }

    const json = await response.json();
    const table: DictTable | null = json?.data ?? null;
    if (!table) {
      throw new Error(`字典 "${dictId}" 不存在`);
    }

    const items = table.items ?? [];
    dictCache.set(dictId, items);
    return items;
  })();

  loadingPromises.set(dictId, promise);
  promise.finally(() => {
    loadingPromises.delete(dictId);
  });
  return promise;
}

/**
 * useDict — 响应式字典查询 Composable
 *
 * 封装字典数据的懒加载、缓存、标签解析、选项生成。
 * 使用模块级 Map 缓存，多个组件共享同一份字典数据，避免重复请求。
 *
 * @example
 * ```ts
 * const { loadDict, getDictLabel, getDictOptions } = useDict();
 * await loadDict('priority');
 * const label = await getDictLabel('priority', 'high'); // "高优先级"
 * const opts = await getDictOptions('priority');        // [{ label, value }, ...]
 * ```
 */
export function useDict() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 加载字典表数据（带缓存）
   * @param dictId 字典标识
   * @returns 字典条目列表
   */
  async function loadDict(dictId: string): Promise<DictItem[]> {
    loading.value = true;
    error.value = null;
    try {
      return await fetchDict(dictId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载字典失败';
      error.value = msg;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取单个值对应的标签文本
   * @param dictId 字典标识
   * @param value 字典条目 value
   * @returns 对应的 label，未匹配时返回 value 本身
   */
  async function getDictLabel(dictId: string, value: string): Promise<string> {
    const items = await fetchDict(dictId);
    const item = items.find((it) => it.value === value);
    return item?.label ?? value;
  }

  /**
   * 获取下拉选项列表（按 sortOrder 升序排列）
   * @param dictId 字典标识
   * @returns 选项数组 [{ label, value }]
   */
  async function getDictOptions(dictId: string): Promise<DictOption[]> {
    const items = await fetchDict(dictId);
    return [...items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({ label: item.label, value: item.value }));
  }

  /**
   * 清空指定字典缓存（不传则清空全部）
   */
  function clearCache(dictId?: string): void {
    if (dictId) {
      dictCache.delete(dictId);
    } else {
      dictCache.clear();
    }
  }

  return {
    /** 是否正在加载 */
    loading,
    /** 错误信息 */
    error,
    /** 加载字典表数据（带缓存） */
    loadDict,
    /** 获取单个标签文本 */
    getDictLabel,
    /** 获取下拉选项列表 */
    getDictOptions,
    /** 清空缓存 */
    clearCache,
  };
}
