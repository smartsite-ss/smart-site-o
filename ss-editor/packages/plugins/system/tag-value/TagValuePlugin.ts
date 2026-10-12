// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { i18n, registerLocaleModules } from '@scada-editor/core';
import { tagValuePropertySchema } from './tagValuePropertySchema';

// 动态扫描 locales 目录，新增语言只需添加对应 json 文件，无需改动本文件
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import pkg from './package.json';

export type TagValueProps = InferSchemaProps<typeof tagValuePropertySchema> & {
  /** 设备 UUID 主键（绑定回显/反查用） */
  deviceId: string;
  /** 设备编码（用户可读，展示用） */
  deviceCode: string;
  /** 设备名称（展示用） */
  deviceName: string;
  /** 标签 ID（运行态订阅的唯一标识） */
  tagId: string;
  /** 标签名称（展示用） */
  tagName: string;
  /** 标签数据类型（用于格式化判断） */
  dataType: string;
  /** 装饰图片 URL / dataURL（由 TagValueConfig 通过 StateImagePicker 管理） */
  decorationImage: string;
  /** 背景图片 URL / dataURL（由 TagValueConfig 通过 StateImagePicker 管理） */
  backgroundImage: string;
};

const defaults: TagValueProps = {
  ...buildDefaultsFromSchema(tagValuePropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
  decorationImage: '',
  backgroundImage: '',
} as TagValueProps;

@Graphic({
  type: 'tag-value',
  name: i18n.global.t('tagValue.label'),
  category: 'system',
  version: pkg.version,
  description: i18n.global.t('tagValue.description'),
  defaultProps: defaults,
  defaultWidth: 160,
  defaultHeight: 48,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: false,
    animatable: false,
  },
})
export class TagValuePlugin extends BasePlugin<TagValueProps> {
  componentName = 'TagValueGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 160, h = 48) {
    super('tag-value', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
