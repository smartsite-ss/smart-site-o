// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import ConeCrusherConfigComponent from './ConeCrusherConfig.vue';
import { ConeCrusherPlugin } from './ConeCrusherPlugin';
import { conecrusherPropertySchema } from './conecrusherPropertySchema';
import ConeCrusherGraphicComponent from './ConeCrusherGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ConeCrusherConfig = ConeCrusherConfigComponent;
export const ConeCrusherGraphic = ConeCrusherGraphicComponent;
export { ConeCrusherPlugin, conecrusherPropertySchema };
export type { ConeCrusherProps } from './ConeCrusherPlugin';

export default createPlugin({
  type: 'conecrusher',
  category: 'mines',
  label: () => i18n.global.t('conecrusher.label'),
  plugin: ConeCrusherPlugin,
  schema: conecrusherPropertySchema,
  defaultWidth: 100,
  defaultHeight: 120,
  config: ConeCrusherConfigComponent,
  graphicComponent: ConeCrusherGraphicComponent,
  graphicComponentName: 'ConeCrusherGraphic',
});
