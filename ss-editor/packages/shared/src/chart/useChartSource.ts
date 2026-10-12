// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { createChartDataSource } from './data-source/factory';
import { createEmptyResult } from './data-source/static';
import type {
  ChartDataResult,
  ChartDataSource,
  ChartDataSourceConfig,
  DatabaseDataSource,
  DatabaseDataSourceDeps,
} from './data-source';

/** 组合式函数可用的完整依赖（在 DatabaseDataSourceDeps 基础上扩展实时刷新所需字段） */
export interface ChartSourceDeps extends DatabaseDataSourceDeps {
  wsStore: DatabaseDataSourceDeps['wsStore'] & {
    /** WS 批量刷新版本号（变化时触发 latest 模式实时刷新） */
    tagFlushVersion?: number;
    /** 连接状态（供断线补偿，可省略） */
    isConnected?: boolean;
  };
}

/**
 * 图表数据源组合式函数：统一管理「创建 → 订阅 → 加载 → 实时刷新 → 卸载清理」生命周期。
 * - static / api：挂载时 load，api 轮询通过 onChange 推送；
 * - database(latest)：额外监听 wsStore.tagFlushVersion，变化时调用 readLatest 刷新；
 * - 配置（数据源类型 / 模式 / 绑定变量）变化时自动重建数据源并重新加载。
 */
export function useChartSource(
  getConfig: () => ChartDataSourceConfig,
  deps?: ChartSourceDeps,
) {
  const result = ref<ChartDataResult>(createEmptyResult());
  const source = shallowRef<ChartDataSource | null>(null);

  async function reload() {
    const current = source.value;
    if (!current) return;
    result.value = await current.load();
  }

  /** 创建 / 重建数据源：退订旧源、创建新源、订阅并加载基线 */
  async function resetSource() {
    source.value?.unsubscribe();
    let next: ChartDataSource;
    try {
      next = createChartDataSource(getConfig(), deps);
    } catch (error) {
      source.value = null;
      result.value = {
        dimensions: [],
        source: [],
        state: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
      return;
    }

    source.value = next;
    next.onChange((value) => {
      result.value = value;
    });
    next.subscribe();
    await reload();
  }

  onMounted(() => {
    void resetSource();
  });

  // 数据源配置 / 绑定变更（编辑态增删变量、切换类型 / 模式）时重建
  watch(getConfig, () => {
    void resetSource();
  });

  // 数据库 latest 模式：WS 批量刷新后读取实时最新值
  watch(
    () => deps?.wsStore?.tagFlushVersion,
    () => {
      const current = source.value as DatabaseDataSource | null;
      if (current && 'readLatest' in current) {
        result.value = current.readLatest();
      }
    },
  );

  // 编辑态 wsStore 可能在图元绑定后才建立连接；连接建立后补订阅。
  // DatabaseDataSource.subscribe 内部幂等，未连接时不会提前注册。
  watch(
    () => deps?.wsStore?.isConnected,
    (connected) => {
      if (connected) {
        source.value?.subscribe();
      }
    },
  );

  onUnmounted(() => {
    source.value?.unsubscribe();
    source.value = null;
  });

  return { result, reload };
}
