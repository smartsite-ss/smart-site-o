// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { i18n, registerLocaleModules } from '@scada-editor/core';
import { hikvisionVideoPropertySchema } from './hikvisionVideoPropertySchema';
import type { VideoChannel } from './videoPlayer';

// 动态扫描 locales 目录，新增语言只需添加对应 json 文件，无需改动本文件
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import pkg from './package.json';

export type HikvisionVideoProps = InferSchemaProps<typeof hikvisionVideoPropertySchema> & {
  /** 视频通道列表，数组顺序即网格槽位顺序（左上→右下） */
  channels: VideoChannel[];
};

const defaults: HikvisionVideoProps = {
  ...buildDefaultsFromSchema(hikvisionVideoPropertySchema),
  channels: [],
} as HikvisionVideoProps;

@Graphic({
  type: 'hikvision-video',
  name: i18n.global.t('hikvisionVideo.label'),
  category: 'system',
  version: pkg.version,
  description: i18n.global.t('hikvisionVideo.description'),
  defaultProps: defaults,
  defaultWidth: 640,
  defaultHeight: 360,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: false,
    animatable: false,
  },
})
export class HikvisionVideoPlugin extends BasePlugin<HikvisionVideoProps> {
  componentName = 'HikvisionVideoGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 640, h = 360) {
    super('hikvision-video', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
