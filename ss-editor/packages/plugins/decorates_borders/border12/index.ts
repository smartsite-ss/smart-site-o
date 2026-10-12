// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border12ConfigComponent from './Border12Config.vue';
import { Border12Plugin } from './Border12Plugin';
import { schema } from './border12PropertySchema';
import Border12GraphicComponent from './Border12Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border12Config = Border12ConfigComponent;
export const Border12Graphic = Border12GraphicComponent;
export { Border12Plugin, schema };
export type { Border12Props } from './Border12Plugin';

export default createPlugin({
  type: 'border12',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border12.label'),
  plugin: Border12Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border12ConfigComponent,
  graphicComponent: Border12GraphicComponent,
  graphicComponentName: 'Border12Graphic',
});