// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import { ThreeGaugePlugin } from './ThreeGaugePlugin';
import { threeGaugePropertySchema } from './threeGaugePropertySchema';

export { ThreeGaugePlugin, threeGaugePropertySchema };

export default createPlugin({
  type: 'three-gauge',
  category: '3d',
  label: () => i18n.global.t('three-gauge.label'),
  plugin: ThreeGaugePlugin,
  schema: threeGaugePropertySchema,
  defaultWidth: 400,
  defaultHeight: 400,
});