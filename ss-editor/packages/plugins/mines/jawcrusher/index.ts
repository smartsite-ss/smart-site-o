// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import JawCrusherConfigComponent from './JawCrusherConfig.vue';
import { JawCrusherPlugin } from './JawCrusherPlugin';
import { jawcrusherPropertySchema } from './jawcrusherPropertySchema';
import JawCrusherGraphicComponent from './JawCrusherGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const JawCrusherConfig = JawCrusherConfigComponent;
export const JawCrusherGraphic = JawCrusherGraphicComponent;
export { JawCrusherPlugin, jawcrusherPropertySchema };
export type { JawCrusherProps } from './JawCrusherPlugin';

export default createPlugin({
  type: 'jawcrusher',
  category: 'mines',
  label: () => i18n.global.t('jawcrusher.label'),
  plugin: JawCrusherPlugin,
  schema: jawcrusherPropertySchema,
  defaultWidth: 120,
  defaultHeight: 160,
  config: JawCrusherConfigComponent,
  graphicComponent: JawCrusherGraphicComponent,
  graphicComponentName: 'JawCrusherGraphic',
});
