// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import FanConfigComponent from './FanConfig.vue';
import { FanPlugin } from './FanPlugin';
import { fanPropertySchema } from './fanPropertySchema';
import FanGraphicComponent from './FanGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const FanConfig = FanConfigComponent;
export const FanGraphic = FanGraphicComponent;
export { FanPlugin, fanPropertySchema };
export type { FanProps } from './FanPlugin';

export default createPlugin({
  type: 'fan',
  category: 'mines',
  label: () => i18n.global.t('fan.label'),
  plugin: FanPlugin,
  schema: fanPropertySchema,
  defaultWidth: 120,
  defaultHeight: 200,
  config: FanConfigComponent,
  graphicComponent: FanGraphicComponent,
  graphicComponentName: 'FanGraphic',
});