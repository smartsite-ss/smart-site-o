// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExcelImporter } from '../../../scada-data/importers/ExcelImporter';
import type { TagConfig as _TagConfig } from '../../../scada-data/drivers/IFileImporter';

// Ensure File is available in Node environment
if (!((globalThis as any).File)) {
  (globalThis as any).File = class {
    constructor(_bits: any[], _name: string, _options?: any) {}
  };
}

// Mock xlsx module
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

function createMockFile(name: string = 'test.xlsx'): File {
  const buffer = new ArrayBuffer(8);
  return new File([buffer], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Mock FileReader
class MockFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | ArrayBuffer | null = null;

  readAsArrayBuffer(_file: File) {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      if (this.onload) this.onload();
    }, 0);
  }
}

describe('ExcelImporter', () => {
  let importer: ExcelImporter;

  beforeEach(() => {
    importer = new ExcelImporter();
    // Ensure FileReader exists in Node environment
    if (!((globalThis as any).FileReader)) {
      (globalThis as any).FileReader = class {};
    }
    vi.spyOn(globalThis, 'FileReader').mockImplementation(() => {
      return new MockFileReader() as unknown as FileReader;
    });
  });

  // ==================== parse ====================
  describe('parse', () => {
    it('TC-XLS-001: should parse Excel file with rows', async () => {
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue([
        ['tagId', 'tagName', 'dataType', 'unit', 'min', 'max'],
        ['tag-1', 'Temp 1', 'number', '°C', 0, 100],
        ['tag-2', 'Pressure', 'number', 'Pa', 0, 1000],
      ]);

      const file = createMockFile();
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(2);
      expect(tags[0]).toMatchObject({
        tagId: 'tag-1',
        tagName: 'Temp 1',
        dataType: 'number',
        unit: '°C',
        min: 0,
        max: 100,
      });
      expect(tags[1]).toMatchObject({
        tagId: 'tag-2',
        tagName: 'Pressure',
        dataType: 'number',
        unit: 'Pa',
        min: 0,
        max: 1000,
      });
    });

    it('TC-XLS-002: should return empty array for single row', async () => {
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue([
        ['tagId', 'tagName', 'dataType'],
      ]);

      const file = createMockFile();
      const tags = await importer.parse(file);
      expect(tags).toEqual([]);
    });

    it('TC-XLS-003: should generate default tagId when column is empty', async () => {
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue([
        ['tagId', 'tagName', 'dataType'],
        ['', 'T1', 'number'],
      ]);

      const file = createMockFile();
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(1);
      expect(tags[0].tagId).toBe('tag-1');
    });

    it('TC-XLS-004: should handle missing optional fields', async () => {
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue([
        ['tagId', 'tagName', 'dataType', 'unit', 'min', 'max'],
        ['tag-1', 'T1', 'number'],
      ]);

      const file = createMockFile();
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(1);
      expect(tags[0].unit).toBeUndefined();
      expect(tags[0].min).toBeUndefined();
      expect(tags[0].max).toBeUndefined();
    });

    it('TC-XLS-005: should handle null values in optional fields', async () => {
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue([
        ['tagId', 'tagName', 'dataType', 'unit', 'min', 'max'],
        ['tag-1', 'T1', 'number', null, null, null],
      ]);

      const file = createMockFile();
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(1);
      expect(tags[0].min).toBeUndefined();
      expect(tags[0].max).toBeUndefined();
    });
  });

  // ==================== getSupportedFormats ====================
  describe('getSupportedFormats', () => {
    it('TC-XLS-010: should return supported formats', () => {
      const formats = importer.getSupportedFormats();
      expect(formats).toContain('.xlsx');
      expect(formats).toContain('.xls');
    });
  });

  // ==================== error handling ====================
  describe('error handling', () => {
    it('TC-XLS-020: should handle Excel parse error', async () => {
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockImplementation(() => {
        throw new Error('Invalid file format');
      });

      const file = createMockFile();
      await expect(importer.parse(file)).rejects.toThrow('Excel parse error');
    });

    it('TC-XLS-021: should handle file read error', async () => {
      vi.spyOn(globalThis, 'FileReader').mockImplementation(() => {
        return {
          onload: null,
          onerror: null,
          readAsArrayBuffer: function() {
            setTimeout(() => {
              if ((this as any).onerror) (this as any).onerror(new Error('read error'));
            }, 0);
          },
        } as unknown as FileReader;
      });
      const file = createMockFile();
      await expect(importer.parse(file)).rejects.toThrow('File read error');
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-XLS-030: should handle many rows', async () => {
      const XLSX = await import('xlsx');
      const rows: unknown[][] = [['tagId', 'tagName', 'dataType']];
      for (let i = 0; i < 50; i++) {
        rows.push([`tag-${i}`, `Tag ${i}`, 'number']);
      }
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue(rows);

      const file = createMockFile();
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(50);
    });

    it('TC-XLS-031: should handle non-string values by converting to string', async () => {
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue([
        ['tagId', 'tagName', 'dataType', 'unit', 'min', 'max'],
        [123, 456, 'number', '°C', 0, 100],
      ]);

      const file = createMockFile();
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(1);
      expect(tags[0].tagId).toBe('123');
      expect(tags[0].tagName).toBe('456');
    });
  });
});