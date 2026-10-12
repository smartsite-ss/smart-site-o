// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import { ChartPiePlugin } from './ChartPiePlugin';
import { chartPiePropertySchema } from './chartPiePropertySchema';
import ChartPieGraphicComponent from './ChartPieGraphic.vue';
import ChartPieConfigComponent from './ChartPieConfig.vue';

export const ChartPieGraphic = ChartPieGraphicComponent;
export { ChartPiePlugin, chartPiePropertySchema };
export type { ChartPieProps } from './ChartPiePlugin';

export default createPlugin({
  type: 'chart-pie',
  category: 'chart',
  version: pkg.version,
  label: () => i18n.global.t('chartPie.label'),
  plugin: ChartPiePlugin,
  schema: chartPiePropertySchema,
  config: ChartPieConfigComponent,
  defaultWidth: 360,
  defaultHeight: 280,
  graphicComponent: ChartPieGraphicComponent,
  graphicComponentName: 'ChartPieGraphic',
});
