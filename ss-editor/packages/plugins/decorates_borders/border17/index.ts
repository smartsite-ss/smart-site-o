// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, ConfigTemplateManager, registerLocaleModules} from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border17ConfigComponent from './Border17Config.vue';
import { Border17Plugin } from './Border17Plugin';
import { schema } from './border17PropertySchema';
import Border17GraphicComponent from './Border17Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
ConfigTemplateManager.registerPluginSchema('border17', schema);
ConfigTemplateManager.registerConfigComponent('border17', Border17ConfigComponent);

export const Border17Config = Border17ConfigComponent;
export const Border17Graphic = Border17GraphicComponent;
export { Border17Plugin, schema };
export type { Border17Props } from './Border17Plugin';

export default createPlugin({
  type: 'border17',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border17.label'),
  plugin: Border17Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border17ConfigComponent,
  graphicComponent: Border17GraphicComponent,
  graphicComponentName: 'Border17Graphic',
});