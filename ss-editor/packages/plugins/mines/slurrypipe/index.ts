// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import SlurrypipeConfigComponent from './SlurrypipeConfig.vue'; import { SlurrypipePlugin } from './SlurrypipePlugin';
import { slurrypipePropertySchema } from './slurrypipePropertySchema'; import SlurrypipeGraphicComponent from './SlurrypipeGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const SlurrypipeConfig = SlurrypipeConfigComponent; export const SlurrypipeGraphic = SlurrypipeGraphicComponent;
export { SlurrypipePlugin, slurrypipePropertySchema }; export type { SlurrypipeProps } from './SlurrypipePlugin';
export default createPlugin({ type: 'slurrypipe', category: 'mines', label: () => i18n.global.t('slurrypipe.label'),
  plugin: SlurrypipePlugin, schema: slurrypipePropertySchema, defaultWidth: 200, defaultHeight: 20,
  config: SlurrypipeConfigComponent, graphicComponent: SlurrypipeGraphicComponent, graphicComponentName: 'SlurrypipeGraphic',
});
