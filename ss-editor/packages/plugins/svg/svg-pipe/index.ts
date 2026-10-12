// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import SvgPipeIconComponent from './SvgPipeIcon.vue';
import SvgPipeConfigComponent from './SvgPipeConfig.vue';
import { SvgPipePlugin } from './SvgPipePlugin';
import { svgPipePropertySchema } from './svgPipePropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const SvgPipeIcon = SvgPipeIconComponent;
export const SvgPipeConfig = SvgPipeConfigComponent;
export { SvgPipePlugin, svgPipePropertySchema };
export type { SvgPipePoint, SvgPipeConfig } from './SvgPipePlugin';

export default createPlugin({
  type: 'svg-pipe',
  category: 'svg',
  label: () => i18n.global.t('svg-pipe.label'),
  plugin: SvgPipePlugin,
  schema: svgPipePropertySchema,
  defaultWidth: 200,
  defaultHeight: 60,
  icon: SvgPipeIconComponent,
  config: SvgPipeConfigComponent,
});