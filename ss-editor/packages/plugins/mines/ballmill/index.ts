// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import BallmillConfigComponent from './BallmillConfig.vue';
import { BallmillPlugin } from './BallmillPlugin';
import { ballmillPropertySchema } from './ballmillPropertySchema';
import BallmillGraphicComponent from './BallmillGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const BallmillConfig = BallmillConfigComponent;
export const BallmillGraphic = BallmillGraphicComponent;
export { BallmillPlugin, ballmillPropertySchema };
export type { BallMillProps } from './BallmillPlugin';

export default createPlugin({
  type: 'ballmill',
  category: 'mines',
  label: () => i18n.global.t('ballmill.label'),
  plugin: BallmillPlugin,
  schema: ballmillPropertySchema,
  defaultWidth: 180,
  defaultHeight: 90,
  config: BallmillConfigComponent,
  graphicComponent: BallmillGraphicComponent,
  graphicComponentName: 'BallmillGraphic',
});
