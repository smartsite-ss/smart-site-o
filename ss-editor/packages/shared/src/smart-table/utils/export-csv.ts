// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { SmartTableColumn } from '../types';
import { resolveCellValue } from './export-xlsx';

export function exportToCsv<T>(
  columns: SmartTableColumn<T>[],
  data: T[],
  filename: string,
): void {
  const visibleCols = columns.filter((c) => !c.excludeFromExport);
  const header = visibleCols
    .map((c) => c.exportTitle || (typeof c.title === 'function' ? c.title(c) : c.title))
    .join(',');
  const rows = data.map((row) =>
    visibleCols
      .map((col) => {
        let val = resolveCellValue(col, row);
        if (typeof val === 'string' && /[,"\n]/.test(val)) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(','),
  );

  const bom = '\uFEFF';
  const csv = bom + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${filename}.csv`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
