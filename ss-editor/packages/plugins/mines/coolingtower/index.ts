// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import CoolingtowerConfigComponent from './CoolingtowerConfig.vue';
import { CoolingtowerPlugin } from './CoolingtowerPlugin';
import { coolingtowerPropertySchema } from './coolingtowerPropertySchema';
import CoolingtowerGraphicComponent from './CoolingtowerGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const CoolingtowerConfig = CoolingtowerConfigComponent;
export const CoolingtowerGraphic = CoolingtowerGraphicComponent;
export { CoolingtowerPlugin, coolingtowerPropertySchema };
export type { CoolingtowerProps } from './CoolingtowerPlugin';

export default createPlugin({
  type: 'coolingtower',
  category: 'mines',
  label: () => i18n.global.t('coolingtower.label'),
  plugin: CoolingtowerPlugin,
  schema: coolingtowerPropertySchema,
  defaultWidth: 100,
  defaultHeight: 140,
  config: CoolingtowerConfigComponent,
  graphicComponent: CoolingtowerGraphicComponent,
  graphicComponentName: 'CoolingtowerGraphic',
});
