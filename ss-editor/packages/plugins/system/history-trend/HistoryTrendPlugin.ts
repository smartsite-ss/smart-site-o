// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { historyTrendPropertySchema } from './historyTrendPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';

// 动态扫描 locales 目录，新增语言只需添加对应 json 文件，无需改动本文件
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import pkg from './package.json';
import type { HistoryTrendTagBinding } from './historyTrendUtils';

export type { TrendSeriesStyle, HistoryTrendTagBinding } from './historyTrendUtils';
export { DEFAULT_TREND_COLORS, createDefaultSeriesStyle } from './historyTrendUtils';

export type HistoryTrendProps = InferSchemaProps<typeof historyTrendPropertySchema> & {
  tags: HistoryTrendTagBinding[];
};

const defaults: HistoryTrendProps = {
  ...buildDefaultsFromSchema(historyTrendPropertySchema),
  tags: [],
} as HistoryTrendProps;

@Graphic({
  type: 'history-trend',
  name: i18n.global.t('historyTrend.label'),
  category: 'system',
  version: pkg.version,
  description: i18n.global.t('historyTrend.description'),
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
export class HistoryTrendPlugin extends BasePlugin<HistoryTrendProps> {
  componentName = 'HistoryTrendGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 480, h = 320) {
    super('history-trend', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
