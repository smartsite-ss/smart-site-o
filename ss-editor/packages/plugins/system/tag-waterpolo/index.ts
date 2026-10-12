// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import { TagWaterpoloPlugin } from './TagWaterpoloPlugin';
import { tagWaterpoloPropertySchema } from './tagWaterpoloPropertySchema';
import TagWaterpoloGraphicComponent from './TagWaterpoloGraphic.vue';
import TagWaterpoloConfigComponent from './TagWaterpoloConfig.vue';

export const TagWaterpoloGraphic = TagWaterpoloGraphicComponent;
export { TagWaterpoloPlugin, tagWaterpoloPropertySchema };
export type { TagWaterpoloProps } from './TagWaterpoloPlugin';

export default createPlugin({
  type: 'tag-waterpolo',
  category: 'system',
  version: pkg.version,
  label: () => i18n.global.t('tagWaterpolo.label'),
  plugin: TagWaterpoloPlugin,
  schema: tagWaterpoloPropertySchema,
  config: TagWaterpoloConfigComponent,
  defaultWidth: 200,
  defaultHeight: 200,
  graphicComponent: TagWaterpoloGraphicComponent,
  graphicComponentName: 'TagWaterpoloGraphic',
});
