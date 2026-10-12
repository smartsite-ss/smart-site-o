// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { DataFilter, FilterExecutionResult, PipelineResult } from '../types/pipeline.types';
import type { DataPoint, GraphicData } from '../types/graphic-data.types';
import { isDataPoint, isDataList } from '../types/graphic-data.types';
import { v4 as uuidv4 } from 'uuid';
import { ScriptEngine } from './ScriptEngine';

export interface FilterInstance {
  id: string;
  name: string;
  filter: DataFilter;
  execute(input: unknown, tagId: string): unknown;
}

export type RuntimeFilterFn = (
  value: unknown,
  quality: string,
  tagMeta: Record<string, unknown>,
) => GraphicData | null;

export class DataPipeline {
  private _filters: FilterInstance[] = [];
  private _errorConfig: { strategy: 'skip' | 'stop' | 'defaultValue'; defaultValue?: unknown } = { strategy: 'stop' };
  private _lastOutputs: Map<string, unknown> = new Map();
  private _lastGraphicData: Map<string, GraphicData> = new Map();
  private _filterScripts: Map<string, string> = new Map();

  configureError(config: Partial<{ strategy: 'skip' | 'stop' | 'defaultValue'; defaultValue?: unknown }>): void {
    Object.assign(this._errorConfig, config);
  }

  registerFilterScript(tagId: string, script: string): void {
    this._filterScripts.set(tagId, script);
  }

  removeFilterScript(tagId: string): void {
    this._filterScripts.delete(tagId);
  }

  executeFilter(
    rawValue: unknown,
    tagId: string,
    quality: string = 'good',
    tagMeta: Record<string, unknown> = {},
    fullDataSet?: unknown,
  ): GraphicData | null {
    const script = this._filterScripts.get(tagId);
    if (!script) {
      const fallback = this._createDefaultDataPoint(rawValue, tagId, quality, tagMeta);
      this._lastGraphicData.set(tagId, fallback);
      return fallback;
    }

    try {
      const res = {
        tagId,
        tagName: tagMeta.tagName || tagId,
        quality,
        dataType: tagMeta.dataType || 'string',
        unit: tagMeta.unit,
        minValue: tagMeta.minValue,
        maxValue: tagMeta.maxValue,
        dataSourceId: tagMeta.dataSourceId,
        dataSourceName: tagMeta.dataSourceName,
        dataSourceType: tagMeta.dataSourceType,
      };
      // 统一通过 ScriptEngine.executeFilterScript 执行用户脚本，启用沙箱隔离
      const result = ScriptEngine.getInstance().executeFilterScript(script, fullDataSet ?? rawValue, res);

      if (result && typeof result === 'object') {
        const graphicResult = result as GraphicData;
        if (isDataPoint(graphicResult) || isDataList(graphicResult)) {
          this._lastGraphicData.set(tagId, graphicResult);
          return graphicResult;
        }
      }

      const fallback = this._createDefaultDataPoint(rawValue, tagId, quality, tagMeta);
      this._lastGraphicData.set(tagId, fallback);
      return fallback;
    } catch (err: unknown) {
      console.error(`[DataPipeline] Filter script error for tag "${tagId}":`, err);
      return this._lastGraphicData.get(tagId) ?? this._createDefaultDataPoint(rawValue, tagId, quality, tagMeta);
    }
  }

  shouldUpdate(tagId: string, next: GraphicData): boolean {
    const prev = this._lastGraphicData.get(tagId);
    if (!prev) return true;

    if (isDataPoint(prev) && isDataPoint(next)) {
      return prev.value !== next.value
        || prev.quality !== next.quality
        || prev.timestamp !== next.timestamp;
    }

    if (isDataList(prev) && isDataList(next)) {
      if (prev.totalCount !== next.totalCount) return true;
      if (prev.rows.length !== next.rows.length) return true;
      try {
        return JSON.stringify(prev.rows) !== JSON.stringify(next.rows);
      } catch {
        return true;
      }
    }

    return true;
  }

  getLastGraphicData(tagId: string): GraphicData | undefined {
    return this._lastGraphicData.get(tagId);
  }

  isChanged(tagId: string, next: GraphicData): boolean {
    return this.shouldUpdate(tagId, next);
  }

  executeFilterWithChangeDetection(
    rawValue: unknown,
    tagId: string,
    quality: string = 'good',
    tagMeta: Record<string, unknown> = {},
    fullDataSet?: unknown,
  ): { result: GraphicData | null; changed: boolean } {
    const result = this.executeFilter(rawValue, tagId, quality, tagMeta, fullDataSet);
    if (!result) {
      return { result: null, changed: false };
    }
    const changed = this.shouldUpdate(tagId, result);
    return { result, changed };
  }

  registerFilter(filter: DataFilter): string {
    const instance: FilterInstance = {
      id: uuidv4(),
      name: filter.name,
      filter,
      execute: (input, tagId) => this._applyFilter(filter, input, tagId),
    };
    this._filters.push(instance);
    this._sortFilters();
    return instance.id;
  }

  removeFilter(filterId: string): void { this._filters = this._filters.filter(f => f.id !== filterId); }

  getFilters(): DataFilter[] { return this._filters.map(f => ({ ...f.filter })); }

  setFilterEnabled(filterId: string, enabled: boolean): void {
    const inst = this._filters.find(f => f.id === filterId);
    if (inst) inst.filter.enabled = enabled;
  }

