// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  BasePlugin,
  Graphic,
  DrawContext,
  InferSchemaProps,
  buildDefaultsFromSchema,
} from '@scada-editor/plugin-sdk';
import { i18n, registerLocaleModules } from '@scada-editor/core';
import { tagWaterpoloPropertySchema } from './tagWaterpoloPropertySchema';
import type { ChartVariableBinding } from '@scada-editor/shared';
import pkg from './package.json';

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type TagWaterpoloProps = InferSchemaProps<typeof tagWaterpoloPropertySchema> & {
  tags: ChartVariableBinding[];
};

const defaults: TagWaterpoloProps = {
  ...buildDefaultsFromSchema(tagWaterpoloPropertySchema),
  tags: [],
} as TagWaterpoloProps;

@Graphic({
  type: 'tag-waterpolo',
  name: i18n.global.t('tagWaterpolo.label'),
  category: 'system',
  primaryCategory: 'system',
  version: pkg.version,
  description: i18n.global.t('tagWaterpolo.description'),
  defaultProps: defaults,
  defaultWidth: 200,
  defaultHeight: 200,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: false,
    animatable: false,
  },
})
export class TagWaterpoloPlugin extends BasePlugin<TagWaterpoloProps> {
  componentName = 'TagWaterpoloGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 200, h = 200) {
    super('tag-waterpolo', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
