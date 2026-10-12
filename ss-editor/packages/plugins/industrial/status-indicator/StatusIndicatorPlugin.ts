// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { statusIndicatorPropertySchema } from './statusIndicatorPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type StatusIndicatorProps = InferSchemaProps<typeof statusIndicatorPropertySchema> & {
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
};

const defaultIndicatorProps: StatusIndicatorProps = {
  ...buildDefaultsFromSchema(statusIndicatorPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as StatusIndicatorProps;

@Graphic({
  type: 'status-indicator',
  name: i18n.global.t('statusIndicator.label'),
  category: 'industrial',
  primaryCategory: 'industrial',
  description: i18n.global.t('statusIndicator.description'),
  defaultProps: defaultIndicatorProps,
  defaultWidth: 40,
  defaultHeight: 40,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class StatusIndicatorPlugin extends BasePlugin<StatusIndicatorProps> {
  componentName = 'StatusIndicatorGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  constructor(x = 0, y = 0, w = 40, h = 40) {
    super('status-indicator', x, y, w, h);
    this.setDefaultProps({ ...defaultIndicatorProps });
  }

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成（见 StatusIndicatorGraphic.vue）
  }
}
