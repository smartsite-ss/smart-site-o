// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, ConfigTemplateManager, registerLocaleModules} from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border16ConfigComponent from './Border16Config.vue';
import { Border16Plugin } from './Border16Plugin';
import { schema } from './border16PropertySchema';
import Border16GraphicComponent from './Border16Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
ConfigTemplateManager.registerPluginSchema('border16', schema);
ConfigTemplateManager.registerConfigComponent('border16', Border16ConfigComponent);

export const Border16Config = Border16ConfigComponent;
export const Border16Graphic = Border16GraphicComponent;
export { Border16Plugin, schema };
export type { Border16Props } from './Border16Plugin';

export default createPlugin({
  type: 'border16',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border16.label'),
  plugin: Border16Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border16ConfigComponent,
  graphicComponent: Border16GraphicComponent,
  graphicComponentName: 'Border16Graphic',
});