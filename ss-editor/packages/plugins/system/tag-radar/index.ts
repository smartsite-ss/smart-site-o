// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import { TagRadarPlugin } from './TagRadarPlugin';
import { tagRadarPropertySchema } from './tagRadarPropertySchema';
import TagRadarGraphicComponent from './TagRadarGraphic.vue';
import TagRadarConfigComponent from './TagRadarConfig.vue';

export const TagRadarGraphic = TagRadarGraphicComponent;
export { TagRadarPlugin, tagRadarPropertySchema };
export type { TagRadarProps } from './TagRadarPlugin';

export default createPlugin({
  type: 'tag-radar',
  category: 'system',
  version: pkg.version,
  label: () => i18n.global.t('tagRadar.label'),
  plugin: TagRadarPlugin,
  schema: tagRadarPropertySchema,
  config: TagRadarConfigComponent,
  defaultWidth: 360,
  defaultHeight: 300,
  graphicComponent: TagRadarGraphicComponent,
  graphicComponentName: 'TagRadarGraphic',
});
