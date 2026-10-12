// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IFileImporter, TagConfig } from '../drivers/IFileImporter';

export class JsonImporter implements IFileImporter {
  async parse(file: File): Promise<TagConfig[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(this._parseJson(JSON.parse(reader.result as string))); }
        catch (err: any) { reject(new Error(`JSON parse error: ${err?.message || 'Unknown error'}`)); }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  }

  getSupportedFormats(): string[] { return ['.json']; }

  private _parseJson(data: unknown): TagConfig[] {
    const items = Array.isArray(data) ? data : [data];
    return items.map((item: any, idx: number) => ({
      tagId: item.tagId || `tag-${idx}`,
      tagName: item.tagName || item.name || `Tag ${idx}`,
      dataType: item.dataType || 'number',
      unit: item.unit,
      min: item.min,
      max: item.max,
      values: Array.isArray(item.values) ? item.values : undefined,
    }));
  }
}