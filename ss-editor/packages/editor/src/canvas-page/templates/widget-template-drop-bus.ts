// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 组件模板拖拽放置事件总线
 *
 * 解耦画布（useDragDrop）与组件模板面板（WidgetTemplatePanel）：
 * 画布 drop 检测到 `application/x-widget-template` 后通过 emitWidgetTemplateDrop
 * 广播模板 id 与画布逻辑坐标，由面板订阅并完成读取/变量赋值/实例化。
 */

export interface WidgetTemplateDropPayload {
  templateId: string;
  /** 画布逻辑坐标（已换算，未做网格吸附） */
  logicalPos: { x: number; y: number };
}

export const WIDGET_TEMPLATE_MIME = 'application/x-widget-template';

type DropHandler = (payload: WidgetTemplateDropPayload) => void;

const handlers = new Set<DropHandler>();

export function emitWidgetTemplateDrop(payload: WidgetTemplateDropPayload): void {
  handlers.forEach((h) => {
    try {
      h(payload);
    } catch (err) {
      console.error('[WidgetTemplateDropBus] handler 执行失败', err);
    }
  });
}

/** 订阅 drop 事件，返回取消订阅函数 */
export function onWidgetTemplateDrop(handler: DropHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}
