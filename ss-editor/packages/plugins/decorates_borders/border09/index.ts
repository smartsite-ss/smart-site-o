// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border09ConfigComponent from './Border09Config.vue';
import { Border09Plugin } from './Border09Plugin';
import { schema } from './border09PropertySchema';
import Border09GraphicComponent from './Border09Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border09Config = Border09ConfigComponent;
export const Border09Graphic = Border09GraphicComponent;
export { Border09Plugin, schema };
export type { Border09Props } from './Border09Plugin';

export default createPlugin({
  type: 'border09',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border09.label'),
  plugin: Border09Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border09ConfigComponent,
  graphicComponent: Border09GraphicComponent,
  graphicComponentName: 'Border09Graphic',
});