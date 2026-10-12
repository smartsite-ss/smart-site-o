// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import OrebinConfigComponent from './OrebinConfig.vue';
import { OrebinPlugin } from './OrebinPlugin';
import { orebinPropertySchema } from './orebinPropertySchema';
import OrebinGraphicComponent from './OrebinGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const OrebinConfig = OrebinConfigComponent;
export const OrebinGraphic = OrebinGraphicComponent;
export { OrebinPlugin, orebinPropertySchema };
export type { OrebinProps } from './OrebinPlugin';

export default createPlugin({
  type: 'orebin',
  category: 'mines',
  label: () => i18n.global.t('orebin.label'),
  plugin: OrebinPlugin,
  schema: orebinPropertySchema,
  defaultWidth: 120,
  defaultHeight: 130,
  config: OrebinConfigComponent,
  graphicComponent: OrebinGraphicComponent,
  graphicComponentName: 'OrebinGraphic',
});
