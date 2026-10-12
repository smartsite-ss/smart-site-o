// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type {
  ChartDataSource,
  ChartDataResult,
  DatabaseSourceConfig,
} from './types';

/** database 数据源所依赖的「取数 + 订阅」基础设施（由插件层注入，避免 shared 反向依赖 system） */
export interface DatabaseDataSourceDeps {
  dataQueryApi: {
    queryTrend: (params: {
      tagIds: string[];
      startTime: string;
      endTime: string;
      maxPoints?: number;
      projectId?: string;
      interpolation?: string;
      interval?: number;
    }) => Promise<{
      data: Array<{ tagId: string; data: Array<{ timestamp: string; value: number | null }> }>;
      pagination: { total: number };
    }>;
    getLatest: (
      tagIds: string[],
    ) => Promise<Array<{ tagId: string; value: number | string | boolean | null; timestamp: string }>>;
    getAggregated: (params: {
      tagIds: string[];
      startTime: Date;
      endTime: Date;
      function: 'avg' | 'max' | 'min' | 'sum' | 'count';
      interval?: string;
    }) => Promise<Array<{ tagId: string; value: number; timestamp: string; count?: number }>>;
  };
  wsStore: {
    subscribeTags: (tagIds: string[]) => void;
    unsubscribeTags: (tagIds: string[]) => void;
    getTagValue: (tagId: string) => unknown;
    /** 连接状态：编辑态可能在绑定后才建立连接，未连接时暂不订阅，连接后补订阅 */
    isConnected?: boolean;
  };
}

/** database 数据源（在 ChartDataSource 基础上扩展实时最新值读取能力） */
export interface DatabaseDataSource extends ChartDataSource {
  /** 读取 wsStore 中绑定变量的实时最新值并通知监听器（供 gauge/水球/进度/柱/饼/雷达实时刷新） */
  readLatest(): ChartDataResult;
}

function parsePoint(raw: { timestamp: string; value: number | null }): [number, number] | null {
  const time = new Date(raw.timestamp).getTime();
  const value = Number(raw.value);
  if (Number.isNaN(time) || raw.value === null || raw.value === undefined || Number.isNaN(value)) {
    return null;
  }
  return [time, value];
}

function tagName(config: DatabaseSourceConfig, tagId: string): string {
  const tag = config.tags.find((t) => t.tagId === tagId);
  return tag?.tagName || tag?.deviceName || tagId;
}

/**
 * 数据库（变量相关）数据源：绑定 tag 变量，时序走 queryTrend、最新值走 getLatest、
 * 聚合统计走 getAggregated；实时订阅走 wsStore。
 */
export function createDatabaseDataSource(
  config: DatabaseSourceConfig,
  deps: DatabaseDataSourceDeps,
): DatabaseDataSource {
  const listeners = new Set<(result: ChartDataResult) => void>();

  function notify(result: ChartDataResult) {
    listeners.forEach((listener) => listener(result));
  }

  async function loadSeries(): Promise<ChartDataResult> {
    const tagIds = config.tags.map((t) => t.tagId).filter(Boolean);
    if (tagIds.length === 0) return { dimensions: [], source: [], state: 'empty' };

    const end = config.seriesConfig?.endTime
      ? new Date(config.seriesConfig.endTime).getTime()
      : Date.now();
    const start = config.seriesConfig?.startTime
      ? new Date(config.seriesConfig.startTime).getTime()
      : end - 60 * 60 * 1000;

    try {
      const res = await deps.dataQueryApi.queryTrend({
        tagIds,
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
        maxPoints: config.seriesConfig?.maxPoints ?? 2000,
        interpolation: config.seriesConfig?.interpolation ?? 'raw',
        interval: config.seriesConfig?.interval,
        projectId: config.tags[0]?.projectId,
      });

      const series = (res.data ?? []).map((item) => ({
        tagId: item.tagId,
        name: tagName(config, item.tagId),
        data: (item.data ?? [])
          .map(parsePoint)
          .filter((p): p is [number, number] => p !== null),
      }));

      return {
        dimensions: ['time', 'value'],
        source: [],
        series,
        state: series.every((s) => s.data.length === 0) ? 'empty' : 'ready',
      };
    } catch (error) {
      return {
        dimensions: [],
        source: [],
        state: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function loadLatest(): Promise<ChartDataResult> {
    // latest 模式实时值统一由 WebSocket 提供（tagFlushVersion 驱动 readLatest 刷新），
    // 不再通过 HTTP /data/latest 拉取基线，避免命中不存在的端点报错。
    return readLatest();
  }

  async function loadAggregate(): Promise<ChartDataResult> {
    const tagIds = config.tags.map((t) => t.tagId).filter(Boolean);
    if (tagIds.length === 0) return { dimensions: [], source: [], state: 'empty' };

    try {
      const fn = config.aggregateConfig?.function ?? 'avg';
      const end = new Date();
      const start = new Date(end.getTime() - 60 * 60 * 1000);
      const points = await deps.dataQueryApi.getAggregated({
        tagIds,
        startTime: start,
        endTime: end,
        function: fn,
        interval: config.aggregateConfig?.interval,
      });

      const byTagId = new Map(points.map((p) => [p.tagId, p.value]));
      const source = config.tags
        .filter((t) => byTagId.has(t.tagId))
        .map((t) => ({
          name: t.tagName || t.deviceName || t.tagId,
          value: byTagId.get(t.tagId) ?? 0,
        }));

      return {
        dimensions: ['name', 'value'],
        source,
        state: source.length === 0 ? 'empty' : 'ready',
      };
    } catch (error) {
      return {
        dimensions: [],
        source: [],
        state: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  function load(): Promise<ChartDataResult> {
    switch (config.mode) {
      case 'series':
        return loadSeries();
      case 'latest':
        return loadLatest();
      case 'aggregate':
        return loadAggregate();
      default:
        return Promise.resolve({ dimensions: [], source: [], state: 'empty' });
    }
  }

  function tagIds(): string[] {
    return config.tags.map((t) => t.tagId).filter(Boolean);
  }

  let subscribed = false;

  function subscribe(): void {
    if (subscribed) return;
    const ids = tagIds();
    if (ids.length === 0) return;
    // 编辑态 wsStore 可能在图元绑定后才建立连接；未连接时暂不订阅，
    // 待 useChartSource 监听到 isConnected 后调用 subscribe() 补订阅。
    if (deps.wsStore.isConnected === false) return;
    deps.wsStore.subscribeTags(ids);
    subscribed = true;
  }

  function unsubscribe(): void {
    const ids = tagIds();
    if (ids.length > 0) deps.wsStore.unsubscribeTags(ids);
    subscribed = false;
  }

  function readLatest(): ChartDataResult {
    const series = config.tags
      .filter((t) => t.tagId)
      .map((t) => {
        const raw = deps.wsStore.getTagValue(t.tagId);
        const value = Number(raw);
        return {
          tagId: t.tagId,
          name: t.tagName || t.deviceName || t.tagId,
          data: [Number.isFinite(value) ? value : 0] as Array<number>,
        };
      });

    const result: ChartDataResult = {
      dimensions: ['value'],
      source: [],
      series,
      state: series.length === 0 ? 'empty' : 'ready',
    };
    notify(result);
    return result;
  }

  return {
    type: 'database',
    load,
    subscribe,
    unsubscribe,
    readLatest,
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
