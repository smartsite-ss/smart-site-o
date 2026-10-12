// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

const mockPage = {
  scale: 100,
  width: 1920,
  height: 1080,
  getGroupManager: null as any,
};

const mockSelectedGraphicIds: string[] = [];

const mockSortedGraphics: any[] = [];

vi.mock('@scada-editor/core', () => ({
  usePageStore: () => ({
    currentPage: mockPage,
    get selectedGraphicIds() {
      return mockSelectedGraphicIds;
    },
    currentPageScaleFactor: 1,
  }),
  useGraphicStore: () => ({
    get sortedGraphics() {
      return mockSortedGraphics;
    },
    selectedGraphics: [],
    selectedGraphicIds: [],
    alignGraphics: vi.fn(),
    distributeGraphics: vi.fn(),
    saveHistory: vi.fn(),
  }),
  displayToLogical: (pos: any) => pos,
  displayRectToLogical: (rect: any) => rect,
  SelectionMode: {
    SINGLE: 'single',
    BOX: 'box',
    ADDITIVE: 'additive',
    SUBTRACTIVE: 'subtractive',
  },
  keyboardService: {
    getCurrentKeyState: () => ({ ctrl: false, shift: false }),
  },
}));

import { useTransform } from '../../composables/useCanvasInteraction/useTransform';
import type { CanvasInteractionOptions } from '../../types';

function createMockOptions(
  overrides: Partial<CanvasInteractionOptions> = {},
): CanvasInteractionOptions {
  return {
    panX: ref(0),
    panY: ref(0),
    canvasWidth: ref(1920),
    canvasHeight: ref(1080),
    cursorStyle: ref(''),
    hoveredGraphicId: ref(''),
    graphicDecorators: ref({}),
    ...overrides,
  };
}

function resetMockPage() {
  mockPage.scale = 100;
  mockPage.width = 1920;
  mockPage.height = 1080;
  mockPage.getGroupManager = null;
  mockSelectedGraphicIds.length = 0;
  mockSortedGraphics.length = 0;
}

