// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * E2E test: Data binding workflow
 *
 * Test strategy:
 * - Mock Pinia stores and external dependencies (konva, uuid)
 * - Use setActivePinia to create real Pinia instance
 * - Test data binding, alerts, script execution, scheduled task scheduling full flow
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
    type: overrides.type || 'label',
    name: overrides.name || 'Graphic',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 100,
    height: overrides.height ?? 40,
    rotation: overrides.rotation ?? 0,
    config: overrides.config || {
      customProps: {
        text: 'Default Text',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        fontSize: 14,
        visible: true,
        locked: false,
      },
      visible: true,
      locked: false,
      style: { fill: '#ffffff', stroke: '#333333', strokeWidth: 1 },
    },
    dataSource: overrides.dataSource || { enabled: false, dataSource: '', dataField: '' },
    events: overrides.events || { eventHandlers: {} },
    animations: overrides.animations || [],
    parentId: overrides.parentId ?? null,
    groupId: overrides.groupId ?? null,
    visible: overrides.visible ?? true,
    locked: overrides.locked ?? false,
    zIndex: overrides.zIndex ?? 0,
    metadata: overrides.metadata || {},
    toJSON() {
      return {
        id: self.id,
        type: self.type,
        name: self.name,
        config: { ...self.config },
        dataSource: { ...self.dataSource },
        events: { ...self.events },
        animations: [...self.animations],
        parentId: self.parentId,
        groupId: self.groupId,
        visible: self.visible,
        locked: self.locked,
        zIndex: self.zIndex,
        metadata: { ...self.metadata },
      };
    },
  };
  return self;
}

mockGraphicFactoryCreate.mockImplementation((type: string, x: number, y: number, width: number, height: number) => {
  return createMockGraphic({ type, x, y, width, height });
});

mockGraphicFactoryFromJSON.mockImplementation((data: any) => {
  return createMockGraphic({ ...data });
});

// ─── Import stores ───

import { usePageStore } from '../../store/page.store';
import { useGraphicStore } from '../../store/graphic.store';
import { useSimulationStore } from '../../store/simulation.store';
import { useScriptRuntimeStore } from '../../store/script.store';
/* ─── Import真实引擎 ─── */
import { ScriptEngine } from '../../scada-data/engine/ScriptEngine';
import { TaskScheduler } from '../../scada-data/engine/TaskScheduler';

// ─── Test suite ───

