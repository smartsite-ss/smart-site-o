// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import IndicatorIconComponent from './IndicatorIcon.vue';
import IndicatorConfigComponent from './IndicatorConfig.vue';
import IndicatorGraphicComponent from './IndicatorGraphic.vue';
import { IndicatorPlugin } from './IndicatorPlugin';
import { indicatorPropertySchema } from './indicatorPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export const IndicatorIcon = IndicatorIconComponent;
export const IndicatorConfig = IndicatorConfigComponent;
export const IndicatorGraphic = IndicatorGraphicComponent;
export { IndicatorPlugin, indicatorPropertySchema };
export type { IndicatorProps } from './IndicatorPlugin';

export default createPlugin({
  type: 'indicator',
  category: 'industrial',
  version: pkg.version,
  label: () => i18n.global.t('indicator.label'),
  plugin: IndicatorPlugin,
  schema: indicatorPropertySchema,
  config: IndicatorConfigComponent,
  defaultWidth: 40,
  defaultHeight: 40,
  graphicComponent: IndicatorGraphicComponent,
  graphicComponentName: 'IndicatorGraphic',
});
