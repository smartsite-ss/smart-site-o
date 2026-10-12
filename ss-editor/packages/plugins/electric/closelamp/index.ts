// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import CloselampConfigComponent from './CloselampConfig.vue';
import { CloselampPlugin } from './CloselampPlugin';
import { closelampPropertySchema } from './closelampPropertySchema';
import CloselampGraphicComponent from './CloselampGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const CloselampConfig = CloselampConfigComponent;
export const CloselampGraphic = CloselampGraphicComponent;
export { CloselampPlugin, closelampPropertySchema };
export type { CloselampProps } from './CloselampPlugin';

export default createPlugin({
  type: 'closelamp',
  category: 'electric',
  label: () => i18n.global.t('closelamp.label'),
  plugin: CloselampPlugin,
  schema: closelampPropertySchema,
  defaultWidth: 40,
  defaultHeight: 44,
  config: CloselampConfigComponent,
  graphicComponent: CloselampGraphicComponent,
  graphicComponentName: 'CloselampGraphic',
});
