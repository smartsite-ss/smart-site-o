// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import VoltmeterConfigComponent from './VoltmeterConfig.vue';
import { VoltmeterPlugin } from './VoltmeterPlugin';
import { voltmeterPropertySchema } from './voltmeterPropertySchema';
import VoltmeterGraphicComponent from './VoltmeterGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const VoltmeterConfig = VoltmeterConfigComponent;
export const VoltmeterGraphic = VoltmeterGraphicComponent;
export { VoltmeterPlugin, voltmeterPropertySchema };
export type { VoltmeterProps } from './VoltmeterPlugin';

export default createPlugin({
  type: 'voltmeter',
  category: 'electric',
  label: () => i18n.global.t('voltmeter.label'),
  plugin: VoltmeterPlugin,
  schema: voltmeterPropertySchema,
  defaultWidth: 50,
  defaultHeight: 50,
  config: VoltmeterConfigComponent,
  graphicComponent: VoltmeterGraphicComponent,
  graphicComponentName: 'VoltmeterGraphic',
});
