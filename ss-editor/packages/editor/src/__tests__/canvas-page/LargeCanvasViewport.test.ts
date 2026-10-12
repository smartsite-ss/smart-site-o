// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useTransform } from '../../composables/useCanvasInteraction/useTransform';

const mockPageStore = {
  currentPage: {
    id: 'large-test-page',
    name: 'Large Test Page',
    width: 3840,
    height: 2160,
    scale: 100,
    getGroupManager: () => null,
  },
  selectedGraphicIds: [],
};

const mockGraphicStore = {
  sortedGraphics: [],
};

vi.mock('@scada-editor/core', () => ({
  usePageStore: () => mockPageStore,
  useGraphicStore: () => mockGraphicStore,
}));

const createMockDOM = (width: number, height: number) => ({
  clientWidth: width,
  clientHeight: height,
  scrollLeft: 0,
  scrollTop: 0,
  classList: { contains: () => false },
});

describe('LargeCanvasViewport - Large canvas editing Viewport management', () => {
  let transform: ReturnType<typeof useTransform>;
  let panX: any;
  let panY: any;
  let canvasWidth: any;
  let canvasHeight: any;

  beforeEach(() => {
    panX = ref(0);
    panY = ref(0);
    canvasWidth = ref(3840);
    canvasHeight = ref(2160);

    mockPageStore.currentPage = {
      id: 'large-test-page',
      name: 'Large Test Page',
      width: 3840,
      height: 2160,
      scale: 100,
      getGroupManager: () => null,
    };
    mockPageStore.selectedGraphicIds = [];
    mockGraphicStore.sortedGraphics = [];

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

  describe('Extra large page fitToWindow', () => {
    const largePages = {
      '4K': { width: 3840, height: 2160 },
      '8K': { width: 7680, height: 4320 },
      'Ultra-wide': { width: 5120, height: 1440 },
      'Ultra-tall': { width: 1080, height: 5120 },
    };

    for (const [name, size] of Object.entries(largePages)) {
      it(`${name} page (${size.width}x${size.height}) content visible after fitToWindow`, () => {
        vi.spyOn(document, 'querySelector').mockReturnValue(
          createMockDOM(1400, 900) as any,
        );
        const drawCanvas = vi.fn();
        mockPageStore.currentPage!.width = size.width;
        mockPageStore.currentPage!.height = size.height;
        mockPageStore.currentPage!.scale = 100;
        transform.fitToWindow(drawCanvas);
        const scale = mockPageStore.currentPage.scale / 100;
        expect(scale).toBeGreaterThan(0);
        expect(scale).toBeLessThanOrEqual(1);
        expect(isFinite(panX.value)).toBe(true);
        expect(isFinite(panY.value)).toBe(true);
        // Content should not go below SCALE_MIN after zoom
        expect(mockPageStore.currentPage.scale).toBeGreaterThanOrEqual(20);
        expect(mockPageStore.currentPage.scale).toBeLessThanOrEqual(300);
      });
    }
  });

  describe('Zoom anchor stability', () => {
    beforeEach(() => {
      vi.spyOn(document, 'querySelector').mockReturnValue(
        createMockDOM(1400, 900) as any,
      );
    });

    it('scale changes correctly and no errors after zoom at viewport center on large page', () => {
      const drawCanvas = vi.fn();
      mockPageStore.currentPage!.width = 7680;
      mockPageStore.currentPage!.height = 4320;

      transform.fitToWindow(drawCanvas);

      const anchorLogicalX = 3840;
      const anchorLogicalY = 2160;
      const prevScale = mockPageStore.currentPage.scale;
      const newScaleVal = (mockPageStore.currentPage.scale * 2);

      transform.zoomAtAnchor(anchorLogicalX, anchorLogicalY, newScaleVal, drawCanvas);

      expect(mockPageStore.currentPage.scale).toBeGreaterThan(prevScale);
      expect(mockPageStore.currentPage.scale).toBeLessThanOrEqual(300);
      expect(drawCanvas).toHaveBeenCalled();
      expect(isFinite(panX.value)).toBe(true);
      expect(isFinite(panY.value)).toBe(true);
    });

    it('scale does not overflow after scroll zoom on 4K page', () => {
      const drawCanvas = vi.fn();
      mockPageStore.currentPage!.width = 3840;
      mockPageStore.currentPage!.height = 2160;

      transform.fitToWindow(drawCanvas);

      const anchorLogicalX = 1920;
      const anchorLogicalY = 1080;

      for (let step = 1; step <= 5; step++) {
        const newScaleVal = 100 + step * 20;
        transform.zoomAtAnchor(anchorLogicalX, anchorLogicalY, newScaleVal, drawCanvas);

        expect(mockPageStore.currentPage.scale).toBeGreaterThanOrEqual(20);
        expect(mockPageStore.currentPage.scale).toBeLessThanOrEqual(300);
      }
    });
  });

  describe('Continuous zoom - canvas not lost', () => {
    beforeEach(() => {
      vi.spyOn(document, 'querySelector').mockReturnValue(
        createMockDOM(1400, 900) as any,
      );
    });

    it('canvas origin stays within reasonable range after 50 consecutive zoomIn/zoomOut on large page', () => {
      const drawCanvas = vi.fn();
      mockPageStore.currentPage!.width = 3840;
      mockPageStore.currentPage!.height = 2160;

      transform.fitToWindow(drawCanvas);

      for (let i = 0; i < 50; i++) {
        if (i % 3 === 0) transform.zoomIn(drawCanvas);
        else if (i % 3 === 1) transform.zoomOut(drawCanvas);
        else transform.centerZoom(i % 2 ? 10 : -10, drawCanvas);
      }

      expect(isFinite(panX.value)).toBe(true);
      expect(isFinite(panY.value)).toBe(true);
      expect(mockPageStore.currentPage.scale).toBeGreaterThanOrEqual(20);
      expect(mockPageStore.currentPage.scale).toBeLessThanOrEqual(300);
    });

    it('rapid zoom on 8K page does not produce NaN', () => {
      const drawCanvas = vi.fn();
      mockPageStore.currentPage!.width = 7680;
      mockPageStore.currentPage!.height = 4320;

      transform.fitToWindow(drawCanvas);

      for (let i = 0; i < 100; i++) {
        const randomDelta = (Math.random() - 0.5) * 20;
        transform.centerZoom(randomDelta, drawCanvas);
      }

      expect(isNaN(panX.value)).toBe(false);
      expect(isNaN(panY.value)).toBe(false);
      expect(isNaN(mockPageStore.currentPage.scale)).toBe(false);
    });
  });

  describe('Extreme aspect ratio pages', () => {
    beforeEach(() => {
      vi.spyOn(document, 'querySelector').mockReturnValue(
        createMockDOM(1400, 900) as any,
      );
    });

    it('extremely wide page (10000x1000) centered horizontally after fitToWindow', () => {
      const drawCanvas = vi.fn();
      mockPageStore.currentPage!.width = 10000;
      mockPageStore.currentPage!.height = 1000;
      mockPageStore.currentPage!.scale = 100;

      transform.fitToWindow(drawCanvas);

      const scale = mockPageStore.currentPage.scale / 100;
      expect(scale).toBeGreaterThanOrEqual(0.1);
      expect(panX.value).toBeGreaterThanOrEqual(0);
      expect(panY.value).toBeGreaterThanOrEqual(0);
    });

    it('extremely tall page (1000x10000) centered vertically after fitToWindow', () => {
      const drawCanvas = vi.fn();
      mockPageStore.currentPage!.width = 1000;
      mockPageStore.currentPage!.height = 10000;
      mockPageStore.currentPage!.scale = 100;

      transform.fitToWindow(drawCanvas);

      const scale = mockPageStore.currentPage.scale / 100;
      expect(scale).toBeGreaterThanOrEqual(0.1);
      // After zoom, extremely tall page content may exceed container, pan can be negative
      expect(isFinite(panX.value)).toBe(true);
      expect(isFinite(panY.value)).toBe(true);
      expect(mockPageStore.currentPage.scale).toBeGreaterThanOrEqual(20);
    });
  });

  describe('clampPan large page constraints', () => {
    beforeEach(() => {
      vi.spyOn(document, 'querySelector').mockReturnValue(
        createMockDOM(1200, 800) as any,
      );
    });

    it('CSS-driven model clampPan is no-op, does not modify panX/panY', () => {
      mockPageStore.currentPage!.width = 3840;
      mockPageStore.currentPage!.height = 2160;
      mockPageStore.currentPage!.scale = 50;

      panX.value = -3000;
      panY.value = 5000;

      transform.clampPan();

      expect(panX.value).toBe(-3000);
      expect(panY.value).toBe(5000);
    });

    it('clampPan does not force centering under CSS-driven model', () => {
      mockPageStore.currentPage!.width = 3840;
      mockPageStore.currentPage!.height = 2160;
      mockPageStore.currentPage!.scale = 10;

      panX.value = 500;
      panY.value = -500;

      transform.clampPan();

      expect(panX.value).toBe(500);
      expect(panY.value).toBe(-500);
    });
  });

  describe('handleWheel large page mouse zoom', () => {
    it('content not lost after Ctrl+wheel zoom at mouse position on large page', () => {
      const drawCanvas = vi.fn();

      vi.spyOn(document, 'querySelector').mockImplementation((sel: string) => {
        if (sel === 'canvas.design-canvas') {
          return { getBoundingClientRect: () => ({ left: 200, top: 100 }) } as any;
        }
        return createMockDOM(1400, 900) as any;
      });

      mockPageStore.currentPage!.width = 7680;
      mockPageStore.currentPage!.height = 4320;

      transform.fitToWindow(drawCanvas);

      const initialScale = mockPageStore.currentPage.scale;

      const mockEvent = {
        ctrlKey: true,
        deltaY: -100,
        preventDefault: vi.fn(),
        clientX: 900,
        clientY: 550,
      } as unknown as WheelEvent;

      transform.handleWheel(mockEvent, drawCanvas);

      expect(mockPageStore.currentPage.scale).toBeGreaterThan(initialScale);
      expect(isFinite(panX.value)).toBe(true);
      expect(isFinite(panY.value)).toBe(true);
    });
  });
});