// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import PumpIconComponent from './PumpIcon.vue';
import PumpConfigComponent from './PumpConfig.vue';
import PumpGraphicComponent from './PumpGraphic.vue';
import { PumpPlugin } from './PumpPlugin';
import { pumpPropertySchema } from './pumpPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export const PumpIcon = PumpIconComponent;
export const PumpConfig = PumpConfigComponent;
export const PumpGraphic = PumpGraphicComponent;
export { PumpPlugin, pumpPropertySchema };
export type { PumpProps } from './PumpPlugin';

export default createPlugin({
  type: 'pump',
  category: 'industrial',
  version: pkg.version,
  label: () => i18n.global.t('pump.label'),
  plugin: PumpPlugin,
  schema: pumpPropertySchema,
  config: PumpConfigComponent,
  defaultWidth: 80,
  defaultHeight: 80,
  graphicComponent: PumpGraphicComponent,
  graphicComponentName: 'PumpGraphic',
});
