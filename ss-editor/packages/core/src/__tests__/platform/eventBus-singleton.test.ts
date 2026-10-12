// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Test EventBus singleton consistency
 *
 * Background: Previously there were two independent EventBus modules:
 * - platform/event/EventBus.ts has its own Events enum and eventBus instance
 * - utils/event/eventBus.ts has another complete Events enum and eventBus instance
 *
 * Bug: BasePage/graphic.store emits events via utils/eventBus,
 * LayerPanel receives via platform/eventBus → events are never delivered
 *
 * Fix: platform/event/EventBus.ts changed to `export * from utils/event/eventBus`
 * Ensure there is only one global eventBus instance
 */
describe('EventBus Singleton Consistency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('platform/event/EventBus and utils/event/eventBus Consistency', () => {
    it('eventBus exported from both paths should be the same instance', async () => {
      const { eventBus: platformBus } = await import('../../platform/event/EventBus');
      const { eventBus: utilBus } = await import('../../utils/event/eventBus');

      expect(platformBus).toBe(utilBus);
    });

    it('Events enum exported from both paths should be the same reference', async () => {
      const { Events: platformEvents } = await import('../../platform/event/EventBus');
      const { Events: utilEvents } = await import('../../utils/event/eventBus');

      expect(platformEvents).toBe(utilEvents);
    });

    it('events emitted via utils should be received from platform imported eventBus', async () => {
      const { eventBus: platformBus } = await import('../../platform/event/EventBus');
      const { eventBus: utilBus, Events } = await import('../../utils/event/eventBus');

      const listener = vi.fn();
      platformBus.on(Events.GRAPHIC_ADDED, listener);

      utilBus.emit(Events.GRAPHIC_ADDED, { id: 'test-graphic', graphic: {} as any });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ id: 'test-graphic', graphic: {} as any });

      platformBus.off(Events.GRAPHIC_ADDED, listener);
    });

    it('events emitted via platform should be received from utils imported eventBus', async () => {
      const { eventBus: platformBus, Events } = await import('../../platform/event/EventBus');
      const { eventBus: utilBus } = await import('../../utils/event/eventBus');

      const listener = vi.fn();
      utilBus.on(Events.GRAPHIC_REMOVED, listener);

      platformBus.emit(Events.GRAPHIC_REMOVED, { id: 'test-graphic' });

      expect(listener).toHaveBeenCalledTimes(1);

      utilBus.off(Events.GRAPHIC_REMOVED, listener);
    });
  });

  describe('Events Enum Completeness', () => {
    it('should include GROUP_DELETED event', async () => {
      const { Events } = await import('../../platform/event/EventBus');

      expect(Events.GROUP_DELETED).toBeDefined();
      expect(Events.GROUP_DELETED).toBe('group_deleted');
    });

    it('should include GROUP_UPDATED event', async () => {
      const { Events } = await import('../../platform/event/EventBus');

      expect(Events.GROUP_UPDATED).toBeDefined();
      expect(Events.GROUP_UPDATED).toBe('group_updated');
    });

    it('should include GROUP_CREATED event', async () => {
      const { Events } = await import('../../platform/event/EventBus');

      expect(Events.GROUP_CREATED).toBeDefined();
      expect(Events.GROUP_CREATED).toBe('group_created');
    });

    it('should include all graphic and page related events', async () => {
      const { Events } = await import('../../platform/event/EventBus');

      const expectedEvents = [
        'GRAPHIC_ADDED', 'GRAPHIC_REMOVED', 'GRAPHIC_SELECTED', 'GRAPHIC_UPDATED',
        'PAGE_ADDED', 'PAGE_REMOVED', 'PAGE_SWITCHED', 'PAGE_UPDATED',
        'SELECTION_CHANGED', 'SELECTION_CLEARED',
        'GROUP_CREATED', 'GROUP_DELETED', 'GROUP_UPDATED',
      ] as const;

      for (const eventName of expectedEvents) {
        expect(Events[eventName]).toBeDefined();
      }
    });
  });

  describe('Event Communication Scenario: Simulate LayerPanel and BasePage', () => {
    it('GRAPHIC_ADDED event emitted by BasePage via utils/eventBus should be received by LayerPanel', async () => {
      // LayerPanel imports eventBus from platform/event/EventBus
      const { eventBus: layerPanelBus, Events } = await import('../../platform/event/EventBus'); /* BasePage imports eventBus from utils/event/eventBus */ const { eventBus: basePageBus } = await import('../../utils/event/eventBus'); /* Simulate LayerPanel registering listener */ const layerPanelRefresh = vi.fn(); layerPanelBus.on(Events.GRAPHIC_ADDED, layerPanelRefresh); /* Simulate BasePage emitting event after adding graphic */ basePageBus.emit(Events.GRAPHIC_ADDED, { id:'graphic-2',
        graphic: { id: 'graphic-2', type: 'rect' } as any,
      });

      expect(layerPanelRefresh).toHaveBeenCalledTimes(1);

      layerPanelBus.off(Events.GRAPHIC_ADDED, layerPanelRefresh);
    });

    it('GRAPHIC_REMOVED event emitted by graphic.store via utils/eventBus should be received by LayerPanel', async () => {
      const { eventBus: layerPanelBus, Events } = await import('../../platform/event/EventBus');
      const { eventBus: storeBus } = await import('../../utils/event/eventBus');

      const layerPanelRefresh = vi.fn();
      layerPanelBus.on(Events.GRAPHIC_REMOVED, layerPanelRefresh);

      storeBus.emit(Events.GRAPHIC_REMOVED, { id: 'graphic-1' });

      expect(layerPanelRefresh).toHaveBeenCalledTimes(1);

      layerPanelBus.off(Events.GRAPHIC_REMOVED, layerPanelRefresh);
    });

    it('GROUP_DELETED event should be delivered from store to LayerPanel', async () => {
      const { eventBus: layerPanelBus, Events } = await import('../../platform/event/EventBus');
      const { eventBus: storeBus } = await import('../../utils/event/eventBus');

      const layerPanelRefresh = vi.fn();
      layerPanelBus.on(Events.GROUP_DELETED, layerPanelRefresh);

      storeBus.emit(Events.GROUP_DELETED, { groupId: 'group-1' });

      expect(layerPanelRefresh).toHaveBeenCalledTimes(1);

      layerPanelBus.off(Events.GROUP_DELETED, layerPanelRefresh);
    });

    it('PAGE_SWITCHED event should be delivered correctly', async () => {
      const { eventBus: layerPanelBus, Events } = await import('../../platform/event/EventBus');
      const { eventBus: pageBus } = await import('../../utils/event/eventBus');

      const layerPanelRefresh = vi.fn();
      layerPanelBus.on(Events.PAGE_SWITCHED, layerPanelRefresh);

      pageBus.emit(Events.PAGE_SWITCHED, { pageId: 'page-2', projectId: 'project-1' });

      expect(layerPanelRefresh).toHaveBeenCalledTimes(1);
      expect(layerPanelRefresh).toHaveBeenCalledWith({ pageId: 'page-2', projectId: 'project-1' });

      layerPanelBus.off(Events.PAGE_SWITCHED, layerPanelRefresh);
    });
  });
});
