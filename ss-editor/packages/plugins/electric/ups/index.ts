// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import UpsConfigComponent from './UpsConfig.vue';
import { UpsPlugin } from './UpsPlugin';
import { upsPropertySchema } from './upsPropertySchema';
import UpsGraphicComponent from './UpsGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const UpsConfig = UpsConfigComponent;
export const UpsGraphic = UpsGraphicComponent;
export { UpsPlugin, upsPropertySchema };
export type { UpsProps } from './UpsPlugin';

export default createPlugin({
  type: 'ups',
  category: 'electric',
  label: () => i18n.global.t('ups.label'),
  plugin: UpsPlugin,
  schema: upsPropertySchema,
  defaultWidth: 50,
  defaultHeight: 70,
  config: UpsConfigComponent,
  graphicComponent: UpsGraphicComponent,
  graphicComponentName: 'UpsGraphic',
});
