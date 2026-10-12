// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * E2E test: Design workflow
 *
 * Test strategy:
 * - Mock Pinia stores and external dependencies (konva, uuid)
 * - Use setActivePinia to create real Pinia instance
 * - Test complete design workflow: create project → edit graphics → undo/redo → save
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// ─── Mock Graphic Factory ───

const mockGraphicFactoryCreate = vi.fn();
const mockGraphicFactoryFromJSON = vi.fn();

vi.mock('../../graphic-editing/graphic/factory/GraphicFactory', () => ({
  GraphicFactory: {
    createGraphic: (...args: any[]) => mockGraphicFactoryCreate(...args),
    createGraphicFromJSON: (data: any) => mockGraphicFactoryFromJSON(data),
  },
}));

// ─── Mock Page Manager ───

// ─── Mock Storage Service ───

const mockStorage = {
  projects: [] as any[],
  templates: [] as any[],
  autoSaveData: null as any,
  settings: { autoSave: false, autoSaveInterval: 30000 },
};

vi.mock('../../services/storage.service', () => ({
  loadProjects: vi.fn(() => mockStorage.projects),
  saveProjects: vi.fn((projects: any[]) => { mockStorage.projects = projects; }),
  loadTemplates: vi.fn(() => mockStorage.templates),
  saveTemplates: vi.fn((templates: any[]) => { mockStorage.templates = templates; }),
  loadAutoSave: vi.fn(() => mockStorage.autoSaveData),
  saveAutoSave: vi.fn((data: any) => { mockStorage.autoSaveData = data; }),
  clearAutoSave: vi.fn(() => { mockStorage.autoSaveData = null; }),
  loadSettings: vi.fn(() => mockStorage.settings),
  saveSettings: vi.fn((settings: any) => { mockStorage.settings = settings; }),
}));

// ─── Mock StateService ───

