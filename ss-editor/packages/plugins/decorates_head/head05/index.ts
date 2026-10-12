// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import ConfigComponent from './Head05Config.vue';
import { Head05Plugin } from './Head05Plugin';
import { schema } from './head05PropertySchema';
import GraphicComponent from './Head05Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Head05Config = ConfigComponent;
export const Head05Graphic = GraphicComponent;
export { Head05Plugin, schema };
export type { Head05Props } from './Head05Plugin';

export default createPlugin({
  type: 'head05',
  category: 'decorates_head',
  version: pkg.version,
  label: () => i18n.global.t('head05.label'),
  plugin: Head05Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 30,
  config: ConfigComponent,
  graphicComponent: GraphicComponent,
  graphicComponentName: 'Head05Graphic',
});