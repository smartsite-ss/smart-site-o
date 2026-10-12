// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border04ConfigComponent from './Border04Config.vue';
import { Border04Plugin } from './Border04Plugin';
import { schema } from './border04PropertySchema';
import Border04GraphicComponent from './Border04Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border04Config = Border04ConfigComponent;
export const Border04Graphic = Border04GraphicComponent;
export { Border04Plugin, schema };
export type { Border04Props } from './Border04Plugin';

export default createPlugin({
  type: 'border04',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border04.label'),
  plugin: Border04Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border04ConfigComponent,
  graphicComponent: Border04GraphicComponent,
  graphicComponentName: 'Border04Graphic',
});