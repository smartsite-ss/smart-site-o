// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IRenderer } from '../types/IRenderer';
import { RenderBackend } from '../types/RenderBackend';
import type { IPluginInstance } from '../types/IPluginInstance';
import type { CssDomPlugin } from '../base/CssDomPlugin';

export class CssDomRenderer implements IRenderer {
  readonly backend = RenderBackend.CSS_DOM;

  mount(container: HTMLElement, element: IPluginInstance): void {
    const plugin = element as unknown as CssDomPlugin<any>;
    if (typeof plugin.mount === 'function') {
      plugin.mount(container);
    }
  }

  unmount(element: IPluginInstance): void {
    const plugin = element as unknown as CssDomPlugin<any>;
    if (typeof plugin.unmount === 'function') {
      plugin.unmount();
    }
  }

  update(element: IPluginInstance, props: Record<string, any>): void {
    const plugin = element as unknown as CssDomPlugin<any>;
    if (typeof plugin.update === 'function') {
      plugin.update(props);
    }
  }

  updateGeometry(element: IPluginInstance, x: number, y: number, w: number, h: number): void {
    const plugin = element as unknown as CssDomPlugin<any>;
    if (typeof plugin.updateGeometry === 'function') {
      plugin.updateGeometry(x, y, w, h);
    }
  }
}