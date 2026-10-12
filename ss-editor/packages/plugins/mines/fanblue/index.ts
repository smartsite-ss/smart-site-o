// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import FanBlueConfigComponent from './FanBlueConfig.vue';
import { FanBluePlugin } from './FanBluePlugin';
import { fanbluePropertySchema } from './fanbluePropertySchema';
import FanBlueGraphicComponent from './FanBlueGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const FanBlueConfig = FanBlueConfigComponent;
export const FanBlueGraphic = FanBlueGraphicComponent;
export { FanBluePlugin, fanbluePropertySchema };
export type { FanBlueProps } from './FanBluePlugin';

export default createPlugin({
  type: 'fanblue',
  category: 'mines',
  label: () => i18n.global.t('fanblue.label'),
  plugin: FanBluePlugin,
  schema: fanbluePropertySchema,
  defaultWidth: 200,
  defaultHeight: 200,
  config: FanBlueConfigComponent,
  graphicComponent: FanBlueGraphicComponent,
  graphicComponentName: 'FanBlueGraphic',
});