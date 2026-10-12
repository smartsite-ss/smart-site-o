// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border01ConfigComponent from './Border01Config.vue';
import { Border01Plugin } from './Border01Plugin';
import { border01PropertySchema } from './border01PropertySchema';
import Border01GraphicComponent from './Border01Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border01Config = Border01ConfigComponent;
export const Border01Graphic = Border01GraphicComponent;
export { Border01Plugin, border01PropertySchema };
export type { Border01Props } from './Border01Plugin';

export default createPlugin({
  type: 'border01',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border01.label'),
  plugin: Border01Plugin,
  schema: border01PropertySchema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border01ConfigComponent,
  graphicComponent: Border01GraphicComponent,
  graphicComponentName: 'Border01Graphic',
});