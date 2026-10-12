// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import VibfeederConfigComponent from './VibfeederConfig.vue';
import { VibfeederPlugin } from './VibfeederPlugin';
import { vibfeederPropertySchema } from './vibfeederPropertySchema';
import VibfeederGraphicComponent from './VibfeederGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const VibfeederConfig = VibfeederConfigComponent;
export const VibfeederGraphic = VibfeederGraphicComponent;
export { VibfeederPlugin, vibfeederPropertySchema };
export type { VibfeederProps } from './VibfeederPlugin';

export default createPlugin({
  type: 'vibfeeder',
  category: 'mines',
  label: () => i18n.global.t('vibfeeder.label'),
  plugin: VibfeederPlugin,
  schema: vibfeederPropertySchema,
  defaultWidth: 160,
  defaultHeight: 60,
  config: VibfeederConfigComponent,
  graphicComponent: VibfeederGraphicComponent,
  graphicComponentName: 'VibfeederGraphic',
});
