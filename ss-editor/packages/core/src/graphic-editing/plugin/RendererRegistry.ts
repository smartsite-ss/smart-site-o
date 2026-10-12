// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { RenderBackend } from '@scada-editor/plugin-sdk';
import type { IRenderer, IPluginInstance } from '@scada-editor/plugin-sdk';
import type { BasePlugin } from '@scada-editor/plugin-sdk';
import type { DrawContext } from '@scada-editor/plugin-sdk';

/**
 * 渲染器注册表 —— 统一管理 5 种渲染方式的 IRenderer 实例
 *
 * 设计原则：
 *   - 每种 RenderBackend 只有一个 IRenderer 实例（共享资源）
 *   - Canvas 2D 是内置渲染方式，通过适配器桥接现有 BasePlugin 体系
 *   - Vue/SVG/CSS/Three.js 通过 register() 动态注册
 *   - 三层混合容器在编辑器中负责 DOM Overlay 层的 pan/zoom 同步
 */
export class RendererRegistry {
  private static _renderers = new Map<RenderBackend, IRenderer>();

  /**
   * 注册渲染器实例
   */
  static register(renderer: IRenderer): void {
    if (this._renderers.has(renderer.backend)) {
      console.warn(`[RendererRegistry] Renderer for "${renderer.backend}" already registered, overwriting.`);
    }
    this._renderers.set(renderer.backend, renderer);
  }

  /**
   * 获取指定后端的渲染器
   */
  static getRenderer(backend: RenderBackend): IRenderer | null {
    return this._renderers.get(backend) ?? null;
  }

  /**
   * 检查某后端渲染器是否已注册
   */
  static hasRenderer(backend: RenderBackend): boolean {
    return this._renderers.has(backend);
  }

  /**
   * 注销渲染器
   */
  static unregister(backend: RenderBackend): void {
    this._renderers.delete(backend);
  }

  /**
   * 获取所有已注册的后端类型
   */
  static getRegisteredBackends(): RenderBackend[] {
    return Array.from(this._renderers.keys());
  }

  /**
   * 渲染单个图元到指定后端
   * - Canvas 2D: 使用 render(dc) 直接绘制
   * - DOM 类型: 使用 mount/unmount 管理 DOM 元素
   */
  static renderPlugin(plugin: BasePlugin<any>, dc: DrawContext): void {
    (plugin as unknown as { render(dc: DrawContext): void }).render(dc);
  }

  /**
   * 判断图元实例使用的后端类型
   * 优先级：Vue > SVG > CSS > Three > Canvas 2D (render 作为兜底)
   */
  static getBackendForPlugin(plugin: IPluginInstance): RenderBackend {
    // 先检查特定渲染后端（它们可能有 render 方法供编辑器使用，但运行态应使用专用后端）
    if (typeof (plugin as any).getComponent === 'function') {
      return RenderBackend.VUE_COMPONENT;
    }
    if (typeof (plugin as any).getSvgTemplate === 'function') {
      return RenderBackend.SVG_DOM;
    }
    if (typeof (plugin as any).getHtmlTemplate === 'function') {
      return RenderBackend.CSS_DOM;
    }
    if (typeof (plugin as any).loadScene === 'function') {
      return RenderBackend.THREE_3D;
    }
    // Canvas 2D 作为兜底：任何有 render 方法的组件都归类为 Canvas 2D
    if (typeof (plugin as any).render === 'function') {
      return RenderBackend.CANVAS_2D;
    }
    return RenderBackend.CANVAS_2D;
  }

  /**
   * 清空所有注册（用于测试重置）
   */
  static reset(): void {
    this._renderers.clear();
  }
}