// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type {
  ScriptContext,
  ScriptResult,
  ScriptAPI,
  SandboxEnv,
  ScriptDefinition,
  ScriptTrigger,
  ExecutionContext,
  EventBinding,
  ScriptLog,
} from '../types/script.types';
import { ALLOWED_GLOBALS, BLOCKED_GLOBALS } from '../types/script.types';
import { ClientScriptAPIFactory } from './ClientScriptAPI';

export class ScriptEngine {
  private static instance: ScriptEngine;
  private scripts: Map<string, ScriptDefinition> = new Map();
  private executionHistory: Map<string, ExecutionContext[]> = new Map();
  private eventBindings: Map<string, EventBinding> = new Map();
  private logs: ScriptLog[] = [];
  private eventBus: any = null;
  /** 图元变更处理器：运行态下由调用方注入，用于将脚本中的图元操作直接应用到渲染层 */
  private graphicChangeHandler: ((graphicId: string, props: Record<string, any>) => void) | null = null;

  static getInstance(): ScriptEngine {
    if (!ScriptEngine.instance) {
      ScriptEngine.instance = new ScriptEngine();
    }
    return ScriptEngine.instance;
  }

  setEventBus(bus: any): void {
    this.eventBus = bus;
  }

  /**
   * 设置图元变更处理器
   * 运行态下由调用方（如 PageBrowser）注入，用于将脚本中的图元操作
   * （moveGraphic / setGraphicProps / showGraphic / hideGraphic 等）
   * 直接应用到渲染层，无需通过 apiCalls 返回值间接处理。
   */
  setGraphicChangeHandler(handler: ((graphicId: string, props: Record<string, any>) => void) | null): void {
    this.graphicChangeHandler = handler;
  }

  // ─── 脚本注册管理 ───

  registerScript(definition: ScriptDefinition): void {
    this.scripts.set(definition.id, definition);
    if (!this.executionHistory.has(definition.id)) {
      this.executionHistory.set(definition.id, []);
    }
  }

  unregisterScript(scriptId: string): void {
    this.scripts.delete(scriptId);
    this.executionHistory.delete(scriptId);
    // 清理事件绑定
    for (const [key, binding] of this.eventBindings) {
      if (binding.scriptId === scriptId) {
        binding.unsubscribe();
        this.eventBindings.delete(key);
      }
    }
  }

  getScript(scriptId: string): ScriptDefinition | undefined {
    return this.scripts.get(scriptId);
  }

  getAllScripts(): ScriptDefinition[] {
    return Array.from(this.scripts.values());
  }

  getExecutionHistory(scriptId: string): ExecutionContext[] {
    return this.executionHistory.get(scriptId) ?? [];
  }

  getLogs(): ScriptLog[] {
    return this.logs;
  }

  // ─── 脚本执行 ───

