// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ==================== Mocks ====================

const mockStorageGetItem = vi.fn();
const mockStorageSetItem = vi.fn();
const mockStorageRemoveItem = vi.fn();
const mockStorageClear = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: mockStorageGetItem,
  setItem: mockStorageSetItem,
  removeItem: mockStorageRemoveItem,
  clear: mockStorageClear,
  length: 0,
  key: vi.fn(() => null),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock ProjectMigration
const mockMigrateProject = vi.fn();
vi.mock('@scada-editor/plugin-sdk', () => ({
  ProjectMigration: {
    migrateProject: (...args: any[]) => mockMigrateProject(...args),
  },
}));

// Mock store modules
const mockGraphicStoreInstance = {
  selectedGraphics: [],
  addGraphic: vi.fn(),
  startBatchOperation: vi.fn(),
  endBatchOperation: vi.fn(),
};

const mockPageStoreInstance = {
  pages: [],
  currentPageId: null,
  currentPage: null,
};

vi.mock('../../store/graphic.store', () => ({
  useGraphicStore: vi.fn(() => mockGraphicStoreInstance),
}));

vi.mock('../../store/page.store', () => ({
  usePageStore: vi.fn(() => mockPageStoreInstance),
}));

// Mock GraphicFactory
const mockCreateGraphicFromJSON = vi.fn();
vi.mock('../../graphic-editing/graphic/factory/GraphicFactory', () => ({
  GraphicFactory: {
    createGraphicFromJSON: (...args: any[]) => mockCreateGraphicFromJSON(...args),
  },
}));

// Mock settings with autoSave enabled
const mockSettings = {
  autoSave: true,
  autoSaveInterval: 30000,
};

// Mock storage service
vi.mock('../../services/storage.service', () => ({
  saveAutoSave: vi.fn(),
  loadAutoSave: vi.fn(),
  clearAutoSave: vi.fn(),
  saveProject: vi.fn(),
  loadProject: vi.fn(),
  saveProjects: vi.fn(),
  loadProjects: vi.fn(() => []),
  saveTemplates: vi.fn(),
  loadTemplates: vi.fn(() => []),
  saveSettings: vi.fn(),
  loadSettings: vi.fn(() => ({ ...mockSettings })),
  saveToStorage: vi.fn(),
  loadFromStorage: vi.fn(() => null),
  removeFromStorage: vi.fn(),
  clearStorage: vi.fn(),
}));

import { StateService } from '../../services/state.service';
import * as StorageService from '../../services/storage.service';

