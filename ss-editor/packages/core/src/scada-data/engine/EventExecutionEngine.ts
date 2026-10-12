// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IEvent, IEventAction, IEventCondition, EventContext, EventType } from '@scada-editor/plugin-sdk';
import type { IGraphic } from '@scada-editor/plugin-sdk';

/**
 * 事件去抖配置（毫秒）
 */
const DEBOUNCE_CONFIG: Partial<Record<EventType, number>> = {
  click: 0,
  dblclick: 0,
  mouseenter: 300,
  mouseleave: 300,
  vnodeMounted: 0,
  vnodeBeforeMount: 0,
};

/**
 * 动作执行器接口
 * 允许外部注入不同运行时（编辑态/运行态）的动作实现
 */
export interface ActionExecutor {
  /** 执行自定义脚本 */
  executeScript(script: string, context: EventContext): void | Promise<void>;
  /** 调用 API */
  callApi(target: string, value: any, context: EventContext): void | Promise<void>;
  /** 执行内置脚本方法 */
  executeBuiltinScript(target: string, value: any, context: EventContext): void;
  /** 显示图元 */
  showGraphic(target: string): void;
  /** 隐藏图元 */
  hideGraphic(target: string): void;
  /** 修改属性 */
  changeProperty(target: string, value: any): void;
  /** 页面跳转 */
  navigateTo(target: string): void;
  /** 弹出提示 */
  showAlert(value: any): void;
}

/**
 * 默认空执行器（编辑态使用，不执行实际动作）
 */
const NOOP_EXECUTOR: ActionExecutor = {
  executeScript() {},
  callApi() {},
  executeBuiltinScript() {},
  showGraphic() {},
  hideGraphic() {},
  changeProperty() {},
  navigateTo() {},
  showAlert() {},
};

/**
 * EventExecutionEngine — 事件交互引擎
 *
 * 负责：
 * 1. 注册/注销图元的 DOM 事件监听器
 * 2. 管理 Vue 生命周期事件（vnodeMounted / vnodeBeforeMount）
 * 3. 条件评估（AND 逻辑）
 * 4. 动作分发（8 种 actionType）
 * 5. 高频事件去抖
 *
 * 编辑态和运行态通过注入不同的 ActionExecutor 实现差异化行为
 */
export class EventExecutionEngine {
  private static instance: EventExecutionEngine;

  /** 已注册的 DOM 事件监听器引用（用于清理） */
  private _domListeners: Map<string, Array<{ type: EventType; element: HTMLElement; handler: EventListener }>> = new Map();

  /** 防抖计时器 */
  private _debounceTimers: Map<string, number> = new Map();

  /** 动作执行器 */
  private _executor: ActionExecutor = NOOP_EXECUTOR;

  /** 调试模式 */
  private _debug = false;

  static getInstance(): EventExecutionEngine {
    if (!EventExecutionEngine.instance) {
      EventExecutionEngine.instance = new EventExecutionEngine();
    }
    return EventExecutionEngine.instance;
  }

  /**
   * 设置动作执行器
   * - 编辑态：注入 NOOP_EXECUTOR 或仅记录日志的执行器
   * - 运行态：注入实际操作执行器
   */
  setExecutor(executor: Partial<ActionExecutor>): void {
    this._executor = { ...NOOP_EXECUTOR, ...executor };
  }

  /** 开启/关闭调试模式 */
  setDebug(enabled: boolean): void {
    this._debug = enabled;
  }

  /**
   * 为图元注册所有事件监听器
   * 在运行态图元挂载完成后调用
   */
  registerGraphicEvents(graphic: IGraphic, element: HTMLElement): void {
    const graphicId = graphic.id;
    // 先清理旧监听器
    this.unregisterGraphicEvents(graphicId);

    const eventHandlers = graphic.events?.eventHandlers;
    if (!eventHandlers) return;

    const listeners: Array<{ type: EventType; element: HTMLElement; handler: EventListener }> = [];

    for (const [eventType, eventDef] of Object.entries(eventHandlers)) {
      const evt = eventDef as IEvent;
      if (!evt || !evt.actions || evt.actions.length === 0) continue;

      const typedEventType = eventType as EventType;

      if (typedEventType === 'vnodeMounted' || typedEventType === 'vnodeBeforeMount') {
        // 生命周期事件不注册 DOM 监听器，由 Vue 组件钩子触发
        continue;
      }

      const handler = this._createDOMHandler(graphic, evt, typedEventType);
      const domEventType = this._toDOMEventType(typedEventType);
      if (domEventType) {
        element.addEventListener(domEventType, handler);
        listeners.push({ type: typedEventType, element, handler });
      }
    }

    this._domListeners.set(graphicId, listeners);
    this._log(`[EventEngine] Registered ${listeners.length} DOM listeners for graphic "${graphicId}"`);
  }

