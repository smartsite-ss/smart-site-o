// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ScriptAPI, ScriptContext } from '../types/script.types';

/**
 * 客户端白名单 ScriptAPI 实现
 * 提供脚本在沙箱中可调用的所有安全 API
 */
export interface ClientScriptAPIOptions {
  onTagRead?: (tagId: string, value: any) => void;
  onTagWrite?: (tagId: string, value: any) => void;
  onGraphicChange?: (graphicId: string, props: Record<string, any>) => void;
  onAlarmTrigger?: (config: { tagId: string; level: string; message: string }) => void;
  onAlarmAcknowledge?: (alarmId: string) => void;
  onLog?: (level: 'info' | 'warn' | 'error', message: string) => void;
  onSwitchPage?: (pageId: string) => void;
  onNotify?: (message: string, level: 'info' | 'warn' | 'error') => void;
  onFetch?: (url: string, options?: any) => Promise<any>;
}

export class ClientScriptAPIFactory {
  /** 创建完整的 ScriptAPI 实例 */
  static create(context: ScriptContext, options?: ClientScriptAPIOptions): ScriptAPI {
    // 容器内定时器管理
    const timers: Map<number, ReturnType<typeof setInterval>> = new Map();
    let nextTimerId = 1;

    const api: ScriptAPI = {
      // ─── 数据读写 ───
      readTag(tagId: string): any | null {
        const value = context.tagValues?.[tagId] ?? null;
        options?.onTagRead?.(tagId, value);
        return value;
      },
      writeTag(tagId: string, value: any): void {
        options?.onTagWrite?.(tagId, value);
      },
      getTagQuality(tagId: string): string {
        const value = context.tagValues?.[tagId];
        return value?.quality ?? 'good';
      },

      // ─── 图元操作 ───
      setGraphicProps(graphicId: string, props: Record<string, any>): void {
        options?.onGraphicChange?.(graphicId, props);
      },
      showGraphic(graphicId: string): void {
        options?.onGraphicChange?.(graphicId, { visible: true });
      },
      hideGraphic(graphicId: string): void {
        options?.onGraphicChange?.(graphicId, { visible: false });
      },
      moveGraphic(graphicId: string, x: number, y: number): void {
        options?.onGraphicChange?.(graphicId, { x, y });
      },
      rotateGraphic(graphicId: string, angle: number): void {
        options?.onGraphicChange?.(graphicId, { rotation: angle });
      },

      // ─── 告警操作 ───
      triggerAlarm(config: { tagId: string; level: string; message: string }): void {
        options?.onAlarmTrigger?.(config);
      },
      acknowledgeAlarm(alarmId: string): void {
        options?.onAlarmAcknowledge?.(alarmId);
      },
      clearAlarm(_alarmId: string): void {
        // 通过事件总线清除告警
      },
      getActiveAlarms(): any[] {
        return [];
      },

      // ─── 页面操作 ───
      switchPage(pageId: string): void {
        options?.onSwitchPage?.(pageId);
      },
      getCurrentPageId(): string {
        return context.graphicId ?? '';
      },

      // ─── 网络请求 ───
      async fetch(url: string, fetchOptions?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<any> {
        if (options?.onFetch) {
          return options.onFetch(url, fetchOptions);
        }
        try {
          const response = await globalThis.fetch(url, fetchOptions);
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            return response.json();
          }
          return response.text();
        } catch (error: any) {
          throw new Error(`Fetch failed: ${error?.message ?? String(error)}`);
        }
      },

      // ─── 定时器 ───
      setTimeout(callback: (...args: any[]) => void, delay: number): number {
        const id = nextTimerId++;
        const timer = globalThis.setTimeout(() => {
          timers.delete(id);
          try { callback(); } catch (e) { /* 静默吞掉沙箱内回调异常 */ }
        }, delay);
        timers.set(id, timer);
        return id;
      },
      setInterval(callback: (...args: any[]) => void, interval: number): number {
        const id = nextTimerId++;
        const timer = globalThis.setInterval(() => {
          try { callback(); } catch (e) { /* 静默吞掉沙箱内回调异常 */ }
        }, interval);
        timers.set(id, timer);
        return id;
      },
      clearTimeout(id: number): void {
        const timer = timers.get(id);
        if (timer !== undefined) {
          globalThis.clearTimeout(timer);
          timers.delete(id);
        }
      },
      clearInterval(id: number): void {
        const timer = timers.get(id);
        if (timer !== undefined) {
          globalThis.clearInterval(timer);
          timers.delete(id);
        }
      },

      // ─── 工具函数 ───
      sleep(ms: number): Promise<void> {
        return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
      },
      notify(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        options?.onNotify?.(message, level);
        // 同时记录到日志
        options?.onLog?.(level, `[notify] ${message}`);
      },
      log(level: 'info' | 'warn' | 'error', message: string): void {
        options?.onLog?.(level, message);
      },

      // ─── 数值工具 ───
      round(value: number, decimals: number = 0): number {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
      },
      clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
      },
      mapRange(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
        return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
      },
      colorForValue(v: number, min: number = 0, max: number = 100): string {
        const ratio = Math.max(0, Math.min(1, (v - min) / (max - min)));
        const r = Math.round(ratio * 255);
        const g = Math.round((1 - ratio) * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
      },
      isAlarm(v: number, high: number, low: number = 0): boolean {
        return v >= high || v <= low;
      },
    };

    return api;
  }
}