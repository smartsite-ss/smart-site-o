// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

// 动态扫描 locales 目录，新增语言只需添加对应 json 文件，无需改动本文件
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import { HikvisionVideoPlugin } from './HikvisionVideoPlugin';
import { hikvisionVideoPropertySchema } from './hikvisionVideoPropertySchema';
import HikvisionVideoGraphicComponent from './HikvisionVideoGraphic.vue';
import HikvisionVideoConfigComponent from './HikvisionVideoConfig.vue';

export const HikvisionVideoGraphic = HikvisionVideoGraphicComponent;
export { HikvisionVideoPlugin, hikvisionVideoPropertySchema };
export type { HikvisionVideoProps } from './HikvisionVideoPlugin';
export type { VideoChannel, VideoProtocol, VideoLayout } from './videoPlayer';

export default createPlugin({
  type: 'hikvision-video',
  category: 'system',
  version: pkg.version,
  label: () => i18n.global.t('hikvisionVideo.label'),
  plugin: HikvisionVideoPlugin,
  schema: hikvisionVideoPropertySchema,
  config: HikvisionVideoConfigComponent,
  defaultWidth: 640,
  defaultHeight: 360,
  graphicComponent: HikvisionVideoGraphicComponent,
  graphicComponentName: 'HikvisionVideoGraphic',
});
