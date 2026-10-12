// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, reactive, onUnmounted } from 'vue';
import { dictApi, type DictTable } from '../api/modules/dict.api';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * useDict — 响应式字典查询 Composable
 *
 * 封装字典数据的懒加载、缓存、标签解析、选项生成等通用逻辑。
 * 组件销毁时自动中止未完成的请求。
 *
 * @example
 * ```ts
 * const { loadDict, getLabel, getOptions } = useDict();
 * await loadDict('priority');
 * const label = getLabel('priority', 'high'); // "高优先级"
 * const opts = getOptions('tagDataType');     // [{ value, label }, ...]
 * ```
 */
export function useDict() {
  const dicts = reactive<Record<string, DictTable>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);
  const loadingDicts = new Set<string>();
  let aborted = false;

  /** 清理标志，组件卸载时中止后续操作 */
  onUnmounted(() => {
    aborted = true;
  });

  /**
   * 加载单个字典表（缓存存在时不重复请求）
   * @param dictId 字典标识
   * @param locale 语言环境，默认从当前 i18n 获取或 'zh-CN'
   */
  async function loadDict(dictId: string, locale?: string): Promise<DictTable> {
    if (dicts[dictId]) return dicts[dictId];
    if (loadingDicts.has(dictId)) {
      // 正在加载中，等待轮询完成
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (aborted) {
            clearInterval(check);
            reject(new Error('组件已卸载'));
          }
          if (dicts[dictId]) {
            clearInterval(check);
            resolve(dicts[dictId]);
          }
        }, 50);
      });
    }

    loadingDicts.add(dictId);
    loading.value = true;
    error.value = null;

    try {
      const res = await dictApi.getDict(dictId, locale);
      if (aborted) throw new Error('组件已卸载');
      if (res.data) {
        dicts[dictId] = res.data;
        return res.data;
      }
      throw new Error(`字典 "${dictId}" 不存在`);
    } catch (e: any) {
      error.value = e?.message || '加载字典失败';
      throw e;
    } finally {
      loadingDicts.delete(dictId);
      if (loadingDicts.size === 0) {
        loading.value = false;
      }
    }
  }

  /**
   * 批量加载多个字典表
   */
  async function loadDicts(dictIds: string[], locale?: string): Promise<void> {
    await Promise.all(dictIds.map((id) => loadDict(id, locale)));
  }

  /**
   * 从缓存获取字典表
   */
  function getDict(dictId: string): DictTable | undefined {
    return dicts[dictId];
  }

  /**
   * 根据 value 获取对应 label
   * @param dictId 字典标识
   * @param value 字典条目 value
   * @param fallback 未匹配时显示的兜底文字，默认显示 value 本身
   */
  function getLabel(dictId: string, value: string, fallback?: string): string {
    const dict = dicts[dictId];
    if (!dict) return fallback ?? value;
    const item = dict.items.find((it) => it.value === value);
    return item?.label ?? fallback ?? value;
  }

  /**
   * 获取下拉选项列表（按 sortOrder 排序）
   */
  function getOptions(dictId: string): SelectOption[] {
    const dict = dicts[dictId];
    if (!dict) return [];
    return [...dict.items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({ value: item.value, label: item.label }));
  }

  /**
   * 重新加载所有已加载的字典
   * @param locale 语言环境，不传则使用上次加载时的 locale
   */
  async function reloadAll(locale?: string): Promise<void> {
    const ids = Object.keys(dicts);
    clearCache();
    await loadDicts(ids, locale);
  }

  /**
   * 清空缓存
   */
  function clearCache(): void {
    Object.keys(dicts).forEach((key) => delete dicts[key]);
  }

  return {
    /** 已加载的字典表缓存，key 为 dictId */
    dicts,
    /** 是否正在加载 */
    loading,
    /** 错误信息 */
    error,
    /** 加载单个字典表 */
    loadDict,
    /** 批量加载多个字典表 */
    loadDicts,
    /** 从缓存获取字典表 */
    getDict,
    /** 根据 value 获取 label */
    getLabel,
    /** 获取下拉选项列表 */
    getOptions,
    /** 重新加载所有已加载字典 */
    reloadAll,
    /** 清空缓存 */
    clearCache,
  };
}