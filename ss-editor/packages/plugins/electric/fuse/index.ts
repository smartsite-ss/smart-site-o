// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import FuseConfigComponent from './FuseConfig.vue';
import { FusePlugin } from './FusePlugin';
import { fusePropertySchema } from './fusePropertySchema';
import FuseGraphicComponent from './FuseGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const FuseConfig = FuseConfigComponent;
export const FuseGraphic = FuseGraphicComponent;
export { FusePlugin, fusePropertySchema };
export type { FuseProps } from './FusePlugin';

export default createPlugin({
  type: 'fuse',
  category: 'electric',
  label: () => i18n.global.t('fuse.label'),
  plugin: FusePlugin,
  schema: fusePropertySchema,
  defaultWidth: 30,
  defaultHeight: 60,
  config: FuseConfigComponent,
  graphicComponent: FuseGraphicComponent,
  graphicComponentName: 'FuseGraphic',
});
