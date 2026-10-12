// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import PtConfigComponent from './PtConfig.vue';
import { PtPlugin } from './PtPlugin';
import { ptPropertySchema } from './ptPropertySchema';
import PtGraphicComponent from './PtGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const PtConfig = PtConfigComponent;
export const PtGraphic = PtGraphicComponent;
export { PtPlugin, ptPropertySchema };
export type { PtProps } from './PtPlugin';

export default createPlugin({
  type: 'pt',
  category: 'electric',
  label: () => i18n.global.t('pt.label'),
  plugin: PtPlugin,
  schema: ptPropertySchema,
  defaultWidth: 50,
  defaultHeight: 60,
  config: PtConfigComponent,
  graphicComponent: PtGraphicComponent,
  graphicComponentName: 'PtGraphic',
});
