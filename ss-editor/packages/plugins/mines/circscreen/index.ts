// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import CircscreenConfigComponent from './CircscreenConfig.vue'; import { CircscreenPlugin } from './CircscreenPlugin';
import { circscreenPropertySchema } from './circscreenPropertySchema'; import CircscreenGraphicComponent from './CircscreenGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const CircscreenConfig = CircscreenConfigComponent; export const CircscreenGraphic = CircscreenGraphicComponent;
export { CircscreenPlugin, circscreenPropertySchema }; export type { CircscreenProps } from './CircscreenPlugin';
export default createPlugin({ type: 'circscreen', category: 'mines', label: () => i18n.global.t('circscreen.label'),
  plugin: CircscreenPlugin, schema: circscreenPropertySchema, defaultWidth: 120, defaultHeight: 120,
  config: CircscreenConfigComponent, graphicComponent: CircscreenGraphicComponent, graphicComponentName: 'CircscreenGraphic',
});
