// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export { default as ShapeIcon } from './ShapeIcon.vue';
export { default as ShapeConfig } from './ShapeConfig.vue';
import { ShapePlugin } from './ShapePlugin';
import { shapePropertySchema } from './shapePropertySchema';
export { ShapePlugin, shapePropertySchema };

export default createPlugin({
  type: 'shape',
  category: 'basic',
  version: pkg.version,
  label: () => i18n.global.t('shape.label'),
  plugin: ShapePlugin,
  schema: shapePropertySchema,
  defaultWidth: 100,
  defaultHeight: 80,
});