// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border11ConfigComponent from './Border11Config.vue';
import { Border11Plugin } from './Border11Plugin';
import { schema } from './border11PropertySchema';
import Border11GraphicComponent from './Border11Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border11Config = Border11ConfigComponent;
export const Border11Graphic = Border11GraphicComponent;
export { Border11Plugin, schema };
export type { Border11Props } from './Border11Plugin';

export default createPlugin({
  type: 'border11',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border11.label'),
  plugin: Border11Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border11ConfigComponent,
  graphicComponent: Border11GraphicComponent,
  graphicComponentName: 'Border11Graphic',
});