// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import FlowmeterConfigComponent from './FlowmeterConfig.vue';
import { FlowmeterPlugin } from './FlowmeterPlugin';
import { flowmeterPropertySchema } from './flowmeterPropertySchema';
import FlowmeterGraphicComponent from './FlowmeterGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const FlowmeterConfig = FlowmeterConfigComponent;
export const FlowmeterGraphic = FlowmeterGraphicComponent;
export { FlowmeterPlugin, flowmeterPropertySchema };
export type { FlowmeterProps } from './FlowmeterPlugin';

export default createPlugin({
  type: 'flowmeter',
  category: 'mines',
  label: () => i18n.global.t('flowmeter.label'),
  plugin: FlowmeterPlugin,
  schema: flowmeterPropertySchema,
  defaultWidth: 70,
  defaultHeight: 70,
  config: FlowmeterConfigComponent,
  graphicComponent: FlowmeterGraphicComponent,
  graphicComponentName: 'FlowmeterGraphic',
});
