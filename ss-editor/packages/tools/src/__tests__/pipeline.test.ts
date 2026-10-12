// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentInfo, GenerateOptions, GenerateResult } from '../types';

// Mock fs module
const mockFs = {
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
};

vi.mock('fs', () => mockFs);

// Mock svg-extractor
const mockExtractSvg = vi.fn();
const mockExtractAllSvgs = vi.fn();

vi.mock('../svg-extractor/index', () => ({
  extractSvg: mockExtractSvg,
  extractAllSvgs: mockExtractAllSvgs,
}));

// Mock png-renderer
const mockRenderPng = vi.fn();
const mockRenderPngToFile = vi.fn();
const mockCloseBrowser = vi.fn();

vi.mock('../png-renderer/index', () => ({
  renderPng: mockRenderPng,
  renderPngToFile: mockRenderPngToFile,
  closeBrowser: mockCloseBrowser,
}));

// Dynamic import after mock setup
const pipelineModule = await import('../pipeline');
const { generateIcons } = pipelineModule as {
  generateIcons: (components: ComponentInfo[], options?: GenerateOptions) => Promise<GenerateResult>;
};

function makeComponent(overrides: Partial<ComponentInfo> = {}): ComponentInfo {
  return {
    type: 'test-button',
    category: 'basic',
    dirPath: '/plugins/basic/test-button',
    hasGraphicVue: true,
    hasIconVue: false,
    hasPng: false,
    hasSvg: false,
    ...overrides,
  };
}

