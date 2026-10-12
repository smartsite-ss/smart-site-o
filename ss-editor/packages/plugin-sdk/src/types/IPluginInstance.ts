// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { DrawContext } from './DrawContext';

export interface IPluginInstance {
  readonly type: string;

  readonly props: Readonly<Record<string, any>>;

  mount(container: HTMLElement): void;
  unmount(): void;
  update(props: Partial<Record<string, any>>): void;
  updateGeometry(x: number, y: number, w: number, h: number): void;

  render?(dc: DrawContext): void;

  getDomElement?(): HTMLElement | null;
}