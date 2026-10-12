// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import MagselectorConfigComponent from './MagselectorConfig.vue';
import { MagselectorPlugin } from './MagselectorPlugin';
import { magselectorPropertySchema } from './magselectorPropertySchema';
import MagselectorGraphicComponent from './MagselectorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const MagselectorConfig = MagselectorConfigComponent;
export const MagselectorGraphic = MagselectorGraphicComponent;
export { MagselectorPlugin, magselectorPropertySchema };
export type { MagselectorProps } from './MagselectorPlugin';

export default createPlugin({
  type: 'magselector',
  category: 'mines',
  label: () => i18n.global.t('magselector.label'),
  plugin: MagselectorPlugin,
  schema: magselectorPropertySchema,
  defaultWidth: 160,
  defaultHeight: 90,
  config: MagselectorConfigComponent,
  graphicComponent: MagselectorGraphicComponent,
  graphicComponentName: 'MagselectorGraphic',
});
