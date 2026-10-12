// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import RotarykilnConfigComponent from './RotarykilnConfig.vue';
import { RotarykilnPlugin } from './RotarykilnPlugin';
import { rotarykilnPropertySchema } from './rotarykilnPropertySchema';
import RotarykilnGraphicComponent from './RotarykilnGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const RotarykilnConfig = RotarykilnConfigComponent;
export const RotarykilnGraphic = RotarykilnGraphicComponent;
export { RotarykilnPlugin, rotarykilnPropertySchema };
export type { RotarykilnProps } from './RotarykilnPlugin';

export default createPlugin({
  type: 'rotarykiln',
  category: 'mines',
  label: () => i18n.global.t('rotarykiln.label'),
  plugin: RotarykilnPlugin,
  schema: rotarykilnPropertySchema,
  defaultWidth: 220,
  defaultHeight: 70,
  config: RotarykilnConfigComponent,
  graphicComponent: RotarykilnGraphicComponent,
  graphicComponentName: 'RotarykilnGraphic',
});
