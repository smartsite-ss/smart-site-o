// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import SagmillConfigComponent from './SagmillConfig.vue';
import { SagmillPlugin } from './SagmillPlugin';
import { sagmillPropertySchema } from './sagmillPropertySchema';
import SagmillGraphicComponent from './SagmillGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const SagmillConfig = SagmillConfigComponent;
export const SagmillGraphic = SagmillGraphicComponent;
export { SagmillPlugin, sagmillPropertySchema };
export type { SagmillProps } from './SagmillPlugin';

export default createPlugin({
  type: 'sagmill',
  category: 'mines',
  label: () => i18n.global.t('sagmill.label'),
  plugin: SagmillPlugin,
  schema: sagmillPropertySchema,
  defaultWidth: 170,
  defaultHeight: 95,
  config: SagmillConfigComponent,
  graphicComponent: SagmillGraphicComponent,
  graphicComponentName: 'SagmillGraphic',
});
