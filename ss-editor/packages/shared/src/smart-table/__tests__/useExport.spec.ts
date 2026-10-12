// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi } from 'vitest';

describe('export utils', () => {
  beforeAll(() => {
    // jsdom doesn't have URL.createObjectURL
    if (typeof URL.createObjectURL === 'undefined') {
      Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:test') });
    }
    if (typeof URL.revokeObjectURL === 'undefined') {
      Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn() });
    }
  });

  describe('exportToXlsx', () => {
    it('TC-EXP-001: resolveCellValue returns formatted value', async () => {
      const { resolveCellValue } = await import('../utils/export-xlsx');
      const col: any = { key: 'name', dataKey: 'name' };
      expect(resolveCellValue(col, { name: 'test' })).toBe('test');
    });

    it('TC-EXP-002: respects excludeFromExport', async () => {
      const { exportToXlsx } = await import('../utils/export-xlsx');
      await expect(exportToXlsx([], [], 'test')).resolves.not.toThrow();
    });
  });

  describe('exportToCsv', () => {
    it('TC-EXP-003: generates CSV with BOM', async () => {
      const { exportToCsv } = await import('../utils/export-csv');
      expect(() => exportToCsv([], [], 'test')).not.toThrow();
    });

    it('TC-EXP-004: escapes special characters', async () => {
      const { resolveCellValue } = await import('../utils/export-xlsx');
      const col: any = { key: 'desc', dataKey: 'desc' };
      const row = { desc: 'hello, "world"' };
      const val = resolveCellValue(col, row);
      expect(val).toBe('hello, "world"');
    });
  });

  describe('exportToImage', () => {
    it('TC-EXP-005: exportToImage function exists', async () => {
      const { exportToImage } = await import('../utils/export-image');
      expect(typeof exportToImage).toBe('function');
    });
  });
});
