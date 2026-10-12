// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import PumpConfigComponent from './PumpConfig.vue';
import { PumpPlugin } from './PumpPlugin';
import { pumpPropertySchema } from './pumpPropertySchema';
import PumpGraphicComponent from './PumpGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const PumpConfig = PumpConfigComponent;
export const PumpGraphic = PumpGraphicComponent;
export { PumpPlugin, pumpPropertySchema };
export type { PumpProps } from './PumpPlugin';

export default createPlugin({
  type: 'pump',
  category: 'mines',
  label: () => i18n.global.t('pump.label'),
  plugin: PumpPlugin,
  schema: pumpPropertySchema,
  defaultWidth: 200,
  defaultHeight: 130,
  config: PumpConfigComponent,
  graphicComponent: PumpGraphicComponent,
  graphicComponentName: 'PumpGraphic',
});