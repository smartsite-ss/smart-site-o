// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, ConfigTemplateManager, registerLocaleModules} from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border18ConfigComponent from './Border18Config.vue';
import { Border18Plugin } from './Border18Plugin';
import { schema } from './border18PropertySchema';
import Border18GraphicComponent from './Border18Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
ConfigTemplateManager.registerPluginSchema('border18', schema);
ConfigTemplateManager.registerConfigComponent('border18', Border18ConfigComponent);

export const Border18Config = Border18ConfigComponent;
export const Border18Graphic = Border18GraphicComponent;
export { Border18Plugin, schema };
export type { Border18Props } from './Border18Plugin';

export default createPlugin({
  type: 'border18',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border18.label'),
  plugin: Border18Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border18ConfigComponent,
  graphicComponent: Border18GraphicComponent,
  graphicComponentName: 'Border18Graphic',
});