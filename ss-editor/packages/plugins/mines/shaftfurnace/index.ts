// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import ShaftfurnaceConfigComponent from './ShaftfurnaceConfig.vue'; import { ShaftfurnacePlugin } from './ShaftfurnacePlugin';
import { shaftfurnacePropertySchema } from './shaftfurnacePropertySchema'; import ShaftfurnaceGraphicComponent from './ShaftfurnaceGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ShaftfurnaceConfig = ShaftfurnaceConfigComponent; export const ShaftfurnaceGraphic = ShaftfurnaceGraphicComponent;
export { ShaftfurnacePlugin, shaftfurnacePropertySchema }; export type { ShaftfurnaceProps } from './ShaftfurnacePlugin';
export default createPlugin({ type: 'shaftfurnace', category: 'mines', label: () => i18n.global.t('shaftfurnace.label'),
  plugin: ShaftfurnacePlugin, schema: shaftfurnacePropertySchema, defaultWidth: 90, defaultHeight: 140,
  config: ShaftfurnaceConfigComponent, graphicComponent: ShaftfurnaceGraphicComponent, graphicComponentName: 'ShaftfurnaceGraphic',
});
