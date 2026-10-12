// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';

export type EventType = 
  | 'graphic-added'
  | 'graphic-removed'
  | 'graphic-selected'
  | 'graphic-updated'
  | 'graphic-moved'
  | 'graphic-resized'
  | 'page-added'
  | 'page-removed'
  | 'page-switched'
  | 'page-updated'
  | 'canvas-zoomed'
  | 'canvas-panned'
  | 'canvas-resized'
  | 'selection-changed'
  | 'selection-cleared'
  | 'undo'
  | 'redo'
  | 'copy'
  | 'paste'
  | 'cut'
  | 'delete'
  | 'layout-changed'
  | 'alignment-changed'
  | 'distribution-changed'
  | 'group-created'
  | 'group-destroyed'
  | 'group-moved'
  | 'group-scaled'
  | 'group-rotated'
  | 'group-edit-mode-changed'
  | 'export-started'
  | 'export-completed'
  | 'export-failed'
  | 'share-link-generated'
  | 'project-loaded'
  | 'settings-changed'
  | 'theme-changed'
  | 'auto-save';

/**
 * 默认高频事件节流配置（单位：毫秒）
 * 高频事件（拖拽/缩放/移动）启用节流以降低 CPU 开销
 * 低频事件（点击/选择/撤销）不节流以保证即时响应
 */
export const DEFAULT_THROTTLE_CONFIG: Partial<Record<EventType, number>> = {
  // 拖拽/移动类高频事件 ~30fps
  'graphic-moved': 32,
  'graphic-resized': 32,
  'canvas-panned': 32,
  'canvas-zoomed': 50,
  'group-moved': 32,
  'group-scaled': 32,
  'group-rotated': 32,
  // 属性更新类 ~30fps
  'graphic-updated': 32,
  // 选择变更（中等频率，允许稍作合并）
  'selection-changed': 16,
};

export interface EventPayload {
  'graphic-added': { graphic: IGraphic; pageId: string };
  'graphic-removed': { graphicId: string; pageId: string };
  'graphic-selected': { graphicId: string | null; pageId: string };
  'graphic-updated': { graphicId: string; changes: Partial<Record<string, any>>; pageId: string };
  'graphic-moved': { graphicId: string; x: number; y: number; pageId: string };
  'graphic-resized': { graphicId: string; width: number; height: number; pageId: string };
  'page-added': { pageId: string; projectId: string };
  'page-removed': { pageId: string; projectId: string };
  'page-switched': { pageId: string; projectId: string };
  'page-updated': { pageId: string; changes: Partial<Record<string, any>> };
  'canvas-zoomed': { scale: number; centerX: number; centerY: number };
  'canvas-panned': { x: number; y: number };
  'canvas-resized': { width: number; height: number };
  'selection-changed': { selectedIds: string[]; pageId: string };
  'selection-cleared': { pageId: string };
  'undo': Record<string, never>;
  'redo': Record<string, never>;
  'copy': { graphicIds: string[]; pageId: string };
  'paste': { graphicIds: string[]; pageId: string };
  'cut': { graphicIds: string[]; pageId: string };
  'delete': { graphicIds: string[]; pageId: string };
  'layout-changed': { layoutType: string };
  'alignment-changed': { alignment: string };
  'distribution-changed': { direction: 'horizontal' | 'vertical' };
  'group-created': { groupId: string; memberIds: string[] };
  'group-destroyed': { groupId: string };
  'group-moved': { groupId: string; dx: number; dy: number; pageId: string };
  'group-scaled': { groupId: string; scaleX: number; scaleY: number; pageId: string };
  'group-rotated': { groupId: string; angle: number; pageId: string };
  'group-edit-mode-changed': { pageId: string; groupId: string | null; active: boolean };
  'export-started': { format: string };
  'export-completed': { format: string; data: string };
  'export-failed': { format: string; error: Error };
  'share-link-generated': { url: string };
  'project-loaded': { projectId: string };
  'settings-changed': { settings: Record<string, any> };
  'theme-changed': { themeName: string };
  'auto-save': { projectId: string };
}

/**
 * 带类型安全和节流功能的事件总线
 * 
 * 性能优化：
 * - 支持按事件类型配置节流间隔
 * - 使用 performance.now() 高精度时间戳
 * - 仅跳过回调调用，不影响事件数据本身
 */
export class TypedEventBus {
  private listeners = new Map<EventType, Set<(...args: any[]) => any>>();
  private onceListeners = new Map<EventType, Set<(...args: any[]) => any>>();

  /** 节流配置：事件类型 → 最小触发间隔(ms) */
  private throttleConfig: Map<EventType, number> = new Map();
  /** 上次触发时间记录 */
  private lastEmitTime: Map<EventType, number> = new Map();

  constructor(throttleConfig?: Partial<Record<EventType, number>>) {
    if (throttleConfig) {
      for (const [event, interval] of Object.entries(throttleConfig)) {
        this.throttleConfig.set(event as EventType, interval);
      }
    }
    // 合并默认节流配置（用户配置可覆盖默认值）
    for (const [event, interval] of Object.entries(DEFAULT_THROTTLE_CONFIG)) {
      if (!this.throttleConfig.has(event as EventType)) {
        this.throttleConfig.set(event as EventType, interval);
      }
    }
  }

