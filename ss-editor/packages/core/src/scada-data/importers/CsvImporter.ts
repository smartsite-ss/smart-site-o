// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IFileImporter, TagConfig } from '../drivers/IFileImporter';

export class CsvImporter implements IFileImporter {
  async parse(file: File): Promise<TagConfig[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(this._parseCsv(reader.result as string)); }
        catch (err: any) { reject(new Error(`CSV parse error: ${err?.message || 'Unknown error'}`)); }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  }

  getSupportedFormats(): string[] { return ['.csv', '.tsv']; }

  private _parseCsv(text: string): TagConfig[] {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    const delimiter = text.includes('\t') ? '\t' : ',';
    const tags: TagConfig[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this._splitLine(lines[i], delimiter);
      tags.push({
        tagId: cols[0] || `tag-${i}`,
        tagName: cols[1] || `Tag ${i}`,
        dataType: cols[2] || 'number',
        unit: cols[3] || undefined,
        min: cols[4] ? Number(cols[4]) : undefined,
        max: cols[5] ? Number(cols[5]) : undefined,
      });
    }
    return tags;
  }

  private _splitLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === delimiter && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  }
}