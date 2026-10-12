// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import Head02ConfigComponent from './Head02Config.vue';
import { Head02Plugin } from './Head02Plugin';
import { schema } from './head02PropertySchema';
import Head02GraphicComponent from './Head02Graphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Head02Config = Head02ConfigComponent;
export const Head02Graphic = Head02GraphicComponent;
export { Head02Plugin, schema };
export type { Head02Props } from './Head02Plugin';

export default createPlugin({
  type: 'head02',
  category: 'decorates_head',
  version: pkg.version,
  label: () => i18n.global.t('head02.label'),
  plugin: Head02Plugin,
  schema,
  defaultWidth: 400,
  defaultHeight: 3,
  config: Head02ConfigComponent,
  graphicComponent: Head02GraphicComponent,
  graphicComponentName: 'Head02Graphic',
});