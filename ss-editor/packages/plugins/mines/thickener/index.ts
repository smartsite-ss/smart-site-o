// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import ThickenerConfigComponent from './ThickenerConfig.vue';
import { ThickenerPlugin } from './ThickenerPlugin';
import { thickenerPropertySchema } from './thickenerPropertySchema';
import ThickenerGraphicComponent from './ThickenerGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ThickenerConfig = ThickenerConfigComponent;
export const ThickenerGraphic = ThickenerGraphicComponent;
export { ThickenerPlugin, thickenerPropertySchema };
export type { ThickenerProps } from './ThickenerPlugin';

export default createPlugin({
  type: 'thickener',
  category: 'mines',
  label: () => i18n.global.t('thickener.label'),
  plugin: ThickenerPlugin,
  schema: thickenerPropertySchema,
  defaultWidth: 160,
  defaultHeight: 130,
  config: ThickenerConfigComponent,
  graphicComponent: ThickenerGraphicComponent,
  graphicComponentName: 'ThickenerGraphic',
});
