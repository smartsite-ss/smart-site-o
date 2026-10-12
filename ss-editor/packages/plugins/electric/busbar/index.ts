// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import BusbarConfigComponent from './BusbarConfig.vue';
import { BusbarPlugin } from './BusbarPlugin';
import { busbarPropertySchema } from './busbarPropertySchema';
import BusbarGraphicComponent from './BusbarGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const BusbarConfig = BusbarConfigComponent;
export const BusbarGraphic = BusbarGraphicComponent;
export { BusbarPlugin, busbarPropertySchema };
export type { BusbarProps } from './BusbarPlugin';

export default createPlugin({
  type: 'busbar',
  category: 'electric',
  label: () => i18n.global.t('busbar.label'),
  plugin: BusbarPlugin,
  schema: busbarPropertySchema,
  defaultWidth: 120,
  defaultHeight: 16,
  config: BusbarConfigComponent,
  graphicComponent: BusbarGraphicComponent,
  graphicComponentName: 'BusbarGraphic',
});
