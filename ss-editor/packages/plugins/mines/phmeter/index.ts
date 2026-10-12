// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import PhmeterConfigComponent from './PhmeterConfig.vue'; import { PhmeterPlugin } from './PhmeterPlugin';
import { phmeterPropertySchema } from './phmeterPropertySchema'; import PhmeterGraphicComponent from './PhmeterGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const PhmeterConfig = PhmeterConfigComponent; export const PhmeterGraphic = PhmeterGraphicComponent;
export { PhmeterPlugin, phmeterPropertySchema }; export type { PhmeterProps } from './PhmeterPlugin';
export default createPlugin({ type: 'phmeter', category: 'mines', label: () => i18n.global.t('phmeter.label'),
  plugin: PhmeterPlugin, schema: phmeterPropertySchema, defaultWidth: 50, defaultHeight: 70,
  config: PhmeterConfigComponent, graphicComponent: PhmeterGraphicComponent, graphicComponentName: 'PhmeterGraphic',
});
