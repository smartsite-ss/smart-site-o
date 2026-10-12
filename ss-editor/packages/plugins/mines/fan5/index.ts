// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import Fan5ConfigComponent from './Fan5Config.vue';
import { Fan5Plugin } from './Fan5Plugin';
import { fan5PropertySchema } from './fan5PropertySchema';
import Fan5GraphicComponent from './Fan5Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Fan5Config = Fan5ConfigComponent;
export const Fan5Graphic = Fan5GraphicComponent;
export { Fan5Plugin, fan5PropertySchema };
export type { Fan5Props } from './Fan5Plugin';

export default createPlugin({
  type: 'fan5',
  category: 'mines',
  label: () => i18n.global.t('fan5.label'),
  plugin: Fan5Plugin,
  schema: fan5PropertySchema,
  defaultWidth: 140,
  defaultHeight: 210,
  config: Fan5ConfigComponent,
  graphicComponent: Fan5GraphicComponent,
  graphicComponentName: 'Fan5Graphic',
});