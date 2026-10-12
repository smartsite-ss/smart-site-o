// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border03ConfigComponent from './Border03Config.vue';
import { Border03Plugin } from './Border03Plugin';
import { schema } from './border03PropertySchema';
import Border03GraphicComponent from './Border03Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border03Config = Border03ConfigComponent;
export const Border03Graphic = Border03GraphicComponent;
export { Border03Plugin, schema };
export type { Border03Props } from './Border03Plugin';

export default createPlugin({
  type: 'border03',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border03.label'),
  plugin: Border03Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border03ConfigComponent,
  graphicComponent: Border03GraphicComponent,
  graphicComponentName: 'Border03Graphic',
});