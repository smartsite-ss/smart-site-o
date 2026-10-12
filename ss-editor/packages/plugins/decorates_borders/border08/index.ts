// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border08ConfigComponent from './Border08Config.vue';
import { Border08Plugin } from './Border08Plugin';
import { schema } from './border08PropertySchema';
import Border08GraphicComponent from './Border08Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border08Config = Border08ConfigComponent;
export const Border08Graphic = Border08GraphicComponent;
export { Border08Plugin, schema };
export type { Border08Props } from './Border08Plugin';

export default createPlugin({
  type: 'border08',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border08.label'),
  plugin: Border08Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border08ConfigComponent,
  graphicComponent: Border08GraphicComponent,
  graphicComponentName: 'Border08Graphic',
});