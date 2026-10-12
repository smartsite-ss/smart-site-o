// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import CapacitorConfigComponent from './CapacitorConfig.vue';
import { CapacitorPlugin } from './CapacitorPlugin';
import { capacitorPropertySchema } from './capacitorPropertySchema';
import CapacitorGraphicComponent from './CapacitorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const CapacitorConfig = CapacitorConfigComponent;
export const CapacitorGraphic = CapacitorGraphicComponent;
export { CapacitorPlugin, capacitorPropertySchema };
export type { CapacitorProps } from './CapacitorPlugin';

export default createPlugin({
  type: 'capacitor',
  category: 'electric',
  label: () => i18n.global.t('capacitor.label'),
  plugin: CapacitorPlugin,
  schema: capacitorPropertySchema,
  defaultWidth: 30,
  defaultHeight: 50,
  config: CapacitorConfigComponent,
  graphicComponent: CapacitorGraphicComponent,
  graphicComponentName: 'CapacitorGraphic',
});
