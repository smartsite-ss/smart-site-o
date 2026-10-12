// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import { ChartGaugePlugin } from './GaugePlugin';
import { gaugePropertySchema } from './gaugePropertySchema';
import GaugeGraphicComponent from './GaugeGraphic.vue';
import GaugeConfigComponent from './GaugeConfig.vue';

export { default as ChartGaugeIcon } from './GaugeIcon.vue';
export const GaugeGraphic = GaugeGraphicComponent;
export { ChartGaugePlugin, gaugePropertySchema };
export type { ChartGaugeProps } from './GaugePlugin';

export default createPlugin({
  type: 'chart-gauge',
  category: 'chart',
  version: pkg.version,
  label: () => i18n.global.t('chartGauge.label'),
  plugin: ChartGaugePlugin,
  schema: gaugePropertySchema,
  config: GaugeConfigComponent,
  defaultWidth: 200,
  defaultHeight: 200,
  graphicComponent: GaugeGraphicComponent,
  graphicComponentName: 'GaugeGraphic',
});
