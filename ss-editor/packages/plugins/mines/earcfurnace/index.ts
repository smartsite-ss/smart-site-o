// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import EarcfurnaceConfigComponent from './EarcfurnaceConfig.vue'; import { EarcfurnacePlugin } from './EarcfurnacePlugin';
import { earcfurnacePropertySchema } from './earcfurnacePropertySchema'; import EarcfurnaceGraphicComponent from './EarcfurnaceGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const EarcfurnaceConfig = EarcfurnaceConfigComponent; export const EarcfurnaceGraphic = EarcfurnaceGraphicComponent;
export { EarcfurnacePlugin, earcfurnacePropertySchema }; export type { EarcfurnaceProps } from './EarcfurnacePlugin';
export default createPlugin({ type: 'earcfurnace', category: 'mines', label: () => i18n.global.t('earcfurnace.label'),
  plugin: EarcfurnacePlugin, schema: earcfurnacePropertySchema, defaultWidth: 130, defaultHeight: 100,
  config: EarcfurnaceConfigComponent, graphicComponent: EarcfurnaceGraphicComponent, graphicComponentName: 'EarcfurnaceGraphic',
});
