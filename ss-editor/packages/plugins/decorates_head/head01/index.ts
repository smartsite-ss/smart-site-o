// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Head01ConfigComponent from './Head01Config.vue';
import { Head01Plugin } from './Head01Plugin';
import { schema } from './head01PropertySchema';
import Head01GraphicComponent from './Head01Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Head01Config = Head01ConfigComponent;
export const Head01Graphic = Head01GraphicComponent;
export { Head01Plugin, schema };
export type { Head01Props } from './Head01Plugin';

export default createPlugin({
  type: 'head01',
  category: 'decorates_head',
  version: pkg.version,
  label: () => i18n.global.t('head01.label'),
  plugin: Head01Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 30,
  config: Head01ConfigComponent,
  graphicComponent: Head01GraphicComponent,
  graphicComponentName: 'Head01Graphic',
});