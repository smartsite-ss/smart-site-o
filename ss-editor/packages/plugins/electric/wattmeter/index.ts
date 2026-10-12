// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import WattmeterConfigComponent from './WattmeterConfig.vue';
import { WattmeterPlugin } from './WattmeterPlugin';
import { wattmeterPropertySchema } from './wattmeterPropertySchema';
import WattmeterGraphicComponent from './WattmeterGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const WattmeterConfig = WattmeterConfigComponent;
export const WattmeterGraphic = WattmeterGraphicComponent;
export { WattmeterPlugin, wattmeterPropertySchema };
export type { WattmeterProps } from './WattmeterPlugin';

export default createPlugin({
  type: 'wattmeter',
  category: 'electric',
  label: () => i18n.global.t('wattmeter.label'),
  plugin: WattmeterPlugin,
  schema: wattmeterPropertySchema,
  defaultWidth: 50,
  defaultHeight: 50,
  config: WattmeterConfigComponent,
  graphicComponent: WattmeterGraphicComponent,
  graphicComponentName: 'WattmeterGraphic',
});
