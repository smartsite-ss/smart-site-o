// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import BallvalveConfigComponent from './BallvalveConfig.vue'; import { BallvalvePlugin } from './BallvalvePlugin';
import { ballvalvePropertySchema } from './ballvalvePropertySchema'; import BallvalveGraphicComponent from './BallvalveGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const BallvalveConfig = BallvalveConfigComponent; export const BallvalveGraphic = BallvalveGraphicComponent;
export { BallvalvePlugin, ballvalvePropertySchema }; export type { BallvalveProps } from './BallvalvePlugin';
export default createPlugin({ type: 'ballvalve', category: 'mines', label: () => i18n.global.t('ballvalve.label'),
  plugin: BallvalvePlugin, schema: ballvalvePropertySchema, defaultWidth: 60, defaultHeight: 70,
  config: BallvalveConfigComponent, graphicComponent: BallvalveGraphicComponent, graphicComponentName: 'BallvalveGraphic',
});
