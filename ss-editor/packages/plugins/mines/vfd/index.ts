// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import VfdConfigComponent from './VfdConfig.vue';
import { VfdPlugin } from './VfdPlugin';
import { vfdPropertySchema } from './vfdPropertySchema';
import VfdGraphicComponent from './VfdGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const VfdConfig = VfdConfigComponent;
export const VfdGraphic = VfdGraphicComponent;
export { VfdPlugin, vfdPropertySchema };
export type { VfdProps } from './VfdPlugin';

export default createPlugin({
  type: 'vfd',
  category: 'mines',
  label: () => i18n.global.t('vfd.label'),
  plugin: VfdPlugin,
  schema: vfdPropertySchema,
  defaultWidth: 80,
  defaultHeight: 110,
  config: VfdConfigComponent,
  graphicComponent: VfdGraphicComponent,
  graphicComponentName: 'VfdGraphic',
});