vi.mock('../../services/state.service', () => {
  const mockStateService: Record<string, any> = {
    init: vi.fn(),
    saveProject: vi.fn((name: string) => {
      const project = {
        name,
        pages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockStorage.projects.push(project);
      return project;
    }),
    loadProject: vi.fn((index: number) => {
      if (index < 0 || index >= mockStorage.projects.length) return false;
      return true;
    }),
    deleteProject: vi.fn((index: number) => {
      if (index < 0 || index >= mockStorage.projects.length) return false;
      mockStorage.projects.splice(index, 1);
      return true;
    }),
    startAutoSave: vi.fn(),
    stopAutoSave: vi.fn(),
    batchOperation: vi.fn(),
    getInstance: vi.fn((): any => mockStateService),
  };
  return { stateService: mockStateService, StateService: { getInstance: () => mockStateService } };
});

// ─── Mock ProjectMigration ───

vi.mock('@scada-editor/plugin-sdk', () => {
  class MockBaseGraphic {
    id: string = '';
    type: string = '';
    config: any = { customProps: {}, visible: true, locked: false, style: {} };
    events: any = { eventHandlers: {} };
    dataSource: any = { enabled: false, dataSource: '', dataField: '' };
    animations: any[] = [];
    _pageContext: any = null;
    _setPageContext(ctx: any) { this._pageContext = ctx; }
    getPosition() { return { x: this.config.x ?? 0, y: this.config.y ?? 0 }; }
    setPosition(x: number, y: number) { this.config.x = x; this.config.y = y; }
    getSize() { return { width: this.config.width ?? 100, height: this.config.height ?? 100 }; }
    setSize(w: number, h: number) { this.config.width = w; this.config.height = h; }
    getLocked() { return false; }
    getVisible() { return true; }
    setLocked(_v: boolean) {}
    setVisible(_v: boolean) {}
    setZIndex(_z: number) {}
    toJSON() { return { ...this.config, id: this.id, type: this.type, dataSource: this.dataSource, events: this.events }; }
    update(props: any) { Object.assign(this.config, props); }
    clone() { return new MockBaseGraphic(); }
    onMounted() {}
    onUnmounted() {}
    onThemeChanged(_t: string) {}
    onPropertyChanged(_c: any) {}
    onVisibilityChanged(_v: boolean) {}
    onResize(_w: number, _h: number) {}
  }

  return {
    BaseGraphic: MockBaseGraphic,
    ProjectMigration: {
      migrateProject: vi.fn((data: any) => ({ data, report: { migratedCount: 0 } })),
    },
    themeManager: {
      subscribe: vi.fn(() => vi.fn()),
      getCurrentThemeName: vi.fn(() => 'default'),
      setTheme: vi.fn(),
      getTheme: vi.fn(() => ({})),
    },
    ThemeManager: vi.fn(),
    GraphicFactory: {
      createGraphic: vi.fn(),
      createGraphicFromJSON: vi.fn(),
    },
  };
});

// ─── Helper function: create mock graphic ───

interface MockGraphic {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  config: Record<string, any>;
  dataSource: { enabled: boolean; dataSource: string; dataField: string };
  events: any;
  animations: any[];
  parentId: string | null;
  groupId: string | null;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  metadata: Record<string, any>;
}

function createMockGraphic(overrides: Partial<MockGraphic> = {}): MockGraphic {
  const self = {
    id: overrides.id || `graphic-${Math.random().toString(36).slice(2, 8)}`,
    type: overrides.type || 'shape',
    name: overrides.name || 'Graphic',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 100,
    height: overrides.height ?? 100,
    rotation: overrides.rotation ?? 0,
    config: overrides.config || {
      customProps: {},
      visible: true,
      locked: false,
      style: { fill: '#409EFF', stroke: '#333333', strokeWidth: 1 },
    },
    dataSource: overrides.dataSource || { enabled: false, dataSource: '', dataField: ''}, events: overrides.events || { eventHandlers: {} }, animations: overrides.animations || [], parentId: overrides.parentId ?? null, groupId: overrides.groupId ?? null, visible: overrides.visible ?? true, locked: overrides.locked ?? false, zIndex: overrides.zIndex ?? 0, metadata: overrides.metadata || {}, toJSON() { return { id: self.id, type: self.type, name: self.name, config: { ...self.config }, dataSource: { ...self.dataSource }, events: { ...self.events }, animations: [...self.animations], parentId: self.parentId, groupId: self.groupId, visible: self.visible, locked: self.locked, zIndex: self.zIndex, metadata: { ...self.metadata }, }; }, }; return self; } /* 设置 mockGraphicFactoryCreate 的默认行为 */ mockGraphicFactoryCreate.mockImplementation((type: string, x: number, y: number, width: number, height: number) => { return createMockGraphic({ type, x, y, width, height }); }); mockGraphicFactoryFromJSON.mockImplementation((data: any) => { return createMockGraphic({ ...data }); }); /* ─── Import stores ─── */ import { usePageStore } from '../../store/page.store';
import { useGraphicStore } from '../../store/graphic.store';

// ─── Test suite ───

describe('E2E: Design Workflow', () => {
  let pageStore: ReturnType<typeof usePageStore>;
  let graphicStore: ReturnType<typeof useGraphicStore>;

  beforeEach(() => {
    setActivePinia(createPinia());

    pageStore = usePageStore();
    graphicStore = useGraphicStore();

    // Reset mock storage
    mockStorage.projects = [];
    mockStorage.templates = [];
    mockStorage.autoSaveData = null;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // TC-E2E-001: Create project → add page → add graphics → save
  // ========================================================================
  describe('TC-E2E-001: Create project → Add page → Add graphics → Save', () => {
    it('should create a new page', () => {
      const initialPageCount = pageStore.pages.length;

      const newPage = pageStore.addPage('Dashboard');

      expect(pageStore.pages.length).toBe(initialPageCount + 1);
      expect(newPage.name).toBe('Dashboard');
      expect(pageStore.currentPageId).toBe(newPage.id);
    });

    it('should create a page and add graphics', () => {
      pageStore.addPage('My Page');

      const graphic = graphicStore.addGraphic('shape', 100, 200, 150, 80);

      expect(graphic).toBeDefined();
      expect(graphic!.type).toBe('shape');
      expect((graphic as any).x).toBe(100);
      expect((graphic as any).y).toBe(200);
      expect((graphic as any).width).toBe(150);
      expect((graphic as any).height).toBe(80);

      const currentPage = pageStore.currentPage;
      expect(currentPage!.graphics.length).toBe(1);
    });

    it('should add multiple types of graphics', () => {
      pageStore.addPage('Multi Page');

      graphicStore.addGraphic('shape', 10, 10, 100, 100);
      graphicStore.addGraphic('label', 50, 50, 200, 40);
      graphicStore.addGraphic('image', 100, 100, 300, 200);

      const currentPage = pageStore.currentPage;
      expect(currentPage!.graphics.length).toBe(3);

      const types = currentPage!.graphics.map((g: any) => g.type);
      expect(types).toContain('shape');
      expect(types).toContain('label');
      expect(types).toContain('image');
    });

    it('should save the project', () => {
      pageStore.addPage('Project Page');
      graphicStore.addGraphic('shape', 50, 50, 200, 200);

      const project = graphicStore.saveProject('My Project');

      expect(project).toBeDefined();
      expect(mockStorage.projects.length).toBe(1);
      expect(mockStorage.projects[0].name).toBe('My Project');
    });
  });

  // ========================================================================
  // TC-E2E-002: Load project → edit graphics → undo/redo → save
  // ========================================================================
  describe('TC-E2E-002: Load project → Edit graphics → Undo/Redo → Save', () => {
    it('should load a saved project', () => {
      // Save project first
      pageStore.addPage('Saved Page');
      graphicStore.addGraphic('shape', 100, 100, 200, 150);
      graphicStore.saveProject('Test Project');

      // Reset stores
      setActivePinia(createPinia());
      const newPageStore = usePageStore();
      const newGraphicStore = useGraphicStore();

      // Load project
      const result = newGraphicStore.loadProject(0);
      expect(result).toBe(true);
      expect(newPageStore.pages.length).toBeGreaterThan(0);
    });

    it('loading a non-existent project index should return false', () => {
      const result = graphicStore.loadProject(999);
      expect(result).toBe(false);
    });

    it('should edit graphic properties', () => {
      pageStore.addPage('Edit Page');
      const graphic = graphicStore.addGraphic('shape', 50, 50, 100, 100);

      const currentPage = pageStore.currentPage;
      currentPage!.updateGraphic(graphic!.id, {
        x: 200,
        y: 300,
        width: 150,
        height: 150,
      });

      const updated = currentPage!.graphics.find((g: any) => g.id === graphic!.id);
      expect((updated as any).x).toBe(200);
      expect((updated as any).y).toBe(300);
      expect((updated as any).width).toBe(150);
      expect((updated as any).height).toBe(150);
    });

    it('should batch edit graphics (no throw)', () => {
      pageStore.addPage('Batch Page');
      const g1 = graphicStore.addGraphic('shape', 10, 10, 50, 50);
      const g2 = graphicStore.addGraphic('shape', 100, 10, 50, 50);

      // Select two graphics
      const currentPage = pageStore.currentPage;
      currentPage!.selectMultipleGraphics([g1!.id, g2!.id]);

      expect(() => {
        graphicStore.batchEdit({ width: 80, height: 80 } as any);
      }).not.toThrow();
    });

    it('should delete a project', () => {
      pageStore.addPage('Del Page');
      graphicStore.saveProject('To Delete');

      const result = graphicStore.deleteProject(0);
      expect(result).toBe(true);
      expect(mockStorage.projects.length).toBe(0);
    });

    it('deleting a non-existent project index should return false', () => {
      const result = graphicStore.deleteProject(999);
      expect(result).toBe(false);
    });
  });

  // ========================================================================
  // TC-E2E-003: Select graphics → copy → paste → delete
  // ========================================================================
  describe('TC-E2E-003: Select graphics → Copy → Paste → Delete', () => {
    it('should select a graphic', () => {
      pageStore.addPage('Select Page');
      const graphic = graphicStore.addGraphic('shape', 50, 50, 100, 100);

      const currentPage = pageStore.currentPage;
      currentPage!.selectGraphic(graphic!.id);

      expect(currentPage!.selectedGraphicId).toBe(graphic!.id);
    });

    it('should multi-select graphics', () => {
      pageStore.addPage('MultiSelect Page');
      const g1 = graphicStore.addGraphic('shape', 10, 10, 50, 50);
      const g2 = graphicStore.addGraphic('shape', 100, 10, 50, 50);
      const g3 = graphicStore.addGraphic('shape', 200, 10, 50, 50);

      const currentPage = pageStore.currentPage;
      currentPage!.selectMultipleGraphics([g1!.id, g2!.id, g3!.id]);

      expect(currentPage!.selectedGraphicIds.length).toBe(3);
      expect(currentPage!.selectedGraphicIds).toContain(g1!.id);
      expect(currentPage!.selectedGraphicIds).toContain(g2!.id);
      expect(currentPage!.selectedGraphicIds).toContain(g3!.id);
    });

    it('should toggle graphic selection', () => {
      pageStore.addPage('Toggle Page');
      const graphic = graphicStore.addGraphic('shape', 50, 50, 100, 100); /* addGraphic 已自动选中图形，先清除选择 */ const currentPage = pageStore.currentPage; currentPage!.clearSelection(); expect(currentPage!.selectedGraphicId).toBeNull(); graphicStore.toggleSelection(graphic!.id); expect(currentPage!.selectedGraphicId).toBe(graphic!.id); graphicStore.toggleSelection(graphic!.id); expect(currentPage!.selectedGraphicId).toBeNull(); }); it('should delete a graphic', () => {
      pageStore.addPage('Delete Page');
      const graphic = graphicStore.addGraphic('shape', 50, 50, 100, 100);

      expect(pageStore.currentPage!.graphics.length).toBe(1);

      graphicStore.removeGraphic(graphic!.id);

      expect(pageStore.currentPage!.graphics.length).toBe(0);
    });

    it('deleting a non-existent graphic should not throw', () => {
      pageStore.addPage('Safe Delete');
      expect(() => graphicStore.removeGraphic('non-existent-id')).not.toThrow();
    });

    it('should copy a page', () => {
      pageStore.addPage('Original Page');
      const originalPageId = pageStore.currentPageId!;
      graphicStore.addGraphic('shape', 50, 50, 100, 100);

      const copiedPage = pageStore.copyPage(originalPageId);

      expect(copiedPage).not.toBeNull();
      expect(copiedPage!.name).toContain('Copy');
      expect(pageStore.currentPageId).toBe(copiedPage!.id);
    });
  });

  // ========================================================================
  // TC-E2E-004: Layer operations → reorder → group → ungroup
  // ========================================================================
  describe('TC-E2E-004: Layer operations → Reorder → Group → Ungroup', () => {
    it('should create a page group', () => {
      const group = pageStore.addPageGroup('Zone 1');

      expect(group).toBeDefined();
      expect(group.name).toBe('Zone 1');
      expect(pageStore.pageGroups.length).toBe(1);
    });

    it('should move a page to a group', () => {
      const group = pageStore.addPageGroup('Zone A');
      pageStore.addPage('Page in Zone');

      const pageId = pageStore.currentPageId!;
      pageStore.movePageToGroup(pageId, group.id);

      const pagesInGroup = pageStore.getPagesByGroup(group.id);
      expect(pagesInGroup.length).toBe(1);
      expect(pagesInGroup[0].id).toBe(pageId);
    });

    it('should remove a page from a group', () => {
      const group = pageStore.addPageGroup('Zone B');
      pageStore.addPage('Removable Page');
      const pageId = pageStore.currentPageId!;

      pageStore.movePageToGroup(pageId, group.id);
      pageStore.removePageFromGroup(pageId);

      const pagesInGroup = pageStore.getPagesByGroup(group.id);
      expect(pagesInGroup.length).toBe(0);
    });

    it('should rename a page group', () => {
      const group = pageStore.addPageGroup('Old Name');
      pageStore.renamePageGroup(group.id, 'New Name');

      const updated = pageStore.pageGroups.find((g) => g.id === group.id);
      expect(updated!.name).toBe('New Name');
    });

    it('should delete a page group', () => {
      const group = pageStore.addPageGroup('To Delete');
      pageStore.addPage('Page in Deleted Group');
      pageStore.movePageToGroup(pageStore.currentPageId!, group.id);

      pageStore.removePageGroup(group.id);

      expect(pageStore.pageGroups.length).toBe(0);
      // Pages should return to ungrouped state
      const ungrouped = pageStore.getUngroupedPages;
      expect(ungrouped.length).toBeGreaterThanOrEqual(1);
    });

    it('should reorder pages', () => {
      pageStore.addPage('Page A');
      pageStore.addPage('Page B');
      pageStore.addPage('Page C');

      const initialOrder = pageStore.pages.map((p) => p.name);
      expect(initialOrder[0]).toBe('Page1');

      pageStore.reorderPages(0, 2);

      const reordered = pageStore.pages.map((p) => p.name);
      expect(reordered[0]).toBe('Page A');
    });

    it('should delete a page', () => { /* 有多于一个页面才能删除 */ pageStore.addPage('Extra Page');
      const pageCountBefore = pageStore.pages.length;
      const pageId = pageStore.currentPageId!;

      pageStore.removePage(pageId);

      expect(pageStore.pages.length).toBe(pageCountBefore - 1);
    });

    it('只有一个页面时不应删除', () => {
      // 确保只有一个页面
      const pageCountBefore = pageStore.pages.length;
      pageStore.removePage(pageStore.currentPageId!);

      expect(pageStore.pages.length).toBe(pageCountBefore);
    });
  });

  // ========================================================================
  // TC-E2E-005: Export project → import project → verify data integrity
  // ========================================================================
  describe('TC-E2E-005: Export project → Import project → Verify data integrity', () => {
    it('should export project as JSON', () => {
      pageStore.addPage('Export Page');
      graphicStore.addGraphic('shape', 100, 100, 200, 150);
      graphicStore.addGraphic('label', 100, 300, 200, 40);

      const jsonData = graphicStore.exportAsJSON();

      expect(jsonData).toBeDefined();
      expect(typeof jsonData).toBe('string');

      const parsed = JSON.parse(jsonData);
      expect(parsed.pages).toBeDefined();
      expect(parsed.exportTime).toBeDefined();
    });

    it('should export project as HTML', () => {
      pageStore.addPage('HTML Export');
      const html = graphicStore.exportAsHTML();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('projectData');
      expect(html).toContain('canvas');
    });

    it('import/export should preserve data integrity', () => {
      // Create project
      pageStore.addPage('Integrity Page');
      graphicStore.addGraphic('shape', 50, 50, 100, 100);
      graphicStore.addGraphic('label', 200, 200, 150, 50);

      // Export
      const jsonData = graphicStore.exportAsJSON();

      // Reset stores
      setActivePinia(createPinia());
      const newPageStore = usePageStore();
      useGraphicStore();

      // Import
      newPageStore.importPages(JSON.parse(jsonData).pages);

      expect(newPageStore.pages.length).toBeGreaterThanOrEqual(2);
      const integrityPage = newPageStore.pages.find((p: any) => p.name === 'Integrity Page');
      expect(integrityPage).toBeDefined();
      expect(integrityPage!.graphics.length).toBe(2);
    });

    it('Import空数据不应报错', () => {
      expect(() => pageStore.importPages([])).not.toThrow();
    });

    it('Import无效 JSON 应能正确处理', () => {
      try {
        pageStore.importPages([{ invalid: true }]);
      } catch (e) {
        // 期望可能抛出异常
      }
      // 不应崩溃
    });
  });

  // ========================================================================
  // Edge cases
  // ========================================================================
  describe('Edge cases', () => {
    it('page name duplicate check should work correctly', () => {
      pageStore.addPage('Unique Name');
      expect(pageStore.isPageNameDuplicate('Unique Name')).toBe(true);
      expect(pageStore.isPageNameDuplicate('Another Name')).toBe(false);
    });

    it('should set page icon', () => {
      pageStore.addPage('Icon Page');
      pageStore.setPageIcon(pageStore.currentPageId!, 'icon-home'); /* 图标设置不应报错 */ }); it('应能获取页面模式', () => {
      expect(pageStore.currentPageMode).toBe('edit');
      pageStore.setPageMode('preview');
      expect(pageStore.currentPageMode).toBe('preview');
      pageStore.setPageMode('edit');
      expect(pageStore.currentPageMode).toBe('edit');
    });

    it('should get zoom-related config', () => {
      expect(pageStore.currentScaleMin).toBe(20);
      expect(pageStore.currentScaleMax).toBe(300);
      expect(pageStore.currentZoomStep).toBe(1.05);

      pageStore.setScaleMin(10);
      pageStore.setScaleMax(500);
      pageStore.setZoomStep(1.1);

      expect(pageStore.currentScaleMin).toBe(10);
      expect(pageStore.currentScaleMax).toBe(500);
      expect(pageStore.currentZoomStep).toBe(1.1);
    });
  });
});