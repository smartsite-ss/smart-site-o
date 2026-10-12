// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import GroundConfigComponent from './GroundConfig.vue';
import { GroundPlugin } from './GroundPlugin';
import { groundPropertySchema } from './groundPropertySchema';
import GroundGraphicComponent from './GroundGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const GroundConfig = GroundConfigComponent;
export const GroundGraphic = GroundGraphicComponent;
export { GroundPlugin, groundPropertySchema };
export type { GroundProps } from './GroundPlugin';

export default createPlugin({
  type: 'ground',
  category: 'electric',
  label: () => i18n.global.t('ground.label'),
  plugin: GroundPlugin,
  schema: groundPropertySchema,
  defaultWidth: 30,
  defaultHeight: 30,
  config: GroundConfigComponent,
  graphicComponent: GroundGraphicComponent,
  graphicComponentName: 'GroundGraphic',
});
