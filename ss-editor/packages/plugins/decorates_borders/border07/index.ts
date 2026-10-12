// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border07ConfigComponent from './Border07Config.vue';
import { Border07Plugin } from './Border07Plugin';
import { schema } from './border07PropertySchema';
import Border07GraphicComponent from './Border07Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border07Config = Border07ConfigComponent;
export const Border07Graphic = Border07GraphicComponent;
export { Border07Plugin, schema };
export type { Border07Props } from './Border07Plugin';

export default createPlugin({
  type: 'border07',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border07.label'),
  plugin: Border07Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border07ConfigComponent,
  graphicComponent: Border07GraphicComponent,
  graphicComponentName: 'Border07Graphic',
});