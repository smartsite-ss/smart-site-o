// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import FlipperNumberConfigComponent from './FlipperNumberConfig.vue';
import { FlipperNumberPlugin } from './FlipperNumberPlugin';
import { schema } from './flipperNumberPropertySchema';
import FlipperNumberGraphicComponent from './FlipperNumberGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const FlipperNumberConfig = FlipperNumberConfigComponent;
export const FlipperNumberGraphic = FlipperNumberGraphicComponent;
export { FlipperNumberPlugin, schema };
export type { FlipperNumberProps } from './FlipperNumberPlugin';

export default createPlugin({
  type: 'flipper-number',
  category: 'decorates_other',
  version: pkg.version,
  label: () => i18n.global.t('flipper-number.label'),
  plugin: FlipperNumberPlugin,
  schema,
  defaultWidth: 300,
  defaultHeight: 100,
  config: FlipperNumberConfigComponent,
  graphicComponent: FlipperNumberGraphicComponent,
  graphicComponentName: 'FlipperNumberGraphic',
});