// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, ConfigTemplateManager, registerLocaleModules} from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border13ConfigComponent from './Border13Config.vue';
import { Border13Plugin } from './Border13Plugin';
import { schema } from './border13PropertySchema';
import Border13GraphicComponent from './Border13Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
ConfigTemplateManager.registerPluginSchema('border13', schema);
ConfigTemplateManager.registerConfigComponent('border13', Border13ConfigComponent);

export const Border13Config = Border13ConfigComponent;
export const Border13Graphic = Border13GraphicComponent;
export { Border13Plugin, schema };
export type { Border13Props } from './Border13Plugin';

export default createPlugin({
  type: 'border13',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border13.label'),
  plugin: Border13Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border13ConfigComponent,
  graphicComponent: Border13GraphicComponent,
  graphicComponentName: 'Border13Graphic',
});