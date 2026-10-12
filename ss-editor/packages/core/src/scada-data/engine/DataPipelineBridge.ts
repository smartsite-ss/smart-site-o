// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { DataPipeline } from './DataPipeline';
import type { DataDriverEngine } from './DataDriverEngine';
import type { DataSourceManager, TagValueChangeHandler } from './DataSourceManager';
import type { GraphicData, GraphicContext, DriverScriptAPI, DataPointMap } from '../types/graphic-data.types';
import { BindingManager } from '../managers/BindingManager';

export interface PipelineGraphicBinding {
  graphicId: string;
  tagId: string;
  graphicName: string;
  graphicType: string;
  filterScript?: string;
  driverScript?: string;
}

export interface PipelineBridgeOptions {
  dataSourceManager: DataSourceManager;
  dataPipeline: DataPipeline;
  dataDriverEngine: DataDriverEngine;
  getBindingsByTagId: (tagId: string) => PipelineGraphicBinding[];
  getVariableMeta: (tagId: string) => Record<string, unknown>;
  onFilterExecuted?: (graphicId: string, result: GraphicData | null, changed: boolean) => void;
  onDriverExecuted?: (graphicId: string, output: unknown) => void;
}

export class DataPipelineBridge {
  private _options: PipelineBridgeOptions;
  private _unsubscribe: (() => void) | null = null;
  private _lastFilterOutputs: Map<string, GraphicData | null> = new Map();
  private _lastRawValues: Map<string, unknown> = new Map();

  constructor(options: PipelineBridgeOptions) {
    this._options = options;
  }

  start(): void {
    if (this._unsubscribe) return;

    const handler: TagValueChangeHandler = (payload) => {
      this._handleTagChange(
        payload.tagId,
        payload.value,
        payload.quality,
        payload.sourceId,
      );
    };

    this._unsubscribe = this._options.dataSourceManager.onTagValueChanged(handler);
  }

  stop(): void {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._lastFilterOutputs.clear();
    this._lastRawValues.clear();
  }

  private _handleTagChange(
    tagId: string,
    value: unknown,
    quality: string,
    sourceId: string,
  ): void {
    const bindings = this._options.getBindingsByTagId(tagId);
    if (!bindings || bindings.length === 0) return;

    const rawData = this._options.dataSourceManager.getSourceRawData(sourceId);

    for (const binding of bindings) {
      if (!binding.filterScript && !binding.driverScript) continue;

      let filterResult: GraphicData | null = null;
      let filterChanged = false;

      if (binding.filterScript) {
        this._options.dataPipeline.registerFilterScript(tagId, binding.filterScript);

        const tagMeta = this._options.getVariableMeta(tagId);
        const { result, changed } = this._options.dataPipeline.executeFilterWithChangeDetection(
          value,
          tagId,
          quality,
          tagMeta,
          rawData,
        );
        filterResult = result;
        filterChanged = changed;

        this._lastFilterOutputs.set(binding.graphicId, result);
        this._options.onFilterExecuted?.(binding.graphicId, result, changed);
      } else {
        filterChanged = true;
      }

      if (!filterChanged && filterResult === null) continue;

      const previousRaw = this._lastRawValues.get(binding.graphicId);
      if (!filterChanged && previousRaw === value) continue;
      this._lastRawValues.set(binding.graphicId, value);

      if (binding.driverScript) {
        this._options.dataDriverEngine.registerRuntimeDriver(
          binding.graphicId,
          binding.driverScript,
        );

        const graphicContext: GraphicContext = {
          graphicId: binding.graphicId,
          graphicName: binding.graphicName,
          graphicType: binding.graphicType,
          pageId: '',
        };

        const allData: DataPointMap = {};

        const driverApi = this._createDriverScriptAPI(binding.graphicId);

        this._options.dataDriverEngine.executeRuntimeDriver(
          binding.graphicId,
          filterResult || {} as GraphicData,
          allData,
          graphicContext,
          driverApi,
        ).then((output) => {
          this._options.onDriverExecuted?.(binding.graphicId, output);
        }).catch((err) => {
          console.error(`[DataPipelineBridge] Driver error for graphic "${binding.graphicId}":`, err);
        });
      }
    }
  }

