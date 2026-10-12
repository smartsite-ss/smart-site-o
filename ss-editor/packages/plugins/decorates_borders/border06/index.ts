// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border06ConfigComponent from './Border06Config.vue';
import { Border06Plugin } from './Border06Plugin';
import { schema } from './border06PropertySchema';
import Border06GraphicComponent from './Border06Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border06Config = Border06ConfigComponent;
export const Border06Graphic = Border06GraphicComponent;
export { Border06Plugin, schema };
export type { Border06Props } from './Border06Plugin';

export default createPlugin({
  type: 'border06',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border06.label'),
  plugin: Border06Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border06ConfigComponent,
  graphicComponent: Border06GraphicComponent,
  graphicComponentName: 'Border06Graphic',
});