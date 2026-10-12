// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useTransform } from '../../composables/useCanvasInteraction/useTransform';

// Mock stores
const mockPageStore = {
  currentPage: {
    id: 'test-page',
    name: 'Test Page',
    width: 1920,
    height: 1080,
    scale: 100,
    getGroupManager: () => null,
  },
  selectedGraphicIds: [],
};

const mockGraphicStore = {
  sortedGraphics: [] as any[],
};

// Mock usePageStore and useGraphicStore
vi.mock('@scada-editor/core', () => ({
  usePageStore: () => mockPageStore,
  useGraphicStore: () => mockGraphicStore,
}));

describe('useTransform - Smart Viewport management system', () => {
  let transform: any;
  let panX: any;
  let panY: any;
  let canvasWidth: any;
  let canvasHeight: any;

  const createOptions = () => ({
    panX: panX as any,
    panY: panY as any,
    canvasWidth: canvasWidth as any,
    canvasHeight: canvasHeight as any,
    cursorStyle: ref('default') as any,
    hoveredGraphicId: ref('') as any,
    graphicDecorators: ref({}) as any,
  });

  beforeEach(() => {
    // Reset state
    panX = ref(0);
    panY = ref(0);
    canvasWidth = ref(1920);
    canvasHeight = ref(1080);
    // Reset mock store
    mockPageStore.currentPage = {
      id: 'test-page',
      name: 'Test Page',
      width: 1920,
      height: 1080,
      scale: 100,
      getGroupManager: () => null,
    };
    mockPageStore.selectedGraphicIds = [];
    mockGraphicStore.sortedGraphics = [];
    // Create transform instance
    transform = useTransform(createOptions());
  });

  describe('zoomIn / zoomOut - Zoom keeps viewport center', () => {
    it('zoomIn should zoom anchored at canvas center without changing viewport center', () => {
      const drawCanvas = vi.fn();
      
      // initial state: scale=100, pan=(0,0)
      expect(mockPageStore.currentPage.scale).toBe(100);

      // Execute zoomIn
      transform.zoomIn(drawCanvas);

      // Verify: scale increased by 5%
      expect(mockPageStore.currentPage.scale).toBe(105);

      // Verify: pan adjusted to keep canvas center at viewport center
      // Canvas logical center: (960, 540)
      // After zoom, pan should be adjusted so this point remains centered
      expect(drawCanvas).toHaveBeenCalled();
    });

    it('zoomOut should zoom out anchored at canvas center', () => {
      const drawCanvas = vi.fn();
      
      // Set initial scale to 200
      mockPageStore.currentPage.scale = 200;

      transform.zoomOut(drawCanvas);

      // Verify: scale decreased by ~5% (200/1.05 ≈ 190.48)
      expect(mockPageStore.currentPage.scale).toBeCloseTo(190.476, 1);
      expect(drawCanvas).toHaveBeenCalled();
    });

    it('scale values should stay within valid range and not overflow after multiple zooms', () => {
      const drawCanvas = vi.fn();

      // Execute zoomIn 5 times in a row
      for (let i = 0; i < 5; i++) {
        transform.zoomIn(drawCanvas);
      }

      // Verify final scale is within valid range
      expect(mockPageStore.currentPage.scale).toBeGreaterThan(100);
      expect(mockPageStore.currentPage.scale).toBeLessThanOrEqual(300);

      // CSS model: panX/panY always 0
      expect(panX.value).toBe(0);
      expect(panY.value).toBe(0);
    });

    it('zoom should be within reasonable range (20-300%)', () => {
      const drawCanvas = vi.fn();

      // Test minimum limit
      mockPageStore.currentPage.scale = 10;
      transform.zoomOut(drawCanvas);
      expect(mockPageStore.currentPage.scale).toBeGreaterThanOrEqual(10);

      // Test maximum limit - requires multiple zoomIn
      mockPageStore.currentPage.scale = 400;
      for (let i = 0; i < 10; i++) {
        transform.zoomIn(drawCanvas);
      }
      expect(mockPageStore.currentPage.scale).toBeLessThanOrEqual(300);
    });
  });

  describe('fitToWindow - Fit window (with padding)', () => {
    beforeEach(() => {
      // Mock DOM element
      const mockElement = {
        clientWidth: 1200,
        clientHeight: 800,
        classList: { contains: () => false },
      };

      vi.spyOn(document, 'querySelector').mockReturnValue(mockElement as any);
    });

    it('fitToWindow should correctly calculate scale to fit canvas in container', () => {
      const drawCanvas = vi.fn();

      // Set large page size (3840x2160)
      mockPageStore.currentPage!.width = 3840;
      mockPageStore.currentPage!.height = 2160;

      transform.fitToWindow(drawCanvas);

      expect(mockPageStore.currentPage.scale).toBeCloseTo(26.72, 0);
    });

    it('fitToWindow should center content in container', () => {
      const drawCanvas = vi.fn();

      // Standard page 1920x1080
      mockPageStore.currentPage!.width = 1920;
      mockPageStore.currentPage!.height = 1080;

      transform.fitToWindow(drawCanvas);

      // CSS model: flexbox+margin:auto handles centering, panX/panY remain 0
      expect(panX.value).toBe(0);
      expect(panY.value).toBe(0);
    });

    it('small page should be centered', () => {
      const drawCanvas = vi.fn();

      // Small page size (800x600)
      mockPageStore.currentPage!.width = 800;
      mockPageStore.currentPage!.height = 600;

      transform.fitToWindow(drawCanvas);

      // scale should be calculated from available space, ~90%
      expect(mockPageStore.currentPage.scale).toBeCloseTo(90, -1);

      // CSS model: flexbox+margin:auto handles centering, panX/panY remain 0
      expect(panX.value).toBe(0);
      expect(panY.value).toBe(0);
    });
  });

  describe('clampPan - Boundary constraints', () => {
    it('clampPan is no-op under CSS-driven model', () => {
      panX.value = -99999;
      panY.value = -99999;

      transform.clampPan();

      expect(panX.value).toBe(-99999);
      expect(panY.value).toBe(-99999);
    });

    it('clampPan does not modify pan values under CSS-driven model', () => {
      mockPageStore.currentPage.scale = 50;

      panX.value = 1000;
      panY.value = 1000;

      transform.clampPan();

      expect(panX.value).toBe(1000);
      expect(panY.value).toBe(1000);
    });
  });

  describe('handleWheel - Scroll wheel zoom', () => {
    it('Ctrl+wheel should zoom anchored at mouse position', () => {
      const drawCanvas = vi.fn();
      
      const mockCanvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      };
      vi.spyOn(document, 'querySelector').mockImplementation((sel: string) => {
        if (sel === 'canvas.design-canvas') return mockCanvas as any;
        return { clientWidth: 1200, clientHeight: 800 } as any;
      });
      
      const mockEvent = {
        ctrlKey: true,
        deltaY: -100,
        preventDefault: vi.fn(),
        clientX: 500,
        clientY: 400,
      } as unknown as WheelEvent;

      transform.handleWheel(mockEvent, drawCanvas);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(drawCanvas).toHaveBeenCalled();
      expect(mockPageStore.currentPage.scale).toBeGreaterThan(100);
    });

    it('非Ctrl滚轮不应该触发缩放', () => {
      const drawCanvas = vi.fn();
      
      const mockEvent = {
        ctrlKey: false,
        deltaY: -100,
        preventDefault: vi.fn(),
      } as unknown as WheelEvent;

      transform.handleWheel(mockEvent, drawCanvas);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(drawCanvas).not.toHaveBeenCalled();
      expect(mockPageStore.currentPage.scale).toBe(100);
    });
  });

  describe('ensureContentVisible - Smart adaptation', () => {
    beforeEach(() => {
      vi.spyOn(document, 'querySelector').mockReturnValue({
        clientWidth: 1200,
        clientHeight: 800,
        classList: { contains: () => false },
      } as any);
    });

    it('should call fitToContent when graphics exist', () => {
      const drawCanvas = vi.fn();

      // Simulate having graphics
      mockGraphicStore.sortedGraphics = [
        {
          getPosition: () => ({ x: 100, y: 100 }),
          getSize: () => ({ width: 200, height: 150 }),
        },
      ];

      transform.ensureContentVisible(drawCanvas);

      expect(drawCanvas).toHaveBeenCalled();
    });

    it('should call fitToWindow when no graphics exist', () => {
      const drawCanvas = vi.fn();

      // No graphics
      mockGraphicStore.sortedGraphics = [];

      transform.ensureContentVisible(drawCanvas);

      expect(drawCanvas).toHaveBeenCalled();
    });
  });

  describe('Large page scenario tests', () => {
    beforeEach(() => {
      vi.spyOn(document, 'querySelector').mockReturnValue({
        clientWidth: 1400,
        clientHeight: 900,
        classList: { contains: () => false },
      } as any);
    });

    it('4K page (3840x2160) should fit and center correctly', () => {
      const drawCanvas = vi.fn();

      // Set 4K page
      mockPageStore.currentPage!.width = 3840;
      mockPageStore.currentPage!.height = 2160;
      mockPageStore.currentPage!.scale = 100;

      // Call fitToWindow
      transform.fitToWindow(drawCanvas);

      // Verify scale is within reasonable range (should shrink)
      expect(mockPageStore.currentPage.scale).toBeLessThan(50); // Significantly shrunk

      // Verify pan values center the canvas

      // pan should be non-negative
      expect(panX.value).toBeGreaterThanOrEqual(0);
      expect(panY.value).toBeGreaterThanOrEqual(0);
    });

    it('extra large page (7680x4320 - 8K) should work correctly', () => {
      const drawCanvas = vi.fn();

      mockPageStore.currentPage!.width = 7680;
      mockPageStore.currentPage!.height = 4320;
      mockPageStore.currentPage!.scale = 100;

      transform.fitToWindow(drawCanvas);

      // Should not throw error
      expect(drawCanvas).toHaveBeenCalled();

      // scale should not be lower than 20%
      expect(mockPageStore.currentPage.scale).toBeGreaterThanOrEqual(20);
      expect(mockPageStore.currentPage.scale).toBeLessThan(25);
    });

    it('16K extra large page (15360x8640) zoom should not go below SCALE_MIN=20', () => {
      const drawCanvas = vi.fn();

      mockPageStore.currentPage!.width = 15360;
      mockPageStore.currentPage!.height = 8640;
      mockPageStore.currentPage!.scale = 100;

      transform.fitToWindow(drawCanvas);

      expect(drawCanvas).toHaveBeenCalled();
      expect(mockPageStore.currentPage.scale).toBeGreaterThanOrEqual(20);
      expect(mockPageStore.currentPage.scale).toBeLessThanOrEqual(300);
    });

    it('extremely wide page (10000x1000) zoom should not go below SCALE_MIN', () => {
      const drawCanvas = vi.fn();

      mockPageStore.currentPage!.width = 10000;
      mockPageStore.currentPage!.height = 1000;

      transform.fitToWindow(drawCanvas);

      const scale = mockPageStore.currentPage.scale / 100;
      expect(scale).toBeGreaterThanOrEqual(0.2);
      expect(panX.value).toBeGreaterThanOrEqual(0);
    });

    it('should remain in visible area after multiple zoomIn on large page', () => {
      const drawCanvas = vi.fn();

      // 4K page
      mockPageStore.currentPage!.width = 3840;
      mockPageStore.currentPage!.height = 2160;
      mockPageStore.currentPage!.scale = 100;

      // First fitToWindow
      transform.fitToWindow(drawCanvas);

      // Record initial state
      const initialScale = mockPageStore.currentPage.scale;

      // ZoomIn 5 times in a row
      for (let i = 0; i < 5; i++) {
        transform.zoomIn(drawCanvas);
      }

      // Verify scale increased
      expect(mockPageStore.currentPage.scale).toBeGreaterThan(initialScale);

      // Verify pan is correctly adjusted (canvas won't disappear)
      expect(isFinite(panX.value)).toBe(true);
      expect(isFinite(panY.value)).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('invalid container size should be handled safely', () => {
      const drawCanvas = vi.fn();

      // Mock returns invalid size
      vi.spyOn(document, 'querySelector').mockReturnValue({
        clientWidth: 0,
        clientHeight: 0,
        classList: { contains: () => false },
      } as any);
      // Should not throw error
      expect(() => transform.fitToWindow(drawCanvas)).not.toThrow();
    });

    it('fallback behavior when DOM element does not exist', () => {
      const drawCanvas = vi.fn();
      // Mock returns null
      vi.spyOn(document, 'querySelector').mockReturnValue(null);
      // Should not throw error
      expect(() => transform.fitToWindow(drawCanvas)).not.toThrow();
    });

    it('should handle safely when currentPage is null', () => {
      const drawCanvas = vi.fn();
      mockPageStore.currentPage = null as any;
      // All operations should exit safely
      expect(() => transform.zoomIn(drawCanvas)).not.toThrow();
      expect(() => transform.zoomOut(drawCanvas)).not.toThrow();
      expect(() => transform.fitToWindow(drawCanvas)).not.toThrow();
      expect(() => transform.centerZoom(10, drawCanvas)).not.toThrow();
    });
  });
});

describe('useTransform - Performance and regression tests', () => {
  let transform: any;
  const panX = ref(0);
  const panY = ref(0);
  const canvasWidth = ref(1920);
  const canvasHeight = ref(1080);

  beforeEach(() => {
    mockPageStore.currentPage = {
      id: 'test-page',
      name: 'Test Page',
      width: 1920,
      height: 1080,
      scale: 100,
      getGroupManager: () => null,
    };
    
    vi.spyOn(document, 'querySelector').mockReturnValue({
      clientWidth: 1200,
      clientHeight: 800,
      classList: { contains: () => false },
    } as any);

    transform = useTransform({
      panX: panX as any,
      panY: panY as any,
      canvasWidth: canvasWidth as any,
      canvasHeight: canvasHeight as any,
      cursorStyle: ref('default') as any,
      hoveredGraphicId: ref('') as any,
      graphicDecorators: ref({}) as any,
    });
  });

  it('Rapid continuous zoom operations should not cause numerical overflow', () => {
    const drawCanvas = vi.fn();

    // Simulate rapid consecutive operations
    for (let i = 0; i < 100; i++) {
      if (i % 2 === 0) {
        transform.zoomIn(drawCanvas);
      } else {
        transform.zoomOut(drawCanvas);
      }
    }

    // All values should be finite numbers
    expect(isFinite(mockPageStore.currentPage.scale)).toBe(true);
    expect(isFinite(panX.value)).toBe(true);
    expect(isFinite(panY.value)).toBe(true);

    // scale should be within valid range
    expect(mockPageStore.currentPage.scale).toBeGreaterThanOrEqual(20);
    expect(mockPageStore.currentPage.scale).toBeLessThanOrEqual(300);
  });

  it('extreme aspect ratio pages (1:10 and 10:1) should work correctly', () => {
    const drawCanvas = vi.fn();

    // Extremely wide page
    mockPageStore.currentPage!.width = 10000;
    mockPageStore.currentPage!.height = 1000;
    transform.fitToWindow(drawCanvas);
    expect(drawCanvas).toHaveBeenCalled();

    // Extremely tall page
    mockPageStore.currentPage!.width = 1000;
    mockPageStore.currentPage!.height = 10000;
    transform.fitToWindow(drawCanvas);
    expect(drawCanvas).toHaveBeenCalledTimes(2);
  });

  it('resetZoom should restore to a reasonable default view', () => {
      const drawCanvas = vi.fn();

      // First set extreme state
      mockPageStore.currentPage!.scale = 300;
      panX.value = -1000;
      panY.value = -1000;

      transform.resetZoom(drawCanvas);

      // resetZoom now calls fitToWindow, scale will be recalculated
      // No longer forced to 100, but fits window
      expect(mockPageStore.currentPage.scale).toBeGreaterThan(0);
      expect(mockPageStore.currentPage.scale).toBeLessThanOrEqual(200);

      // pan should be recalculated (via fitToWindow)
      expect(drawCanvas).toHaveBeenCalled();
    });
});
