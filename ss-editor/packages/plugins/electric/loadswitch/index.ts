// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import LoadswitchConfigComponent from './LoadswitchConfig.vue';
import { LoadswitchPlugin } from './LoadswitchPlugin';
import { loadswitchPropertySchema } from './loadswitchPropertySchema';
import LoadswitchGraphicComponent from './LoadswitchGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const LoadswitchConfig = LoadswitchConfigComponent;
export const LoadswitchGraphic = LoadswitchGraphicComponent;
export { LoadswitchPlugin, loadswitchPropertySchema };
export type { LoadswitchProps } from './LoadswitchPlugin';

export default createPlugin({
  type: 'loadswitch',
  category: 'electric',
  label: () => i18n.global.t('loadswitch.label'),
  plugin: LoadswitchPlugin,
  schema: loadswitchPropertySchema,
  defaultWidth: 40,
  defaultHeight: 90,
  config: LoadswitchConfigComponent,
  graphicComponent: LoadswitchGraphicComponent,
  graphicComponentName: 'LoadswitchGraphic',
});