describe('pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: files don't exist
    mockFs.existsSync.mockReturnValue(false);
    // Default: extractSvg returns valid SVG
    mockExtractSvg.mockResolvedValue('<svg>test</svg>');
    mockRenderPngToFile.mockResolvedValue(undefined);
  });

  // ================================================================
  // generateIcons
  // ================================================================
  describe('generateIcons', () => {
    // TC-PIPELINE-001
    it('should generate SVG only when format is svg', async () => {
      const comp = makeComponent();
      const result = await generateIcons([comp], { format: 'svg' });

      expect(result.total).toBe(1);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockExtractSvg).toHaveBeenCalledTimes(1);
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      expect(mockRenderPngToFile).not.toHaveBeenCalled();
      expect(result.results[0].svgPath).toBe('/plugins/basic/test-button/test-button.svg');
      expect(result.results[0].pngPath).toBeUndefined();
    });

    // TC-PIPELINE-002
    it('should generate PNG only when format is png', async () => {
      const comp = makeComponent();
      const result = await generateIcons([comp], { format: 'png' });

      expect(result.total).toBe(1);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockExtractSvg).toHaveBeenCalledTimes(1);
      expect(mockRenderPngToFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFileSync).not.toHaveBeenCalled(); // No SVG file write
      expect(result.results[0].pngPath).toBe('/plugins/basic/test-button/test-button.png');
      expect(result.results[0].svgPath).toBeUndefined();
    });

    // TC-PIPELINE-003
    it('should generate both SVG and PNG when format is both', async () => {
      const comp = makeComponent();
      const result = await generateIcons([comp], { format: 'both' });

      expect(result.total).toBe(1);
      expect(result.success).toBe(1);
      expect(mockExtractSvg).toHaveBeenCalledTimes(1); // Reused for both
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1); // SVG write
      expect(mockRenderPngToFile).toHaveBeenCalledTimes(1); // PNG render
      expect(result.results[0].svgPath).toBe('/plugins/basic/test-button/test-button.svg');
      expect(result.results[0].pngPath).toBe('/plugins/basic/test-button/test-button.png');
    });

    // TC-PIPELINE-004
    it('should skip component without Graphic.vue', async () => {
      const comp = makeComponent({ hasGraphicVue: false });
      const result = await generateIcons([comp]);

      expect(result.total).toBe(1);
      expect(result.success).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0].error).toBe('No Graphic.vue found');
      expect(mockExtractSvg).not.toHaveBeenCalled();
    });

    // TC-PIPELINE-005
    it('should overwrite existing files when force is true', async () => {
      const comp = makeComponent();
      mockFs.existsSync.mockReturnValue(true); // File already exists

      const result = await generateIcons([comp], { force: true, format: 'svg' });

      expect(result.success).toBe(1);
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    // TC-PIPELINE-006
    it('should not overwrite existing files when force is false', async () => {
      const comp = makeComponent();
      mockFs.existsSync.mockImplementation((p: string) => {
        // The SVG file already exists
        if (p === '/plugins/basic/test-button/test-button.svg') return true;
        return false;
      });

      const result = await generateIcons([comp], { force: false, format: 'svg' });

      expect(result.success).toBe(1);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
      expect(result.results[0].svgPath).toBeUndefined();
    });

    // TC-PIPELINE-007
    it('should handle failed extraction gracefully', async () => {
      const comp = makeComponent();
      mockExtractSvg.mockRejectedValue(new Error('Extraction failed'));

      const result = await generateIcons([comp], { format: 'svg' });

      expect(result.total).toBe(1);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBe('Extraction failed');
    });

    // TC-PIPELINE-008
    it('should use default options when none provided', async () => {
      const comp = makeComponent();
      await generateIcons([comp]);

      // Default format is 'both'
      expect(mockExtractSvg).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          size: 128,
          backgroundColor: '#1e1e2e',
        })
      );
    });

    // TC-PIPELINE-009
    it('should pass custom options to extractor and renderer', async () => {
      const comp = makeComponent();
      await generateIcons([comp], {
        size: 256,
        scale: 3,
        backgroundColor: '#ffffff',
        padding: 16,
        format: 'both',
      });

      expect(mockExtractSvg).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          size: 256,
          backgroundColor: '#ffffff',
        })
      );

      expect(mockRenderPngToFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          size: 256,
          scale: 3,
          backgroundColor: '#ffffff',
          padding: 16,
        })
      );
    });

    // TC-PIPELINE-010
    it('should create directory before writing files', async () => {
      const comp = makeComponent();
      await generateIcons([comp], { format: 'svg' });

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(comp.dirPath, { recursive: true });
    });

    // TC-PIPELINE-011
    it('should handle empty components array', async () => {
      const result = await generateIcons([]);

      expect(result.total).toBe(0);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.results).toEqual([]);
      expect(mockExtractSvg).not.toHaveBeenCalled();
      expect(mockRenderPngToFile).not.toHaveBeenCalled();
    });

    // TC-PIPELINE-012
    it('should handle null svgContent from extractSvg', async () => {
      const comp = makeComponent();
      mockExtractSvg.mockResolvedValue(null);

      const result = await generateIcons([comp], { format: 'svg' });

      expect(result.success).toBe(1);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
      expect(mockRenderPngToFile).not.toHaveBeenCalled();
    });

    // TC-PIPELINE-013
    it('should handle PNG generation when SVG extraction returns null for PNG-only format', async () => {
      const comp = makeComponent();
      mockExtractSvg.mockResolvedValue(null);

      const result = await generateIcons([comp], { format: 'png' });

      expect(result.success).toBe(1);
      expect(mockRenderPngToFile).not.toHaveBeenCalled();
    });

    // TC-PIPELINE-014
    it('should handle PNG error when SVG extraction succeeded', async () => {
      const comp = makeComponent();
      mockExtractSvg.mockResolvedValue('<svg>test</svg>');
      mockRenderPngToFile.mockRejectedValue(new Error('PNG render failed'));

      const result = await generateIcons([comp], { format: 'both' });

      expect(result.total).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.success).toBe(0);
      expect(result.results[0].error).toBe('PNG render failed');
    });

    // TC-PIPELINE-015
    it('should handle multiple components with mixed results', async () => {
      const comp1 = makeComponent({ type: 'button', dirPath: '/plugins/basic/button' });
      const comp2 = makeComponent({ type: 'label', hasGraphicVue: false, dirPath: '/plugins/basic/label' });
      const comp3 = makeComponent({ type: 'input', dirPath: '/plugins/basic/input' });

      mockExtractSvg.mockResolvedValueOnce('<svg>button</svg>');
      mockExtractSvg.mockResolvedValueOnce('<svg>input</svg>');

      const result = await generateIcons([comp1, comp2, comp3], { format: 'svg' });

      expect(result.total).toBe(3);
      expect(result.success).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
    });

    // TC-PIPELINE-016
    it('should not write PNG file when it already exists and force is false', async () => {
      const comp = makeComponent();
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins/basic/test-button/test-button.png') return true;
        return false;
      });

      const result = await generateIcons([comp], { format: 'png' });

      expect(result.success).toBe(1);
      expect(mockRenderPngToFile).not.toHaveBeenCalled();
      expect(result.results[0].pngPath).toBeUndefined();
    });

    // TC-PIPELINE-017
    it('should handle error with no message property', async () => {
      const comp = makeComponent();
      mockExtractSvg.mockRejectedValue('raw string error');

      const result = await generateIcons([comp], { format: 'svg' });

      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBe('raw string error');
    });
  });
});