// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import ConveyerbeltConfigComponent from './ConveyerbeltConfig.vue';
import { ConveyerbeltPlugin } from './ConveyerbeltPlugin';
import { conveyerbeltPropertySchema } from './conveyerbeltPropertySchema';
import ConveyerbeltGraphicComponent from './ConveyerbeltGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ConveyerbeltConfig = ConveyerbeltConfigComponent;
export const ConveyerbeltGraphic = ConveyerbeltGraphicComponent;
export { ConveyerbeltPlugin, conveyerbeltPropertySchema };
export type { ConveyerbeltProps } from './ConveyerbeltPlugin';

export default createPlugin({
  type: 'conveyerbelt',
  category: 'mines',
  label: () => i18n.global.t('conveyerbelt.label'),
  plugin: ConveyerbeltPlugin,
  schema: conveyerbeltPropertySchema,
  defaultWidth: 370,
  defaultHeight: 50,
  config: ConveyerbeltConfigComponent,
  graphicComponent: ConveyerbeltGraphicComponent,
  graphicComponentName: 'ConveyerbeltGraphic',
});