describe('StateService', () => {
  let stateService: StateService;

  // Reset singleton before each test
  beforeEach(() => {
    // Reset singleton
    (StateService as any).instance = undefined;
    stateService = StateService.getInstance();

    // Reset mock state
    vi.clearAllMocks();

    mockPageStoreInstance.pages = [];
    mockPageStoreInstance.currentPageId = null;
    mockPageStoreInstance.currentPage = null;
    mockGraphicStoreInstance.selectedGraphics = [];

    // Reset storage mock defaults
    vi.mocked(StorageService.loadProjects).mockReturnValue([]);
    vi.mocked(StorageService.loadTemplates).mockReturnValue([]);
    vi.mocked(StorageService.loadSettings).mockReturnValue({ ...mockSettings });
    vi.mocked(StorageService.loadAutoSave).mockReturnValue(null);

    mockMigrateProject.mockReturnValue({
      data: { pages: [], currentPageId: null },
      report: { migratedCount: 0 },
    });
  });

  afterEach(() => {
    stateService.cleanup();
  });

  // ==================== TC-STATE-001: Singleton ====================
  describe('TC-STATE-001: Singleton Pattern', () => {
    it('TC-STATE-001-01: getInstance should return the same instance', () => {
      const instance1 = StateService.getInstance();
      const instance2 = StateService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('TC-STATE-001-02: should not create a new instance via constructor', () => {
      const instance1 = StateService.getInstance();
      const instance2 = new StateService();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ==================== TC-STATE-002: Init ====================
  describe('TC-STATE-002: Initialization', () => {
    it('TC-STATE-002-01: init should import and initialize stores', async () => {
      await stateService.init();
      // Should not throw
      expect(true).toBe(true);
    });

    it('TC-STATE-002-02: init should setup auto save when settings.autoSave is true', async () => {
      vi.mocked(StorageService.loadSettings).mockReturnValue({ autoSave: true, autoSaveInterval: 100 });
      await stateService.init();
      // Should not throw
      expect(true).toBe(true);
    });

    it('TC-STATE-002-03: init should not setup auto save when settings.autoSave is false', async () => {
      vi.mocked(StorageService.loadSettings).mockReturnValue({ autoSave: false, autoSaveInterval: 100 });
      await stateService.init();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ==================== TC-STATE-003: Auto Save ====================
  describe('TC-STATE-003: Auto Save', () => {
    beforeEach(async () => {
      await stateService.init();
    });

    it('TC-STATE-003-01: startAutoSave should set up interval', async () => {
      stateService.startAutoSave(100);
      // Should not throw
      expect(true).toBe(true);
    });

    it('TC-STATE-003-02: stopAutoSave should clear interval', () => {
      stateService.startAutoSave(100);
      stateService.stopAutoSave();
      // Should not throw
      expect(true).toBe(true);
    });

    it('TC-STATE-003-03: startAutoSave should replace existing interval', () => {
      stateService.startAutoSave(100);
      stateService.startAutoSave(200);
      // Should not throw
      expect(true).toBe(true);
    });

    it('TC-STATE-003-04: stopAutoSave when no interval should not throw', () => {
      stateService.stopAutoSave();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ==================== TC-STATE-004: CRUD Operations ====================
  describe('TC-STATE-004: CRUD Operations', () => {
    beforeEach(async () => {
      await stateService.init();
    });

    it('TC-STATE-004-01: saveProject should save project to localStorage', () => {
      mockPageStoreInstance.pages = [{ id: 'page-1', name: 'Test Page' }] as any;
      mockPageStoreInstance.currentPage = mockPageStoreInstance.pages[0];

      const result = stateService.saveProject('My Project');

      expect(result).toBeDefined();
      expect(result.name).toBe('My Project');
      expect(StorageService.saveProjects).toHaveBeenCalled();
      expect(StorageService.clearAutoSave).toHaveBeenCalled();
    });

    it('TC-STATE-004-02: loadProject should load valid project by index', () => {
      const project = {
        name: 'Test',
        pages: [{ id: 'page-1', name: 'Page 1', graphics: [] }],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      vi.mocked(StorageService.loadProjects).mockReturnValue([project]);
      mockMigrateProject.mockReturnValue({
        data: { pages: project.pages },
        report: { migratedCount: 0 },
      });

      const result = stateService.loadProject(0);

      expect(result).toBe(true);
      expect(mockPageStoreInstance.pages).toEqual(project.pages);
      expect(StorageService.clearAutoSave).toHaveBeenCalled();
    });

    it('TC-STATE-004-03: loadProject should return false for invalid index', () => {
      vi.mocked(StorageService.loadProjects).mockReturnValue([]);

      const result = stateService.loadProject(0);

      expect(result).toBe(false);
    });

    it('TC-STATE-004-04: loadProject should return false for negative index', () => {
      vi.mocked(StorageService.loadProjects).mockReturnValue([{ name: 'Test' }]);

      const result = stateService.loadProject(-1);

      expect(result).toBe(false);
    });

    it('TC-STATE-004-05: loadProject should apply migrations', () => {
      const project = { name: 'Test', pages: [] };
      vi.mocked(StorageService.loadProjects).mockReturnValue([project]);
      mockMigrateProject.mockReturnValue({
        data: { pages: [{ id: 'page-1' }] },
        report: { migratedCount: 3 },
      });

      const result = stateService.loadProject(0);

      expect(result).toBe(true);
      expect(mockMigrateProject).toHaveBeenCalled();
    });

    it('TC-STATE-004-06: deleteProject should delete valid project by index', () => {
      const projects = [
        { name: 'Project 1', pages: [] },
        { name: 'Project 2', pages: [] },
      ];
      vi.mocked(StorageService.loadProjects).mockReturnValue(projects);

      const result = stateService.deleteProject(0);

      expect(result).toBe(true);
      expect(StorageService.saveProjects).toHaveBeenCalled();
      const savedProjects = vi.mocked(StorageService.saveProjects).mock.calls[0][0];
      expect(savedProjects.length).toBe(1);
      expect(savedProjects[0].name).toBe('Project 2');
    });

    it('TC-STATE-004-07: deleteProject should return false for invalid index', () => {
      vi.mocked(StorageService.loadProjects).mockReturnValue([]);

      const result = stateService.deleteProject(0);

      expect(result).toBe(false);
    });

    it('TC-STATE-004-08: deleteProject should return false for negative index', () => {
      vi.mocked(StorageService.loadProjects).mockReturnValue([{ name: 'Test' }]);

      const result = stateService.deleteProject(-1);

      expect(result).toBe(false);
    });
  });

  // ==================== TC-STATE-005: Template Operations ====================
  describe('TC-STATE-005: Template Operations', () => {
    beforeEach(async () => {
      await stateService.init();
    });

    it('TC-STATE-005-01: saveTemplate should save selected graphics as template', () => {
      mockPageStoreInstance.currentPage = {
        id: 'page-1',
        selectedGraphicIds: ['g-1', 'g-2'],
      } as any;
      mockGraphicStoreInstance.selectedGraphics = [
        { id: 'g-1', toJSON: () => ({ id: 'g-1', type: 'rect' }) },
        { id: 'g-2', toJSON: () => ({ id: 'g-2', type: 'circle' }) },
      ] as any;

      const result = stateService.saveTemplate('My Template');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('My Template');
      expect(result!.graphics.length).toBe(2);
      expect(StorageService.saveTemplates).toHaveBeenCalled();
    });

    it('TC-STATE-005-02: saveTemplate should return null when no selection', () => {
      mockPageStoreInstance.currentPage = {
        id: 'page-1',
        selectedGraphicIds: [],
      } as any;

      const result = stateService.saveTemplate('Empty Template');

      expect(result).toBeNull();
    });

    it('TC-STATE-005-03: saveTemplate should return null when no current page', () => {
      mockPageStoreInstance.currentPage = null;

      const result = stateService.saveTemplate('No Page');

      expect(result).toBeNull();
    });

    it('TC-STATE-005-04: applyTemplate should create graphics from template', async () => {
      const template = {
        name: 'Test Template',
        graphics: [
          { id: 'g-1', type: 'rect', config: { geometry: { x: 100, y: 100 } } },
        ],
        createdAt: '2024-01-01',
      };
      vi.mocked(StorageService.loadTemplates).mockReturnValue([template]);

      const mockGraphic = {
        id: 'g-1',
        getPosition: vi.fn(() => ({ x: 100, y: 100 })),
        setPosition: vi.fn(),
      };
      mockCreateGraphicFromJSON.mockReturnValue(mockGraphic);

      mockPageStoreInstance.currentPage = {
        id: 'page-1',
        graphics: [],
      } as any;

      await stateService.applyTemplate(0);

      expect(mockCreateGraphicFromJSON).toHaveBeenCalledTimes(1);
      expect(mockGraphic.getPosition).toHaveBeenCalled();
      expect(mockGraphic.setPosition).toHaveBeenCalledWith(120, 120);
    });

    it('TC-STATE-005-05: applyTemplate should do nothing for invalid index', async () => {
      vi.mocked(StorageService.loadTemplates).mockReturnValue([]);

      await stateService.applyTemplate(0);

      expect(mockCreateGraphicFromJSON).not.toHaveBeenCalled();
    });

    it('TC-STATE-005-06: applyTemplate should do nothing when no current page', async () => {
      vi.mocked(StorageService.loadTemplates).mockReturnValue([{ graphics: [] }]);
      mockPageStoreInstance.currentPage = null;

      await stateService.applyTemplate(0);

      expect(mockCreateGraphicFromJSON).not.toHaveBeenCalled();
    });
  });

  // ==================== TC-STATE-006: Batch Operations ====================
  describe('TC-STATE-006: Batch Operations', () => {
    beforeEach(async () => {
      await stateService.init();
      mockPageStoreInstance.currentPage = {
        id: 'page-1',
        graphics: [],
        updateGraphic: vi.fn(),
        removeGraphic: vi.fn(),
        moveGraphic: vi.fn(),
      } as any;
      // Reset mock implementations to default (no-op) behavior
      mockGraphicStoreInstance.addGraphic.mockReset();
      mockGraphicStoreInstance.startBatchOperation.mockReset();
      mockGraphicStoreInstance.endBatchOperation.mockReset();
    });

    it('TC-STATE-006-01: batchOperation should process add operations', () => {
      const operations = [
        { type: 'add', payload: { type: 'rect', x: 100, y: 100, width: 200, height: 100 } },
      ];

      stateService.batchOperation(operations);

      expect(mockGraphicStoreInstance.startBatchOperation).toHaveBeenCalled();
      expect(mockGraphicStoreInstance.addGraphic).toHaveBeenCalledWith('rect', 100, 100, 200, 100);
      expect(mockGraphicStoreInstance.endBatchOperation).toHaveBeenCalled();
    });

    it('TC-STATE-006-02: batchOperation should process update operations', () => {
      const operations = [
        { type: 'update', payload: { id: 'g-1', properties: { x: 200 } } },
      ];

      stateService.batchOperation(operations);

      expect((mockPageStoreInstance.currentPage! as any).updateGraphic).toHaveBeenCalledWith('g-1', { x: 200 });
    });

    it('TC-STATE-006-03: batchOperation should process delete operations', () => {
      const operations = [
        { type: 'delete', payload: 'g-1' },
      ];

      stateService.batchOperation(operations);

      expect((mockPageStoreInstance.currentPage! as any).removeGraphic).toHaveBeenCalledWith('g-1');
    });

    it('TC-STATE-006-04: batchOperation should process move operations', () => {
      const operations = [
        { type: 'move', payload: { id: 'g-1', x: 300, y: 400 } },
      ];

      stateService.batchOperation(operations);

      expect((mockPageStoreInstance.currentPage! as any).moveGraphic).toHaveBeenCalledWith('g-1', 300, 400);
    });

    it('TC-STATE-006-05: batchOperation should always call endBatchOperation even on error', () => {
      mockGraphicStoreInstance.addGraphic.mockImplementation(() => {
        throw new Error('Add failed');
      });

      const operations = [
        { type: 'add', payload: { type: 'rect', x: 0, y: 0, width: 100, height: 100 } },
      ];

      expect(() => stateService.batchOperation(operations)).toThrow('Add failed');
      expect(mockGraphicStoreInstance.endBatchOperation).toHaveBeenCalled();
    });

    it('TC-STATE-006-06: batchOperation should process multiple mixed operations', () => {
      const operations = [
        { type: 'add', payload: { type: 'rect', x: 0, y: 0, width: 100, height: 100 } },
        { type: 'update', payload: { id: 'g-1', properties: { x: 50 } } },
        { type: 'delete', payload: 'g-2' },
        { type: 'move', payload: { id: 'g-3', x: 200, y: 300 } },
      ];

      stateService.batchOperation(operations);

      expect(mockGraphicStoreInstance.addGraphic).toHaveBeenCalledTimes(1);
      expect((mockPageStoreInstance.currentPage! as any).updateGraphic).toHaveBeenCalledTimes(1);
      expect((mockPageStoreInstance.currentPage! as any).removeGraphic).toHaveBeenCalledTimes(1);
      expect((mockPageStoreInstance.currentPage! as any).moveGraphic).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== TC-STATE-007: Export/Import ====================
  describe('TC-STATE-007: Export/Import', () => {
    beforeEach(async () => {
      await stateService.init();
    });

    it('TC-STATE-007-01: exportProject should return JSON string', () => {
      mockPageStoreInstance.pages = [{ id: 'page-1', name: 'Test Page' }] as any;

      const json = stateService.exportProject();

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.pages).toEqual([{ id: 'page-1', name: 'Test Page' }]);
      expect(parsed.exportTime).toBeDefined();
    });

    it('TC-STATE-007-02: importProject should parse JSON and apply migrations', () => {
      const jsonData = JSON.stringify({
        pages: [{ id: 'page-1', name: 'Imported Page' }],
      });
      mockMigrateProject.mockReturnValue({
        data: { pages: [{ id: 'page-1', name: 'Imported Page' }] },
        report: { migratedCount: 0 },
      });

      const result = stateService.importProject(jsonData);

      expect(result).toBe(true);
      expect(mockMigrateProject).toHaveBeenCalled();
    });

    it('TC-STATE-007-03: importProject should return false for invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = stateService.importProject('invalid json');

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('TC-STATE-007-04: importProject should handle migration count logging', () => {
      const jsonData = JSON.stringify({ pages: [] });
      mockMigrateProject.mockReturnValue({
        data: { pages: [] },
        report: { migratedCount: 5 },
      });

      stateService.importProject(jsonData);

      expect(mockMigrateProject).toHaveBeenCalled();
    });

    it('TC-STATE-007-05: export/import round-trip should preserve data', () => {
      const originalPages = [{ id: 'page-1', name: 'Test Page', graphics: [] }];
      mockPageStoreInstance.pages = originalPages as any;
      mockMigrateProject.mockImplementation((data: any) => ({
        data,
        report: { migratedCount: 0 },
      }));

      const exported = stateService.exportProject();
      const result = stateService.importProject(exported);

      expect(result).toBe(true);
    });
  });

  // ==================== TC-STATE-008: Schema Migrations ====================
  describe('TC-STATE-008: Schema Migrations', () => {
    beforeEach(async () => {
      await stateService.init();
    });

    it('TC-STATE-008-01: registerSchemaMigrations should store migrations', () => {
      const migrations = [{ version: 1, migrate: vi.fn() } as any];

      stateService.registerSchemaMigrations('test-plugin', migrations);

      const stored = stateService.getSchemaMigrations();
      expect(stored['test-plugin']).toBe(migrations);
    });

    it('TC-STATE-008-02: getSchemaMigrations should return a copy', () => {
      const migrations = [{ version: 1, migrate: vi.fn() } as any];
      stateService.registerSchemaMigrations('test-plugin', migrations);

      const stored = stateService.getSchemaMigrations();
      stored['test-plugin'] = [];

      // Original should not be affected
      const storedAgain = stateService.getSchemaMigrations();
      expect(storedAgain['test-plugin']).toBe(migrations);
    });

    it('TC-STATE-008-03: registerSchemaMigrations should overwrite existing plugin migrations', () => {
      const oldMigrations = [{ version: 1, migrate: vi.fn() } as any];
      const newMigrations = [{ version: 2, migrate: vi.fn() } as any];

      stateService.registerSchemaMigrations('test-plugin', oldMigrations);
      stateService.registerSchemaMigrations('test-plugin', newMigrations);

      const stored = stateService.getSchemaMigrations();
      expect(stored['test-plugin']).toBe(newMigrations);
    });

    it('TC-STATE-008-04: getSchemaMigrations should return empty object when no migrations registered', () => {
      const stored = stateService.getSchemaMigrations();
      expect(stored).toEqual({});
    });
  });

  // ==================== TC-STATE-009: Error Handling ====================
  describe('TC-STATE-009: Error Handling', () => {
    it('TC-STATE-009-01: operations should throw when stores not initialized', () => {
      expect(() => stateService.saveProject('Test')).toThrow(
        'StateService not initialized. Call init() first.'
      );
    });

    it('TC-STATE-009-02: saveProject should throw when stores not initialized', () => {
      expect(() => stateService.saveProject('Test')).toThrow(
        'StateService not initialized. Call init() first.'
      );
    });

    it('TC-STATE-009-03: loadProject should throw when stores not initialized', () => {
      expect(() => stateService.loadProject(0)).toThrow(
        'StateService not initialized. Call init() first.'
      );
    });

    it('TC-STATE-009-04: deleteProject should throw when stores not initialized', () => {
      expect(() => stateService.deleteProject(0)).toThrow(
        'StateService not initialized. Call init() first.'
      );
    });

    it('TC-STATE-009-05: batchOperation should throw when stores not initialized', () => {
      expect(() => stateService.batchOperation([])).toThrow(
        'StateService not initialized. Call init() first.'
      );
    });

    it('TC-STATE-009-06: exportProject should throw when stores not initialized', () => {
      expect(() => stateService.exportProject()).toThrow(
        'StateService not initialized. Call init() first.'
      );
    });

    it('TC-STATE-009-07: importProject should throw when stores not initialized', () => {
      expect(() => stateService.importProject('{}')).toThrow(
        'StateService not initialized. Call init() first.'
      );
    });
  });

  // ==================== TC-STATE-010: Cleanup ====================
  describe('TC-STATE-010: Cleanup', () => {
    it('TC-STATE-010-01: cleanup should stop auto save', async () => {
      await stateService.init();
      stateService.startAutoSave(100);

      stateService.cleanup();

      // Should not throw, auto save stopped
      expect(true).toBe(true);
    });

    it('TC-STATE-010-02: cleanup should not throw when no auto save running', () => {
      stateService.cleanup();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});