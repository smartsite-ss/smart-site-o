// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export { default as ColorPicker } from './ColorPicker.vue';
export { default as ColorField } from './ColorField.vue';
export { default as PluginConfigPanel } from './PluginConfigPanel.vue';
export { default as SsLoading } from './SsLoading.vue';

// Cron 表达式编辑控件
export { default as CronExpressionInput } from './components/CronExpressionInput.vue';

// 字典 UI 控件
export { default as DictSelector } from './components/DictSelector.vue';
export { default as DictLabel } from './components/DictLabel.vue';

// 时间范围选择器
export { default as TimeRangePicker } from './components/TimeRangePicker.vue';
export type { TimeRange } from './components/TimeRangePicker.types';
export { useDict } from './composables/useDict';
export type { DictItem, DictTable, DictOption } from './composables/useDict';

// SmartTable 通用列表组件
export { default as SmartTable } from './smart-table/SmartTable.vue';
export { default as SmartTableCore } from './smart-table/SmartTableCore.vue';
export { default as SmartTablePagination } from './smart-table/SmartTablePagination.vue';
export { default as SmartTableLoading } from './smart-table/SmartTableLoading.vue';
export { default as SmartTableEmpty } from './smart-table/SmartTableEmpty.vue';
export { default as SmartTableColumnToggle } from './smart-table/SmartTableColumnToggle.vue';
export { default as SmartTableExport } from './smart-table/SmartTableExport.vue';

export type {
  SmartTableColumn,
  PaginationConfig,
  PageChangeEvent,
  ColumnPersist,
  ExportFormat,
  ExportEvent,
  SortConfig,
  SortChangeEvent,
  FormatterType,
  ColumnEditor,
  EditorOption,
  CellSpan,
  SpanMethod,
  RowEditEvent,
  FlatTreeRow,
  TreeExpandEvent,
} from './smart-table/types';

export { usePagination } from './smart-table/composables/usePagination';
export { useColumnConfig } from './smart-table/composables/useColumnConfig';
export { useExport } from './smart-table/composables/useExport';
export { exportToXlsx } from './smart-table/utils/export-xlsx';
export { exportToCsv } from './smart-table/utils/export-csv';
export { exportToImage } from './smart-table/utils/export-image';
export { applyFormatter, getNestedValue } from './smart-table/utils/formatters';

// 图表基座（跨 chart / system 分类复用）
export {
  registerChartModules,
  buildContainerStyle,
  buildTrendChartOption,
  DEFAULT_TREND_COLORS,
  createDefaultSeriesStyle,
  formatNumber,
} from './chart';
export type {
  TrendSeriesStyle,
  ChartTagBinding,
  ChartVariableBinding,
  ChartContainerStyleInput,
  TrendChartOptionInput,
} from './chart';

// 图表数据源抽象（static / api / database）
export * from './chart/data-source';

// 分类图表 option 组装器（bar / pie / radar / gauge）
export {
  buildBarChartOption,
  buildPieChartOption,
  buildRadarChartOption,
  buildGaugeChartOption,
  latestSeriesToCategoryResult,
  useChartSource,
} from './chart';
export type { CategoryChartOptionInput, GaugeChartOptionInput, ChartSourceDeps } from './chart';
export { default as ChartDataSourceEditor } from './chart/ChartDataSourceEditor.vue';