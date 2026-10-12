// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, ConfigTemplateManager, registerLocaleModules} from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border19ConfigComponent from './Border19Config.vue';
import { Border19Plugin } from './Border19Plugin';
import { schema } from './border19PropertySchema';
import Border19GraphicComponent from './Border19Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
ConfigTemplateManager.registerPluginSchema('border19', schema);
ConfigTemplateManager.registerConfigComponent('border19', Border19ConfigComponent);

export const Border19Config = Border19ConfigComponent;
export const Border19Graphic = Border19GraphicComponent;
export { Border19Plugin, schema };
export type { Border19Props } from './Border19Plugin';

export default createPlugin({
  type: 'border19',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border19.label'),
  plugin: Border19Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border19ConfigComponent,
  graphicComponent: Border19GraphicComponent,
  graphicComponentName: 'Border19Graphic',
});