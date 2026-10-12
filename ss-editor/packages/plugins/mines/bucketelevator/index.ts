// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import BucketelevatorConfigComponent from './BucketelevatorConfig.vue';
import { BucketelevatorPlugin } from './BucketelevatorPlugin';
import { bucketelevatorPropertySchema } from './bucketelevatorPropertySchema';
import BucketelevatorGraphicComponent from './BucketelevatorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const BucketelevatorConfig = BucketelevatorConfigComponent;
export const BucketelevatorGraphic = BucketelevatorGraphicComponent;
export { BucketelevatorPlugin, bucketelevatorPropertySchema };
export type { BucketelevatorProps } from './BucketelevatorPlugin';

export default createPlugin({
  type: 'bucketelevator',
  category: 'mines',
  label: () => i18n.global.t('bucketelevator.label'),
  plugin: BucketelevatorPlugin,
  schema: bucketelevatorPropertySchema,
  defaultWidth: 80,
  defaultHeight: 200,
  config: BucketelevatorConfigComponent,
  graphicComponent: BucketelevatorGraphicComponent,
  graphicComponentName: 'BucketelevatorGraphic',
});
