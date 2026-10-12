// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { RenderBackend } from './RenderBackend';
import type { IPluginInstance } from './IPluginInstance';

export interface IRenderer {
  readonly backend: RenderBackend;

  mount(container: HTMLElement, element: IPluginInstance): void;
  unmount(element: IPluginInstance): void;
  update(element: IPluginInstance, props: Record<string, any>): void;
  updateGeometry(element: IPluginInstance, x: number, y: number, w: number, h: number): void;
}