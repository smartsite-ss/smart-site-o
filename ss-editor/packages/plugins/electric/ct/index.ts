// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import CtConfigComponent from './CtConfig.vue';
import { CtPlugin } from './CtPlugin';
import { ctPropertySchema } from './ctPropertySchema';
import CtGraphicComponent from './CtGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const CtConfig = CtConfigComponent;
export const CtGraphic = CtGraphicComponent;
export { CtPlugin, ctPropertySchema };
export type { CtProps } from './CtPlugin';

export default createPlugin({
  type: 'ct',
  category: 'electric',
  label: () => i18n.global.t('ct.label'),
  plugin: CtPlugin,
  schema: ctPropertySchema,
  defaultWidth: 50,
  defaultHeight: 60,
  config: CtConfigComponent,
  graphicComponent: CtGraphicComponent,
  graphicComponentName: 'CtGraphic',
});