  moveFilter(filterId: string, newOrder: number): void {
    const idx = this._filters.findIndex(f => f.id === filterId);
    if (idx < 0) return;
    const [item] = this._filters.splice(idx, 1);
    this._filters.splice(Math.max(0, Math.min(newOrder, this._filters.length)), 0, item);
    this._filters.forEach((f, i) => { f.filter.order = i; });
  }

  executeChain(rawValue: unknown, tagId: string = ''): PipelineResult {
    let currentValue = rawValue;
    const executionResults: FilterExecutionResult[] = [];
    let success = true;
    let error: string | undefined;

    const enabledFilters = this._filters.filter(f => f.filter.enabled);
    for (const instance of enabledFilters) {
      const stepStart = Date.now();
      try {
        const output = instance.execute(currentValue, tagId);
        executionResults.push({ filterId: instance.id, input: currentValue, output, duration: Date.now() - stepStart, success: true });
        currentValue = output;
      } catch (err: any) {
        const errorMsg = err?.message ?? 'Unknown filter error';
        executionResults.push({ filterId: instance.id, input: currentValue, output: null, duration: Date.now() - stepStart, success: false, error: errorMsg });
        if (this._errorConfig.strategy === 'stop') { success = false; error = errorMsg; break; }
        else if (this._errorConfig.strategy === 'defaultValue' && this._errorConfig.defaultValue !== undefined) {
          currentValue = this._errorConfig.defaultValue;
        }
      }
    }
    return { input: rawValue, output: currentValue, success, error, filters: executionResults };
  }

  clear(): void {
    this._filters = [];
    this._lastOutputs.clear();
    this._lastGraphicData.clear();
    this._filterScripts.clear();
  }

  private _createDefaultDataPoint(
    rawValue: unknown,
    tagId: string,
    quality: string,
    tagMeta: Record<string, unknown>,
  ): DataPoint {
    return {
      tagId,
      tagName: (tagMeta.tagName as string) || tagId,
      dataSourceId: (tagMeta.dataSourceId as string) || '',
      dataSourceName: (tagMeta.dataSourceName as string) || '',
      dataSourceType: (tagMeta.dataSourceType as DataPoint['dataSourceType']) || 'tag',
      value: rawValue as DataPoint['value'],
      dataType: (tagMeta.dataType as DataPoint['dataType']) || 'string',
      unit: tagMeta.unit as string,
      quality: quality as DataPoint['quality'],
      timestamp: Date.now(),
      raw: rawValue,
    };
  }

  private _applyFilter(filter: DataFilter, input: unknown, tagId: string): unknown {
    switch ((filter.config as any).type) {
      case 'fieldExtract': return this._fieldExtract(input, (filter.config as any).jsonPath);
      case 'typeConvert': return this._typeConvert(input, (filter.config as any).targetType);
      case 'scaleTransform': return this._scaleTransform(input, (filter.config as any).scale, (filter.config as any).offset);
      case 'deadband': return this._deadband(input, tagId, (filter.config as any).threshold);
      case 'format': return this._format(input, (filter.config as any).precision, (filter.config as any).formatType);
      case 'custom': return this._customScript(input, tagId, (filter.config as any).script);
      default: return input;
    }
  }

  private _fieldExtract(input: unknown, jsonPath?: string): unknown {
    if (!jsonPath || input == null) return input;
    const parts = jsonPath.split('.');
    let current: any = input;
    for (const p of parts) { if (current == null) return null; current = current[p]; }
    return current;
  }

  private _typeConvert(input: unknown, targetType?: string): unknown {
    if (input == null) return null;
    switch (targetType) {
      case 'number': return Number(input);
      case 'string': return String(input);
      case 'boolean': return Boolean(input);
      case 'json': return typeof input === 'string' ? JSON.parse(input) : input;
      default: return input;
    }
  }

  private _scaleTransform(input: unknown, scale?: number, offset?: number): number {
    return (Number(input) || 0) * (scale ?? 1) + (offset ?? 0);
  }

  private _deadband(input: unknown, tagId: string, threshold?: number): unknown {
    if (typeof input !== 'number' || threshold == null) return input;
    const lastOutput = this._lastOutputs.get(tagId);
    if (lastOutput !== undefined && typeof lastOutput === 'number') {
      if (Math.abs(input - lastOutput) < threshold) return lastOutput;
    }
    this._lastOutputs.set(tagId, input);
    return input;
  }

  private _format(input: unknown, precision?: number, formatType?: string): string {
    if (typeof input !== 'number') return String(input);
    const p = precision ?? 2;
    switch (formatType) {
      case 'percent': return (input * 100).toFixed(p) + '%';
      case 'currency': return '¥' + input.toFixed(p);
      default: return input.toFixed(p);
    }
  }

  private _customScript(input: unknown, tagId: string, script?: string): unknown {
    if (!script) return input;
    // 统一通过 ScriptEngine 执行 customScript，启用沙箱隔离
    const result = ScriptEngine.getInstance().executeFilterScript(
      script,
      input,
      { tagId, context: { _lastOutputs: this._lastOutputs } },
    );
    return result ?? input;
  }

  private _sortFilters(): void {
    this._filters.sort((a, b) => a.filter.order - b.filter.order);
  }
}