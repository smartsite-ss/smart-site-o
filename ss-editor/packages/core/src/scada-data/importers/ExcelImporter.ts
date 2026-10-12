// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IFileImporter, TagConfig } from '../drivers/IFileImporter';

export class ExcelImporter implements IFileImporter {
  async parse(file: File): Promise<TagConfig[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // xlsx is an optional runtime dependency
          const XLSX = await import('xlsx');
          const data = new Uint8Array(reader.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
          const tags = this._parseRows(jsonData as unknown[][]);
          resolve(tags);
        } catch (err: any) {
          reject(new Error(`Excel parse error: ${err?.message || 'Unknown error'}`));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsArrayBuffer(file);
    });
  }

  getSupportedFormats(): string[] { return ['.xlsx', '.xls']; }

  private _parseRows(rows: unknown[][]): TagConfig[] {
    if (rows.length < 2) return [];
    const tags: TagConfig[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      tags.push({
        tagId: String(row[0] || `tag-${i}`),
        tagName: String(row[1] || `Tag ${i}`),
        dataType: String(row[2] || 'number'),
        unit: row[3] ? String(row[3]) : undefined,
        min: row[4] != null ? Number(row[4]) : undefined,
        max: row[5] != null ? Number(row[5]) : undefined,
      });
    }
    return tags;
  }
}