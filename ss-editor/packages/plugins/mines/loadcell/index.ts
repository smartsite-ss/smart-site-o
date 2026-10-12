// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import LoadcellConfigComponent from './LoadcellConfig.vue'; import { LoadcellPlugin } from './LoadcellPlugin';
import { loadcellPropertySchema } from './loadcellPropertySchema'; import LoadcellGraphicComponent from './LoadcellGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const LoadcellConfig = LoadcellConfigComponent; export const LoadcellGraphic = LoadcellGraphicComponent;
export { LoadcellPlugin, loadcellPropertySchema }; export type { LoadcellProps } from './LoadcellPlugin';
export default createPlugin({ type: 'loadcell', category: 'mines', label: () => i18n.global.t('loadcell.label'),
  plugin: LoadcellPlugin, schema: loadcellPropertySchema, defaultWidth: 50, defaultHeight: 30,
  config: LoadcellConfigComponent, graphicComponent: LoadcellGraphicComponent, graphicComponentName: 'LoadcellGraphic',
});
