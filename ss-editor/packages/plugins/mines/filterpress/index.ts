// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import FilterpressConfigComponent from './FilterpressConfig.vue';
import { FilterpressPlugin } from './FilterpressPlugin';
import { filterpressPropertySchema } from './filterpressPropertySchema';
import FilterpressGraphicComponent from './FilterpressGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const FilterpressConfig = FilterpressConfigComponent;
export const FilterpressGraphic = FilterpressGraphicComponent;
export { FilterpressPlugin, filterpressPropertySchema };
export type { FilterpressProps } from './FilterpressPlugin';

export default createPlugin({
  type: 'filterpress',
  category: 'mines',
  label: () => i18n.global.t('filterpress.label'),
  plugin: FilterpressPlugin,
  schema: filterpressPropertySchema,
  defaultWidth: 200,
  defaultHeight: 100,
  config: FilterpressConfigComponent,
  graphicComponent: FilterpressGraphicComponent,
  graphicComponentName: 'FilterpressGraphic',
});