describe('useTransform - Transform Handles', () => {
  let drawCanvas: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setActivePinia(createPinia());
    drawCanvas = vi.fn();
    resetMockPage();
  });

  describe('zoom', () => {
    it('should zoomIn: page scale multiplied by 1.05', () => {
      mockPage.scale = 100;
      const options = createMockOptions();
      const { zoomIn } = useTransform(options);

      zoomIn(drawCanvas);

      expect(mockPage.scale).toBeCloseTo(105, 5);
      expect(drawCanvas).toHaveBeenCalled();
    });

    it('should zoomOut: page scale divided by 1.05', () => {
      mockPage.scale = 144;
      const options = createMockOptions();
      const { zoomOut } = useTransform(options);

      zoomOut(drawCanvas);

      expect(mockPage.scale).toBeCloseTo(137.142857, 1);
      expect(drawCanvas).toHaveBeenCalled();
    });

    it('should resetZoom: delegate to fitToWindow, scale calculated by container size', () => {
      mockPage.scale = 150;
      const options = createMockOptions({
        panX: ref(50),
        panY: ref(-30),
      });
      const { resetZoom } = useTransform(options);
      resetZoom(drawCanvas);
      // resetZoom now delegates to fitToWindow, scale is calculated by container size
      expect(mockPage.scale).toBeGreaterThan(0);
      expect(mockPage.scale).toBeLessThanOrEqual(200);
      expect(drawCanvas).toHaveBeenCalled();
    });
  });

  describe('centerZoom', () => {
    it('should increase scale by +10 delta', () => {
      mockPage.scale = 100;
      const options = createMockOptions();
      const { centerZoom } = useTransform(options);

      centerZoom(10, drawCanvas);

      expect(mockPage.scale).toBe(110);
      expect(drawCanvas).toHaveBeenCalled();
    });

    it('should decrease scale by -10 delta', () => {
      mockPage.scale = 100;
      const options = createMockOptions();
      const { centerZoom } = useTransform(options);

      centerZoom(-10, drawCanvas);

      expect(mockPage.scale).toBe(90);
      expect(drawCanvas).toHaveBeenCalled();
    });

    it('should clamp scale at minimum 20', () => {
      mockPage.scale = 15;
      const options = createMockOptions();
      const { centerZoom } = useTransform(options);

      centerZoom(-10, drawCanvas);

      expect(mockPage.scale).toBe(20);
    });

    it('should clamp scale at maximum 300', () => {
      mockPage.scale = 510;
      const options = createMockOptions();
      const { centerZoom } = useTransform(options);

      centerZoom(-5, drawCanvas);

      expect(mockPage.scale).toBe(300);
    });

    it('should recalculate panX/Y for center anchor on zoom', () => {
      mockPage.scale = 100;
      const options = createMockOptions({
        panX: ref(0),
        panY: ref(0),
        canvasWidth: ref(1920),
        canvasHeight: ref(1080),
      });
      const { centerZoom } = useTransform(options);

      centerZoom(10, drawCanvas);

      expect(mockPage.scale).toBe(110);
      expect(isFinite(options.panX.value)).toBe(true);
      expect(isFinite(options.panY.value)).toBe(true);
      expect(drawCanvas).toHaveBeenCalled();
    });
  });

  describe('fitToWindow', () => {
    it('should calculate scale based on wrapper dimensions', () => {
      mockPage.width = 1920;
      mockPage.height = 1080;
      mockPage.scale = 100;

      const mockWrapper = {
        clientWidth: 960,
        clientHeight: 540,
      };
      vi.spyOn(document, 'querySelector').mockImplementation((sel: string) => {
        if (sel === '.plugin-layer-manager') return mockWrapper as any;
        return null;
      });

      const options = createMockOptions();
      const { fitToWindow } = useTransform(options);

      fitToWindow(drawCanvas);

      expect(mockPage.scale).toBeCloseTo(40, 5);
      expect(drawCanvas).toHaveBeenCalled();
    });
  });

  describe('fitToContent', () => {
    it('should calculate scale based on graphic bounds', () => {
      mockSortedGraphics.length = 0;
      mockSortedGraphics.push(
        { getPosition: () => ({ x: 100, y: 100 }), getSize: () => ({ width: 200, height: 150 }) },
        { getPosition: () => ({ x: 300, y: 250 }), getSize: () => ({ width: 100, height: 100 }) },
      );
      mockPage.scale = 100;

      const mockWrapper = {
        clientWidth: 800,
        clientHeight: 600,
      };
      vi.spyOn(document, 'querySelector').mockImplementation((sel: string) => {
        if (sel === '.plugin-layer-manager') return mockWrapper as any;
        return null;
      });

      const options = createMockOptions();
      const { fitToContent } = useTransform(options);

      fitToContent(drawCanvas);

      expect(mockPage.scale).not.toBe(100);
      expect(drawCanvas).toHaveBeenCalled();
    });

    it('should fallback to fitToWindow when no graphics exist', () => {
      mockSortedGraphics.length = 0;
      mockPage.scale = 100;
      const options = createMockOptions();
      const { fitToContent } = useTransform(options);
      fitToContent(drawCanvas);
      // Falls back to fitToWindow when no graphics exist
      expect(drawCanvas).toHaveBeenCalled();
    });
  });

  describe('handleWheel', () => {
    it('should prevent default and zoom on ctrl+scroll up', () => {
      mockPage.scale = 100;
      const options = createMockOptions();
      const { handleWheel } = useTransform(options);

      const mockCanvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      };
      vi.spyOn(document, 'querySelector').mockImplementation((sel: string) => {
        if (sel === 'canvas.design-canvas') return mockCanvas as any;
        return { clientWidth: 1200, clientHeight: 800 } as any;
      });

      const preventDefault = vi.fn();
      const mockEvent = {
        ctrlKey: true,
        metaKey: false,
        deltaY: -100,
        preventDefault,
        clientX: 500,
        clientY: 400,
      } as unknown as WheelEvent;

      handleWheel(mockEvent, drawCanvas);

      expect(preventDefault).toHaveBeenCalled();
      expect(mockPage.scale).toBe(110);
    });

    it('should prevent default and zoom on ctrl+scroll down', () => {
      mockPage.scale = 100;
      const options = createMockOptions();
      const { handleWheel } = useTransform(options);

      const mockCanvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      };
      vi.spyOn(document, 'querySelector').mockImplementation((sel: string) => {
        if (sel === 'canvas.design-canvas') return mockCanvas as any;
        return { clientWidth: 1200, clientHeight: 800 } as any;
      });

      const preventDefault = vi.fn();
      const mockEvent = {
        ctrlKey: true,
        metaKey: false,
        deltaY: 100,
        preventDefault,
        clientX: 500,
        clientY: 400,
      } as unknown as WheelEvent;

      handleWheel(mockEvent, drawCanvas);

      expect(preventDefault).toHaveBeenCalled();
      expect(mockPage.scale).toBe(90);
    });

    it('should not prevent default when ctrl is not pressed', () => {
      mockPage.scale = 100;
      const options = createMockOptions();
      const { handleWheel } = useTransform(options);

      const event = new WheelEvent('wheel', {
        deltaY: 50,
        ctrlKey: false,
      });
      vi.spyOn(event, 'preventDefault');

      handleWheel(event, drawCanvas);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockPage.scale).toBe(100);
    });
  });

  describe('resize state', () => {
    it('should initialize with isResizing=false, resizeHandle="", resizeStartX/Y=0', () => {
      const options = createMockOptions();
      const { isResizing, resizeHandle, resizeStartX, resizeStartY } =
        useTransform(options);

      expect(isResizing.value).toBe(false);
      expect(resizeHandle.value).toBe('');
      expect(resizeStartX.value).toBe(0);
      expect(resizeStartY.value).toBe(0);
    });
  });

  describe('rotate state', () => {
    it('should initialize with isRotating=false, rotateStartX/Y=0', () => {
      const options = createMockOptions();
      const { isRotating, rotateStartX, rotateStartY } =
        useTransform(options);

      expect(isRotating.value).toBe(false);
      expect(rotateStartX.value).toBe(0);
      expect(rotateStartY.value).toBe(0);
    });
  });

  describe('move state', () => {
    it('should initialize with isMoving=false, moveStartX/Y=0', () => {
      const options = createMockOptions();
      const { isMoving, moveStartX, moveStartY } = useTransform(options);

      expect(isMoving.value).toBe(false);
      expect(moveStartX.value).toBe(0);
      expect(moveStartY.value).toBe(0);
    });
  });

  describe('group detection', () => {
    it('should return true when selected graphic is in a group', () => {
      const mockGroupMgr = {
        isGraphicInGroup: vi.fn((id: string) => id === 'g1'),
        isGroup: vi.fn(() => false),
      };
      mockPage.getGroupManager = () => mockGroupMgr;
      mockSelectedGraphicIds.length = 0;
      mockSelectedGraphicIds.push('g1');

      const options = createMockOptions();
      const { isGroupSelected } = useTransform(options);

      expect(isGroupSelected.value).toBe(true);
    });

    it('should return false when no graphics selected', () => {
      mockPage.getGroupManager = () => ({
        isGraphicInGroup: vi.fn(() => false),
        isGroup: vi.fn(() => false),
      });
      mockSelectedGraphicIds.length = 0;

      const options = createMockOptions();
      const { isGroupSelected } = useTransform(options);

      expect(isGroupSelected.value).toBe(false);
    });

    it('should return false when selected graphic is not in a group', () => {
      const mockGroupMgr = {
        isGraphicInGroup: vi.fn(() => false),
        isGroup: vi.fn(() => false),
      };
      mockPage.getGroupManager = () => mockGroupMgr;
      mockSelectedGraphicIds.length = 0;
      mockSelectedGraphicIds.push('g2');

      const options = createMockOptions();
      const { isGroupSelected } = useTransform(options);

      expect(isGroupSelected.value).toBe(false);
    });
  });

  describe('panning state', () => {
    it('should initialize isPanning as false', () => {
      const options = createMockOptions();
      const { isPanning } = useTransform(options);

      expect(isPanning.value).toBe(false);
    });

    it('should allow setting isPanning to true', () => {
      const options = createMockOptions();
      const { isPanning } = useTransform(options);

      isPanning.value = true;
      expect(isPanning.value).toBe(true);
    });
  });
});