  /**
   * 构建 DriverScriptAPI 实例，将 driver 脚本的图元操作副作用
   * 通过 BindingManager.getGraphicStore().applyProperty 直接应用到渲染层。
   *
   * 修复原实现传入 `{} as DriverScriptAPI` 导致 setText/setBackground 等方法调用报错、
   * driver 脚本副作用完全失效的问题。
   *
   * 工具函数（clamp/mapRange/colorForValue/formatNumber）由 ScriptEngine.executeDriverScript
   * 内部合并的 helpers 提供，此处无需重复实现。
   */
  private _createDriverScriptAPI(graphicId: string): DriverScriptAPI {
    const store = BindingManager.getGraphicStore();
    const applyProp = (path: string, value: unknown) => {
      store?.applyProperty(graphicId, path, value);
    };

    const alarms: Array<{ id: string; level: string; message: string }> = [];

    return {
      setText: (val: string) => applyProp('config.customProps.text', val),
      setBackground: (color: string) => applyProp('config.style.backgroundColor', color),
      setVisible: (visible: boolean) => applyProp('visible', visible),
      setBorder: (color: string, width?: number) => {
        applyProp('config.style.borderColor', color);
        if (width !== undefined) applyProp('config.style.borderWidth', width);
      },
      setRotation: (degrees: number) => applyProp('config.style.transform', `rotate(${degrees}deg)`),
      setOpacity: (value: number) => applyProp('config.style.opacity', value),
      setPosition: (x: number, y: number) => {
        applyProp('config.position.x', x);
        applyProp('config.position.y', y);
      },
      showGraphic: (targetId: string) => store?.applyProperty(targetId, 'visible', true),
      hideGraphic: (targetId: string) => store?.applyProperty(targetId, 'visible', false),
      setGraphicProps: (targetId: string, props: Record<string, unknown>) => {
        for (const [path, value] of Object.entries(props)) {
          store?.applyProperty(targetId, path, value);
        }
      },
      triggerAlarm: (level: string, message: string) => {
        alarms.push({ id: `alarm-${Date.now()}-${alarms.length}`, level, message });
      },
      clearAlarm: (_alarmId?: string) => {
        // 简化实现：清空当前图元关联的告警（按 level 维度可扩展）
        if (alarms.length > 0) alarms.length = 0;
      },
      getActiveAlarms: () => [...alarms],
      httpGet: async (url: string) => {
        try {
          const resp = await fetch(url);
          return await resp.json();
        } catch (err) {
          console.error(`[DataPipelineBridge] httpGet error for graphic "${graphicId}":`, err);
          return null;
        }
      },
      httpPost: async (url: string, data: unknown) => {
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          return await resp.json();
        } catch (err) {
          console.error(`[DataPipelineBridge] httpPost error for graphic "${graphicId}":`, err);
          return null;
        }
      },
      readTag: (tagId: string) => {
        const cached = this._options.dataSourceManager.getCachedValue(tagId);
        return cached ? { value: cached.value, quality: cached.quality, timestamp: cached.timestamp } : null;
      },
      writeTag: (tagId: string, value: unknown) => {
        // 通过 EventBus 发出 writeTag 事件，由上层（如 WebSocketDriver）处理实际写入
        const sources = this._options.dataSourceManager.getAllSources();
        const targetSource = sources.find((s) => {
          const raw = this._options.dataSourceManager.getSourceRawData(s.id);
          return raw && tagId in raw;
        });
        if (targetSource) {
          this._options.dataSourceManager.writeTag(targetSource.id, tagId, value).catch((err) => {
            console.error(`[DataPipelineBridge] writeTag error for tag "${tagId}":`, err);
          });
        }
      },
      setTimeout: (callback: () => void, ms: number) => window.setTimeout(callback, ms),
      setInterval: (callback: () => void, ms: number) => window.setInterval(callback, ms),
      clearTimeout: (id: number) => window.clearTimeout(id),
      clearInterval: (id: number) => window.clearInterval(id),
      // 以下工具函数由 ScriptEngine.executeDriverScript 合并的 helpers 覆盖，此处仅满足接口
      clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      mapRange: (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number) =>
        toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin),
      colorForValue: (value: number, min: number, max: number) => {
        const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
        const r = Math.round(ratio * 255);
        const g = Math.round((1 - ratio) * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
      },
      formatNumber: (value: number, decimals: number, unit?: string) =>
        `${value.toFixed(decimals)}${unit ?? ''}`,
    };
  }
}