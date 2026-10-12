// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border02ConfigComponent from './Border02Config.vue';
import { Border02Plugin } from './Border02Plugin';
import { schema } from './border02PropertySchema';
import Border02GraphicComponent from './Border02Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border02Config = Border02ConfigComponent;
export const Border02Graphic = Border02GraphicComponent;
export { Border02Plugin, schema };
export type { Border02Props } from './Border02Plugin';

export default createPlugin({
  type: 'border02',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border02.label'),
  plugin: Border02Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border02ConfigComponent,
  graphicComponent: Border02GraphicComponent,
  graphicComponentName: 'Border02Graphic',
});