// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ExpressionTrigger } from '../types/script.types';
import { ScriptEngine } from './ScriptEngine';

/**
 * 表达式触发器
 * 基于表达式解析条件，当标签值变化满足条件时触发脚本
 */
export class ExpressionTriggerManager {
  private static instance: ExpressionTriggerManager;
  private triggers: Map<string, ExpressionTrigger> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private engine: ScriptEngine;
  private eventBus: any = null;
  private dataChangeUnsubscribe: (() => void) | null = null;

  constructor() {
    this.engine = ScriptEngine.getInstance();
  }

  static getInstance(): ExpressionTriggerManager {
    if (!ExpressionTriggerManager.instance) {
      ExpressionTriggerManager.instance = new ExpressionTriggerManager();
    }
    return ExpressionTriggerManager.instance;
  }

  /**
   * 设置事件总线，用于自动订阅 data:changed 事件
   */
  setEventBus(bus: any): void {
    this.eventBus = bus;
    this.subscribeToDataChange();
  }

  /**
   * 注册表达式触发器
   */
  register(config: Omit<ExpressionTrigger, 'lastEvaluatedAt' | 'lastTriggeredAt'>): ExpressionTrigger {
    const trigger: ExpressionTrigger = {
      ...config,
      lastEvaluatedAt: undefined,
      lastTriggeredAt: undefined,
    };
    this.triggers.set(trigger.id, trigger);
    return trigger;
  }

  /** 注销触发器 */
  unregister(triggerId: string): void {
    this.triggers.delete(triggerId);
    const timer = this.debounceTimers.get(triggerId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.debounceTimers.delete(triggerId);
    }
  }

  /**
   * 当标签值变化时，评估所有匹配的触发器
   */
  evaluate(tagId: string, tagValue: any): void {
    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) continue;
      if (!trigger.tagIds.includes(tagId)) continue;

      trigger.lastEvaluatedAt = Date.now();

      // 防抖处理
      const existingTimer = this.debounceTimers.get(trigger.id);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        this.debounceTimers.delete(trigger.id);
        if (this.evaluateExpression(trigger.expression, tagValue)) {
          trigger.lastTriggeredAt = Date.now();
          this.engine.executeAsync(trigger.scriptId, 'expression').catch((err) => {
            console.error(`ExpressionTrigger: script ${trigger.scriptId} execution failed:`, err);
          });
        }
      }, trigger.debounceMs);

      this.debounceTimers.set(trigger.id, timer);
    }
  }

  /**
   * 自动订阅 data:changed 事件，对有 tagIds 配置的触发器自动监听
   * 当触发器的 trigger.type === 'datachange' 时，自动注册数据变化监听
   */
  private subscribeToDataChange(): void {
    if (!this.eventBus) return;

    // 取消之前的订阅
    this.dataChangeUnsubscribe?.();

    this.dataChangeUnsubscribe = this.eventBus.on?.('data:changed', (payload: any) => {
      const { tagId, value } = payload ?? {};
      if (tagId === undefined) return;

      // 找到所有匹配此 tagId 的触发器
      for (const trigger of this.triggers.values()) {
        if (!trigger.enabled) continue;
        if (!trigger.tagIds.includes(tagId)) continue;

        trigger.lastEvaluatedAt = Date.now();

        // 防抖处理
        const existingTimer = this.debounceTimers.get(trigger.id);
        if (existingTimer !== undefined) {
          clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
          this.debounceTimers.delete(trigger.id);
          if (this.evaluateExpression(trigger.expression, value)) {
            trigger.lastTriggeredAt = Date.now();
            this.engine.executeAsync(trigger.scriptId, 'datachange').catch((err) => {
              console.error(`ExpressionTrigger[datachange]: script ${trigger.scriptId} failed:`, err);
            });
          }
        }, trigger.debounceMs);

        this.debounceTimers.set(trigger.id, timer);
      }
    });
  }

  /**
   * 评估表达式是否满足条件
   * 例如：expression = "value > 80" → 传入 { value: 85 } → true
   */
  private evaluateExpression(expression: string, tagValue: any): boolean {
    try {
      const fn = new Function('value', `return ${expression}`);
      return Boolean(fn(tagValue));
    } catch {
      return false;
    }
  }

  /** 获取所有触发器 */
  getAll(): ExpressionTrigger[] {
    return Array.from(this.triggers.values());
  }

  /** 清理 */
  destroy(): void {
    this.dataChangeUnsubscribe?.();
    this.dataChangeUnsubscribe = null;
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.triggers.clear();
  }
}