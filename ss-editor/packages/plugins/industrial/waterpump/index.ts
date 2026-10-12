// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import WaterpumpIconComponent from './WaterpumpIcon.vue';
import WaterpumpConfigComponent from './WaterpumpConfig.vue';
import WaterpumpGraphicComponent from './WaterpumpGraphic.vue';
import { WaterpumpPlugin } from './WaterpumpPlugin';
import { waterpumpPropertySchema } from './waterpumpPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export const WaterpumpIcon = WaterpumpIconComponent;
export const WaterpumpConfig = WaterpumpConfigComponent;
export const WaterpumpGraphic = WaterpumpGraphicComponent;
export { WaterpumpPlugin, waterpumpPropertySchema };
export type { WaterpumpProps } from './WaterpumpPlugin';

export default createPlugin({
  type: 'waterpump',
  category: 'industrial',
  version: pkg.version,
  label: () => i18n.global.t('waterpump.label'),
  plugin: WaterpumpPlugin,
  schema: waterpumpPropertySchema,
  config: WaterpumpConfigComponent,
  defaultWidth: 120,
  defaultHeight: 60,
  graphicComponent: WaterpumpGraphicComponent,
  graphicComponentName: 'WaterpumpGraphic',
});
