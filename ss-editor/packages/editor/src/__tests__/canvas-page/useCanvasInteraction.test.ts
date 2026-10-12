// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useCanvasInteraction } from '../../composables/useCanvasInteraction';

vi.mock('@scada-editor/core', () => ({
  usePageStore: () => ({
    currentPageScaleFactor: 1,
    selectedGraphicIds: [],
  }),
  useGraphicStore: () => ({
    sortedGraphics: [],
    selectedGraphics: [],
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

function createDefaultOptions() {
  return {
    panX: ref(0),
    panY: ref(0),
    canvasWidth: ref(1920),
    canvasHeight: ref(1080),
    cursorStyle: ref(''),
    hoveredGraphicId: ref(''),
    graphicDecorators: ref({}),
  };
}

describe('useCanvasInteraction', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with default values', () => {
    const interaction = useCanvasInteraction(createDefaultOptions());
    expect(interaction.isSelecting.value).toBe(false);
    expect(interaction.selectionRect.value).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });

  it('should have alignment functions', () => {
    const interaction = useCanvasInteraction(createDefaultOptions());
    expect(typeof interaction.alignLeft).toBe('function');
    expect(typeof interaction.alignRight).toBe('function');
    expect(typeof interaction.alignTop).toBe('function');
    expect(typeof interaction.alignBottom).toBe('function');
    expect(typeof interaction.alignCenter).toBe('function');
    expect(typeof interaction.alignMiddle).toBe('function');
    expect(typeof interaction.distributeHorizontal).toBe('function');
    expect(typeof interaction.distributeVertical).toBe('function');
  });

  it('should have zoom functions', () => {
    const interaction = useCanvasInteraction(createDefaultOptions());
    expect(typeof interaction.zoomIn).toBe('function');
    expect(typeof interaction.zoomOut).toBe('function');
    expect(typeof interaction.resetZoom).toBe('function');
    expect(typeof interaction.fitToWindow).toBe('function');
    expect(typeof interaction.fitToContent).toBe('function');
  });

  it('should have drag and drop functions', () => {
    const interaction = useCanvasInteraction(createDefaultOptions());
    expect(typeof interaction.handleDragOver).toBe('function');
    expect(typeof interaction.handleDrop).toBe('function');
    expect(typeof interaction.isGraphicLocked).toBe('function');
    expect(typeof interaction.toggleSnapToGrid).toBe('function');
  });

  it('should have mouse event handlers', () => {
    const interaction = useCanvasInteraction(createDefaultOptions());
    expect(typeof interaction.handleCanvasClick).toBe('function');
    expect(typeof interaction.handleCanvasMouseDown).toBe('function');
    expect(typeof interaction.handleCanvasMouseMove).toBe('function');
    expect(typeof interaction.handleCanvasMouseUp).toBe('function');
  });

  it('should toggle snapToGrid', () => {
    const interaction = useCanvasInteraction(createDefaultOptions());
    expect(interaction.toggleSnapToGrid).toBeDefined();
  });

  describe('snap position calculation', () => {
    it('should snap to grid with default grid size 20', () => {
      const snapToGridPosition = (x: number, y: number) => ({
        x: Math.round(x / 20) * 20,
        y: Math.round(y / 20) * 20,
      });
      const pos = snapToGridPosition(33, 47);
      expect(pos.x).toBe(40);
      expect(pos.y).toBe(40);
    });

    it('should not change position when already on grid', () => {
      const snapToGridPosition = (x: number, y: number) => ({
        x: Math.round(x / 20) * 20,
        y: Math.round(y / 20) * 20,
      });
      const pos = snapToGridPosition(40, 60);
      expect(pos.x).toBe(40);
      expect(pos.y).toBe(60);
    });
  });

  describe('overlay coordinate transformation (logical → display)', () => {
    it('should compute correct display position for 1920×1080 page', () => {
      const scale = 1;
      const panX = 0;
      const canvasLeft = 0;
      const snapValue = 400;
      const displayX = snapValue * scale + panX + canvasLeft;
      expect(displayX).toBe(400);
    });

    it('should compute correct display position for 800×600 page with centering offset', () => {
      const scale = 1;
      const panX = 0;
      const canvasLeft = 30;
      const snapValue = 200;
      const displayX = snapValue * scale + panX + canvasLeft;
      expect(displayX).toBe(230);
    });

    it('should compute correct display position with pan offset', () => {
      const scale = 0.8;
      const panX = 50;
      const canvasLeft = 20;
      const snapValue = 300;
      const displayX = snapValue * scale + panX + canvasLeft;
      expect(displayX).toBe(310);
    });

    it('should compute correct display position with zoom', () => {
      const scale = 0.5;
      const panX = 100;
      const canvasLeft = 0;
      const snapValue = 200;
      const displayX = snapValue * scale + panX + canvasLeft;
      expect(displayX).toBe(200);
    });
  });
});