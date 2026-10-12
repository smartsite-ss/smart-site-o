// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { SmartTableColumn, ExportFormat, ExportEvent } from '../types';
import { applyFormatter, getNestedValue } from '../utils/formatters';

export function useExport(
  columns: () => SmartTableColumn[],
  data: () => any[],
  tableId: () => string,
  emit: (evt: 'export', payload: ExportEvent) => void,
) {
  const exportDropdownVisible = ref(false);
  const exporting = ref(false);

  function toggleExportDropdown() {
    exportDropdownVisible.value = !exportDropdownVisible.value;
  }

  function closeExportDropdown() {
    exportDropdownVisible.value = false;
  }

  function resolveCellValue(col: SmartTableColumn, row: any): string {
    const dataKey = col.dataKey || col.key;
    const value = getNestedValue(row, dataKey);
    return applyFormatter(value, col.formatter, col.render, row, -1);
  }

  function getExportFilename(format: string): string {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${tableId()}-${ts}.${format}`;
  }

  async function doExport(format: ExportFormat) {
    closeExportDropdown();
    const cols = columns().filter((c) => !c.excludeFromExport);
    const allData = data();

    // 先尝试 emit 给父组件处理
    emit('export', { format, columns: cols, data: allData });
  }

  return {
    exportDropdownVisible,
    exporting,
    toggleExportDropdown,
    closeExportDropdown,
    doExport,
    resolveCellValue,
    getExportFilename,
  };
}

// Need this for the reactive ref
import { ref } from 'vue';
