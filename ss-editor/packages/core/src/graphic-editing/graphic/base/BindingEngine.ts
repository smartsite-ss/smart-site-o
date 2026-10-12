// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IPageContext } from './IPageContext';
import type { IGraphic } from '@scada-editor/plugin-sdk';
import type { IGraphicBinding } from './IGraphicBinding';
import { eventBus, Events } from '../../../utils/event/eventBus';

export class BindingEngine {
  private graphicDisposers = new Map<string, (() => void)[]>();

  constructor(private pageContext: IPageContext) {}

  attach(graphic: IGraphic, depth: number = 0): void {
    if (depth > 10) {
      console.warn(`[BindingEngine] 检测到循环绑定，图元: ${graphic.id}`);
      return;
    }

    const bindings = this.getBindings(graphic);
    if (!bindings || bindings.length === 0) return;

    const disposers: (() => void)[] = [];

    for (const binding of bindings) {
      const source = this.resolveSource(graphic, binding);
      if (!source) continue;

      const handler = () => {
        const sourceValue = this.readPath(source, binding.sourcePath);
        if (!this.evaluateCondition(binding.condition, source)) return;

        const target = this.resolveTarget(binding);
        if (!target) return;

        const finalValue = this.applyTransform(sourceValue, binding.transform);
        target.setProps(binding.targetPath, finalValue);
        target.onDataChanged?.({ field: binding.targetPath, value: finalValue, source: source.id });
      };

      eventBus.on(Events.GRAPHIC_UPDATED, (payload: { graphicId: string }) => {
        if (payload.graphicId === source.id) {
          handler();
        }
      });

      const dispose = () => {
        eventBus.off(Events.GRAPHIC_UPDATED, handler as any);
      };
      disposers.push(dispose);

      handler();
    }

    this.graphicDisposers.set(graphic.id, disposers);
  }

  detach(graphicId: string): void {
    const disposers = this.graphicDisposers.get(graphicId);
    if (disposers) {
      for (const dispose of disposers) {
        dispose();
      }
      this.graphicDisposers.delete(graphicId);
    }
  }

  private getBindings(graphic: IGraphic): IGraphicBinding[] | null {
    try {
      return graphic.getProps<IGraphicBinding[]>('bindings', []);
    } catch {
      return null;
    }
  }

  private resolveSource(graphic: IGraphic, binding: IGraphicBinding): IGraphic | null {
    if (binding.sourceId === 'self') return graphic;
    return this.pageContext.getGraphicById(binding.sourceId) ?? null;
  }

  private resolveTarget(binding: IGraphicBinding): IGraphic | null {
    if (binding.targetId === 'self') return null;
    return this.pageContext.getGraphicById(binding.targetId) ?? null;
  }

  private readPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current: any = obj;
    for (const p of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current.getProps === 'function' && p === path.split('.')[0]) {
        return current.getProps(parts.slice(1).join('.'));
      }
      current = current[p];
    }
    return current;
  }

  private applyTransform(value: any, transform?: string | ((v: any) => any)): any {
    if (!transform) return value;
    if (typeof transform === 'function') return transform(value);

    const builtin: Record<string, (v: any) => any> = {
      multiply100: (v) => Number(v) * 100,
      divide100: (v) => Number(v) / 100,
      negate: (v) => !v,
      toString: (v: any) => String(v),
      toNumber: (v) => Number(v),
      uppercase: (v) => String(v).toUpperCase(),
      lowercase: (v) => String(v).toLowerCase(),
    };
    return builtin[transform]?.(value) ?? value;
  }

  private evaluateCondition(
    condition: IGraphicBinding['condition'],
    source: IGraphic
  ): boolean {
    if (!condition) return true;

    const fieldValue = source.getProps(condition.field);
    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'gt':
        return Number(fieldValue) > Number(condition.value);
      case 'lt':
        return Number(fieldValue) < Number(condition.value);
      case 'gte':
        return Number(fieldValue) >= Number(condition.value);
      case 'lte':
        return Number(fieldValue) <= Number(condition.value);
      default:
        return true;
    }
  }
}