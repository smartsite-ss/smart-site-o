// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import SlurrypumpConfigComponent from './SlurrypumpConfig.vue';
import { SlurrypumpPlugin } from './SlurrypumpPlugin';
import { slurrypumpPropertySchema } from './slurrypumpPropertySchema';
import SlurrypumpGraphicComponent from './SlurrypumpGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const SlurrypumpConfig = SlurrypumpConfigComponent;
export const SlurrypumpGraphic = SlurrypumpGraphicComponent;
export { SlurrypumpPlugin, slurrypumpPropertySchema };
export type { SlurrypumpProps } from './SlurrypumpPlugin';

export default createPlugin({
  type: 'slurrypump',
  category: 'mines',
  label: () => i18n.global.t('slurrypump.label'),
  plugin: SlurrypumpPlugin,
  schema: slurrypumpPropertySchema,
  defaultWidth: 100,
  defaultHeight: 80,
  config: SlurrypumpConfigComponent,
  graphicComponent: SlurrypumpGraphicComponent,
  graphicComponentName: 'SlurrypumpGraphic',
});
