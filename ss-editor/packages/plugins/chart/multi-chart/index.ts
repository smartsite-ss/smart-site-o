// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

export { default as MultiChartIcon } from './MultiChartIcon.vue';
export { default as MultiChartConfig } from './MultiChartConfig.vue';
import { MultiChartPlugin } from './MultiChartPlugin';
import { multiChartPropertySchema } from './multiChartPropertySchema';
export { MultiChartPlugin, multiChartPropertySchema };

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export default createPlugin({
  type: 'multi-chart',
  category: 'chart',
  version: pkg.version,
  label: () => i18n.global.t('multiChart.label'),
  plugin: MultiChartPlugin,
  schema: multiChartPropertySchema,
  defaultWidth: 400,
  defaultHeight: 300,
});