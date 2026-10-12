// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import ConfigComponent from './Head06Config.vue';
import { Head06Plugin } from './Head06Plugin';
import { schema } from './head06PropertySchema';
import GraphicComponent from './Head06Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Head06Config = ConfigComponent;
export const Head06Graphic = GraphicComponent;
export { Head06Plugin, schema };
export type { Head06Props } from './Head06Plugin';

export default createPlugin({
  type: 'head06',
  category: 'decorates_head',
  version: pkg.version,
  label: () => i18n.global.t('head06.label'),
  plugin: Head06Plugin,
  schema,
  defaultWidth: 500,
  defaultHeight: 70,
  config: ConfigComponent,
  graphicComponent: GraphicComponent,
  graphicComponentName: 'Head06Graphic',
});