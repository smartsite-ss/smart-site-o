// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import Fan2ConfigComponent from './Fan2Config.vue';
import { Fan2Plugin } from './Fan2Plugin';
import { fan2PropertySchema } from './fan2PropertySchema';
import Fan2GraphicComponent from './Fan2Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Fan2Config = Fan2ConfigComponent;
export const Fan2Graphic = Fan2GraphicComponent;
export { Fan2Plugin, fan2PropertySchema };
export type { Fan2Props } from './Fan2Plugin';

export default createPlugin({
  type: 'fan2',
  category: 'mines',
  label: () => i18n.global.t('fan2.label'),
  plugin: Fan2Plugin,
  schema: fan2PropertySchema,
  defaultWidth: 120,
  defaultHeight: 110,
  config: Fan2ConfigComponent,
  graphicComponent: Fan2GraphicComponent,
  graphicComponentName: 'Fan2Graphic',
});