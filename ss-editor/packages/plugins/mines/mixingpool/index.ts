// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import MixingpoolConfigComponent from './MixingpoolConfig.vue';
import { MixingpoolPlugin } from './MixingpoolPlugin';
import { mixingpoolPropertySchema } from './mixingpoolPropertySchema';
import MixingpoolGraphicComponent from './MixingpoolGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const MixingpoolConfig = MixingpoolConfigComponent;
export const MixingpoolGraphic = MixingpoolGraphicComponent;
export { MixingpoolPlugin, mixingpoolPropertySchema };
export type { MixingpoolProps } from './MixingpoolPlugin';

export default createPlugin({
  type: 'mixingpool',
  category: 'mines',
  label: () => i18n.global.t('mixingpool.label'),
  plugin: MixingpoolPlugin,
  schema: mixingpoolPropertySchema,
  defaultWidth: 140,
  defaultHeight: 200,
  config: MixingpoolConfigComponent,
  graphicComponent: MixingpoolGraphicComponent,
  graphicComponentName: 'MixingpoolGraphic',
});