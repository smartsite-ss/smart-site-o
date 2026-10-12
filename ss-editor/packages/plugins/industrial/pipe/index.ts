// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import PipeIconComponent from './PipeIcon.vue';
import PipeConfigComponent from './PipeConfig.vue';
import { PipePlugin } from './PipePlugin';
import { pipePropertySchema } from './pipePropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const PipeIcon = PipeIconComponent;
export const PipeConfig = PipeConfigComponent;
export { PipePlugin, pipePropertySchema };

export default createPlugin({
  type: 'pipe',
  category: 'industrial',
  label: () => i18n.global.t('pipe.label'),
  plugin: PipePlugin,
  schema: pipePropertySchema,
  defaultWidth: 120,
  defaultHeight: 30,
});