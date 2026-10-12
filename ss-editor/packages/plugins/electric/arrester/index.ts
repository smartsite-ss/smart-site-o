// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import ArresterConfigComponent from './ArresterConfig.vue';
import { ArresterPlugin } from './ArresterPlugin';
import { arresterPropertySchema } from './arresterPropertySchema';
import ArresterGraphicComponent from './ArresterGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ArresterConfig = ArresterConfigComponent;
export const ArresterGraphic = ArresterGraphicComponent;
export { ArresterPlugin, arresterPropertySchema };
export type { ArresterProps } from './ArresterPlugin';

export default createPlugin({
  type: 'arrester',
  category: 'electric',
  label: () => i18n.global.t('arrester.label'),
  plugin: ArresterPlugin,
  schema: arresterPropertySchema,
  defaultWidth: 30,
  defaultHeight: 70,
  config: ArresterConfigComponent,
  graphicComponent: ArresterGraphicComponent,
  graphicComponentName: 'ArresterGraphic',
});
