// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import ShakingtableConfigComponent from './ShakingtableConfig.vue';
import { ShakingtablePlugin } from './ShakingtablePlugin';
import { shakingtablePropertySchema } from './shakingtablePropertySchema';
import ShakingtableGraphicComponent from './ShakingtableGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ShakingtableConfig = ShakingtableConfigComponent;
export const ShakingtableGraphic = ShakingtableGraphicComponent;
export { ShakingtablePlugin, shakingtablePropertySchema };
export type { ShakingtableProps } from './ShakingtablePlugin';

export default createPlugin({
  type: 'shakingtable',
  category: 'mines',
  label: () => i18n.global.t('shakingtable.label'),
  plugin: ShakingtablePlugin,
  schema: shakingtablePropertySchema,
  defaultWidth: 180,
  defaultHeight: 85,
  config: ShakingtableConfigComponent,
  graphicComponent: ShakingtableGraphicComponent,
  graphicComponentName: 'ShakingtableGraphic',
});
