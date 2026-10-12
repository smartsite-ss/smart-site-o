// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Head03ConfigComponent from './Head03Config.vue';
import { Head03Plugin } from './Head03Plugin';
import { schema } from './head03PropertySchema';
import Head03GraphicComponent from './Head03Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Head03Config = Head03ConfigComponent;
export const Head03Graphic = Head03GraphicComponent;
export { Head03Plugin, schema };
export type { Head03Props } from './Head03Plugin';

export default createPlugin({
  type: 'head03',
  category: 'decorates_head',
  version: pkg.version,
  label: () => i18n.global.t('head03.label'),
  plugin: Head03Plugin,
  schema,
  defaultWidth: 500,
  defaultHeight: 70,
  config: Head03ConfigComponent,
  graphicComponent: Head03GraphicComponent,
  graphicComponentName: 'Head03Graphic',
});