  /**
   * 注销图元的所有事件监听器
   */
  unregisterGraphicEvents(graphicId: string): void {
    const listeners = this._domListeners.get(graphicId);
    if (listeners) {
      for (const { type, element, handler } of listeners) {
        const domEventType = this._toDOMEventType(type);
        if (domEventType) {
          element.removeEventListener(domEventType, handler);
        }
      }
      this._domListeners.delete(graphicId);
    }
    // 清理防抖计时器
    const timerKey = `${graphicId}:debounce`;
    const timer = this._debounceTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this._debounceTimers.delete(timerKey);
    }
  }

  /**
   * 触发生命周期事件（vnodeMounted / vnodeBeforeMount）
   * 由 Vue 组件钩子调用
   */
  triggerLifecycleEvent(graphic: IGraphic, eventType: 'vnodeMounted' | 'vnodeBeforeMount'): void {
    const eventHandlers = graphic.events?.eventHandlers;
    if (!eventHandlers) return;

    const eventDef = eventHandlers[eventType] as IEvent | undefined;
    if (!eventDef || !eventDef.actions || eventDef.actions.length === 0) return;

    this._log(`[EventEngine] Triggering lifecycle event "${eventType}" for graphic "${graphic.id}"`);

    const context = this._buildContext(graphic, eventType, {});
    this._executeActions(eventDef.actions, context);
  }

  /**
   * 评估条件列表（AND 逻辑）
   * 所有条件必须同时满足才返回 true
   */
  evaluateConditions(conditions: IEventCondition[], context: EventContext): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((cond) => {
      const actualValue = this._getNestedValue(context, cond.field);
      return this._compareValues(actualValue, cond.operator, cond.value);
    });
  }

  /**
   * 执行动作列表
   */
  executeActions(actions: IEventAction[], context: EventContext): void {
    this._executeActions(actions, context);
  }

  // ─── 私有方法 ───

  /** 创建 DOM 事件处理器（含防抖） */
  private _createDOMHandler(
    graphic: IGraphic,
    eventDef: IEvent,
    eventType: EventType,
  ): EventListener {
    return (domEvent: Event) => {
      const debounceMs = DEBOUNCE_CONFIG[eventType] ?? 0;

      const execute = () => {
        const context = this._buildContext(graphic, eventType, domEvent);
        this._executeActions(eventDef.actions, context);
      };

      if (debounceMs > 0) {
        const key = `${graphic.id}:debounce`;
        const existing = this._debounceTimers.get(key);
        if (existing) clearTimeout(existing);
        this._debounceTimers.set(key, window.setTimeout(execute, debounceMs));
      } else {
        execute();
      }
    };
  }

  /** 构建事件执行上下文 */
  private _buildContext(graphic: IGraphic, eventType: EventType, domEvent: any): EventContext {
    return {
      graphic: {
        id: graphic.id,
        type: graphic.type,
        config: graphic.config,
        customProps: graphic.config?.customProps || {},
      },
      event: {
        type: eventType,
        timestamp: Date.now(),
        payload: domEvent
          ? {
              clientX: domEvent.clientX,
              clientY: domEvent.clientY,
              pageX: domEvent.pageX,
              pageY: domEvent.pageY,
              target: domEvent.target,
            }
          : {},
      },
      graphics: [],
      dataSource: (graphic as any).dataSource,
    };
  }

  /** 执行动作列表 */
  private _executeActions(actions: IEventAction[], context: EventContext): void {
    for (const action of actions) {
      try {
        // 条件评估
        if (action.conditions && action.conditions.length > 0) {
          if (!this.evaluateConditions(action.conditions, context)) {
            this._log(`[EventEngine] Conditions not met for action "${action.id}", skipping`);
            continue;
          }
        }

        this._dispatchAction(action, context);
      } catch (err) {
        console.error(`[EventEngine] Error executing action "${action.id}":`, err);
      }
    }
  }

  /** 分发单个动作 */
  private _dispatchAction(action: IEventAction, context: EventContext): void {
    this._log(`[EventEngine] Dispatching action "${action.actionType}" (id: ${action.id})`);

    switch (action.actionType) {
      case 'customScript':
        if (action.script) {
          this._executor.executeScript(action.script, context);
        }
        break;

      case 'api':
        this._executor.callApi(action.target, action.value, context);
        break;

      case 'script':
        this._executor.executeBuiltinScript(action.target, action.value, context);
        break;

      case 'show':
        this._executor.showGraphic(action.target);
        break;

      case 'hide':
        this._executor.hideGraphic(action.target);
        break;

      case 'change':
        this._executor.changeProperty(action.target, action.value);
        break;

      case 'navigate':
        this._executor.navigateTo(action.target);
        break;

      case 'alert':
        this._executor.showAlert(action.value);
        break;

      default:
        this._log(`[EventEngine] Unknown action type: "${action.actionType}"`);
    }
  }

  /** 获取嵌套属性值 */
  private _getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  }

  /** 比较值 */
  private _compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equal': return actual === expected;
      case 'notEqual': return actual !== expected;
      case 'greaterThan': return Number(actual) > Number(expected);
      case 'lessThan': return Number(actual) < Number(expected);
      case 'greaterThanOrEqual': return Number(actual) >= Number(expected);
      case 'lessThanOrEqual': return Number(actual) <= Number(expected);
      case 'contains': return String(actual).includes(String(expected));
      case 'notContains': return !String(actual).includes(String(expected));
      default: return false;
    }
  }

  /** EventType → DOM 事件名映射 */
  private _toDOMEventType(eventType: EventType): string | null {
    switch (eventType) {
      case 'click': return 'click';
      case 'dblclick': return 'dblclick';
      case 'mouseenter': return 'mouseenter';
      case 'mouseleave': return 'mouseleave';
      case 'vnodeMounted':
      case 'vnodeBeforeMount':
        return null; // 生命周期事件，不映射 DOM 事件
      default: return null;
    }
  }

  private _log(message: string): void {
    if (this._debug) {
      console.debug(message);
    }
  }
}