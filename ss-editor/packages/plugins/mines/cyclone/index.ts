// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import CycloneConfigComponent from './CycloneConfig.vue';
import { CyclonePlugin } from './CyclonePlugin';
import { cyclonePropertySchema } from './cyclonePropertySchema';
import CycloneGraphicComponent from './CycloneGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const CycloneConfig = CycloneConfigComponent;
export const CycloneGraphic = CycloneGraphicComponent;
export { CyclonePlugin, cyclonePropertySchema };
export type { CycloneProps } from './CyclonePlugin';

export default createPlugin({
  type: 'cyclone',
  category: 'mines',
  label: () => i18n.global.t('cyclone.label'),
  plugin: CyclonePlugin,
  schema: cyclonePropertySchema,
  defaultWidth: 60,
  defaultHeight: 100,
  config: CycloneConfigComponent,
  graphicComponent: CycloneGraphicComponent,
  graphicComponentName: 'CycloneGraphic',
});
