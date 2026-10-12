// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

export { default as TrendChartIcon } from './TrendChartIcon.vue';
export { default as TrendChartConfig } from './TrendChartConfig.vue';
import { TrendChartPlugin } from './TrendChartPlugin';
import { trendChartPropertySchema } from './trendChartPropertySchema';
export { TrendChartPlugin, trendChartPropertySchema };
export type { TrendChartProps } from './TrendChartPlugin';

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export default createPlugin({
  type: 'trend-chart',
  category: 'chart',
  version: pkg.version,
  label: () => i18n.global.t('trendChart.label'),
  plugin: TrendChartPlugin,
  schema: trendChartPropertySchema,
  defaultWidth: 400,
  defaultHeight: 250,
});