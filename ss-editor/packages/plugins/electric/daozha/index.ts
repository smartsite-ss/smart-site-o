// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import DaozhaConfigComponent from './DaozhaConfig.vue';
import { DaozhaPlugin } from './DaozhaPlugin';
import { daozhaPropertySchema } from './daozhaPropertySchema';
import DaozhaGraphicComponent from './DaozhaGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const DaozhaConfig = DaozhaConfigComponent;
export const DaozhaGraphic = DaozhaGraphicComponent;
export { DaozhaPlugin, daozhaPropertySchema };
export type { DaozhaProps } from './DaozhaPlugin';

export default createPlugin({
  type: 'daozha',
  category: 'electric',
  label: () => i18n.global.t('daozha.label'),
  plugin: DaozhaPlugin,
  schema: daozhaPropertySchema,
  defaultWidth: 40,
  defaultHeight: 100,
  config: DaozhaConfigComponent,
  graphicComponent: DaozhaGraphicComponent,
  graphicComponentName: 'DaozhaGraphic',
});
