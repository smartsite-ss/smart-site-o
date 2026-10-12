// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import TankIconComponent from './TankIcon.vue';
import TankConfigComponent from './TankConfig.vue';
import TankGraphicComponent from './TankGraphic.vue';
import { TankPlugin } from './TankPlugin';
import { tankPropertySchema } from './tankPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export const TankIcon = TankIconComponent;
export const TankConfig = TankConfigComponent;
export const TankGraphic = TankGraphicComponent;
export { TankPlugin, tankPropertySchema };
export type { TankProps } from './TankPlugin';

export default createPlugin({
  type: 'tank',
  category: 'industrial',
  version: pkg.version,
  label: () => i18n.global.t('tank.label'),
  plugin: TankPlugin,
  schema: tankPropertySchema,
  config: TankConfigComponent,
  defaultWidth: 100,
  defaultHeight: 100,
  graphicComponent: TankGraphicComponent,
  graphicComponentName: 'TankGraphic',
});
