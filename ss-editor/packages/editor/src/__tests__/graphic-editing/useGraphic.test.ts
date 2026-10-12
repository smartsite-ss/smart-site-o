// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGraphic } from '../../composables/useGraphic';

vi.mock('../../utils/messageBox', () => ({
  showAlert: vi.fn(),
}));

if (typeof document !== 'undefined') {
  document.body = document.body || {};
  document.body.appendChild = document.body.appendChild || vi.fn();
}

let currentSelectedId: string | null = 'graphic-1';
let currentSelectedIds: string[] = ['graphic-1'];
const state = {
  graphics: [{ id: 'graphic-1', type: 'rectangle' }]
};

let mockCurrentPage: any;

vi.mock('@scada-editor/core', () => ({
  showAlert: vi.fn(),
  useGraphicStore: () => ({
    get graphics() { return state.graphics; },
    selectedGraphic: { id: 'graphic-1', type: 'rectangle' },
    selectedGraphics: [{ id: 'graphic-1', type: 'rectangle' }],
    sortedGraphics: [{ id: 'graphic-1', type: 'rectangle' }],
    addGraphic: vi.fn().mockImplementation(() => {
      const newGraphic = { id: 'new-graphic', type: 'rectangle' };
      state.graphics.push(newGraphic);
      return newGraphic;
    }),
    duplicateGraphic: vi.fn().mockImplementation(() => {
      const newGraphic = { id: 'duplicated-1', type: 'rectangle' };
      state.graphics.push(newGraphic);
      return newGraphic;
    }),
    copy: vi.fn(),
    cut: vi.fn().mockImplementation(() => {
      if (mockCurrentPage && mockCurrentPage.deleteSelectedGraphics) {
        mockCurrentPage.deleteSelectedGraphics();
      }
    }),
    paste: vi.fn().mockImplementation(() => {
      const newGraphic = { id: 'pasted-1', type: 'rectangle' };
      state.graphics.push(newGraphic);
      currentSelectedId = 'pasted-1';
      currentSelectedIds = ['pasted-1'];
      return [newGraphic];
    }),
    groupGraphics: vi.fn(),
    ungroupGraphics: vi.fn(),
    duplicateGroup: vi.fn(),
  }),
  usePageStore: () => {
    mockCurrentPage = {
      id: 'page-1',
      get selectedGraphicId() { return currentSelectedId; },
      set selectedGraphicId(value) { currentSelectedId = value; },
      get selectedGraphicIds() { return currentSelectedIds; },
      get graphics() { return state.graphics; },
      deleteSelectedGraphics: vi.fn().mockImplementation(() => {
        const selectedIds = [...currentSelectedIds];
        for (let i = state.graphics.length - 1; i >= 0; i--) {
          if (selectedIds.includes(state.graphics[i].id)) {
            state.graphics.splice(i, 1);
          }
        }
        currentSelectedId = null;
        currentSelectedIds = [];
      }),
      selectGraphic: vi.fn((id: string | null) => { currentSelectedId = id || 'graphic-1'; }),
      selectMultipleGraphics: vi.fn((ids: string[]) => {
        currentSelectedIds = ids;
        currentSelectedId = ids[0];
      }),
      addToSelection: vi.fn((id: string) => {
        if (!currentSelectedIds.includes(id)) {
          currentSelectedIds.push(id);
        }
      }),
      removeFromSelection: vi.fn((id: string) => {
        const index = currentSelectedIds.indexOf(id);
        if (index !== -1) {
          currentSelectedIds.splice(index, 1);
          if (currentSelectedId === id) {
            currentSelectedId = currentSelectedIds[0] || null;
          }
        }
      }),
      clearSelection: vi.fn(() => {
        currentSelectedId = null;
        currentSelectedIds = [];
      }),
      removeGraphic: vi.fn((id: string) => {
        const index = state.graphics.findIndex(g => g.id === id);
        if (index !== -1) {
          state.graphics.splice(index, 1);
        }
      }),
      updateGraphic: vi.fn(),
      moveGraphic: vi.fn(),
      resizeGraphic: vi.fn(),
      bringToFront: vi.fn(),
      sendToBack: vi.fn(),
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      lockGraphic: vi.fn(),
      unlockGraphic: vi.fn(),
      toggleGraphicLock: vi.fn(),
      showGraphic: vi.fn(),
      hideGraphic: vi.fn(),
      toggleGraphicVisibility: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      alignGraphics: vi.fn(),
      distributeGraphics: vi.fn(),
      autoLayout: vi.fn(),
      importGraphics: vi.fn().mockImplementation((data: any[]) => {
        state.graphics.push(...data);
      }),
      exportGraphics: vi.fn().mockReturnValue([{ id: 'graphic-1' }]),
    };
    return {
      currentPage: mockCurrentPage,
      get selectedGraphicIds() { return currentSelectedIds; },
    };
  },
  useCurrentPage: () => mockCurrentPage,
  GraphicFactory: {
    getGraphicInfo: vi.fn().mockReturnValue({ name: 'Rectangle', icon: 'rectangle' }),
  },
  i18n: {
    global: {
      t: vi.fn().mockReturnValue('test'),
    },
  },
  MessageService: {
    showDeleteSuccess: vi.fn(),
    showCopySuccess: vi.fn(),
    showCutSuccess: vi.fn(),
    showPasteSuccess: vi.fn(),
    showUndoSuccess: vi.fn(),
    showRedoSuccess: vi.fn(),
    showExportSuccess: vi.fn(),
  },
}));

