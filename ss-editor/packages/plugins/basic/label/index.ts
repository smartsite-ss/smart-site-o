// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export { default as LabelIcon } from './LabelIcon.vue';
export { default as LabelConfig } from './LabelConfig.vue';
import { LabelPlugin } from './LabelPlugin';
import { labelPropertySchema } from './labelPropertySchema';
export { LabelPlugin, labelPropertySchema };

export default createPlugin({
  type: 'label',
  category: 'basic',
  version: pkg.version,
  label: () => i18n.global.t('label.label'),
  plugin: LabelPlugin,
  schema: labelPropertySchema,
  defaultWidth: 100,
  defaultHeight: 30,
});