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
import { tagRadarPropertySchema } from './tagRadarPropertySchema';
import type { ChartVariableBinding } from '@scada-editor/shared';
import pkg from './package.json';

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type TagRadarProps = InferSchemaProps<typeof tagRadarPropertySchema> & {
  tags: ChartVariableBinding[];
};

const defaults: TagRadarProps = {
  ...buildDefaultsFromSchema(tagRadarPropertySchema),
  tags: [],
} as TagRadarProps;

@Graphic({
  type: 'tag-radar',
  name: i18n.global.t('tagRadar.label'),
  category: 'system',
  primaryCategory: 'system',
  version: pkg.version,
  description: i18n.global.t('tagRadar.description'),
  defaultProps: defaults,
  defaultWidth: 360,
  defaultHeight: 300,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: false,
    animatable: false,
  },
})
export class TagRadarPlugin extends BasePlugin<TagRadarProps> {
  componentName = 'TagRadarGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 360, h = 300) {
    super('tag-radar', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