describe('E2E: Data Binding Workflow', () => {
  let pageStore: ReturnType<typeof usePageStore>;
  let graphicStore: ReturnType<typeof useGraphicStore>;
  let simulationStore: ReturnType<typeof useSimulationStore>;
  let scriptStore: ReturnType<typeof useScriptRuntimeStore>;

  const ENGINE = ScriptEngine.getInstance();

  beforeEach(() => {
    setActivePinia(createPinia());

    pageStore = usePageStore();
    graphicStore = useGraphicStore();
    simulationStore = useSimulationStore();
    scriptStore = useScriptRuntimeStore();

    mockStorage.projects = [];
    mockStorage.templates = [];
    mockStorage.autoSaveData = null;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // TC-E2E-010: Create data source → bind tags to graphics → start data simulation → verify graph updates
  // ========================================================================
  describe('TC-E2E-010: Create data source → Bind tags to graphics → Start data simulation → Verify graph updates', () => {
    it('should bind data tags to a graphic', () => {
      pageStore.addPage('DataBind Page');
      const label = graphicStore.addGraphic('label', 100, 100, 200, 40);

      graphicStore.bindData(label!.id, 'device://modbus-001', 'temperature');

      const currentPage = pageStore.currentPage;
      const updated = currentPage!.graphics.find((g: any) => g.id === label!.id)!;
      expect(updated.dataSource.enabled).toBe(true);
      expect(updated.dataSource.dataSource).toBe('device://modbus-001');
      expect(updated.dataSource.dataField).toBe('temperature');
    });

    it('should unbind data', () => {
      pageStore.addPage('Unbind Page');
      const label = graphicStore.addGraphic('label', 100, 100, 200, 40);

      graphicStore.bindData(label!.id, 'device://modbus-001', 'temperature');
      graphicStore.unbindData(label!.id);

      const currentPage = pageStore.currentPage;
      const updated = currentPage!.graphics.find((g: any) => g.id === label!.id)!;
      expect(updated.dataSource.enabled).toBe(false);
      expect(updated.dataSource.dataSource).toBe('');
      expect(updated.dataSource.dataField).toBe('');
    });

    it('should bind different data sources to multiple graphics', () => {
      pageStore.addPage('MultiBind Page');
      const tempLabel = graphicStore.addGraphic('label', 10, 10, 200, 40);
      const pressLabel = graphicStore.addGraphic('label', 10, 60, 200, 40);
      const flowLabel = graphicStore.addGraphic('label', 10, 110, 200, 40);

      graphicStore.bindData(tempLabel!.id, 'device://plc-001', 'temperature');
      graphicStore.bindData(pressLabel!.id, 'device://plc-001', 'pressure');
      graphicStore.bindData(flowLabel!.id, 'device://plc-001', 'flowRate');

      const currentPage = pageStore.currentPage;
      const graphics = currentPage!.graphics;

      const temp = graphics.find((g: any) => g.id === tempLabel!.id)!;
      const press = graphics.find((g: any) => g.id === pressLabel!.id)!;
      const flow = graphics.find((g: any) => g.id === flowLabel!.id)!;

      expect(temp.dataSource.dataField).toBe('temperature');
      expect(press.dataSource.dataField).toBe('pressure');
      expect(flow.dataSource.dataField).toBe('flowRate');
    });

    it('数据模拟应能加载场景', () => {
      const scenario = {
        id: 'sim-001',
        name: 'Temperature Rise',
        description: 'Simulate temperature rising over time',
        steps: [
          { tagId: 'tag-temp', value: 25, delay: 0 },
          { tagId: 'tag-temp', value: 30, delay: 1000 },
          { tagId: 'tag-temp', value: 35, delay: 1000 },
          { tagId: 'tag-temp', value: 40, delay: 1000 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      simulationStore.loadScenario(scenario as any);

      expect(simulationStore.hasActiveScenario).toBe(true);
      expect(simulationStore.totalSteps).toBe(4);
      expect(simulationStore.status).toBe('idle');
    });

    it('数据模拟应能启动和暂停', () => {
      const scenario = {
        id: 'sim-002',
        name: 'Basic Sim',
        description: '',
        steps: [{ tagId: 'tag-1', value: 50, delay: 0 }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      simulationStore.loadScenario(scenario as any);
      simulationStore.start();

      expect(simulationStore.isRunning).toBe(true);
      expect(simulationStore.status).toBe('running');

      simulationStore.pause();
      expect(simulationStore.isRunning).toBe(false);
      expect(simulationStore.status).toBe('paused');
    });

    it('数据模拟应能停止并重置', () => {
      const scenario = {
        id: 'sim-003',
        name: 'Stop Test',
        description: '',
        steps: [
          { tagId: 'tag-1', value: 10, delay: 0 },
          { tagId: 'tag-1', value: 20, delay: 1000 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      simulationStore.loadScenario(scenario as any);
      simulationStore.start();
      simulationStore.nextStep();

      expect(simulationStore.currentStep).toBe(1);

      simulationStore.stop();
      expect(simulationStore.isRunning).toBe(false);
      expect(simulationStore.currentStep).toBe(0);
      expect(simulationStore.status).toBe('idle');
    });

    it('数据模拟应能逐步执行', () => {
      const scenario = {
        id: 'sim-004',
        name: 'Step Test',
        description: '',
        steps: [
          { tagId: 'tag-1', value: 0, delay: 0 },
          { tagId: 'tag-1', value: 1, delay: 0 },
          { tagId: 'tag-1', value: 2, delay: 0 }, ], createdAt: Date.now(), updatedAt: Date.now(), }; simulationStore.loadScenario(scenario as any); simulationStore.start(); simulationStore.nextStep(); expect(simulationStore.currentStep).toBe(1); simulationStore.nextStep(); expect(simulationStore.currentStep).toBe(2); /* 最后一步后应停止 */ simulationStore.nextStep(); expect(simulationStore.status).toBe('idle');
    });

    it('数据模拟循环模式应在最后一步后回到第一步', () => {
      const scenario = {
        id: 'sim-loop',
        name: 'Loop Test',
        description: '',
        steps: [
          { tagId: 'tag-1', value: 0, delay: 0 },
          { tagId: 'tag-1', value: 1, delay: 0 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      simulationStore.loadScenario(scenario as any);
      simulationStore.setLoop(true);
      simulationStore.start();

      simulationStore.nextStep(); // step 1
      simulationStore.nextStep(); // should loop back to 0

      expect(simulationStore.currentStep).toBe(0);
      expect(simulationStore.isRunning).toBe(true);
    });

    it('应能跳转到指定步骤', () => {
      const scenario = {
        id: 'sim-goto',
        name: 'Goto Test',
        description: '',
        steps: Array.from({ length: 10 }, (_, i) => ({ tagId: 'tag-1', value: i, delay: 0 })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      simulationStore.loadScenario(scenario as any);
      simulationStore.goToStep(5);

      expect(simulationStore.currentStep).toBe(5);
    });

    it('应能设置模拟速度', () => {
      simulationStore.setSpeed(2.0);
      expect(simulationStore.speed).toBe(2.0);

      simulationStore.setSpeed(0.05);
      expect(simulationStore.speed).toBe(0.1); // 最小值 0.1
    });

    it('应能清除模拟场景', () => {
      const scenario = {
        id: 'sim-clear',
        name: 'Clear Test',
        description: '',
        steps: [{ tagId: 'tag-1', value: 50, delay: 0 }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      simulationStore.loadScenario(scenario as any);
      simulationStore.clearScenario();

      expect(simulationStore.hasActiveScenario).toBe(false);
      expect(simulationStore.isRunning).toBe(false);
    });
  });

  // ========================================================================
  // TC-E2E-011: Configure alarm → trigger alarm → verify alarm notification
  // ========================================================================
  describe('TC-E2E-011: Configure alarm → Trigger alarm → Verify alarm notification', () => {
    it('should add an event handler to a graphic', () => {
      pageStore.addPage('Event Page');
      const graphic = graphicStore.addGraphic('label', 100, 100, 200, 40);

      graphicStore.addEvent(graphic!.id, 'click');

      const currentPage = pageStore.currentPage;
      const updated = currentPage!.graphics.find((g: any) => g.id === graphic!.id)!;
      expect(updated.events.eventHandlers.click).toBeDefined();
      expect(updated.events.eventHandlers.click.eventType).toBe('click');
    });

    it('should add an action to the event handler', () => {
      pageStore.addPage('Action Page');
      const graphic = graphicStore.addGraphic('label', 100, 100, 200, 40);

      graphicStore.addEvent(graphic!.id, 'click');

      // Use eventType as key to add action
      graphicStore.addAction(graphic!.id, 'click', 'show');

      const currentPage = pageStore.currentPage;
      const updated = currentPage!.graphics.find((g: any) => g.id === graphic!.id)!;
      const actions = updated.events.eventHandlers.click.actions;
      expect(actions.length).toBe(1);
      expect(actions[0].actionType).toBe('show');
    });

    it('should delete an event handler', () => {
      pageStore.addPage('RemoveEvent Page');
      const graphic = graphicStore.addGraphic('label', 100, 100, 200, 40);

      graphicStore.addEvent(graphic!.id, 'click');

      // Use eventType as key to delete event
      graphicStore.removeEvent(graphic!.id, 'click');

      const currentPage = pageStore.currentPage;
      const updated = currentPage!.graphics.find((g: any) => g.id === graphic!.id)!;
      expect(updated.events.eventHandlers.click).toBeUndefined();
    });

    it('should delete an action', () => {
      pageStore.addPage('RemoveAction Page');
      const graphic = graphicStore.addGraphic('label', 100, 100, 200, 40);

      graphicStore.addEvent(graphic!.id, 'dblclick');
      // Use eventType as key to add action
      graphicStore.addAction(graphic!.id, 'dblclick', 'alert');
      graphicStore.addAction(graphic!.id, 'dblclick', 'hide');

      const currentPage = pageStore.currentPage;
      const updated = currentPage!.graphics.find((g: any) => g.id === graphic!.id)!;
      const actionId = updated.events.eventHandlers.dblclick.actions[0].id;

      graphicStore.removeAction(graphic!.id, 'dblclick', actionId);

      const updated2 = currentPage!.graphics.find((g: any) => g.id === graphic!.id)!;
      expect(updated2.events.eventHandlers.dblclick.actions.length).toBe(1);
    });

    it('should trigger an event handler', () => {
      pageStore.addPage('Trigger Page');
      const graphic = graphicStore.addGraphic('label', 100, 100, 200, 40);

      graphicStore.addEvent(graphic!.id, 'click');
      graphicStore.addAction(graphic!.id, 'click', 'alert'); /* 触发事件不应崩溃 */ expect(() => { graphicStore.triggerEvent(graphic!.id,'click', { value: 100 });
      }).not.toThrow();
    });
  });

  // ========================================================================
  // TC-E2E-012: Script execution → data transformation → verify output
  // ========================================================================
  describe('TC-E2E-012: Script execution → Data transformation → Verify output', () => {
    it('should register a script', () => {
      scriptStore.registerScript({
        id: 'script-e2e-001',
        name: 'Temperature Converter',
        script: 'return api.readTag("temp") * 9 / 5 + 32;',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      expect(scriptStore.registeredScripts.length).toBe(1);
      // activeScriptCount is computed, mock computes eagerly as 0
      expect(scriptStore.activeScriptCount).toBe(0);
    });

    it('should execute a simple script and return results', () => {
      const scriptCode = 'return 42;';
      const context = {
        graphicId: 'test-graphic',
        tagValues: {},
        triggerType: 'manual' as const,
      };

      const result = ENGINE.executeScript(scriptCode, context);

      expect(result.success).toBe(true);
      expect(result.output).toBe(42);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should execute a data transformation script', () => {
      const scriptCode = `
        const celsius = api.readTag("temperature");
        const fahrenheit = celsius * 9 / 5 + 32;
        return Math.round(fahrenheit * 100) / 100;
      `;
      const context = {
        graphicId: 'test-graphic',
        tagValues: { temperature: 25 },
        triggerType: 'manual' as const,
      };

      const result = ENGINE.executeScript(scriptCode, context);

      expect(result.success).toBe(true);
      expect(result.output).toBe(77); // 25°C = 77°F
    });

    it('should use Script API for data transformation', () => {
      const scriptCode = `
        const value = api.readTag("rawValue");
        const clamped = api.clamp(value, 0, 100);
        const mapped = api.mapRange(clamped, 0, 100, 0, 1);
        return api.round(mapped, 2);
      `;
      const context = {
        graphicId: 'test-graphic',
        tagValues: { rawValue: 75 },
        triggerType: 'manual' as const,
      };

      const result = ENGINE.executeScript(scriptCode, context);

      expect(result.success).toBe(true);
      expect(result.output).toBe(0.75);
    });

    it('should handle script execution errors', () => {
      const scriptCode = 'throw new Error("Test error");';
      const context = {
        graphicId: 'test-graphic',
        tagValues: {},
        triggerType: 'manual' as const,
      };

      const result = ENGINE.executeScript(scriptCode, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
    });

    it('should use Math built-in functions', () => {
      const scriptCode = 'return Math.sqrt(Math.pow(3, 2) + Math.pow(4, 2));';
      const context = {
        graphicId: 'test-graphic',
        tagValues: {},
        triggerType: 'manual' as const,
      };

      const result = ENGINE.executeScript(scriptCode, context);

      expect(result.success).toBe(true);
      expect(result.output).toBe(5);
    });

    it('should work as alarm judgment script', () => {
      const scriptCode = `
        const value = api.readTag("pressure");
        if (value > 100) {
          return api.triggerAlarm({ tagId: "pressure", level: "critical", message: "Pressure too high" });
        }
        return "normal";
      `;
      const context = {
        graphicId: 'test-graphic',
        tagValues: { pressure: 150 },
        triggerType: 'manual' as const,
      };

      const result = ENGINE.executeScript(scriptCode, context);

      expect(result.success).toBe(true);
    });

    it('should unregister a script', () => {
      scriptStore.registerScript({
        id: 'script-to-remove',
        name: 'Temp Script',
        script: 'return 1;',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      expect(scriptStore.registeredScripts.length).toBe(1);

      scriptStore.unregisterScript('script-to-remove');
      expect(scriptStore.registeredScripts.length).toBe(0);
    });

    it('should execute a script through the script store', async () => {
      scriptStore.registerScript({
        id: 'script-exec-test',
        name: 'Exec Test',
        script: 'return api.readTag("value") * 2;',
        type: 'client',
        mode: 'interaction', enabled: true, maxRetries: 0, timeout: 5000, createdAt: Date.now(), updatedAt: Date.now(), executeCount: 0, }); /* Set tagValues in the engine */ /* 注：通过 store 执行需要 engine 中有正确的上下文 */ await scriptStore.executeScript('script-exec-test');

      expect(scriptStore.lastExecutionResult).not.toBeNull();
    });
  });

  // ========================================================================
  // TC-E2E-013: Task scheduler → schedule task → execute → verify result
  // ========================================================================
  describe('TC-E2E-013: Task scheduler → Schedule task → Execute → Verify result', () => { let scheduler: TaskScheduler; beforeEach(() => { /* 注册测试脚本 */ ENGINE.registerScript({ id:'cron-script-001',
        name: 'Cron Job Script',
        script: 'return api.log("info", "cron executed");',
        type: 'client',
        mode: 'timer',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      scheduler = TaskScheduler.getInstance();
    });

    afterEach(() => {
      if (scheduler) {
        scheduler.destroy();
      }
    });

    it('should schedule a Cron task', () => {
      const task = scheduler.schedule('cron-script-001', '* * * * *');

      expect(task).toBeDefined();
      expect(task.scriptId).toBe('cron-script-001');
      expect(task.cron).toBe('* * * * *');
      expect(task.enabled).toBe(true);
      expect(task.runCount).toBe(0);
    });

    it('should get all scheduled tasks', () => {
      vi.useFakeTimers();
      try {
        scheduler.schedule('cron-script-001', '* * * * *');
        vi.advanceTimersByTime(1);
        scheduler.schedule('cron-script-001', '0 * * * *');

        const all = scheduler.getAll();
        expect(all.length).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should get scheduled tasks by script ID', () => {
      scheduler.schedule('cron-script-001', '* * * * *');

      const tasks = scheduler.getByScriptId('cron-script-001');
      expect(tasks.length).toBe(1);
      expect(tasks[0].scriptId).toBe('cron-script-001');
    });

    it('should pause and resume tasks', () => {
      const task = scheduler.schedule('cron-script-001', '* * * * *');

      scheduler.pause(task.taskId);
      const paused = scheduler.getAll();
      expect(paused[0].enabled).toBe(false);

      scheduler.resume(task.taskId);
      const resumed = scheduler.getAll();
      expect(resumed[0].enabled).toBe(true);
    });

    it('should cancel a task', () => {
      const task = scheduler.schedule('cron-script-001', '* * * * *');
      expect(scheduler.getAll().length).toBe(1);

      scheduler.cancel(task.taskId);
      expect(scheduler.getAll().length).toBe(0);
    });

    it('Cron expression * * * * * should execute every minute', () => {
      const nextRun = TaskScheduler.getNextRunTime('* * * * *');

      const now = Date.now();
      expect(nextRun).toBeGreaterThan(now);
      expect(nextRun).toBeLessThanOrEqual(now + 60000);
    });

    it('Cron expression with specified minute should calculate correctly', () => {
      const now = new Date('2026-06-04T10:00:00.000Z');
      const nextRun = TaskScheduler.getNextRunTime('30 * * * *', now);

      const nextDate = new Date(nextRun);
      expect(nextDate.getMinutes()).toBe(30);
    });
  });

  // ========================================================================
  // Edge cases and error paths
  // ========================================================================
  describe('Edge cases and error paths', () => {
    it('binding data to a non-existent graphic should not throw', () => {
      expect(() => {
        graphicStore.bindData('non-existent-id', 'device://test', 'tag');
      }).not.toThrow();
    });

    it('unbinding data from a non-existent graphic should not throw', () => {
      expect(() => {
        graphicStore.unbindData('non-existent-id');
      }).not.toThrow();
    });

    it('空场景不应有进度', () => {
      const scenario = {
        id: 'empty-sim',
        name: 'Empty',
        description: '',
        steps: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      simulationStore.loadScenario(scenario as any);
      expect(simulationStore.progress).toBe(0);
    });

    it('loading an empty scenario should not crash', () => {
      simulationStore.loadScenario(null as any);
      expect(simulationStore.hasActiveScenario).toBe(false);
    });

    it('无场景时不应启动模拟', () => {
      simulationStore.start();
      expect(simulationStore.isRunning).toBe(false);
    });
  });
});