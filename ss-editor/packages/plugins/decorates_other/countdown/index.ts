// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import CountDownConfigComponent from './CountDownConfig.vue';
import { CountDownPlugin } from './CountDownPlugin';
import { schema } from './countdownPropertySchema';
import CountDownGraphicComponent from './CountDownGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const CountDownConfig = CountDownConfigComponent;
export const CountDownGraphic = CountDownGraphicComponent;
export { CountDownPlugin, schema };
export type { CountDownProps } from './CountDownPlugin';

export default createPlugin({
  type: 'countdown',
  category: 'decorates_other',
  version: pkg.version,
  label: () => i18n.global.t('countdown.label'),
  plugin: CountDownPlugin,
  schema,
  defaultWidth: 500,
  defaultHeight: 100,
  config: CountDownConfigComponent,
  graphicComponent: CountDownGraphicComponent,
  graphicComponentName: 'CountDownGraphic',
});