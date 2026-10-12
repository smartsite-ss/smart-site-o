// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IRenderer } from '../types/IRenderer';
import { RenderBackend } from '../types/RenderBackend';
import type { IPluginInstance } from '../types/IPluginInstance';

interface ThreeLikePlugin {
  mount(container: HTMLElement): void | Promise<void>;
  unmount(): void;
  update(props: Record<string, any>): void;
  updateGeometry(x: number, y: number, w: number, h: number): void;
  loadScene?(THREE: any, scene: any, camera: any): void | Promise<void>;
}

export class ThreeRenderer implements IRenderer {
  readonly backend = RenderBackend.THREE_3D;

  mount(container: HTMLElement, element: IPluginInstance): void {
    const plugin = element as unknown as ThreeLikePlugin;
    if (typeof plugin.mount === 'function') {
      const result = plugin.mount(container);
      if (result instanceof Promise) {
        result.catch((err: Error) =>
          console.error('[ThreeRenderer] mount failed:', err),
        );
      }
    }
  }

  unmount(element: IPluginInstance): void {
    const plugin = element as unknown as ThreeLikePlugin;
    if (typeof plugin.unmount === 'function') {
      plugin.unmount();
    }
  }

  update(element: IPluginInstance, props: Record<string, any>): void {
    const plugin = element as unknown as ThreeLikePlugin;
    if (typeof plugin.update === 'function') {
      plugin.update(props);
    }
  }

  updateGeometry(element: IPluginInstance, x: number, y: number, w: number, h: number): void {
    const plugin = element as unknown as ThreeLikePlugin;
    if (typeof plugin.updateGeometry === 'function') {
      plugin.updateGeometry(x, y, w, h);
    }
  }
}