// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { i18n, registerLocaleModules } from '@scada-editor/core';
import { eventPanelPropertySchema } from './eventPanelPropertySchema';

// 动态扫描 locales 目录，新增语言只需添加对应 json 文件，无需改动本文件
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import pkg from './package.json';

export type EventPanelProps = InferSchemaProps<typeof eventPanelPropertySchema> & {
  /** 项目 ID（空 = 全部事件，含系统级） */
  projectId: string;
  /** 事件类型筛选（空 = 全部类型） */
  eventType: string;
  /** 事件状态筛选（空 = 全部状态） */
  status: string;
};

const defaults: EventPanelProps = {
  ...buildDefaultsFromSchema(eventPanelPropertySchema),
  projectId: '',
  eventType: '',
  status: '',
} as EventPanelProps;

@Graphic({
  type: 'event-panel',
  name: i18n.global.t('eventPanel.label'),
  category: 'system',
  version: pkg.version,
  description: i18n.global.t('eventPanel.description'),
  defaultProps: defaults,
  defaultWidth: 480,
  defaultHeight: 320,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: false,
    animatable: false,
  },
})
export class EventPanelPlugin extends BasePlugin<EventPanelProps> {
  componentName = 'EventPanelGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 480, h = 320) {
    super('event-panel', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
