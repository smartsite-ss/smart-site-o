// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// SmartTable 已迁移到 @scada-editor/shared 包
// 此文件保留作为向后兼容的重新导出，新代码请从 @scada-editor/shared 导入
export {
  SmartTable,
  SmartTableCore,
  SmartTablePagination,
  SmartTableLoading,
  SmartTableEmpty,
  SmartTableColumnToggle,
  SmartTableExport,
} from '@scada-editor/shared';

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
} from '@scada-editor/shared';

export {
  usePagination,
  useColumnConfig,
  useExport,
  exportToXlsx,
  exportToCsv,
  exportToImage,
  applyFormatter,
  getNestedValue,
} from '@scada-editor/shared';
