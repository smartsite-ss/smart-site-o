// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PageExportService, PageExportData } from '../../canvas-page/page-export.service';
import { setActivePinia, createPinia } from 'pinia';

describe('PageExportService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('exportPage', () => {
    it('should export page data with correct structure', () => {
      const data = PageExportService.exportPage();

      expect(data).toBeDefined();
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('page');
      expect(data.page).toHaveProperty('id');
      expect(data.page).toHaveProperty('name');
      expect(data.page).toHaveProperty('width');
      expect(data.page).toHaveProperty('height');
      expect(data.page).toHaveProperty('backgroundColor');
      expect(data).toHaveProperty('graphics');
      expect(data).toHaveProperty('timers');
      expect(data).toHaveProperty('groups');
    });

    it('should include graphics in export', () => {
      const data = PageExportService.exportPage();

      expect(Array.isArray(data.graphics)).toBe(true);
    });

    it('should include page config with width and height', () => {
      const data = PageExportService.exportPage();

      expect(data.page.width).toBeGreaterThan(0);
      expect(data.page.height).toBeGreaterThan(0);
    });

    it('should set version to 1.0', () => {
      const data = PageExportService.exportPage();

      expect(data.version).toBe('1.0');
    });

    it('should export with specific pageId', () => {
      const data = PageExportService.exportPage('page-1');

      expect(data).toBeDefined();
      expect(data.page.id).toBe('page-1');
    });
  });

  describe('exportPageRaw', () => {
    it('should return raw page data', () => {
      const data = PageExportService.exportPageRaw();

      expect(data).toBeDefined();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('width');
      expect(data).toHaveProperty('height');
      expect(data).toHaveProperty('graphics');
    });
  });

  describe('exportScene', () => {
    it('should export scene with all pages', () => {
      const data = PageExportService.exportScene();

      expect(data).toBeDefined();
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('pages');
      expect(Array.isArray(data.pages)).toBe(true);
    });

    it('should include scene metadata', () => {
      const data = PageExportService.exportScene();

      expect(data.version).toBe('1.0');
      expect(data.pages.length).toBeGreaterThanOrEqual(1);
      data.pages.forEach(page => {
        expect(page).toHaveProperty('version');
        expect(page).toHaveProperty('page');
        expect(page).toHaveProperty('graphics');
      });
    });
  });

  describe('downloadJSON', () => {
    it('should create download link for JSON data', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };

      const mockAppend = vi.fn();
      const mockRemove = vi.fn();
      const mockCreateElement = vi.fn().mockReturnValue(mockLink);

      vi.stubGlobal('document', {
        createElement: mockCreateElement,
        body: {
          appendChild: mockAppend,
          removeChild: mockRemove,
        },
      });
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:test'),
        revokeObjectURL: vi.fn(),
      });
      vi.stubGlobal('Blob', class {
        type: string;
        constructor(_content: string[], options: { type: string }) {
          this.type = options.type;
        }
      });

      const testData: PageExportData = {
        version: '1.0',
        page: {
          id: 'test-page',
          name: 'Test',
          width: 1920,
          height: 1080,
          backgroundColor: '#ffffff',
        },
        graphics: [],
        timers: [],
        groups: [],
      };

      PageExportService.downloadJSON(testData, 'test.json');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppend).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalled();
      expect(mockLink.download).toBe('test.json');
      expect(mockLink.click).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('should use default filename when not provided', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };

      vi.stubGlobal('document', {
        createElement: vi.fn().mockReturnValue(mockLink),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      });
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:test'),
        revokeObjectURL: vi.fn(),
      });
      vi.stubGlobal('Blob', class {
        constructor() {}
      });

      const testData: PageExportData = {
        version: '1.0',
        page: {
          id: 'test-page',
          name: 'Test',
          width: 1920,
          height: 1080,
          backgroundColor: '#ffffff',
        },
        graphics: [],
        timers: [],
        groups: [],
      };

      expect(() => PageExportService.downloadJSON(testData, 'test.json')).not.toThrow();

      vi.unstubAllGlobals();
    });
  });
});