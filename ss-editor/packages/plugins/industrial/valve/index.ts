// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import ValveIconComponent from './ValveIcon.vue';
import ValveConfigComponent from './ValveConfig.vue';
import ValveGraphicComponent from './ValveGraphic.vue';
import { ValvePlugin } from './ValvePlugin';
import { valvePropertySchema } from './valvePropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export const ValveIcon = ValveIconComponent;
export const ValveConfig = ValveConfigComponent;
export const ValveGraphic = ValveGraphicComponent;
export { ValvePlugin, valvePropertySchema };
export type { ValveProps } from './ValvePlugin';

export default createPlugin({
  type: 'valve',
  category: 'industrial',
  version: pkg.version,
  label: () => i18n.global.t('valve.label'),
  plugin: ValvePlugin,
  schema: valvePropertySchema,
  config: ValveConfigComponent,
  defaultWidth: 80,
  defaultHeight: 80,
  graphicComponent: ValveGraphicComponent,
  graphicComponentName: 'ValveGraphic',
});
