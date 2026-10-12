// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import BreakerConfigComponent from './BreakerConfig.vue';
import { BreakerPlugin } from './BreakerPlugin';
import { breakerPropertySchema } from './breakerPropertySchema';
import BreakerGraphicComponent from './BreakerGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const BreakerConfig = BreakerConfigComponent;
export const BreakerGraphic = BreakerGraphicComponent;
export { BreakerPlugin, breakerPropertySchema };
export type { BreakerProps } from './BreakerPlugin';

export default createPlugin({
  type: 'breaker',
  category: 'electric',
  label: () => i18n.global.t('breaker.label'),
  plugin: BreakerPlugin,
  schema: breakerPropertySchema,
  defaultWidth: 40,
  defaultHeight: 80,
  config: BreakerConfigComponent,
  graphicComponent: BreakerGraphicComponent,
  graphicComponentName: 'BreakerGraphic',
});