  /**
   * 配置指定事件的节流间隔
   * @param event 事件类型
   * @param intervalMs 节流间隔（毫秒），0 表示禁用节流
   */
  configureThrottle<T extends EventType>(event: T, intervalMs: number): void {
    if (intervalMs <= 0) {
      this.throttleConfig.delete(event);
    } else {
      this.throttleConfig.set(event, intervalMs);
    }
  }

  /**
   * 获取事件的当前节流配置
   */
  getThrottleInterval(event: EventType): number | undefined {
    return this.throttleConfig.get(event);
  }

  /**
   * 清除所有节流配置
   */
  clearThrottle(): void {
    this.throttleConfig.clear();
    this.lastEmitTime.clear();
  }

  on<T extends EventType>(type: T, handler: (payload: EventPayload[T]) => void): void {
    const handlers = this.listeners.get(type) || new Set();
    handlers.add(handler);
    this.listeners.set(type, handlers);
  }

  off<T extends EventType>(type: T, handler: (payload: EventPayload[T]) => void): void {
    this.listeners.get(type)?.delete(handler);
    this.onceListeners.get(type)?.delete(handler);
  }

  emit<T extends EventType>(type: T, payload: EventPayload[T]): void {
    // ====== 节流检查 ======
    const throttleInterval = this.throttleConfig.get(type);
    if (throttleInterval !== undefined && throttleInterval > 0) {
      const now = performance.now();
      const lastEmit = this.lastEmitTime.get(type) ?? 0;
      if (now - lastEmit < throttleInterval) {
        return; // 节流跳过本次触发
      }
      this.lastEmitTime.set(type, now);
    }

    // 正常分发到持久监听器
    this.listeners.get(type)?.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in event callback for ${type}:`, error);
      }
    });

    // 分发到一次性监听器
    this.onceListeners.get(type)?.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in once event callback for ${type}:`, error);
      }
    });
    this.onceListeners.delete(type);
  }

  once<T extends EventType>(type: T, handler: (payload: EventPayload[T]) => void): void {
    const handlers = this.onceListeners.get(type) || new Set();
    handlers.add(handler);
    this.onceListeners.set(type, handlers);
  }

  clear(type?: EventType): void {
    if (type) {
      this.listeners.delete(type);
      this.onceListeners.delete(type);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  getListenerCount(type: EventType): number {
    return (this.listeners.get(type)?.size || 0) + (this.onceListeners.get(type)?.size || 0);
  }

  getActiveEvents(): EventType[] {
    return Array.from(this.listeners.keys()).filter(type => 
      (this.listeners.get(type)?.size || 0) > 0 || 
      (this.onceListeners.get(type)?.size || 0) > 0
    );
  }
}

/** 默认实例（带默认节流配置） */
export const typedEventBus = new TypedEventBus(DEFAULT_THROTTLE_CONFIG);

class EventBus {
  private events: Record<string, Array<(data: any) => void>> = {};

  on(event: string, callback: (data: any) => void): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
  }

  emit(event: string, data?: any): void {
    if (this.events[event]) {
      this.events[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  once(event: string, callback: (data: any) => void): void {
    const onceCallback = (data: any) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }

  clear(): void {
    this.events = {};
  }

  getEventCount(event: string): number {
    return this.events[event]?.length || 0;
  }
}

export const eventBus = new EventBus();

export enum Events {
  GRAPHIC_ADDED = 'graphic_added',
  GRAPHIC_REMOVED = 'graphic_removed',
  GRAPHIC_SELECTED = 'graphic_selected',
  GRAPHIC_UPDATED = 'graphic_updated',
  GRAPHIC_MOVED = 'graphic_moved',
  GRAPHIC_RESIZED = 'graphic_resized',
  PAGE_ADDED = 'page_added',
  PAGE_REMOVED = 'page_removed',
  PAGE_SWITCHED = 'page_switched',
  PAGE_UPDATED = 'page_updated',
  CANVAS_ZOOMED = 'canvas_zoomed',
  CANVAS_PANNED = 'canvas_panned',
  CANVAS_RESIZED = 'canvas_resized',
  SELECTION_CHANGED = 'selection_changed',
  SELECTION_CLEARED = 'selection_cleared',
  UNDO = 'undo',
  REDO = 'redo',
  COPY = 'copy',
  PASTE = 'paste',
  CUT = 'cut',
  DELETE = 'delete',
  LAYOUT_CHANGED = 'layout_changed',
  ALIGNMENT_CHANGED = 'alignment_changed',
  DISTRIBUTION_CHANGED = 'distribution_changed',
  GROUP_CREATED = 'group_created',
  GROUP_DELETED = 'group_deleted',
  GROUP_UPDATED = 'group_updated',
  GROUP_TRANSFORMED = 'group_transformed',
  GROUP_MOVED = 'group_moved',
  GROUP_SCALED = 'group_scaled',
  GROUP_ROTATED = 'group_rotated',
  GROUP_EDIT_MODE_CHANGED = 'group_edit_mode_changed',
  EXPORT_STARTED = 'export_started',
  EXPORT_COMPLETED = 'export_completed',
  EXPORT_FAILED = 'export_failed',
  SHARE_LINK_GENERATED = 'share_link_generated',
  PROJECT_LOADED = 'project_loaded',
  SETTINGS_CHANGED = 'settings_changed',
  THEME_CHANGED = 'theme_changed',
  AUTO_SAVE = 'auto_save',
}