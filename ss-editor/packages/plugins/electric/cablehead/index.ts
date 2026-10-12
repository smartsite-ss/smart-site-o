// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import CableheadConfigComponent from './CableheadConfig.vue';
import { CableheadPlugin } from './CableheadPlugin';
import { cableheadPropertySchema } from './cableheadPropertySchema';
import CableheadGraphicComponent from './CableheadGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const CableheadConfig = CableheadConfigComponent;
export const CableheadGraphic = CableheadGraphicComponent;
export { CableheadPlugin, cableheadPropertySchema };
export type { CableheadProps } from './CableheadPlugin';

export default createPlugin({
  type: 'cablehead',
  category: 'electric',
  label: () => i18n.global.t('cablehead.label'),
  plugin: CableheadPlugin,
  schema: cableheadPropertySchema,
  defaultWidth: 30,
  defaultHeight: 50,
  config: CableheadConfigComponent,
  graphicComponent: CableheadGraphicComponent,
  graphicComponentName: 'CableheadGraphic',
});