describe('useGraphic', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    currentSelectedId = 'graphic-1';
    currentSelectedIds = ['graphic-1'];
    state.graphics = [{ id: 'graphic-1', type: 'rectangle' }];
  });

  describe('Graphic Data Access', () => {
    it('should correctly return graphic list and selection state', () => {
      const graphic = useGraphic();

      expect(graphic.graphics).toEqual([{ id: 'graphic-1', type: 'rectangle' }]);
      expect(graphic.selectedGraphic).toEqual({ id: 'graphic-1', type: 'rectangle' });
      expect(graphic.selectedGraphicId).toBe('graphic-1');
      expect(graphic.selectedGraphicIds).toEqual(['graphic-1']);
    });
  });

  describe('Adding Graphics', () => {
    it('should add graphic to current page successfully', () => {
      const graphic = useGraphic();
      const result = graphic.addGraphic('rectangle', 10, 20, 100, 50);

      expect(result).toEqual({ id: 'new-graphic', type: 'rectangle' });
      expect(graphic.graphics.length).toBe(2);
    });
  });

  describe('Deleting Graphics', () => {
    it('should delete specified graphic successfully', () => {
      const graphic = useGraphic();
      const initialCount = graphic.graphics.length;

      graphic.removeGraphic('graphic-1');

      expect(graphic.graphics.length).toBe(initialCount - 1);
    });
  });

  describe('Selecting Graphics', () => {
    it('should correctly select a single graphic', () => {
      const graphic = useGraphic();

      graphic.selectGraphic('graphic-2');

      expect(currentSelectedId).toBe('graphic-2');
    });

    it('should correctly select multiple graphics', () => {
      const graphic = useGraphic();

      graphic.selectMultipleGraphics(['graphic-1', 'graphic-2']);

      expect(currentSelectedIds).toEqual(['graphic-1', 'graphic-2']);
    });

    it('should correctly add graphics to selection state', () => {
      const graphic = useGraphic();

      graphic.addToSelection('graphic-2');

      expect(currentSelectedIds).toEqual(['graphic-1', 'graphic-2']);
    });

    it('should correctly remove graphic from selection', () => {
      const graphic = useGraphic();

      graphic.removeFromSelection('graphic-1');

      expect(currentSelectedIds).toEqual([]);
    });

    it('should correctly clear all selection', () => {
      const graphic = useGraphic();

      graphic.clearSelection();

      expect(currentSelectedId).toBeNull();
      expect(currentSelectedIds).toEqual([]);
    });
  });

  describe('Updating Graphics', () => {
    it('should successfully update graphic properties', () => {
      const graphic = useGraphic();

      expect(() => {
        graphic.updateGraphic('graphic-1', { x: 50, y: 60 });
      }).not.toThrow();
    });
  });

  describe('Copy and Paste Graphics', () => {
    it('should copy selected graphics successfully', () => {
      const graphic = useGraphic();
      const initialSelectedId = graphic.selectedGraphicId;
      const initialSelectedIds = [...graphic.selectedGraphicIds];

      graphic.copySelectedGraphics();

      expect(graphic.selectedGraphicId).toBe(initialSelectedId);
      expect(graphic.selectedGraphicIds).toEqual(initialSelectedIds);
    });

    it('should successfully cut selected graphics', () => {
      const graphic = useGraphic();
      const initialCount = state.graphics.length;

      graphic.cutSelectedGraphics();

      expect(state.graphics.length).toBe(initialCount - 1);
      expect(currentSelectedId).toBeNull();
    });

    it('should paste graphics and select the pasted graphics successfully', () => {
      const graphic = useGraphic();
      const initialCount = graphic.graphics.length;

      const result = graphic.pasteGraphics();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(graphic.graphics.length).toBe(initialCount + 1);

      const pastedGraphicId = result[0].id;
      expect(currentSelectedId).toBe(pastedGraphicId);
      expect(currentSelectedIds).toEqual([pastedGraphicId]);
    });
  });

  describe('Layer Operations', () => {
    it('should bring graphic to front successfully', () => {
      const graphic = useGraphic();
      expect(() => graphic.bringToFront('graphic-1')).not.toThrow();
    });

    it('should send graphic to back successfully', () => {
      const graphic = useGraphic();
      expect(() => graphic.sendToBack('graphic-1')).not.toThrow();
    });
  });

  describe('Lock and Visibility Operations', () => {
    it('should successfully lock and unlock graphics', () => {
      const graphic = useGraphic();
      expect(() => {
        graphic.lockGraphic('graphic-1');
        graphic.unlockGraphic('graphic-1');
      }).not.toThrow();
    });

    it('should successfully show and hide graphics', () => {
      const graphic = useGraphic();
      expect(() => {
        graphic.showGraphic('graphic-1');
        graphic.hideGraphic('graphic-1');
      }).not.toThrow();
    });
  });

  describe('Import/Export Operations', () => {
    it('should import graphics successfully', () => {
      const graphic = useGraphic();
      const initialCount = graphic.graphics.length;
      const importData = [{ id: 'imported-1', type: 'circle' }];

      graphic.importGraphics(importData);

      expect(graphic.graphics.length).toBe(initialCount + 1);
    });

    it('应该成功Export图形', () => {
      const graphic = useGraphic();
      const result = graphic.exportGraphics();

      expect(result).toEqual([{ id: 'graphic-1' }]);
    });
  });

  describe('Graphic Info Retrieval', () => {
    it('should retrieve graphic type info successfully', () => {
      const graphic = useGraphic();
      const result = graphic.getGraphicInfo('rectangle');

      expect(result).toEqual({ name: 'Rectangle', icon: 'rectangle' });
    });
  });
});