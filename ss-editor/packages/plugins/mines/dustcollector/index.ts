// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import DustcollectorConfigComponent from './DustcollectorConfig.vue';
import { DustcollectorPlugin } from './DustcollectorPlugin';
import { dustcollectorPropertySchema } from './dustcollectorPropertySchema';
import DustcollectorGraphicComponent from './DustcollectorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const DustcollectorConfig = DustcollectorConfigComponent;
export const DustcollectorGraphic = DustcollectorGraphicComponent;
export { DustcollectorPlugin, dustcollectorPropertySchema };
export type { DustcollectorProps } from './DustcollectorPlugin';
export default createPlugin({
  type: 'dustcollector', category: 'mines', label: () => i18n.global.t('dustcollector.label'),
  plugin: DustcollectorPlugin, schema: dustcollectorPropertySchema, defaultWidth: 140, defaultHeight: 120,
  config: DustcollectorConfigComponent, graphicComponent: DustcollectorGraphicComponent, graphicComponentName: 'DustcollectorGraphic',
});
