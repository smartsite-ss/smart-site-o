// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ScriptContext {
  graphicId: string;
  tagValues: Record<string, any>;
  triggerType: 'dataChange' | 'timer' | 'event' | 'manual';
}

export interface ScriptResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  /** 脚本执行期间收集的 API 调用记录（供调用方处理） */
  apiCalls?: Array<{ method: string; args: any[] }>;
}

export interface ScriptAPI {
  // ─── 数据读写 ───
  readTag(tagId: string): any | null;
  writeTag(tagId: string, value: any): void;
  getTagQuality(tagId: string): string;
  // ─── 图元操作 ───
  setGraphicProps(graphicId: string, props: Record<string, any>): void;
  showGraphic(graphicId: string): void;
  hideGraphic(graphicId: string): void;
  moveGraphic(graphicId: string, x: number, y: number): void;
  rotateGraphic(graphicId: string, angle: number): void;
  // ─── 告警操作 ───
  triggerAlarm(config: { tagId: string; level: string; message: string }): void;
  acknowledgeAlarm(alarmId: string): void;
  clearAlarm(alarmId: string): void;
  getActiveAlarms(): any[];
  // ─── 页面操作 ───
  switchPage(pageId: string): void;
  getCurrentPageId(): string;
  // ─── 网络请求 ───
  fetch(url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<any>;
  // ─── 定时器 ───
  setTimeout(callback: (...args: any[]) => void, delay: number): number;
  setInterval(callback: (...args: any[]) => void, interval: number): number;
  clearTimeout(id: number): void;
  clearInterval(id: number): void;
  // ─── 工具函数 ───
  sleep(ms: number): Promise<void>;
  notify(message: string, level?: 'info' | 'warn' | 'error'): void;
  log(level: 'info' | 'warn' | 'error', message: string): void;
  round(value: number, decimals?: number): number;
  clamp(value: number, min: number, max: number): number;
  mapRange(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
  colorForValue(v: number, min: number, max: number): string;
  isAlarm(v: number, high: number, low: number): boolean;
}

export interface SandboxEnv {
  context: ScriptContext;
  api: ScriptAPI;
  console: Pick<Console, 'log' | 'warn' | 'error'>;
}

export const ALLOWED_GLOBALS = new Set([
  'context', 'api', 'console',
  'Math', 'Date', 'JSON',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'String', 'Number', 'Boolean', 'Array', 'Object', 'RegExp', 'Error', 'Promise',
  'undefined', 'null', 'NaN', 'Infinity',
]);

export const BLOCKED_GLOBALS = new Set([
  'window', 'document', 'fetch', 'localStorage', 'sessionStorage',
  'XMLHttpRequest', 'WebSocket', 'eval', 'setTimeout', 'setInterval',
  'Function', 'constructor', '__proto__',
]);

// ─── 脚本类型枚举 ───
export type ScriptType = 'client' | 'server' | 'sandbox';

// ─── 脚本定义 ───
export interface ScriptDefinition {
  id: string;
  name: string;
  script: string;
  type: ScriptType;
  mode: ScriptEditorMode;
  enabled: boolean;
  trigger?: ScriptTrigger;
  triggerConfig?: ScriptTriggerConfig;
  maxRetries: number;
  timeout: number;
  createdAt: number;
  updatedAt: number;
  lastExecutedAt?: number;
  executeCount: number;
}

// ─── 脚本编辑器模式 ───
export type ScriptEditorMode = 'filter' | 'driver' | 'interaction' | 'timer' | 'expression';

// ─── 触发器类型 ───
export type ScriptTrigger = 'cron' | 'datachange' | 'event' | 'expression' | 'manual';

// ─── 触发器配置 ───
export interface ScriptTriggerConfig {
  cron?: string;
  tagIds?: string[];
  eventFullName?: string;
  condition?: string;
  debounceMs?: number;
}

// ─── 事件绑定 ───
export interface EventBinding {
  scriptId: string;
  eventFullName: string;
  condition?: string;
  unsubscribe: () => void;
}

// ─── 执行上下文 ───
export interface ExecutionContext {
  scriptId: string;
  scriptName: string;
  triggerType: ScriptTrigger;
  startTime: number;
  endTime?: number;
  status: 'running' | 'success' | 'error' | 'timeout';
  result?: ScriptResult;
  error?: string;
  retryCount: number;
}

// ─── 脚本执行日志 ───
export interface ScriptLog {
  id: string;
  scriptId: string;
  scriptName: string;
  triggerType: ScriptTrigger;
  startTime: number;
  executionTime: number;
  success: boolean;
  output?: any;
  error?: string;
  apiCalls: Array<{ method: string; args: any[] }>;
}

// ─── 定时任务 ───
export interface ScheduledTask {
  taskId: string;
  scriptId: string;
  cron: string;
  params?: Record<string, any>;
  enabled: boolean;
  nextRunTime: number;
  lastRunTime?: number;
  runCount: number;
}

// ─── 表达式触发器 ───
export interface ExpressionTrigger {
  id: string;
  scriptId: string;
  expression: string;
  tagIds: string[];
  debounceMs: number;
  enabled: boolean;
  lastEvaluatedAt?: number;
  lastTriggeredAt?: number;
}