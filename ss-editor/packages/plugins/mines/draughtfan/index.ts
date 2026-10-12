// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import DraughtFanConfigComponent from './DraughtFanConfig.vue';
import { DraughtFanPlugin } from './DraughtFanPlugin';
import { draughtfanPropertySchema } from './draughtfanPropertySchema';
import DraughtFanGraphicComponent from './DraughtFanGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const DraughtFanConfig = DraughtFanConfigComponent;
export const DraughtFanGraphic = DraughtFanGraphicComponent;
export { DraughtFanPlugin, draughtfanPropertySchema };
export type { DraughtFanProps } from './DraughtFanPlugin';

export default createPlugin({
  type: 'draughtfan',
  category: 'mines',
  label: () => i18n.global.t('draughtfan.label'),
  plugin: DraughtFanPlugin,
  schema: draughtfanPropertySchema,
  defaultWidth: 200,
  defaultHeight: 190,
  config: DraughtFanConfigComponent,
  graphicComponent: DraughtFanGraphicComponent,
  graphicComponentName: 'DraughtFanGraphic',
});