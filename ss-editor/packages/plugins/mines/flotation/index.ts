// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import FlotationConfigComponent from './FlotationConfig.vue';
import { FlotationPlugin } from './FlotationPlugin';
import { flotationPropertySchema } from './flotationPropertySchema';
import FlotationGraphicComponent from './FlotationGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const FlotationConfig = FlotationConfigComponent;
export const FlotationGraphic = FlotationGraphicComponent;
export { FlotationPlugin, flotationPropertySchema };
export type { FlotationProps } from './FlotationPlugin';

export default createPlugin({
  type: 'flotation',
  category: 'mines',
  label: () => i18n.global.t('flotation.label'),
  plugin: FlotationPlugin,
  schema: flotationPropertySchema,
  defaultWidth: 140,
  defaultHeight: 100,
  config: FlotationConfigComponent,
  graphicComponent: FlotationGraphicComponent,
  graphicComponentName: 'FlotationGraphic',
});
