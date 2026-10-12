// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, ConfigTemplateManager, registerLocaleModules} from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Border14ConfigComponent from './Border14Config.vue';
import { Border14Plugin } from './Border14Plugin';
import { schema } from './border14PropertySchema';
import Border14GraphicComponent from './Border14Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
ConfigTemplateManager.registerPluginSchema('border14', schema);
ConfigTemplateManager.registerConfigComponent('border14', Border14ConfigComponent);

export const Border14Config = Border14ConfigComponent;
export const Border14Graphic = Border14GraphicComponent;
export { Border14Plugin, schema };
export type { Border14Props } from './Border14Plugin';

export default createPlugin({
  type: 'border14',
  category: 'decorates_borders',
  version: pkg.version,
  label: () => i18n.global.t('border14.label'),
  plugin: Border14Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 300,
  config: Border14ConfigComponent,
  graphicComponent: Border14GraphicComponent,
  graphicComponentName: 'Border14Graphic',
});