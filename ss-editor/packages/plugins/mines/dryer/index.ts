// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import DryerConfigComponent from './DryerConfig.vue'; import { DryerPlugin } from './DryerPlugin';
import { dryerPropertySchema } from './dryerPropertySchema'; import DryerGraphicComponent from './DryerGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const DryerConfig = DryerConfigComponent; export const DryerGraphic = DryerGraphicComponent;
export { DryerPlugin, dryerPropertySchema }; export type { DryerProps } from './DryerPlugin';
export default createPlugin({ type: 'dryer', category: 'mines', label: () => i18n.global.t('dryer.label'),
  plugin: DryerPlugin, schema: dryerPropertySchema, defaultWidth: 180, defaultHeight: 65,
  config: DryerConfigComponent, graphicComponent: DryerGraphicComponent, graphicComponentName: 'DryerGraphic',
});
