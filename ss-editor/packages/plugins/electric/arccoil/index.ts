// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import ArccoilConfigComponent from './ArccoilConfig.vue';
import { ArccoilPlugin } from './ArccoilPlugin';
import { arccoilPropertySchema } from './arccoilPropertySchema';
import ArccoilGraphicComponent from './ArccoilGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ArccoilConfig = ArccoilConfigComponent;
export const ArccoilGraphic = ArccoilGraphicComponent;
export { ArccoilPlugin, arccoilPropertySchema };
export type { ArccoilProps } from './ArccoilPlugin';

export default createPlugin({
  type: 'arccoil',
  category: 'electric',
  label: () => i18n.global.t('arccoil.label'),
  plugin: ArccoilPlugin,
  schema: arccoilPropertySchema,
  defaultWidth: 40,
  defaultHeight: 70,
  config: ArccoilConfigComponent,
  graphicComponent: ArccoilGraphicComponent,
  graphicComponentName: 'ArccoilGraphic',
});
