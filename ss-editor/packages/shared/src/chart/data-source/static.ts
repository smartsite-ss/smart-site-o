// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type {
  ChartDataSource,
  ChartDataResult,
  StaticSourceConfig,
} from './types';

/** 空结果快捷构造 */
export function createEmptyResult(): ChartDataResult {
  return { dimensions: [], source: [], state: 'empty' };
}

/**
 * 静态数据源：数据固化在组件配置内，无后端依赖。
 * load() 直接返回配置中的 dimensions + source，无订阅。
 */
export function createStaticDataSource(config: StaticSourceConfig): ChartDataSource {
  const listeners = new Set<(result: ChartDataResult) => void>();

  function buildResult(): ChartDataResult {
    const dimensions = Array.isArray(config.dimensions) ? config.dimensions : [];
    const source = Array.isArray(config.source) ? config.source : [];
    return {
      dimensions,
      source,
      state: source.length === 0 ? 'empty' : 'ready',
    };
  }

  return {
    type: 'static',
    load: () => Promise.resolve(buildResult()),
    subscribe: () => {
      /* 静态数据源无订阅 */
    },
    unsubscribe: () => {
      /* 静态数据源无资源 */
    },
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
