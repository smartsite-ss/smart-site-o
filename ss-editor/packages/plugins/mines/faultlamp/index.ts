// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import FaultlampConfigComponent from './FaultlampConfig.vue';
import { FaultlampPlugin } from './FaultlampPlugin';
import { faultlampPropertySchema } from './faultlampPropertySchema';
import FaultlampGraphicComponent from './FaultlampGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const FaultlampConfig = FaultlampConfigComponent;
export const FaultlampGraphic = FaultlampGraphicComponent;
export { FaultlampPlugin, faultlampPropertySchema };
export type { FaultlampProps } from './FaultlampPlugin';

export default createPlugin({
  type: 'faultlamp',
  category: 'mines',
  label: () => i18n.global.t('faultlamp.label'),
  plugin: FaultlampPlugin,
  schema: faultlampPropertySchema,
  defaultWidth: 60,
  defaultHeight: 60,
  config: FaultlampConfigComponent,
  graphicComponent: FaultlampGraphicComponent,
  graphicComponentName: 'FaultlampGraphic',
});
