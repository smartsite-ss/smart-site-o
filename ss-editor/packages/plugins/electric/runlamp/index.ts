// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import RunlampConfigComponent from './RunlampConfig.vue';
import { RunlampPlugin } from './RunlampPlugin';
import { runlampPropertySchema } from './runlampPropertySchema';
import RunlampGraphicComponent from './RunlampGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const RunlampConfig = RunlampConfigComponent;
export const RunlampGraphic = RunlampGraphicComponent;
export { RunlampPlugin, runlampPropertySchema };
export type { RunlampProps } from './RunlampPlugin';

export default createPlugin({
  type: 'runlamp',
  category: 'electric',
  label: () => i18n.global.t('runlamp.label'),
  plugin: RunlampPlugin,
  schema: runlampPropertySchema,
  defaultWidth: 36,
  defaultHeight: 36,
  config: RunlampConfigComponent,
  graphicComponent: RunlampGraphicComponent,
  graphicComponentName: 'RunlampGraphic',
});
