// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import Fan3ConfigComponent from './Fan3Config.vue';
import { Fan3Plugin } from './Fan3Plugin';
import { fan3PropertySchema } from './fan3PropertySchema';
import Fan3GraphicComponent from './Fan3Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Fan3Config = Fan3ConfigComponent;
export const Fan3Graphic = Fan3GraphicComponent;
export { Fan3Plugin, fan3PropertySchema };
export type { Fan3Props } from './Fan3Plugin';

export default createPlugin({
  type: 'fan3',
  category: 'mines',
  label: () => i18n.global.t('fan3.label'),
  plugin: Fan3Plugin,
  schema: fan3PropertySchema,
  defaultWidth: 175,
  defaultHeight: 210,
  config: Fan3ConfigComponent,
  graphicComponent: Fan3GraphicComponent,
  graphicComponentName: 'Fan3Graphic',
});