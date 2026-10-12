// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import ReactorConfigComponent from './ReactorConfig.vue';
import { ReactorPlugin } from './ReactorPlugin';
import { reactorPropertySchema } from './reactorPropertySchema';
import ReactorGraphicComponent from './ReactorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ReactorConfig = ReactorConfigComponent;
export const ReactorGraphic = ReactorGraphicComponent;
export { ReactorPlugin, reactorPropertySchema };
export type { ReactorProps } from './ReactorPlugin';

export default createPlugin({
  type: 'reactor',
  category: 'electric',
  label: () => i18n.global.t('reactor.label'),
  plugin: ReactorPlugin,
  schema: reactorPropertySchema,
  defaultWidth: 40,
  defaultHeight: 60,
  config: ReactorConfigComponent,
  graphicComponent: ReactorGraphicComponent,
  graphicComponentName: 'ReactorGraphic',
});
