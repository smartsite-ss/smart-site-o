// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import ClockConfigComponent from './ClockConfig.vue';
import { ClockPlugin } from './ClockPlugin';
import { schema } from './clockPropertySchema';
import ClockGraphicComponent from './ClockGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ClockConfig = ClockConfigComponent;
export const ClockGraphic = ClockGraphicComponent;
export { ClockPlugin, schema };
export type { ClockProps } from './ClockPlugin';

export default createPlugin({
  type: 'clock',
  category: 'decorates_other',
  version: pkg.version,
  label: () => i18n.global.t('clock.label'),
  plugin: ClockPlugin,
  schema,
  defaultWidth: 200,
  defaultHeight: 200,
  config: ClockConfigComponent,
  graphicComponent: ClockGraphicComponent,
  graphicComponentName: 'ClockGraphic',
});