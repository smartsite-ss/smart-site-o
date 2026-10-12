// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import { ChartBarPlugin } from './ChartBarPlugin';
import { chartBarPropertySchema } from './chartBarPropertySchema';
import ChartBarGraphicComponent from './ChartBarGraphic.vue';
import ChartBarConfigComponent from './ChartBarConfig.vue';

export const ChartBarGraphic = ChartBarGraphicComponent;
export { ChartBarPlugin, chartBarPropertySchema };
export type { ChartBarProps } from './ChartBarPlugin';

export default createPlugin({
  type: 'chart-bar',
  category: 'chart',
  version: pkg.version,
  label: () => i18n.global.t('chartBar.label'),
  plugin: ChartBarPlugin,
  schema: chartBarPropertySchema,
  config: ChartBarConfigComponent,
  defaultWidth: 360,
  defaultHeight: 260,
  graphicComponent: ChartBarGraphicComponent,
  graphicComponentName: 'ChartBarGraphic',
});
