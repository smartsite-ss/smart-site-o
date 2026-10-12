// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import GaugeIconComponent from './GaugeIcon.vue';
import GaugeConfigComponent from './GaugeConfig.vue';
import GaugeGraphicComponent from './GaugeGraphic.vue';
import { GaugePlugin } from './GaugePlugin';
import { gaugePropertySchema } from './gaugePropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export const GaugeIcon = GaugeIconComponent;
export const GaugeConfig = GaugeConfigComponent;
export const GaugeGraphic = GaugeGraphicComponent;
export { GaugePlugin, gaugePropertySchema };
export type { GaugeProps } from './GaugePlugin';

export default createPlugin({
  type: 'gauge',
  category: 'industrial',
  version: pkg.version,
  label: () => i18n.global.t('gauge.label'),
  plugin: GaugePlugin,
  schema: gaugePropertySchema,
  config: GaugeConfigComponent,
  defaultWidth: 100,
  defaultHeight: 100,
  graphicComponent: GaugeGraphicComponent,
  graphicComponentName: 'GaugeGraphic',
});
