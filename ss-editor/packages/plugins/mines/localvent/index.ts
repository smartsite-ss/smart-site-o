// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import LocalventConfigComponent from './LocalventConfig.vue';
import { LocalventPlugin } from './LocalventPlugin';
import { localventPropertySchema } from './localventPropertySchema';
import LocalventGraphicComponent from './LocalventGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const LocalventConfig = LocalventConfigComponent;
export const LocalventGraphic = LocalventGraphicComponent;
export { LocalventPlugin, localventPropertySchema };
export type { LocalventProps } from './LocalventPlugin';

export default createPlugin({
  type: 'localvent', category: 'mines', label: () => i18n.global.t('localvent.label'),
  plugin: LocalventPlugin, schema: localventPropertySchema, defaultWidth: 90, defaultHeight: 70,
  config: LocalventConfigComponent, graphicComponent: LocalventGraphicComponent, graphicComponentName: 'LocalventGraphic',
});
