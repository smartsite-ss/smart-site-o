// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import PipeHIconComponent from './PipeHIcon.vue';
import PipeHConfigComponent from './PipeHConfig.vue';
import { PipeHPlugin } from './PipeHPlugin';
import { pipeHPropertySchema } from './pipeHPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const PipeHIcon = PipeHIconComponent;
export const PipeHConfig = PipeHConfigComponent;
export { PipeHPlugin, pipeHPropertySchema };

export default createPlugin({
  type: 'pipe-h',
  category: 'industrial',
  label: () => i18n.global.t('pipeH.label'),
  plugin: PipeHPlugin,
  schema: pipeHPropertySchema,
  defaultWidth: 120,
  defaultHeight: 30,
});