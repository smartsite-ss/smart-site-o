// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import InsulatorConfigComponent from './InsulatorConfig.vue';
import { InsulatorPlugin } from './InsulatorPlugin';
import { insulatorPropertySchema } from './insulatorPropertySchema';
import InsulatorGraphicComponent from './InsulatorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const InsulatorConfig = InsulatorConfigComponent;
export const InsulatorGraphic = InsulatorGraphicComponent;
export { InsulatorPlugin, insulatorPropertySchema };
export type { InsulatorProps } from './InsulatorPlugin';

export default createPlugin({
  type: 'insulator',
  category: 'electric',
  label: () => i18n.global.t('insulator.label'),
  plugin: InsulatorPlugin,
  schema: insulatorPropertySchema,
  defaultWidth: 24,
  defaultHeight: 50,
  config: InsulatorConfigComponent,
  graphicComponent: InsulatorGraphicComponent,
  graphicComponentName: 'InsulatorGraphic',
});
