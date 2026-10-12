// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import Fan4ConfigComponent from './Fan4Config.vue';
import { Fan4Plugin } from './Fan4Plugin';
import { fan4PropertySchema } from './fan4PropertySchema';
import Fan4GraphicComponent from './Fan4Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Fan4Config = Fan4ConfigComponent;
export const Fan4Graphic = Fan4GraphicComponent;
export { Fan4Plugin, fan4PropertySchema };
export type { Fan4Props } from './Fan4Plugin';

export default createPlugin({
  type: 'fan4',
  category: 'mines',
  label: () => i18n.global.t('fan4.label'),
  plugin: Fan4Plugin,
  schema: fan4PropertySchema,
  defaultWidth: 175,
  defaultHeight: 210,
  config: Fan4ConfigComponent,
  graphicComponent: Fan4GraphicComponent,
  graphicComponentName: 'Fan4Graphic',
});