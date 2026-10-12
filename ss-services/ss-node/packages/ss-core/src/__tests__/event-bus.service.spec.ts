// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { EventBusService } from '../event-bus/event-bus.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

type MockEventEmitter = Partial<Record<keyof EventEmitter2, jest.Mock>>;

function createMockEventEmitter(): MockEventEmitter {
  return {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  };
}

describe('EventBusService', () => {
  let service: EventBusService;
  let mockEmitter: MockEventEmitter;

  beforeEach(() => {
    mockEmitter = createMockEventEmitter();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new EventBusService(mockEmitter as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('emit', () => {
    it('should call eventEmitter.emit with event type and payload', () => {
      const payload = { tagId: 'tag-1', value: 42 };
      service.emit('data_point_changed', payload);

      expect(mockEmitter.emit).toHaveBeenCalledWith('data_point_changed', payload);
    });

    it('should pass data to listeners', () => {
      const payload = { tagId: 'tag-1', value: 100 };
      service.emit('tag.change', payload);

      expect(mockEmitter.emit).toHaveBeenCalledWith('tag.change', payload);
    });

    it('should handle errors in emit gracefully', () => {
      mockEmitter.emit.mockImplementation(() => {
        throw new Error('emit error');
      });

      expect(() => service.emit('config_changed', {})).not.toThrow();
    });

    it('should not throw when no listeners registered', () => {
      expect(() => service.emit('data_point_changed', {})).not.toThrow();
      expect(mockEmitter.emit).toHaveBeenCalled();
    });
  });

  describe('emitDataPointChanged', () => {
    it('should emit data_point_changed event', () => {
      const event = {
        tagId: 't1',
        deviceId: 'd1',
        projectId: 'p1',
        value: 1,
        timestamp: 0,
        quality: 'good',
      };
      service.emitDataPointChanged(event);
      expect(mockEmitter.emit).toHaveBeenCalledWith('data_point_changed', event);
    });
  });

  describe('emitDeviceStatusChanged', () => {
    it('should emit device_status_changed event', () => {
      const event = { deviceId: 'd1', projectId: 'p1', status: 'online' as const, timestamp: 0 };
      service.emitDeviceStatusChanged(event);
      expect(mockEmitter.emit).toHaveBeenCalledWith('device_status_changed', event);
    });
  });

  describe('on', () => {
    it('should register a listener on eventEmitter', () => {
      const handler = jest.fn();
      service.on('data_point_changed', handler);

      expect(mockEmitter.on).toHaveBeenCalledWith('data_point_changed', handler);
    });

    it('should register multiple listeners for same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      service.on('data_point_changed', handler1);
      service.on('data_point_changed', handler2);

      expect(mockEmitter.on).toHaveBeenCalledTimes(2);
    });
  });

  describe('once', () => {
    it('should register a one-time listener', () => {
      const handler = jest.fn();
      service.once('alarm_triggered', handler);

      expect(mockEmitter.once).toHaveBeenCalledWith('alarm_triggered', handler);
    });
  });

  describe('off', () => {
    it('should remove a specific listener', () => {
      const handler = jest.fn();
      service.on('data_point_changed', handler);
      service.off('data_point_changed', handler);

      expect(mockEmitter.off).toHaveBeenCalledWith('data_point_changed', handler);
    });

    it('should remove all listeners for event when no handler provided', () => {
      service.off('data_point_changed');

      expect(mockEmitter.removeAllListeners).toHaveBeenCalledWith('data_point_changed');
    });
  });

  describe('removeAllListeners', () => {
    it('should clear all listeners for specific event', () => {
      service.removeAllListeners('data_point_changed');

      expect(mockEmitter.removeAllListeners).toHaveBeenCalledWith('data_point_changed');
    });

    it('should clear all listeners when no event type provided', () => {
      service.removeAllListeners();

      expect(mockEmitter.removeAllListeners).toHaveBeenCalledWith();
    });
  });

  describe('listenerCount', () => {
    it('should return 0 when no listeners registered', () => {
      expect(service.getListenerCount('data_point_changed')).toBe(0);
    });

    it('should return correct count for specific event', () => {
      service.on('data_point_changed', jest.fn());
      service.on('data_point_changed', jest.fn());

      expect(service.getListenerCount('data_point_changed')).toBe(2);
    });

    it('should return total count when no event type provided', () => {
      service.on('data_point_changed', jest.fn());
      service.on('alarm_triggered', jest.fn());

      expect(service.getListenerCount()).toBe(2);
    });

    it('should return 0 for non-existent event type', () => {
      expect(service.getListenerCount('non_existent')).toBe(0);
    });
  });

  describe('emit error handling', () => {
    it('should log error when emit throws', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      mockEmitter.emit.mockImplementation(() => {
        throw new Error('emit failure');
      });

      service.emit('data_point_changed', {});
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ===== emit 钩子机制（#6 事件持久化） =====

  describe('registerEmitHook', () => {
    it('should register hook and call it on emit (sync)', () => {
      const hook = jest.fn();
      service.registerEmitHook(hook);

      const payload = { deviceId: 'd1', projectId: 'p1' };
      service.emit('device.created', payload);

      expect(hook).toHaveBeenCalledWith('device.created', payload);
    });

    it('should return unregister function', () => {
      const hook = jest.fn();
      const unregister = service.registerEmitHook(hook);

      service.emit('device.created', {});
      expect(hook).toHaveBeenCalledTimes(1);

      unregister();
      service.emit('device.created', {});
      expect(hook).toHaveBeenCalledTimes(1); // 不再调用
    });

    it('should call multiple hooks on emit', () => {
      const hook1 = jest.fn();
      const hook2 = jest.fn();
      service.registerEmitHook(hook1);
      service.registerEmitHook(hook2);

      service.emit('config_changed', { key: 'val' });

      expect(hook1).toHaveBeenCalledWith('config_changed', { key: 'val' });
      expect(hook2).toHaveBeenCalledWith('config_changed', { key: 'val' });
    });

    it('should not block emit when a hook throws synchronously', () => {
      const badHook = jest.fn().mockImplementation(() => {
        throw new Error('hook crash');
      });
      const goodHook = jest.fn();
      service.registerEmitHook(badHook);
      service.registerEmitHook(goodHook);

      expect(() => service.emit('device.created', {})).not.toThrow();
      // 好钩子仍然被调用
      expect(goodHook).toHaveBeenCalled();
      // eventEmitter.emit 也被调用
      expect(mockEmitter.emit).toHaveBeenCalled();
    });

    it('should not block emit when an async hook rejects', async () => {
      const badAsyncHook = jest.fn().mockRejectedValue(new Error('async hook fail'));
      service.registerEmitHook(badAsyncHook);

      expect(() => service.emit('device.created', {})).not.toThrow();
      // 等待微任务刷新（rejected Promise 的 .catch 已注册）
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  describe('emitAsync', () => {
    beforeEach(() => {
      // emitAsync 需要 emitAsync 方法
      (mockEmitter as any).emitAsync = jest.fn();
    });

    it('should call eventEmitter.emitAsync with event type and payload', async () => {
      (mockEmitter as any).emitAsync.mockResolvedValue(undefined);

      const payload = { deviceId: 'd1', projectId: 'p1' };
      await service.emitAsync('device.created', payload);

      expect((mockEmitter as any).emitAsync).toHaveBeenCalledWith('device.created', payload);
    });

    it('should await async emit hooks before calling subscribers', async () => {
      const hookCallOrder: string[] = [];
      const asyncHook = jest.fn().mockImplementation(async () => {
        hookCallOrder.push('hook-start');
        await Promise.resolve();
        hookCallOrder.push('hook-end');
      });
      service.registerEmitHook(asyncHook);

      (mockEmitter as any).emitAsync.mockImplementation(() => {
        hookCallOrder.push('subscribers');
        return Promise.resolve();
      });

      await service.emitAsync('device.created', {});

      // 钩子必须在订阅者之前完成
      expect(hookCallOrder).toEqual(['hook-start', 'hook-end', 'subscribers']);
    });

    it('should handle errors in emitAsync gracefully', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (mockEmitter as any).emitAsync.mockRejectedValue(new Error('async emit fail'));

      await expect(service.emitAsync('device.created', {})).resolves.not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should not block when an async hook rejects (await version)', async () => {
      const badHook = jest.fn().mockRejectedValue(new Error('async hook fail'));
      const goodHook = jest.fn().mockResolvedValue(undefined);
      service.registerEmitHook(badHook);
      service.registerEmitHook(goodHook);

      (mockEmitter as any).emitAsync.mockResolvedValue(undefined);

      await service.emitAsync('device.created', {});

      // 两个钩子都被调用
      expect(badHook).toHaveBeenCalled();
      expect(goodHook).toHaveBeenCalled();
      // emitAsync 也被调用
      expect((mockEmitter as any).emitAsync).toHaveBeenCalled();
    });
  });
});
