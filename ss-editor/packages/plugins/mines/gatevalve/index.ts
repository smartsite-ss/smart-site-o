// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import GatevalveConfigComponent from './GatevalveConfig.vue';
import { GatevalvePlugin } from './GatevalvePlugin';
import { gatevalvePropertySchema } from './gatevalvePropertySchema';
import GatevalveGraphicComponent from './GatevalveGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const GatevalveConfig = GatevalveConfigComponent;
export const GatevalveGraphic = GatevalveGraphicComponent;
export { GatevalvePlugin, gatevalvePropertySchema };
export type { GateValveProps } from './GatevalvePlugin';

export default createPlugin({
  type: 'gatevalve',
  category: 'mines',
  label: () => i18n.global.t('gatevalve.label'),
  plugin: GatevalvePlugin,
  schema: gatevalvePropertySchema,
  defaultWidth: 60,
  defaultHeight: 100,
  config: GatevalveConfigComponent,
  graphicComponent: GatevalveGraphicComponent,
  graphicComponentName: 'GatevalveGraphic',
});
