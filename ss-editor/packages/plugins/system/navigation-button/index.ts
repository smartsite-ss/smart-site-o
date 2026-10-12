// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
// ★ 必须在 NavigationButtonPlugin 导入前 merge locale，
// 否则 @Graphic 装饰器中的 i18n.global.t() 会找不到 key
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import { NavigationButtonPlugin } from './NavigationButtonPlugin';
import { navigationButtonPropertySchema } from './navigationButtonPropertySchema';
import NavigationButtonGraphicComponent from './NavigationButtonGraphic.vue';

export const NavigationButtonGraphic = NavigationButtonGraphicComponent;
export { NavigationButtonPlugin, navigationButtonPropertySchema };
export type { NavigationButtonProps } from './NavigationButtonPlugin';

export default createPlugin({
  type: 'navigation-button',
  category: 'system',
  version: pkg.version,
  label: () => i18n.global.t('navigationButton.label'),
  plugin: NavigationButtonPlugin,
  schema: navigationButtonPropertySchema,
  defaultWidth: 100,
  defaultHeight: 40,
  graphicComponent: NavigationButtonGraphicComponent,
  graphicComponentName: 'NavigationButtonGraphic',
});
