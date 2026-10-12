// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border10ConfigComponent from './Border10Config.vue';
import { Border10Plugin } from './Border10Plugin';
import { schema } from './border10PropertySchema';
import Border10GraphicComponent from './Border10Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Border10Config = Border10ConfigComponent;
export const Border10Graphic = Border10GraphicComponent;
export { Border10Plugin, schema };
export type { Border10Props } from './Border10Plugin';

export default createPlugin({
  type: 'border10',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border10.label'),
  plugin: Border10Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border10ConfigComponent,
  graphicComponent: Border10GraphicComponent,
  graphicComponentName: 'Border10Graphic',
});