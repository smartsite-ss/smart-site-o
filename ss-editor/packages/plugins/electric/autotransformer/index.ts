// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import AutotransformerConfigComponent from './AutotransformerConfig.vue';
import { AutotransformerPlugin } from './AutotransformerPlugin';
import { autotransformerPropertySchema } from './autotransformerPropertySchema';
import AutotransformerGraphicComponent from './AutotransformerGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const AutotransformerConfig = AutotransformerConfigComponent;
export const AutotransformerGraphic = AutotransformerGraphicComponent;
export { AutotransformerPlugin, autotransformerPropertySchema };
export type { AutotransformerProps } from './AutotransformerPlugin';

export default createPlugin({
  type: 'autotransformer',
  category: 'electric',
  label: () => i18n.global.t('autotransformer.label'),
  plugin: AutotransformerPlugin,
  schema: autotransformerPropertySchema,
  defaultWidth: 50,
  defaultHeight: 100,
  config: AutotransformerConfigComponent,
  graphicComponent: AutotransformerGraphicComponent,
  graphicComponentName: 'AutotransformerGraphic',
});
