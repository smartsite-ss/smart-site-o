// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import MagseparatorConfigComponent from './MagseparatorConfig.vue';
import { MagseparatorPlugin } from './MagseparatorPlugin';
import { magseparatorPropertySchema } from './magseparatorPropertySchema';
import MagseparatorGraphicComponent from './MagseparatorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const MagseparatorConfig = MagseparatorConfigComponent;
export const MagseparatorGraphic = MagseparatorGraphicComponent;
export { MagseparatorPlugin, magseparatorPropertySchema };
export type { MagseparatorProps } from './MagseparatorPlugin';

export default createPlugin({
  type: 'magseparator',
  category: 'mines',
  label: () => i18n.global.t('magseparator.label'),
  plugin: MagseparatorPlugin,
  schema: magseparatorPropertySchema,
  defaultWidth: 150,
  defaultHeight: 80,
  config: MagseparatorConfigComponent,
  graphicComponent: MagseparatorGraphicComponent,
  graphicComponentName: 'MagseparatorGraphic',
});
