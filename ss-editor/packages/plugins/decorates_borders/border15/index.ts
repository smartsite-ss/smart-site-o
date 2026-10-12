// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, ConfigTemplateManager, registerLocaleModules} from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border15ConfigComponent from './Border15Config.vue';
import { Border15Plugin } from './Border15Plugin';
import { schema } from './border15PropertySchema';
import Border15GraphicComponent from './Border15Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
ConfigTemplateManager.registerPluginSchema('border15', schema);
ConfigTemplateManager.registerConfigComponent('border15', Border15ConfigComponent);

export const Border15Config = Border15ConfigComponent;
export const Border15Graphic = Border15GraphicComponent;
export { Border15Plugin, schema };
export type { Border15Props } from './Border15Plugin';

export default createPlugin({
  type: 'border15',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border15.label'),
  plugin: Border15Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border15ConfigComponent,
  graphicComponent: Border15GraphicComponent,
  graphicComponentName: 'Border15Graphic',
});