// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import { ThreeCubePlugin } from './ThreeCubePlugin';
import { threeCubePropertySchema } from './threeCubePropertySchema';

export { ThreeCubePlugin, threeCubePropertySchema };

export default createPlugin({
  type: 'three-cube',
  category: '3d',
  label: () => i18n.global.t('three-cube.label'),
  plugin: ThreeCubePlugin,
  schema: threeCubePropertySchema,
  defaultWidth: 400,
  defaultHeight: 300,
});