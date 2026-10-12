// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CsvImporter } from '../../../scada-data/importers/CsvImporter';
import type { TagConfig as _TagConfig } from '../../../scada-data/drivers/IFileImporter';

// Ensure File is available in Node environment
if (!((globalThis as any).File)) {
  (globalThis as any).File = class {
    constructor(_bits: any[], _name: string, _options?: any) {}
  };
}

function createMockFile(content: string, name: string = 'test.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}

// Mock FileReader
class MockFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | ArrayBuffer | null = null;

  readAsText(file: File) {
    // Simulate async read
    setTimeout(() => {
      this.result = file as unknown as string;
      // We need to get the file content, but File is not easily mockable
      if (this.onload) this.onload();
    }, 0);
  }
}

describe('CsvImporter', () => {
  let importer: CsvImporter;

  beforeEach(() => {
    importer = new CsvImporter();
    // Ensure FileReader exists in Node environment
    if (!((globalThis as any).FileReader)) {
      (globalThis as any).FileReader = class {};
    }
    // Mock FileReader
    vi.spyOn(globalThis, 'FileReader').mockImplementation(() => {
      const reader = new MockFileReader();
      // Override readAsText to capture content
      reader.readAsText = function(file: File) {
        // Use a trick to get the file content
        const content = (file as any)._content || '';
        reader.result = content;
        setTimeout(() => {
          if (reader.onload) reader.onload();
        }, 0);
      };
      return reader as unknown as FileReader;
    });
  });

  // ==================== parse ====================
  describe('parse', () => {
    it('TC-CSV-001: should parse CSV content with comma delimiter', async () => {
      const csvContent = 'tagId,tagName,dataType,unit,min,max\ntag-1,Temp 1,number,°C,0,100\ntag-2,Pressure,number,Pa,0,1000';
      const file = createMockFile(csvContent);
      (file as any)._content = csvContent;
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

    it('TC-CSV-002: should parse TSV content with tab delimiter', async () => {
      const tsvContent = 'tagId\ttagName\tdataType\ntag-1\tT1\tnumber\ntag-2\tT2\tstring';
      const file = createMockFile(tsvContent, 'test.tsv');
      (file as any)._content = tsvContent;
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(2);
      expect(tags[0].tagId).toBe('tag-1');
      expect(tags[1].tagId).toBe('tag-2');
    });

    it('TC-CSV-003: should return empty array for single line CSV', async () => {
      const csvContent = 'tagId,tagName,dataType';
      const file = createMockFile(csvContent);
      (file as any)._content = csvContent;
      const tags = await importer.parse(file);
      expect(tags).toEqual([]);
    });

    it('TC-CSV-004: should generate default tagId when column is empty', async () => {
      const csvContent = 'tagId,tagName,dataType\n,T1,number';
      const file = createMockFile(csvContent);
      (file as any)._content = csvContent;
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(1);
      expect(tags[0].tagId).toBe('tag-1');
    });

    it('TC-CSV-005: should handle empty lines', async () => {
      const csvContent = 'tagId,tagName,dataType\n\ntag-1,T1,number\n\n';
      const file = createMockFile(csvContent);
      (file as any)._content = csvContent;
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(1);
      expect(tags[0].tagId).toBe('tag-1');
    });

    it('TC-CSV-006: should handle quoted fields', async () => {
      const csvContent = 'tagId,tagName,dataType,unit\ntag-1,"Temp, with comma",number,"°C"';
      const file = createMockFile(csvContent);
      (file as any)._content = csvContent;
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(1);
      expect(tags[0].tagName).toBe('Temp, with comma');
      expect(tags[0].unit).toBe('°C');
    });

    it('TC-CSV-007: should handle missing optional fields', async () => {
      const csvContent = 'tagId,tagName,dataType,unit,min,max\ntag-1,T1,number';
      const file = createMockFile(csvContent);
      (file as any)._content = csvContent;
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(1);
      expect(tags[0].unit).toBeUndefined();
      expect(tags[0].min).toBeUndefined();
      expect(tags[0].max).toBeUndefined();
    });
  });

  // ==================== getSupportedFormats ====================
  describe('getSupportedFormats', () => {
    it('TC-CSV-010: should return supported formats', () => {
      const formats = importer.getSupportedFormats();
      expect(formats).toContain('.csv');
      expect(formats).toContain('.tsv');
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-CSV-020: should handle file read error', async () => {
      // Override mock to trigger error
      vi.spyOn(globalThis, 'FileReader').mockImplementation(() => {
        return {
          onload: null,
          onerror: null,
          readAsText: function() {
            setTimeout(() => {
              if ((this as any).onerror) (this as any).onerror(new Error('read error'));
            }, 0);
          },
        } as unknown as FileReader;
      });
      const file = createMockFile('');
      await expect(importer.parse(file)).rejects.toThrow('File read error');
    });

    it('TC-CSV-021: should handle empty file', async () => {
      const csvContent = '';
      const file = createMockFile(csvContent);
      (file as any)._content = csvContent;
      const tags = await importer.parse(file);
      expect(tags).toEqual([]);
    });

    it('TC-CSV-022: should handle many rows', async () => {
      let csvContent = 'tagId,tagName,dataType\n';
      for (let i = 0; i < 50; i++) {
        csvContent += `tag-${i},Tag ${i},number\n`;
      }
      const file = createMockFile(csvContent);
      (file as any)._content = csvContent;
      const tags = await importer.parse(file);
      expect(tags).toHaveLength(50);
    });
  });
});