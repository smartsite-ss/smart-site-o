// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { DataAction, DataInputPayload, AlarmRecord } from '../types/pipeline.types';
import type { QualityCode } from '../types/quality.types';
import type { GraphicData, DriverScriptAPI, GraphicContext, DataPointMap } from '../types/graphic-data.types';
import { ScriptEngine } from './ScriptEngine';

export interface DriverDefinition {
  id: string;
  name: string;
  script: string;
  priority: number;
  enabled: boolean;
}

interface ScriptOutput {
  value?: unknown;
  properties?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  animation?: 'play' | 'stop' | 'none';
  quality?: QualityCode;
  alarm?: { level: string; message: string };
  triggerAction?: { target: string; payload: unknown };
}

interface ScriptAPIOutput {
  setText?: string;
  setBackground?: string;
  setVisible?: boolean;
  setBorder?: { color: string; width: number };
  setRotation?: number;
  setOpacity?: number;
  setPosition?: { x: number; y: number };
  triggeredAlarms: Array<{ level: string; message: string }>;
  httpRequests: Array<{ method: string; url: string; data: unknown }>;
  calledShowGraphic: string[];
  calledHideGraphic: string[];
  settedGraphicProps: Array<{ id: string; props: Record<string, unknown> }>;
}

export class DataDriverEngine {
  private _drivers: Array<{
    definition: DriverDefinition;
    execute: (value: unknown, context: Record<string, unknown>) => ScriptOutput;
  }> = [];
  private _scriptDrivers: Map<
    string,
    { script: string; priority: number; enabled: boolean }
  > = new Map();
  private _scriptOutputs: Map<string, ScriptAPIOutput> = new Map();
  private _throttleTimestamps: Map<string, number> = new Map();
  private _throttleInterval = 100;

  registerDriver(definition: DriverDefinition): void {
    const inst = {
      definition,
      execute: (value: unknown, context: Record<string, unknown>) =>
        this._executeScript(definition.script, value, context),
    };
    this._drivers.push(inst);
    this._sortDrivers();
  }

  removeDriver(id: string): void {
    this._drivers = this._drivers.filter((d) => d.definition.id !== id);
    this._scriptDrivers.delete(id);
  }

  getDrivers(): DriverDefinition[] {
    return this._drivers.map((d) => ({ ...d.definition }));
  }

  setDriverEnabled(id: string, enabled: boolean): void {
    const inst = this._drivers.find((d) => d.definition.id === id);
    if (inst) inst.definition.enabled = enabled;
  }

  registerRuntimeDriver(graphicId: string, script: string, priority: number = 0): void {
    this._scriptDrivers.set(graphicId, { script, priority, enabled: true });
  }

  removeRuntimeDriver(graphicId: string): void {
    this._scriptDrivers.delete(graphicId);
  }

  setRuntimeDriverEnabled(graphicId: string, enabled: boolean): void {
    const driver = this._scriptDrivers.get(graphicId);
    if (driver) driver.enabled = enabled;
  }

  async executeRuntimeDriver(
    graphicId: string,
    _data: GraphicData,
    _allData: DataPointMap,
    _graphic: GraphicContext,
    api: DriverScriptAPI,
  ): Promise<ScriptAPIOutput | null> {
    const driver = this._scriptDrivers.get(graphicId);
    if (!driver || !driver.enabled || !driver.script) return null;

    const now = Date.now();
    const lastTs = this._throttleTimestamps.get(graphicId) || 0;
    if (now - lastTs < this._throttleInterval) return null;
    this._throttleTimestamps.set(graphicId, now);

    try {
      // 统一通过 ScriptEngine.executeDriverScript 执行用户脚本，启用沙箱隔离
      ScriptEngine.getInstance().executeDriverScript(driver.script, _data, _allData, _graphic, api as unknown as Record<string, unknown>);

      const output: ScriptAPIOutput = {
        triggeredAlarms: [],
        httpRequests: [],
        calledShowGraphic: [],
        calledHideGraphic: [],
        settedGraphicProps: [],
      };

      this._scriptOutputs.set(graphicId, output);
      return output;
    } catch (err: unknown) {
      console.error(`[DataDriverEngine] Runtime driver error for graphic "${graphicId}":`, err);
      return null;
    }
  }

  getScriptOutput(graphicId: string): ScriptAPIOutput | undefined {
    return this._scriptOutputs.get(graphicId);
  }

  execute(value: unknown, context: Record<string, unknown> = {}): DataInputPayload {
    const actions: DataAction[] = [];
    let outputValue = value;
    let quality: QualityCode | undefined;
    let alarm: AlarmRecord | undefined;

    const enabledDrivers = this._drivers.filter((d) => d.definition.enabled);
    for (const driver of enabledDrivers) {
      try {
        const result = driver.execute(outputValue, context);
        if (result.value !== undefined) outputValue = result.value;
        if (result.properties) {
          for (const [target, v] of Object.entries(result.properties)) {
            actions.push({ type: 'setProperty', target, value: v } as DataAction);
          }
        }
        if (result.styles) {
          for (const [target, v] of Object.entries(result.styles)) {
            actions.push({ type: 'setStyle', target, value: v } as DataAction);
          }
        }
        if (result.animation && result.animation !== 'none') {
          actions.push({ type: 'setAnimation', target: result.animation, value: true } as DataAction);
        }
        if (result.triggerAction) {
          actions.push({ type: 'triggerAction', target: result.triggerAction.target, value: result.triggerAction.payload } as DataAction);
        }
        if (result.quality) quality = result.quality;
        if (result.alarm) {
          alarm = {
            id: `alarm-${Date.now()}`,
            message: result.alarm.message,
            severity: result.alarm.level,
            timestamp: Date.now(),
            acknowledged: false,
          } as AlarmRecord;
        }
      } catch (err) {
        console.error(`[DataDriverEngine] Driver "${driver.definition.name}" execution error:`, err);
      }
    }

    return { source: 'driver-engine', value: outputValue, actions, alarm, quality };
  }

  clear(): void {
    this._drivers = [];
    this._scriptDrivers.clear();
    this._scriptOutputs.clear();
    this._throttleTimestamps.clear();
  }

  private _executeScript(script: string, value: unknown, context: Record<string, unknown>): ScriptOutput {
    const validation = ScriptEngine.getInstance().validateScript(script);
    if (!validation.valid) {
      console.error(`[DataDriverEngine] Script validation failed: ${validation.error}`);
      return {};
    }

    // 值返回型 driver 脚本：通过 executeFilterScript 执行，沙箱内 value/data 同名注入，
    // 脚本返回 { value, properties, styles, animation, quality, alarm, triggerAction } 等
    const result = ScriptEngine.getInstance().executeFilterScript(script, value, context);
    return (result ?? {}) as ScriptOutput;
  }

  private _sortDrivers(): void {
    this._drivers.sort((a, b) => a.definition.priority - b.definition.priority);
  }
}