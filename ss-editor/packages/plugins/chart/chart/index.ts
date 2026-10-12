// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

export { default as ChartIcon } from './ChartIcon.vue';
export { default as ChartConfig } from './ChartConfig.vue';
import { ChartPlugin } from './ChartPlugin';
import { chartPropertySchema } from './chartPropertySchema';
export { ChartPlugin, chartPropertySchema };

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export default createPlugin({
  type: 'chart',
  category: 'chart',
  version: pkg.version,
  label: () => i18n.global.t('chart.label'),
  plugin: ChartPlugin,
  schema: chartPropertySchema,
  defaultWidth: 300,
  defaultHeight: 200,
});