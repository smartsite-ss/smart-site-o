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
import { gaugePropertySchema } from './gaugePropertySchema';
import type { ChartDataSourceConfig } from '@scada-editor/shared';
import pkg from './package.json';

registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type ChartGaugeProps = InferSchemaProps<typeof gaugePropertySchema> & {
  dataSource: ChartDataSourceConfig;
};

const defaultDataSource: ChartDataSourceConfig = {
  type: 'static',
  staticConfig: {
    dimensions: ['name', 'value'],
    source: [{ name: '仪表', value: 60 }],
  },
};

const defaults: ChartGaugeProps = {
  ...buildDefaultsFromSchema(gaugePropertySchema),
  dataSource: defaultDataSource,
} as ChartGaugeProps;

@Graphic({
  type: 'chart-gauge',
  name: i18n.global.t('chartGauge.label'),
  category: 'chart',
  primaryCategory: 'chart',
  version: pkg.version,
  description: i18n.global.t('chartGauge.description'),
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
export class ChartGaugePlugin extends BasePlugin<ChartGaugeProps> {
  componentName = 'GaugeGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 200, h = 200) {
    super('chart-gauge', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
