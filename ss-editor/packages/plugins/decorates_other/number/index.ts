// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import NumberConfigComponent from './NumberConfig.vue';
import { NumberPlugin } from './NumberPlugin';
import { schema } from './numberPropertySchema';
import NumberGraphicComponent from './NumberGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const NumberConfig = NumberConfigComponent;
export const NumberGraphic = NumberGraphicComponent;
export { NumberPlugin, schema };
export type { NumberProps } from './NumberPlugin';

export default createPlugin({
  type: 'number',
  category: 'decorates_other',
  version: pkg.version,
  label: () => i18n.global.t('number.label'),
  plugin: NumberPlugin,
  schema,
  defaultWidth: 300,
  defaultHeight: 100,
  config: NumberConfigComponent,
  graphicComponent: NumberGraphicComponent,
  graphicComponentName: 'NumberGraphic',
});