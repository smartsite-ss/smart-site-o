// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { BasePlugin, PluginPropertySchema } from '@scada-editor/plugin-sdk';
import { createMockDrawContext } from './MockDrawContext';

export async function renderToBuffer(
  PluginClass: new (...args: any[]) => BasePlugin<any>,
  width: number,
  height: number,
): Promise<Buffer | null> {
  try {
    const plugin = new PluginClass(0, 0, width, height);
    const { dc } = createMockDrawContext(width, height);
    (plugin as any).render(dc);
    return null;
  } catch {
    return null;
  }
}

export async function compareRenderSnapshot(
  PluginClass: new (...args: any[]) => BasePlugin<any>,
  _schema: PluginPropertySchema,
  propertyChanges: Record<string, any>,
  width = 100,
  height = 100,
): Promise<{ before: string[]; after: string[] }> {
  const beforePlugin = new PluginClass(0, 0, width, height) as BasePlugin<any>;
  const { dc: dcBefore, calls: callsBefore } = createMockDrawContext(width, height);
  (beforePlugin as any).render(dcBefore);

  const afterPlugin = new PluginClass(0, 0, width, height) as BasePlugin<any>;
  (afterPlugin as any).setPluginProps(propertyChanges);
  const { dc: dcAfter, calls: callsAfter } = createMockDrawContext(width, height);
  (afterPlugin as any).render(dcAfter);

  return {
    before: callsBefore,
    after: callsAfter,
  };
}