  executeScript(script: string, context: ScriptContext): ScriptResult {
    const startTime = performance.now();
    const apiCalls: Array<{ method: string; args: any[] }> = [];

    const api = ClientScriptAPIFactory.create(context, {
      onGraphicChange: (graphicId, props) => {
        apiCalls.push({ method: 'setGraphicProps', args: [graphicId, props] });
        // 运行态下直接通过 handler 应用到渲染层
        this.graphicChangeHandler?.(graphicId, props);
      },
      onTagWrite: (tagId, value) => apiCalls.push({ method: 'writeTag', args: [tagId, value] }),
      onAlarmTrigger: (config) => apiCalls.push({ method: 'triggerAlarm', args: [config] }),
      onLog: (level, msg) => apiCalls.push({ method: 'log', args: [level, msg] }),
    });

    const sandbox = this.createSandbox(context, api);

    try {
      const wrappedCode = `
        "use strict";
        ${script}
      `;

      const fn = new Function('api', 'context', 'console', wrappedCode);
      const output = fn.call(sandbox, sandbox.api, sandbox.context, sandbox.console);

      const executionTime = performance.now() - startTime;

      return {
        success: true,
        output,
        executionTime,
        apiCalls,
      };
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        error: error?.message ?? String(error),
        executionTime,
        apiCalls,
      };
    }
  }

  /** 异步执行脚本（支持 timeout 和 retry） */
  async executeAsync(scriptId: string, triggerType: ScriptTrigger = 'manual'): Promise<ScriptResult> {
    const definition = this.scripts.get(scriptId);
    if (!definition) {
      return { success: false, error: `Script not found: ${scriptId}`, executionTime: 0 };
    }

    if (!definition.enabled) {
      return { success: false, error: `Script is disabled: ${scriptId}`, executionTime: 0 };
    }

    const ctx: ExecutionContext = {
      scriptId: definition.id,
      scriptName: definition.name,
      triggerType,
      startTime: Date.now(),
      status: 'running',
      retryCount: 0,
    };

    this.executionHistory.get(scriptId)?.push(ctx);
    const maxRetries = definition.maxRetries ?? 0;
    const timeout = definition.timeout ?? 5000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      ctx.retryCount = attempt;

      try {
        const result = await this.executeWithTimeout(definition, ctx, timeout);

        ctx.status = 'success';
        ctx.endTime = Date.now();
        ctx.result = result;

        this.recordLog(definition, triggerType, result, result.executionTime);
        return result;
      } catch (error: any) {
        if (attempt < maxRetries) continue;

        ctx.status = error?.message?.includes('timeout') ? 'timeout' : 'error';
        ctx.endTime = Date.now();
        ctx.error = error?.message ?? String(error);

        const result: ScriptResult = {
          success: false,
          error: ctx.error,
          executionTime: ctx.endTime - ctx.startTime,
        };
        ctx.result = result;

        this.recordLog(definition, triggerType, result, result.executionTime);
        return result;
      }
    }

    return { success: false, error: 'Max retries exceeded', executionTime: 0 };
  }

  private executeWithTimeout(
    definition: ScriptDefinition,
    ctx: ExecutionContext,
    timeout: number,
  ): Promise<ScriptResult> {
    const context: ScriptContext = {
      graphicId: '',
      tagValues: {},
      triggerType: ctx.triggerType === 'manual' ? 'manual' : 'dataChange',
    };

    return new Promise<ScriptResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Script execution timeout (${timeout}ms): ${definition.name}`));
      }, timeout);

      try {
        const result = this.executeScript(definition.script, context);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /** 编辑态测试执行（不记录历史） */
  testExecute(script: string, context: ScriptContext): ScriptResult {
    return this.executeScript(script, context);
  }

  /** 验证脚本语法是否合法 */
  validateScript(script: string): { valid: boolean; error?: string } {
    try {
      new Function('"use strict";' + script);
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: e?.message ?? String(e) };
    }
  }

  /**
   * 执行过滤脚本（统一入口，替代 DataPipeline / DataDriverEngine 中散落的 new Function）。
   *
   * 沙箱策略：使用 Proxy 拦截 BLOCKED_GLOBALS（window/document/fetch/eval 等），
   * 步数计数器防死循环，仅暴露 ALLOWED_GLOBALS（Math/Date/JSON 等纯函数）。
   *
   * 脚本参数兼容：
   * - `value` / `data` 均指向同一数据（filter 脚本惯用 `value`，GraphicData 脚本惯用 `data`）
   * - `res` 为上下文对象（tagId/tagName/quality/dataType/unit 等）
   * - `api` 为内置 helpers（clamp/mapRange/colorForValue/formatNumber 等）
   *
   * @param script 用户编写的过滤脚本
   * @param data 原始数据（fullDataSet ?? rawValue）
   * @param res 上下文对象
   * @returns 脚本返回值
   * @throws 脚本执行错误（由调用方按自身错误策略处理）
   */
  executeFilterScript(
    script: string,
    data: unknown,
    res: Record<string, unknown>,
  ): unknown {
    try {
      // 同时以 value / data 暴露同一数据，兼容两种脚本写法
      const sandbox = this._createLightweightSandbox({ value: data, data, res });
      const fn = new Function('value', 'data', 'res', 'api', '"use strict";\n' + script);
      return fn.call(sandbox, data, data, res, sandbox.api);
    } catch (err: unknown) {
      // 记录日志后重新抛出，让调用方按自身错误策略处理（DataPipeline.executeChain 的 stop/skip/defaultValue 策略）
      console.error('[ScriptEngine] executeFilterScript error:', err);
      throw err;
    }
  }

  /**
   * 执行驱动脚本（统一入口，替代 DataDriverEngine 中的 new Function）。
   *
   * @param script 用户编写的驱动脚本，签名 (data, allData, graphic, api) => void
   * @param data 当前图元数据
   * @param allData 全部数据点
   * @param graphic 图元上下文
   * @param api 驱动脚本 API（setText/setBackground/setVisible 等）
   * @returns 脚本是否执行成功
   */
  executeDriverScript(
    script: string,
    data: unknown,
    allData: unknown,
    graphic: unknown,
    api: Record<string, unknown>,
  ): boolean {
    try {
      // 将调用方传入的 api（setText/setBackground 等图元操作）合并到 sandbox.api，
      // 使脚本内 api.setText(...) 能正确路由到调用方实现，修复原 {} as DriverScriptAPI 导致副作用失效
      const sandbox = this._createLightweightSandbox({ data, allData, graphic }, api);
      const fn = new Function('data', 'allData', 'graphic', 'api', '"use strict";\n' + script);
      fn.call(sandbox, data, allData, graphic, sandbox.api);
      return true;
    } catch (err: unknown) {
      console.error('[ScriptEngine] executeDriverScript error:', err);
      return false;
    }
  }

  /**
   * 求值表达式（统一入口，替代 BindingManager / ExpressionDataSource 中的 new Function）。
   *
   * @param expression 表达式字符串，如 "val * 1.8 + 32"
   * @param val 输入值
   * @returns 求值结果，失败时返回原值
   */
  evaluateExpression(expression: string, val: unknown): unknown {
    try {
      const sandbox = this._createLightweightSandbox({ val });
      const fn = new Function('val', `"use strict";\nreturn (${expression});`);
      return fn.call(sandbox, val);
    } catch (err: unknown) {
      console.error('[ScriptEngine] evaluateExpression error:', err);
      return val;
    }
  }

  /**
   * 创建轻量级沙箱（无 ScriptAPI 依赖），用于 filter/driver/expression 脚本执行。
   * 复用 createSandbox 的 Proxy + BLOCKED_GLOBALS + 步数计数器机制。
   *
   * @param vars 脚本可见变量
   * @param apiOverride 调用方传入的 api（如 DriverScriptAPI 的 setText/setBackground 等），
   *                    会与内置 helpers（clamp/mapRange/colorForValue 等）合并；
   *                    传入的同名方法会覆盖内置 helper。
   */
  private _createLightweightSandbox(
    vars: Record<string, unknown>,
    apiOverride?: Record<string, unknown>,
  ): { api: Record<string, unknown> } & Record<string, unknown> {
    const helpers = this._buildScriptHelpers();
    const api = apiOverride ? { ...helpers, ...apiOverride } : helpers;
    const env: Record<string, unknown> = { ...vars, api, console: this._buildSandboxConsole() };

    let stepCount = 0;
    const MAX_STEPS = 50000;

    return new Proxy(env, {
      get(target, prop) {
        stepCount++;
        if (stepCount > MAX_STEPS) {
          throw new Error(`脚本执行超过最大步数限制 (${MAX_STEPS})，可能存在无限循环`);
        }
        if (typeof prop === 'string') {
          if (BLOCKED_GLOBALS.has(prop)) {
            throw new Error(`Access to "${prop}" is blocked in sandbox`);
          }
          if (prop in target) {
            return target[prop];
          }
          if (ALLOWED_GLOBALS.has(prop) && prop in globalThis) {
            return (globalThis as any)[prop];
          }
        }
        return undefined;
      },
      set(_target, prop) {
        if (typeof prop === 'string' && BLOCKED_GLOBALS.has(prop)) {
          throw new Error(`Modification of "${prop}" is blocked in sandbox`);
        }
        return true;
      },
    }) as any;
  }

  /** 构建脚本工具函数 API（clamp/mapRange/colorForValue 等），单一来源消除重复 */
  private _buildScriptHelpers(): Record<string, unknown> {
    return {
      Math,
      round: (v: unknown, d: number = 0) => {
        const n = Number(v);
        const factor = Math.pow(10, d);
        return Math.round(n * factor) / factor;
      },
      clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
      mapRange: (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
        outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin),
      colorForValue: (v: number, min: number = 0, max: number = 100) => {
        const ratio = Math.max(0, Math.min(1, (v - min) / (max - min)));
        const r = Math.round(ratio * 255);
        const g = Math.round((1 - ratio) * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
      },
      isAlarm: (v: number, high: number, low: number = 0) => v >= high || v <= low,
      isGood: (v: number, high: number, low: number = 0) => v < high && v > low,
      formatNumber: (v: number, d: number = 2) => v.toFixed(d),
      formatDate: (ts?: number) => new Date(ts ?? Date.now()).toISOString(),
    };
  }

  /** 构建沙箱 console（日志收集，不污染全局 console） */
  private _buildSandboxConsole(): { log: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void } {
    return {
      log: (...args: unknown[]) => console.log('[sandbox]', ...args),
      warn: (...args: unknown[]) => console.warn('[sandbox]', ...args),
      error: (...args: unknown[]) => console.error('[sandbox]', ...args),
    };
  }

  // ─── 沙箱创建 ───

  private createSandbox(context: ScriptContext, api: ScriptAPI): SandboxEnv {
    const sandboxConsole = {
      log: (...args: any[]) => {
        api.log('info', args.map(String).join(' '));
      },
      warn: (...args: any[]) => {
        api.log('warn', args.map(String).join(' '));
      },
      error: (...args: any[]) => {
        api.log('error', args.map(String).join(' '));
      },
    };

    const env: SandboxEnv = {
      context,
      api,
      console: sandboxConsole,
    };

    // 步数计数器：防止无限循环导致浏览器卡死
    let stepCount = 0;
    const MAX_STEPS = 50000;

    return new Proxy(env, {
      get(target, prop) {
        // 每访问一个属性计为一步，超过阈值抛出异常
        stepCount++;
        if (stepCount > MAX_STEPS) {
          throw new Error(`脚本执行超过最大步数限制 (${MAX_STEPS})，可能存在无限循环`);
        }
        if (typeof prop === 'string') {
          if (BLOCKED_GLOBALS.has(prop)) {
            throw new Error(`Access to "${prop}" is blocked in sandbox`);
          }
          if (prop in target) {
            return (target as any)[prop];
          }
          if (ALLOWED_GLOBALS.has(prop) && prop in globalThis) {
            return (globalThis as any)[prop];
          }
        }
        return undefined;
      },
      set(_target, prop) {
        if (typeof prop === 'string' && BLOCKED_GLOBALS.has(prop)) {
          throw new Error(`Modification of "${prop}" is blocked in sandbox`);
        }
        return true;
      },
    }) as unknown as SandboxEnv;
  }

  // ─── 事件绑定 ───

  bindToEvent(scriptId: string, eventFullName: string, condition?: string): EventBinding {
    const key = `${scriptId}:${eventFullName}:${condition ?? ''}`;

    if (this.eventBindings.has(key)) {
      return this.eventBindings.get(key)!;
    }

    const handler = (eventData: any) => {
      if (condition && !this.evaluateCondition(condition, eventData)) {
        return;
      }
      this.executeAsync(scriptId, 'event');
    };

    const unsubscribe = this.eventBus?.on?.(eventFullName, handler) ?? (() => {});

    const binding: EventBinding = { scriptId, eventFullName, condition, unsubscribe };
    this.eventBindings.set(key, binding);
    return binding;
  }

  unbindFromEvent(scriptId: string, eventFullName: string, condition?: string): void {
    const key = `${scriptId}:${eventFullName}:${condition ?? ''}`;
    const binding = this.eventBindings.get(key);
    if (binding) {
      binding.unsubscribe();
      this.eventBindings.delete(key);
    }
  }

  private evaluateCondition(condition: string, eventData: any): boolean {
    try {
      const fn = new Function('data', `return ${condition}`);
      return Boolean(fn(eventData));
    } catch {
      return false;
    }
  }

  // ─── 日志记录 ───

  private recordLog(
    definition: ScriptDefinition,
    triggerType: ScriptTrigger,
    result: ScriptResult,
    executionTime: number,
  ): void {
    this.logs.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      scriptId: definition.id,
      scriptName: definition.name,
      triggerType,
      startTime: Date.now() - executionTime,
      executionTime,
      success: result.success,
      output: result.output,
      error: result.error,
      apiCalls: result.apiCalls ?? [],
    });

    // 保持日志上限 1000 条
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  // ─── 清理 ───

  destroy(): void {
    for (const binding of this.eventBindings.values()) {
      binding.unsubscribe();
    }
    this.eventBindings.clear();
    this.scripts.clear();
    this.executionHistory.clear();
    this.logs = [];
  }
}