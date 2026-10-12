// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import ConfigComponent from './Head04Config.vue';
import { Head04Plugin } from './Head04Plugin';
import { schema } from './head04PropertySchema';
import GraphicComponent from './Head04Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Head04Config = ConfigComponent;
export const Head04Graphic = GraphicComponent;
export { Head04Plugin, schema };
export type { Head04Props } from './Head04Plugin';

export default createPlugin({
  type: 'head04',
  category: 'decorates_head',
  version: pkg.version,
  label: () => i18n.global.t('head04.label'),
  plugin: Head04Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 30,
  config: ConfigComponent,
  graphicComponent: GraphicComponent,
  graphicComponentName: 'Head04Graphic',
});