// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import LevelGaugeConfigComponent from './LevelGaugeConfig.vue';
import { LevelGaugePlugin } from './LevelGaugePlugin';
import { levelgaugePropertySchema } from './levelgaugePropertySchema';
import LevelGaugeGraphicComponent from './LevelGaugeGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const LevelGaugeConfig = LevelGaugeConfigComponent;
export const LevelGaugeGraphic = LevelGaugeGraphicComponent;
export { LevelGaugePlugin, levelgaugePropertySchema };
export type { LevelGaugeProps } from './LevelGaugePlugin';

export default createPlugin({
  type: 'levelgauge',
  category: 'mines',
  label: () => i18n.global.t('levelgauge.label'),
  plugin: LevelGaugePlugin,
  schema: levelgaugePropertySchema,
  defaultWidth: 40,
  defaultHeight: 120,
  config: LevelGaugeConfigComponent,
  graphicComponent: LevelGaugeGraphicComponent,
  graphicComponentName: 'LevelGaugeGraphic',
});
