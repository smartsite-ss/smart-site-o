// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import AmmeterConfigComponent from './AmmeterConfig.vue';
import { AmmeterPlugin } from './AmmeterPlugin';
import { ammeterPropertySchema } from './ammeterPropertySchema';
import AmmeterGraphicComponent from './AmmeterGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const AmmeterConfig = AmmeterConfigComponent;
export const AmmeterGraphic = AmmeterGraphicComponent;
export { AmmeterPlugin, ammeterPropertySchema };
export type { AmmeterProps } from './AmmeterPlugin';

export default createPlugin({
  type: 'ammeter',
  category: 'electric',
  label: () => i18n.global.t('ammeter.label'),
  plugin: AmmeterPlugin,
  schema: ammeterPropertySchema,
  defaultWidth: 50,
  defaultHeight: 50,
  config: AmmeterConfigComponent,
  graphicComponent: AmmeterGraphicComponent,
  graphicComponentName: 'AmmeterGraphic',
});
