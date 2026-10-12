// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export { default as ImageIcon } from './ImageIcon.vue';
import ImageConfig from './ImageConfig.vue';
export { default as ImageConfig } from './ImageConfig.vue';
import { ImagePlugin } from './ImagePlugin';
import { imagePropertySchema } from './imagePropertySchema';
export { ImagePlugin, imagePropertySchema };

export default createPlugin({
  type: 'image',
  category: 'basic',
  version: pkg.version,
  label: () => i18n.global.t('image.label'),
  plugin: ImagePlugin,
  schema: imagePropertySchema,
  config: ImageConfig,
  defaultWidth: 100,
  defaultHeight: 100,
});