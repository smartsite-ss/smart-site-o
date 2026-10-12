// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import EstopbuttonConfigComponent from './EstopbuttonConfig.vue';
import { EstopbuttonPlugin } from './EstopbuttonPlugin';
import { estopbuttonPropertySchema } from './estopbuttonPropertySchema';
import EstopbuttonGraphicComponent from './EstopbuttonGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const EstopbuttonConfig = EstopbuttonConfigComponent;
export const EstopbuttonGraphic = EstopbuttonGraphicComponent;
export { EstopbuttonPlugin, estopbuttonPropertySchema };
export type { EstopbuttonProps } from './EstopbuttonPlugin';

export default createPlugin({
  type: 'estopbutton',
  category: 'mines',
  label: () => i18n.global.t('estopbutton.label'),
  plugin: EstopbuttonPlugin,
  schema: estopbuttonPropertySchema,
  defaultWidth: 50,
  defaultHeight: 50,
  config: EstopbuttonConfigComponent,
  graphicComponent: EstopbuttonGraphicComponent,
  graphicComponentName: 'EstopbuttonGraphic',
});
