// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TypedEventBus } from '../../utils/event/eventBus';
import { eventBus as globalEventBus, Events as _Events } from '../../utils/event/eventBus';

// ==================== TypedEventBus Tests ====================
describe('TypedEventBus', () => {
  let eventBus: TypedEventBus;

  beforeEach(() => {
    eventBus = new TypedEventBus();
  });

  // ==================== TC-EVENT-001: on/emit ====================
  describe('TC-EVENT-001: on and emit', () => {
    it('TC-EVENT-001-01: should register and emit events', () => {
      const handler = vi.fn();
      eventBus.on('graphic-added', handler);

      const payload = { graphic: {} as any, pageId: 'page-1' };
      eventBus.emit('graphic-added', payload);

      expect(handler).toHaveBeenCalledWith(payload);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('TC-EVENT-001-02: should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('graphic-added', handler1);
      eventBus.on('graphic-added', handler2);

      const payload = { graphic: {} as any, pageId: 'page-1' };
      eventBus.emit('graphic-added', payload);

      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
    });

    it('TC-EVENT-001-03: should not call handlers for different events', () => {
      const graphicHandler = vi.fn();
      const pageHandler = vi.fn();
      eventBus.on('graphic-added', graphicHandler);
      eventBus.on('page-switched', pageHandler);

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });

      expect(graphicHandler).toHaveBeenCalledTimes(1);
      expect(pageHandler).not.toHaveBeenCalled();
    });

    it('TC-EVENT-001-04: should handle multiple emit calls', () => {
      const handler = vi.fn();
      eventBus.on('undo', handler);

      eventBus.emit('undo', {});
      eventBus.emit('undo', {});
      eventBus.emit('undo', {});

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== TC-EVENT-002: off ====================
  describe('TC-EVENT-002: off', () => {
    it('TC-EVENT-002-01: should remove specific handler', () => {
      const handler = vi.fn();
      eventBus.on('graphic-added', handler);
      eventBus.off('graphic-added', handler);

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('TC-EVENT-002-02: should remove only the specified handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('graphic-added', handler1);
      eventBus.on('graphic-added', handler2);

      eventBus.off('graphic-added', handler1);

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('TC-EVENT-002-03: should also remove once listeners', () => {
      const handler = vi.fn();
      eventBus.once('graphic-added', handler);
      eventBus.off('graphic-added', handler);

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('TC-EVENT-002-04: should not throw when removing non-existent handler', () => {
      const handler = vi.fn();
      expect(() => {
        eventBus.off('graphic-added', handler);
      }).not.toThrow();
    });
  });

  // ==================== TC-EVENT-003: once ====================
  describe('TC-EVENT-003: once', () => {
    it('TC-EVENT-003-01: once should trigger only once', () => {
      const handler = vi.fn();
      eventBus.once('graphic-added', handler);

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });
      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-2' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('TC-EVENT-003-02: once should receive correct payload', () => {
      const handler = vi.fn();
      eventBus.once('graphic-added', handler);

      const payload = { graphic: {} as any, pageId: 'page-1' };
      eventBus.emit('graphic-added', payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('TC-EVENT-003-03: multiple once handlers should all be called once', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.once('graphic-added', handler1);
      eventBus.once('graphic-added', handler2);

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });
      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-2' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('TC-EVENT-003-04: once and on mix should work correctly', () => {
      const onceHandler = vi.fn();
      const onHandler = vi.fn();

      eventBus.once('graphic-added', onceHandler);
      eventBus.on('graphic-added', onHandler);

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });
      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-2' });

      expect(onceHandler).toHaveBeenCalledTimes(1);
      expect(onHandler).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== TC-EVENT-004: Error Handling ====================
  describe('TC-EVENT-004: Error Handling', () => {
    it('TC-EVENT-004-01: error in handler should not affect other handlers', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalHandler = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.on('graphic-added', errorHandler);
      eventBus.on('graphic-added', normalHandler);

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });

      expect(normalHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('TC-EVENT-004-02: error in once handler should not affect other handlers', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalHandler = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.once('graphic-added', errorHandler);
      eventBus.on('graphic-added', normalHandler);

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });

      expect(normalHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ==================== TC-EVENT-005: clear ====================
  describe('TC-EVENT-005: clear', () => {
    it('TC-EVENT-005-01: clear with specific event should remove only that event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('graphic-added', handler1);
      eventBus.on('graphic-removed', handler2);

      eventBus.clear('graphic-added');

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });
      eventBus.emit('graphic-removed', { graphicId: 'g-1', pageId: 'page-1' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('TC-EVENT-005-02: clear without argument should remove all events', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('graphic-added', handler1);
      eventBus.on('page-switched', handler2);

      eventBus.clear();

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });
      eventBus.emit('page-switched', { pageId: 'page-1', projectId: 'project-1' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('TC-EVENT-005-03: clear should also remove once listeners', () => {
      const handler = vi.fn();
      eventBus.once('graphic-added', handler);
      eventBus.clear('graphic-added');

      eventBus.emit('graphic-added', { graphic: {} as any, pageId: 'page-1' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ==================== TC-EVENT-006: getListenerCount ====================
  describe('TC-EVENT-006: getListenerCount', () => {
    it('TC-EVENT-006-01: should return correct count for on handlers', () => {
      expect(eventBus.getListenerCount('graphic-added')).toBe(0);

      eventBus.on('graphic-added', vi.fn());
      expect(eventBus.getListenerCount('graphic-added')).toBe(1);

      eventBus.on('graphic-added', vi.fn());
      expect(eventBus.getListenerCount('graphic-added')).toBe(2);
    });

    it('TC-EVENT-006-02: should include once handlers in count', () => {
      eventBus.on('graphic-added', vi.fn());
      eventBus.once('graphic-added', vi.fn());

      expect(eventBus.getListenerCount('graphic-added')).toBe(2);
    });

    it('TC-EVENT-006-03: should return 0 for non-existent event', () => {
      expect(eventBus.getListenerCount('non-existent' as any)).toBe(0);
    });
  });

  // ==================== TC-EVENT-007: getActiveEvents ====================
  describe('TC-EVENT-007: getActiveEvents', () => {
    it('TC-EVENT-007-01: should return events with active listeners', () => {
      eventBus.on('graphic-added', vi.fn());
      eventBus.on('page-switched', vi.fn());

      const active = eventBus.getActiveEvents();

      expect(active).toContain('graphic-added');
      expect(active).toContain('page-switched');
      expect(active).not.toContain('graphic-removed');
    });

    it('TC-EVENT-007-02: should include events with both on and once listeners', () => {
      // Note: getActiveEvents only iterates over listeners keys, not onceListeners
      // So events with only once listeners won't appear without a regular listener
      eventBus.once('graphic-added', vi.fn());
      eventBus.on('graphic-added', vi.fn()); // Add both to ensure visibility

      const active = eventBus.getActiveEvents();

      expect(active).toContain('graphic-added');
    });

    it('TC-EVENT-007-03: should return empty array when no listeners', () => {
      const active = eventBus.getActiveEvents();

      expect(active).toEqual([]);
    });
  });

  // ==================== TC-EVENT-008: Throttle ====================
  describe('TC-EVENT-008: Throttle', () => {
    it('TC-EVENT-008-01: should configure throttle for an event', () => {
      eventBus.configureThrottle('graphic-moved', 100);
      expect(eventBus.getThrottleInterval('graphic-moved')).toBe(100);
    });

    it('TC-EVENT-008-02: should throttle events within the interval', () => {
      const handler = vi.fn();
      eventBus.on('graphic-moved', handler);
      eventBus.configureThrottle('graphic-moved', 1000);

      // First emit should go through
      eventBus.emit('graphic-moved', { graphicId: 'g-1', x: 0, y: 0, pageId: 'page-1' });
      expect(handler).toHaveBeenCalledTimes(1);

      // Second emit within throttle window should be skipped
      eventBus.emit('graphic-moved', { graphicId: 'g-1', x: 10, y: 10, pageId: 'page-1' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('TC-EVENT-008-03: should disable throttle with interval <= 0', () => {
      eventBus.configureThrottle('graphic-moved', 100);
      expect(eventBus.getThrottleInterval('graphic-moved')).toBe(100);

      eventBus.configureThrottle('graphic-moved', 0);
      expect(eventBus.getThrottleInterval('graphic-moved')).toBeUndefined();
    });

    it('TC-EVENT-008-04: should disable throttle with negative interval', () => {
      eventBus.configureThrottle('graphic-moved', 100);
      eventBus.configureThrottle('graphic-moved', -1);
      expect(eventBus.getThrottleInterval('graphic-moved')).toBeUndefined();
    });

    it('TC-EVENT-008-05: getThrottleInterval should return undefined for non-configured event', () => {
      expect(eventBus.getThrottleInterval('graphic-selected')).toBeUndefined();
    });

    it('TC-EVENT-008-06: clearThrottle should remove all throttle configs', () => {
      eventBus.configureThrottle('graphic-moved', 100);
      eventBus.configureThrottle('graphic-resized', 50);

      eventBus.clearThrottle();

      expect(eventBus.getThrottleInterval('graphic-moved')).toBeUndefined();
      expect(eventBus.getThrottleInterval('graphic-resized')).toBeUndefined();
    });
  });

  // ==================== TC-EVENT-009: Different Event Types ====================
  describe('TC-EVENT-009: Different Event Types', () => {
    it('TC-EVENT-009-01: should handle undo/redo events', () => {
      const undoHandler = vi.fn();
      const redoHandler = vi.fn();

      eventBus.on('undo', undoHandler);
      eventBus.on('redo', redoHandler);

      eventBus.emit('undo', {});
      eventBus.emit('redo', {});

      expect(undoHandler).toHaveBeenCalledWith({});
      expect(redoHandler).toHaveBeenCalledWith({});
    });

    it('TC-EVENT-009-02: should handle group events', () => {
      const handler = vi.fn();

      eventBus.on('group-created', handler);

      const payload = { groupId: 'group-1', memberIds: ['g-1', 'g-2'] };
      eventBus.emit('group-created', payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('TC-EVENT-009-03: should handle canvas events', () => {
      const handler = vi.fn();

      eventBus.on('canvas-zoomed', handler);

      const payload = { scale: 1.5, centerX: 400, centerY: 300 };
      eventBus.emit('canvas-zoomed', payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('TC-EVENT-009-04: should handle selection events', () => {
      const handler = vi.fn();

      eventBus.on('selection-changed', handler);

      const payload = { selectedIds: ['g-1', 'g-2'], pageId: 'page-1' };
      eventBus.emit('selection-changed', payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });
  });
});

// ==================== EventBus Tests (via global singleton) ====================
describe('EventBus (global singleton)', () => {
  const eventBus = globalEventBus;

  beforeEach(() => {
    eventBus.clear();
  });

  // ==================== TC-EVENT-010: on/emit ====================
  describe('TC-EVENT-010: on and emit', () => {
    it('TC-EVENT-010-01: should register and emit events', () => {
      const callback = vi.fn();
      eventBus.on('test', callback);

      eventBus.emit('test', { value: 'data' });

      expect(callback).toHaveBeenCalledWith({ value: 'data' });
    });

    it('TC-EVENT-010-02: should support multiple handlers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      eventBus.on('test', callback1);
      eventBus.on('test', callback2);

      eventBus.emit('test', { value: 'data' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('TC-EVENT-010-03: should not call handlers for different events', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      eventBus.on('event1', callback1);
      eventBus.on('event2', callback2);

      eventBus.emit('event1', { value: 'data' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('TC-EVENT-010-04: should handle emit with no data', () => {
      const callback = vi.fn();
      eventBus.on('test', callback);

      eventBus.emit('test');

      expect(callback).toHaveBeenCalledWith(undefined);
    });
  });

  // ==================== TC-EVENT-011: off ====================
  describe('TC-EVENT-011: off', () => {
    it('TC-EVENT-011-01: should remove specific handler', () => {
      const callback = vi.fn();
      eventBus.on('test', callback);
      eventBus.off('test', callback);

      eventBus.emit('test', { value: 'data' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('TC-EVENT-011-02: should not affect other handlers when removing', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      eventBus.on('test', callback1);
      eventBus.on('test', callback2);

      eventBus.off('test', callback1);

      eventBus.emit('test', { value: 'data' });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('TC-EVENT-011-03: should not throw when removing non-existent handler', () => {
      expect(() => {
        eventBus.off('test', vi.fn());
      }).not.toThrow();
    });
  });

  // ==================== TC-EVENT-012: once ====================
  describe('TC-EVENT-012: once', () => {
    it('TC-EVENT-012-01: once should trigger only once', () => {
      const callback = vi.fn();
      eventBus.once('test', callback);

      eventBus.emit('test', 'data1');
      eventBus.emit('test', 'data2');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('data1');
    });

    it('TC-EVENT-012-02: once should auto-unsubscribe after first emit', () => {
      const callback = vi.fn();
      eventBus.once('test', callback);

      eventBus.emit('test', 'data');
      expect(eventBus.getEventCount('test')).toBe(0);
    });
  });

  // ==================== TC-EVENT-013: clear ====================
  describe('TC-EVENT-013: clear', () => {
    it('TC-EVENT-013-01: should clear all events', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());
      eventBus.on('event3', vi.fn());

      eventBus.clear();

      expect(eventBus.getEventCount('event1')).toBe(0);
      expect(eventBus.getEventCount('event2')).toBe(0);
      expect(eventBus.getEventCount('event3')).toBe(0);
    });
  });

  // ==================== TC-EVENT-014: getEventCount ====================
  describe('TC-EVENT-014: getEventCount', () => {
    it('TC-EVENT-014-01: should return correct count', () => {
      expect(eventBus.getEventCount('test')).toBe(0);

      eventBus.on('test', vi.fn());
      expect(eventBus.getEventCount('test')).toBe(1);

      eventBus.on('test', vi.fn());
      expect(eventBus.getEventCount('test')).toBe(2);
    });

    it('TC-EVENT-014-02: should return 0 for non-existent event', () => {
      expect(eventBus.getEventCount('non-existent')).toBe(0);
    });
  });

  // ==================== TC-EVENT-015: Error Handling ====================
  describe('TC-EVENT-015: Error Handling', () => {
    it('TC-EVENT-015-01: error in one callback should not affect others', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.on('test', errorCallback);
      eventBus.on('test', normalCallback);

      eventBus.emit('test', 'data');

      expect(normalCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});