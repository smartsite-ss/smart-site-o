// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { SmartTableColumn } from '../types';
import { getNestedValue, applyFormatter } from './formatters';

export function resolveCellValue(col: SmartTableColumn, row: any): string {
  const dataKey = col.dataKey || col.key;
  const value = getNestedValue(row, dataKey);
  return applyFormatter(value, col.formatter, col.render as any, row, -1);
}

/** xlsx 动态导入，仅在导出按钮点击时加载，减少首屏体积 ~400KB */
let xlsxModule: typeof import('xlsx') | null = null;

async function getXlsx(): Promise<typeof import('xlsx')> {
  if (!xlsxModule) {
    xlsxModule = await import('xlsx');
  }
  return xlsxModule;
}

export async function exportToXlsx<T>(
  columns: SmartTableColumn<T>[],
  data: T[],
  filename: string,
): Promise<void> {
  const XLSX = await getXlsx();
  const visibleCols = columns.filter((c) => !c.excludeFromExport);
  const header = visibleCols.map((c) => c.exportTitle || resolveTitle(c));
  const rows = data.map((row) =>
    visibleCols.map((col) => resolveCellValue(col, row)),
  );

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function resolveTitle(col: SmartTableColumn): string {
  if (typeof col.title === 'function') return col.title(col);
  return col.title;
}
