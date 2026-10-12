// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import TimeCommonConfigComponent from './TimeCommonConfig.vue';
import { TimeCommonPlugin } from './TimeCommonPlugin';
import { schema } from './timeCommonPropertySchema';
import TimeCommonGraphicComponent from './TimeCommonGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const TimeCommonConfig = TimeCommonConfigComponent;
export const TimeCommonGraphic = TimeCommonGraphicComponent;
export { TimeCommonPlugin, schema };
export type { TimeCommonProps } from './TimeCommonPlugin';

export default createPlugin({
  type: 'time-common',
  category: 'decorates_other',
  version: pkg.version,
  label: () => i18n.global.t('time-common.label'),
  plugin: TimeCommonPlugin,
  schema,
  defaultWidth: 300,
  defaultHeight: 50,
  config: TimeCommonConfigComponent,
  graphicComponent: TimeCommonGraphicComponent,
  graphicComponentName: 'TimeCommonGraphic',
});