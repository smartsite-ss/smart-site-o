// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import SolenoidvalveConfigComponent from './SolenoidvalveConfig.vue'; import { SolenoidvalvePlugin } from './SolenoidvalvePlugin';
import { solenoidvalvePropertySchema } from './solenoidvalvePropertySchema'; import SolenoidvalveGraphicComponent from './SolenoidvalveGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const SolenoidvalveConfig = SolenoidvalveConfigComponent; export const SolenoidvalveGraphic = SolenoidvalveGraphicComponent;
export { SolenoidvalvePlugin, solenoidvalvePropertySchema }; export type { SolenoidvalveProps } from './SolenoidvalvePlugin';
export default createPlugin({ type: 'solenoidvalve', category: 'mines', label: () => i18n.global.t('solenoidvalve.label'),
  plugin: SolenoidvalvePlugin, schema: solenoidvalvePropertySchema, defaultWidth: 50, defaultHeight: 40,
  config: SolenoidvalveConfigComponent, graphicComponent: SolenoidvalveGraphicComponent, graphicComponentName: 'SolenoidvalveGraphic',
});
