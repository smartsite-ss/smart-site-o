// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border05ConfigComponent from './Border05Config.vue';
import { Border05Plugin } from './Border05Plugin';
import { schema } from './border05PropertySchema';
import Border05GraphicComponent from './Border05Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border05Config = Border05ConfigComponent;
export const Border05Graphic = Border05GraphicComponent;
export { Border05Plugin, schema };
export type { Border05Props } from './Border05Plugin';

export default createPlugin({
  type: 'border05',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border05.label'),
  plugin: Border05Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border05ConfigComponent,
  graphicComponent: Border05GraphicComponent,
  graphicComponentName: 'Border05Graphic',
});