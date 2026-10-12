// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import GaspipeConfigComponent from './GaspipeConfig.vue'; import { GaspipePlugin } from './GaspipePlugin';
import { gaspipePropertySchema } from './gaspipePropertySchema'; import GaspipeGraphicComponent from './GaspipeGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const GaspipeConfig = GaspipeConfigComponent; export const GaspipeGraphic = GaspipeGraphicComponent;
export { GaspipePlugin, gaspipePropertySchema }; export type { GaspipeProps } from './GaspipePlugin';
export default createPlugin({ type: 'gaspipe', category: 'mines', label: () => i18n.global.t('gaspipe.label'),
  plugin: GaspipePlugin, schema: gaspipePropertySchema, defaultWidth: 200, defaultHeight: 16,
  config: GaspipeConfigComponent, graphicComponent: GaspipeGraphicComponent, graphicComponentName: 'GaspipeGraphic',
});
