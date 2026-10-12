// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import PressuregaugeConfigComponent from './PressuregaugeConfig.vue';
import { PressuregaugePlugin } from './PressuregaugePlugin';
import { pressuregaugePropertySchema } from './pressuregaugePropertySchema';
import PressuregaugeGraphicComponent from './PressuregaugeGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const PressuregaugeConfig = PressuregaugeConfigComponent;
export const PressuregaugeGraphic = PressuregaugeGraphicComponent;
export { PressuregaugePlugin, pressuregaugePropertySchema };
export type { PressuregaugeProps } from './PressuregaugePlugin';

export default createPlugin({
  type: 'pressuregauge',
  category: 'mines',
  label: () => i18n.global.t('pressuregauge.label'),
  plugin: PressuregaugePlugin,
  schema: pressuregaugePropertySchema,
  defaultWidth: 70,
  defaultHeight: 70,
  config: PressuregaugeConfigComponent,
  graphicComponent: PressuregaugeGraphicComponent,
  graphicComponentName: 'PressuregaugeGraphic',
});
