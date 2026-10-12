// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import GroundswitchConfigComponent from './GroundswitchConfig.vue';
import { GroundswitchPlugin } from './GroundswitchPlugin';
import { groundswitchPropertySchema } from './groundswitchPropertySchema';
import GroundswitchGraphicComponent from './GroundswitchGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const GroundswitchConfig = GroundswitchConfigComponent;
export const GroundswitchGraphic = GroundswitchGraphicComponent;
export { GroundswitchPlugin, groundswitchPropertySchema };
export type { GroundswitchProps } from './GroundswitchPlugin';

export default createPlugin({
  type: 'groundswitch',
  category: 'electric',
  label: () => i18n.global.t('groundswitch.label'),
  plugin: GroundswitchPlugin,
  schema: groundswitchPropertySchema,
  defaultWidth: 50,
  defaultHeight: 90,
  config: GroundswitchConfigComponent,
  graphicComponent: GroundswitchGraphicComponent,
  graphicComponentName: 'GroundswitchGraphic',
});
