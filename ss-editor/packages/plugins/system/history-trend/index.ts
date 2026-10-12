// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

// 动态扫描 locales 目录，新增语言只需添加对应 json 文件，无需改动本文件
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import { HistoryTrendPlugin } from './HistoryTrendPlugin';
import { historyTrendPropertySchema } from './historyTrendPropertySchema';
import HistoryTrendGraphicComponent from './HistoryTrendGraphic.vue';
import HistoryTrendConfigComponent from './HistoryTrendConfig.vue';

export const HistoryTrendGraphic = HistoryTrendGraphicComponent;
export { HistoryTrendPlugin, historyTrendPropertySchema };
export type { HistoryTrendProps, HistoryTrendTagBinding, TrendSeriesStyle } from './HistoryTrendPlugin';

export default createPlugin({
  type: 'history-trend',
  category: 'system',
  version: pkg.version,
  label: () => i18n.global.t('historyTrend.label'),
  plugin: HistoryTrendPlugin,
  schema: historyTrendPropertySchema,
  config: HistoryTrendConfigComponent,
  defaultWidth: 480,
  defaultHeight: 320,
  graphicComponent: HistoryTrendGraphicComponent,
  graphicComponentName: 'HistoryTrendGraphic',
});
