// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import TempsensorConfigComponent from './TempsensorConfig.vue'; import { TempsensorPlugin } from './TempsensorPlugin';
import { tempsensorPropertySchema } from './tempsensorPropertySchema'; import TempsensorGraphicComponent from './TempsensorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const TempsensorConfig = TempsensorConfigComponent; export const TempsensorGraphic = TempsensorGraphicComponent;
export { TempsensorPlugin, tempsensorPropertySchema }; export type { TempsensorProps } from './TempsensorPlugin';
export default createPlugin({ type: 'tempsensor', category: 'mines', label: () => i18n.global.t('tempsensor.label'),
  plugin: TempsensorPlugin, schema: tempsensorPropertySchema, defaultWidth: 30, defaultHeight: 60,
  config: TempsensorConfigComponent, graphicComponent: TempsensorGraphicComponent, graphicComponentName: 'TempsensorGraphic',
});
