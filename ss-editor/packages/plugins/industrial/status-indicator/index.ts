// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import StatusIndicatorConfigComponent from './StatusIndicatorConfig.vue';
import StatusIndicatorGraphicComponent from './StatusIndicatorGraphic.vue';
import { StatusIndicatorPlugin } from './StatusIndicatorPlugin';
import { statusIndicatorPropertySchema } from './statusIndicatorPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export const StatusIndicatorConfig = StatusIndicatorConfigComponent;
export const StatusIndicatorGraphic = StatusIndicatorGraphicComponent;
export { StatusIndicatorPlugin, statusIndicatorPropertySchema };
export type { StatusIndicatorProps } from './StatusIndicatorPlugin';

export default createPlugin({
  type: 'status-indicator',
  category: 'industrial',
  version: pkg.version,
  label: () => i18n.global.t('statusIndicator.label'),
  plugin: StatusIndicatorPlugin,
  schema: statusIndicatorPropertySchema,
  config: StatusIndicatorConfigComponent,
  defaultWidth: 40,
  defaultHeight: 40,
  graphicComponent: StatusIndicatorGraphicComponent,
  graphicComponentName: 'StatusIndicatorGraphic',
});
