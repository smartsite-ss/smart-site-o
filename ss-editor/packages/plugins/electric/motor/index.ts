// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import MotorConfigComponent from './MotorConfig.vue';
import { MotorPlugin } from './MotorPlugin';
import { motorPropertySchema } from './motorPropertySchema';
import MotorGraphicComponent from './MotorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const MotorConfig = MotorConfigComponent;
export const MotorGraphic = MotorGraphicComponent;
export { MotorPlugin, motorPropertySchema };
export type { MotorProps } from './MotorPlugin';

export default createPlugin({
  type: 'motor',
  category: 'electric',
  label: () => i18n.global.t('motor.label'),
  plugin: MotorPlugin,
  schema: motorPropertySchema,
  defaultWidth: 56,
  defaultHeight: 56,
  config: MotorConfigComponent,
  graphicComponent: MotorGraphicComponent,
  graphicComponentName: 'MotorGraphic',
});
