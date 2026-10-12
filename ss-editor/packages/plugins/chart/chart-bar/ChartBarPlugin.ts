// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  BasePlugin,
  Graphic,
  InferSchemaProps,
  buildDefaultsFromSchema,
  DrawContext,
} from '@scada-editor/plugin-sdk';
import { i18n, registerLocaleModules } from '@scada-editor/core';
import { chartBarPropertySchema } from './chartBarPropertySchema';
import type { ChartDataSourceConfig } from '@scada-editor/shared';
import pkg from './package.json';

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type ChartBarProps = InferSchemaProps<typeof chartBarPropertySchema> & {
  dataSource: ChartDataSourceConfig;
};

const defaultDataSource: ChartDataSourceConfig = {
  type: 'static',
  staticConfig: {
    dimensions: ['name', 'value'],
    source: [
      { name: 'A', value: 120 },
      { name: 'B', value: 200 },
      { name: 'C', value: 150 },
      { name: 'D', value: 80 },
      { name: 'E', value: 70 },
      { name: 'F', value: 110 },
    ],
  },
};

const defaults: ChartBarProps = {
  ...buildDefaultsFromSchema(chartBarPropertySchema),
  dataSource: defaultDataSource,
} as ChartBarProps;

@Graphic({
  type: 'chart-bar',
  name: i18n.global.t('chartBar.label'),
  category: 'chart',
  primaryCategory: 'chart',
  version: pkg.version,
  description: i18n.global.t('chartBar.description'),
  defaultProps: defaults,
  defaultWidth: 360,
  defaultHeight: 260,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: false,
    animatable: false,
  },
})
export class ChartBarPlugin extends BasePlugin<ChartBarProps> {
  componentName = 'ChartBarGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 360, h = 260) {
    super('chart-bar', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
