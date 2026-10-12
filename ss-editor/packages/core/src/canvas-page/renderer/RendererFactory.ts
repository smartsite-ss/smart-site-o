// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IRenderer, RenderMode, RenderOptions, RendererConstructor } from './types';

export class RendererFactory {
  private static renderers = new Map<RenderMode, RendererConstructor>();

  static registerRenderer(type: RenderMode, constructor: RendererConstructor): void {
    this.renderers.set(type, constructor);
  }

  static create(type: RenderMode, container: HTMLElement, options?: RenderOptions): IRenderer {
    const constructor = this.renderers.get(type);
    if (!constructor) {
      throw new Error(`Renderer type "${type}" not registered`);
    }
    return new constructor(container, options);
  }

  static getAvailableRenderers(): RenderMode[] {
    return Array.from(this.renderers.keys());
  }

  static isRendererAvailable(type: RenderMode): boolean {
    return this.renderers.has(type);
  }
}