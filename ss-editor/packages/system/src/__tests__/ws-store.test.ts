// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const mockSocket = {
  connected: false,
  on: vi.fn(),
  emit: vi.fn(),
  removeAllListeners: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock('../api/client', () => ({
  getToken: vi.fn(() => 'test-token-123'),
}));

const mockT = vi.hoisted(() => {
  return (key: string, params?: any) => {
    const messages: Record<string, string> = {
      'system.ws.notLoggedIn': 'Not logged in, cannot connect to WebSocket',
      'system.ws.authFailed': 'WebSocket authentication failed',
      'system.ws.serverDisconnected': 'Server actively disconnected',
      'system.ws.connectFailed': '连接失败: {message}',
      'system.ws.connectionRejected': '连接被拒绝: {reason}',
    };
    if (messages[key]) {
      let msg = messages[key];
      if (params) {
        for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
          msg = msg.replace(`{${k}}`, String(v));
        }
      }
      return msg;
    }
    return key;
  };
});

vi.mock('@scada-editor/core', () => ({
  useI18n: () => ({ t: mockT }),
  i18n: { global: { t: mockT } },
  ScadaDataManager: {
    eventBus: { emit: vi.fn() },
  },
}));

import { useWsStore } from '../stores/ws.store';

describe('useWsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockSocket.connected = false;
    // Mock requestAnimationFrame 同步执行，确保 WS 批处理在测试中立即生效
    // 必须在 clearAllMocks 之后设置，否则会被清除
    let rafIdCounter = 0;
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      const id = ++rafIdCounter;
      cb(0);
      return id;
    }) as any;
    globalThis.cancelAnimationFrame = vi.fn() as any;
  });

  describe('initial state', () => {
    it('should have disconnected status', () => {
      const store = useWsStore();
      expect(store.connectionStatus).toBe('disconnected');
      expect(store.isConnected).toBe(false);
    });

    it('should have empty subscriptions', () => {
      const store = useWsStore();
      expect(store.subscribedTags.size).toBe(0);
      expect(store.subscribedProjectId).toBeNull();
    });

    it('should have empty tag values', () => {
      const store = useWsStore();
      expect(store.tagValues.size).toBe(0);
    });

    it('should have null error', () => {
      const store = useWsStore();
      expect(store.error).toBeNull();
    });

    it('should have empty device statuses', () => {
      const store = useWsStore();
      expect(store.deviceStatuses.size).toBe(0);
    });

    it('should have empty active alarms', () => {
      const store = useWsStore();
      expect(store.activeAlarms.size).toBe(0);
    });

    it('should have empty system messages', () => {
      const store = useWsStore();
      expect(store.systemMessages.length).toBe(0);
    });

    it('should have null lastPongAt', () => {
      const store = useWsStore();
      expect(store.lastPongAt).toBeNull();
    });
  });

  describe('connect', () => {
    it('should set status to connecting and call io', async () => {
      const { io } = await import('socket.io-client');

      const store = useWsStore();
      store.connect('proj-1');

      expect(store.connectionStatus).toBe('connecting');
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transports: ['websocket', 'polling'],
          auth: expect.objectContaining({ token: 'test-token-123' }),
        }),
      );
    });

    it('should subscribe project on connected event', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      expect(connectHandler).toBeDefined();

      mockSocket.connected = true;
      connectHandler[1]();

      expect(store.connectionStatus).toBe('connected');
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:project', { projectId: 'proj-1' });
      expect(store.subscribedProjectId).toBe('proj-1');
    });

    it('should switch project if already connected to different project', () => {
      const store = useWsStore();

      mockSocket.connected = true;
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      connectHandler[1]();
      expect(store.subscribedProjectId).toBe('proj-1');

      mockSocket.emit.mockClear();
      store.connect('proj-2');

      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe:project', { projectId: 'proj-1' });
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:project', { projectId: 'proj-2' });
      expect(store.subscribedProjectId).toBe('proj-2');
    });

    it('should set error when no token available', async () => {
      const { getToken } = await import('../api/client');
      (getToken as any).mockReturnValueOnce(null);

      // 调试免登录兜底（import.meta.env.DEV → debug-mock-token）会使无 token 路径
      // 不可达，测试需临时关闭 DEV 模式以验证原始错误分支（见 stores/ws.store.ts）
      const originalDev = import.meta.env.DEV;
      (import.meta.env as { DEV: boolean }).DEV = false;
      try {
        const store = useWsStore();
        store.connect('proj-1');

        expect(store.error).toBe('Not logged in, cannot connect to WebSocket');
      } finally {
        (import.meta.env as { DEV: boolean }).DEV = originalDev;
      }
    });
  });

  describe('disconnect', () => {
    it('should clear connection and reset state', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();
      store.subscribeTags(['tag-1', 'tag-2']);

      expect(store.isConnected).toBe(true);
      expect(store.subscribedTags.size).toBe(2);

      store.disconnect();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(store.connectionStatus).toBe('disconnected');
      expect(store.subscribedProjectId).toBeNull();
      expect(store.subscribedTags.size).toBe(0);
      expect(store.tagValues.size).toBe(0);
      expect(store.error).toBeNull();
    });

    it('should be safe to call disconnect when not connected', () => {
      const store = useWsStore();
      expect(() => store.disconnect()).not.toThrow();
    });
  });

  describe('subscribeTags', () => {
    it('should add tag IDs to subscription list and emit event', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();

      mockSocket.emit.mockClear();
      store.subscribeTags(['tag-1', 'tag-2']);

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:tag', { tagIds: ['tag-1', 'tag-2'] });
      expect(store.subscribedTags.has('tag-1')).toBe(true);
      expect(store.subscribedTags.has('tag-2')).toBe(true);
    });

    it('should not emit when not connected', () => {
      const store = useWsStore();
      mockSocket.emit.mockClear();
      store.subscribeTags(['tag-1']);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should not emit when tagIds is empty', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();
      mockSocket.emit.mockClear();

      store.subscribeTags([]);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeTags', () => {
    it('should remove tag IDs from subscription set', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();
      store.subscribeTags(['tag-1', 'tag-2', 'tag-3']);

      store.unsubscribeTags(['tag-2']);

      expect(store.subscribedTags.has('tag-1')).toBe(true);
      expect(store.subscribedTags.has('tag-2')).toBe(false);
      expect(store.subscribedTags.has('tag-3')).toBe(true);
    });

    it('should handle unsubscribing non-existent tags gracefully', () => {
      const store = useWsStore();
      expect(() => store.unsubscribeTags(['nonexistent'])).not.toThrow();
      expect(store.subscribedTags.size).toBe(0);
    });
  });

  describe('joinProject / leaveProject', () => {
    it('should subscribe to project via connect event', async () => {
      const store = useWsStore();
      store.connect('proj-test');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:project', { projectId: 'proj-test' });
      expect(store.subscribedProjectId).toBe('proj-test');
    });
  });

  describe('status tracking', () => {
    it('should track connecting → connected transition', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      expect(store.connectionStatus).toBe('connecting');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();

      expect(store.connectionStatus).toBe('connected');
      expect(store.isConnected).toBe(true);
    });

    it('should track connected → disconnected transition', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();

      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'disconnect',
      );
      disconnectHandler[1]('io client disconnect');

      expect(store.connectionStatus).toBe('disconnected');
      expect(store.isConnected).toBe(false);
    });

    it('should set error on server disconnect', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'disconnect',
      );
      disconnectHandler[1]('io server disconnect');

      expect(store.error).toBe('Server actively disconnected');
    });
  });

  describe('event callbacks', () => {
    it('should update tag value on data:update event', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data:update',
      );
      expect(handler).toBeDefined();

      handler[1]({
        tagId: 'tag-1',
        tagName: 'Temperature',
        value: 25.5,
        quality: 'good',
        timestamp: 1700000000000,
      });

      const tagVal = store.tagValues.get('tag-1');
      expect(tagVal).toBeDefined();
      expect(tagVal?.value).toBe(25.5);
      expect(tagVal?.tagName).toBe('Temperature');
      expect(tagVal?.quality).toBe('good');
    });

    it('should handle data:batch event with multiple tags', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data:batch',
      );
      expect(handler).toBeDefined();

      handler[1]({
        data: [
          { tagId: 'tag-1', tagName: 'T1', value: 10, quality: 'good', timestamp: 1000 },
          { tagId: 'tag-2', tagName: 'T2', value: 20, quality: 'good', timestamp: 1000 },
          { tagId: 'tag-3', tagName: 'T3', value: 30, quality: 'uncertain', timestamp: 1000 },
        ],
      });

      expect(store.tagValues.size).toBe(3);
      expect(store.tagValues.get('tag-1')?.value).toBe(10);
      expect(store.tagValues.get('tag-2')?.value).toBe(20);
      expect(store.tagValues.get('tag-3')?.quality).toBe('uncertain');
    });

    it('should ignore data:update without tagId', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data:update',
      );
      handler[1]({ value: 42 });

      expect(store.tagValues.size).toBe(0);
    });

    it('should handle device:statusChange event', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'device:statusChange',
      );
      expect(handler).toBeDefined();

      handler[1]({
        deviceId: 'dev-1',
        fromStatus: 'offline',
        toStatus: 'online',
        timestamp: '2026-07-17T10:00:00.000Z',
      });

      const status = store.deviceStatuses.get('dev-1');
      expect(status).toBeDefined();
      expect(status?.toStatus).toBe('online');
      expect(status?.fromStatus).toBe('offline');
      expect(status?.timestamp).toBe('2026-07-17T10:00:00.000Z');
    });

    it('should ignore device:statusChange without deviceId', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'device:statusChange',
      );
      handler[1]({ fromStatus: 'offline', toStatus: 'online' });

      expect(store.deviceStatuses.size).toBe(0);
    });

    it('should handle alarm:trigger event', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'alarm:trigger',
      );
      expect(handler).toBeDefined();

      handler[1]({
        alarmId: 'alarm-1',
        ruleName: '高温报警',
        tagName: 'temperature',
        level: 'critical',
        value: 95.5,
        message: '温度超过阈值',
        timestamp: '2026-07-17T10:00:00.000Z',
      });

      const alarm = store.activeAlarms.get('alarm-1');
      expect(alarm).toBeDefined();
      expect(alarm?.ruleName).toBe('高温报警');
      expect(alarm?.level).toBe('critical');
      expect(alarm?.value).toBe(95.5);
      expect(alarm?.state).toBe('active');
    });

    it('should ignore alarm:trigger without alarmId', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'alarm:trigger',
      );
      handler[1]({ level: 'critical', message: 'test' });

      expect(store.activeAlarms.size).toBe(0);
    });
  });

  describe('alarm lifecycle events', () => {
    it('should update alarm state to acknowledged on alarm:acknowledged', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      // 先触发报警
      const triggerHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'alarm:trigger',
      );
      triggerHandler[1]({
        alarmId: 'alarm-1',
        ruleName: '高温',
        tagName: 'temp',
        level: 'critical',
        value: 95,
        message: 'over threshold',
        timestamp: '2026-07-17T10:00:00.000Z',
      });
      expect(store.activeAlarms.get('alarm-1')?.state).toBe('active');

      // 确认报警
      const ackHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'alarm:acknowledged',
      );
      expect(ackHandler).toBeDefined();
      ackHandler[1]({
        alarmId: 'alarm-1',
        acknowledgedBy: 'admin',
        timestamp: '2026-07-17T10:01:00.000Z',
      });

      const alarm = store.activeAlarms.get('alarm-1');
      expect(alarm?.state).toBe('acknowledged');
      expect(alarm?.acknowledgedBy).toBe('admin');
    });

    it('should update alarm state to cleared on alarm:cleared', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const triggerHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'alarm:trigger',
      );
      triggerHandler[1]({
        alarmId: 'alarm-2',
        ruleName: '低温',
        tagName: 'temp',
        level: 'warning',
        value: 5,
        message: 'low',
        timestamp: '2026-07-17T10:00:00.000Z',
      });

      const clearHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'alarm:cleared',
      );
      expect(clearHandler).toBeDefined();
      clearHandler[1]({
        alarmId: 'alarm-2',
        clearedBy: 'system',
        timestamp: '2026-07-17T10:05:00.000Z',
      });

      const alarm = store.activeAlarms.get('alarm-2');
      expect(alarm?.state).toBe('cleared');
      expect(alarm?.clearedBy).toBe('system');
    });

    it('should ignore alarm:acknowledged for unknown alarmId', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const ackHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'alarm:acknowledged',
      );
      ackHandler[1]({ alarmId: 'unknown', acknowledgedBy: 'admin' });

      expect(store.activeAlarms.size).toBe(0);
    });
  });

  describe('system broadcast & connection error', () => {
    it('should store system broadcast messages', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'system:broadcast',
      );
      expect(handler).toBeDefined();

      handler[1]({
        message: '系统即将维护',
        data: { duration: 30 },
        timestamp: '2026-07-17T10:00:00.000Z',
      });

      expect(store.systemMessages.length).toBe(1);
      expect(store.systemMessages[0].message).toBe('系统即将维护');
      expect(store.systemMessages[0].data).toEqual({ duration: 30 });
    });

    it('should keep only last 50 system messages', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'system:broadcast',
      );

      for (let i = 0; i < 55; i++) {
        handler[1]({ message: `msg-${i}`, timestamp: `2026-07-17T10:00:${i.toString().padStart(2, '0')}.000Z` });
      }

      expect(store.systemMessages.length).toBe(50);
      expect(store.systemMessages[0].message).toBe('msg-5');
      expect(store.systemMessages[49].message).toBe('msg-54');
    });

    it('should ignore system:broadcast without message', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'system:broadcast',
      );
      handler[1]({ data: { foo: 1 } });

      expect(store.systemMessages.length).toBe(0);
    });

    it('should set error on connection:error event', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection:error',
      );
      expect(handler).toBeDefined();

      handler[1]({ reason: 'too many connections' });

      expect(store.error).toBe('连接被拒绝: too many connections');
    });

    it('should update lastPongAt on pong event', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'pong',
      );
      expect(handler).toBeDefined();

      handler[1]({ message: 'Pong', timestamp: '2026-07-17T10:00:00.000Z', connections: 5 });

      expect(store.lastPongAt).toBe('2026-07-17T10:00:00.000Z');
    });
  });

  describe('heartbeat', () => {
    it('should start heartbeat on connect', async () => {
      vi.useFakeTimers();
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();

      mockSocket.emit.mockClear();
      // 推进 25s 触发心跳
      vi.advanceTimersByTime(25000);

      expect(mockSocket.emit).toHaveBeenCalledWith('ping', {});

      vi.useRealTimers();
    });

    it('should stop heartbeat on disconnect', async () => {
      vi.useFakeTimers();
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();

      store.disconnect();

      mockSocket.emit.mockClear();
      vi.advanceTimersByTime(30000);

      expect(mockSocket.emit).not.toHaveBeenCalledWith('ping', {});

      vi.useRealTimers();
    });

    it('should stop heartbeat on disconnect event', async () => {
      vi.useFakeTimers();
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();

      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'disconnect',
      );
      disconnectHandler[1]('transport close');

      mockSocket.emit.mockClear();
      vi.advanceTimersByTime(30000);

      expect(mockSocket.emit).not.toHaveBeenCalledWith('ping', {});

      vi.useRealTimers();
    });
  });

  describe('error state', () => {
    it('should set error flag on connection failure', async () => {
      const store = useWsStore();
      // connect_error 会 reject connect Promise，测试需捕获避免 unhandled rejection
      store.connect('proj-1').catch(() => void 0);

      const errorHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect_error',
      );
      expect(errorHandler).toBeDefined();

      errorHandler[1]({ message: 'Connection refused' });

      expect(store.connectionStatus).toBe('error');
      expect(store.error).toBe('连接失败: Connection refused');
    });

    it('should increment reconnect attempts', async () => {
      const store = useWsStore();
      store.connect('proj-1').catch(() => void 0);

      const errorHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect_error',
      );
      errorHandler[1]({ message: 'timeout' });
      errorHandler[1]({ message: 'timeout' });
      errorHandler[1]({ message: 'timeout' });
    });

    it('should handle auth failure on connection event', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const connHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection',
      );
      expect(connHandler).toBeDefined();

      connHandler[1]({ authenticated: false });

      expect(store.error).toBe('WebSocket authentication failed');
    });

    it('should clear error via clearError', async () => {
      const store = useWsStore();
      store.connect('proj-1').catch(() => void 0);

      const errorHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect_error',
      );
      errorHandler[1]({ message: 'error' });

      expect(store.error).toBeTruthy();
      store.clearError();
      expect(store.error).toBeNull();
    });
  });

  describe('cleanup on disconnect', () => {
    it('should clear all subscriptions on disconnect', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();
      store.subscribeTags(['tag-1', 'tag-2', 'tag-3']);

      expect(store.subscribedTags.size).toBe(3);

      store.disconnect();

      expect(store.subscribedTags.size).toBe(0);
      expect(store.subscribedProjectId).toBeNull();
    });

    it('should clear device statuses, alarms, and system messages on disconnect', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      // 填充数据
      const deviceHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'device:statusChange',
      );
      deviceHandler[1]({ deviceId: 'dev-1', fromStatus: 'offline', toStatus: 'online', timestamp: '2026-07-17T10:00:00.000Z' });

      const alarmHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'alarm:trigger',
      );
      alarmHandler[1]({ alarmId: 'a-1', ruleName: 'r', tagName: 't', level: 'critical', value: 1, message: 'm', timestamp: '2026-07-17T10:00:00.000Z' });

      const sysHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'system:broadcast',
      );
      sysHandler[1]({ message: 'test', timestamp: '2026-07-17T10:00:00.000Z' });

      const pongHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'pong',
      );
      pongHandler[1]({ timestamp: '2026-07-17T10:00:00.000Z' });

      expect(store.deviceStatuses.size).toBe(1);
      expect(store.activeAlarms.size).toBe(1);
      expect(store.systemMessages.length).toBe(1);
      expect(store.lastPongAt).not.toBeNull();

      store.disconnect();

      expect(store.deviceStatuses.size).toBe(0);
      expect(store.activeAlarms.size).toBe(0);
      expect(store.systemMessages.length).toBe(0);
      expect(store.lastPongAt).toBeNull();
    });
  });

  describe('getTagValue', () => {
    it('should return tag value by id', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data:update',
      );
      handler[1]({ tagId: 'tag-1', value: 42, quality: 'good' });

      expect(store.getTagValue('tag-1')).toBe(42);
    });

    it('should return null for unknown tag', () => {
      const store = useWsStore();
      expect(store.getTagValue('unknown')).toBeNull();
    });
  });

  describe('updateTagValue', () => {
    it('should manually set tag value', () => {
      const store = useWsStore();
      store.updateTagValue('tag-1', 99);

      const tagVal = store.tagValues.get('tag-1');
      expect(tagVal?.value).toBe(99);
      expect(tagVal?.quality).toBe('good');
    });
  });

  describe('subscribeDevice', () => {
    it('should emit subscribe:device when connected', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      mockSocket.connected = true;
      connectHandler[1]();
      mockSocket.emit.mockClear();

      store.subscribeDevice('dev-1');

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:device', { deviceId: 'dev-1' });
    });
  });

  describe('tagFlushVersion', () => {
    it('should start at 0', () => {
      const store = useWsStore();
      expect(store.tagFlushVersion).toBe(0);
    });

    it('should increment on data:update event', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data:update',
      );
      expect(handler).toBeDefined();

      handler[1]({
        tagId: 'tag-1',
        value: 25.5,
        quality: 'good',
        timestamp: 1700000000000,
      });

      // requestAnimationFrame mock 同步执行，flushTagUpdates 已触发
      expect(store.tagFlushVersion).toBe(1);
    });

    it('tagFlushVersion should increment and tagValues should be populated', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data:update',
      );

      // 单条 data:update → flush → 版本号 +1
      handler[1]({ tagId: 'tag-1', value: 25.5, quality: 'good', timestamp: 1000 });
      expect(store.tagFlushVersion).toBe(1);
      expect(store.tagValues.size).toBe(1);
      expect(store.tagValues.get('tag-1')?.value).toBe(25.5);
      expect(store.tagValues.get('tag-1')?.quality).toBe('good');

      // 更新已存在的 tag（值变化）→ flush → 版本号再 +1
      handler[1]({ tagId: 'tag-1', value: 30, quality: 'good', timestamp: 2000 });
      expect(store.tagFlushVersion).toBe(2);
      expect(store.tagValues.get('tag-1')?.value).toBe(30);
    });

    it('should increment when batch data:batch is pushed', async () => {
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data:batch',
      );
      expect(handler).toBeDefined();

      // 一次批量推送多个 tag
      handler[1]({
        data: [
          { tagId: 'tag-1', value: 42, quality: 'good', timestamp: 1 },
          { tagId: 'tag-2', value: 43, quality: 'good', timestamp: 2 },
        ],
      });

      // 一次 flush 处理，版本号递增 1，tagValues 有 2 个条目
      expect(store.tagFlushVersion).toBe(1);
      expect(store.tagValues.size).toBe(2);
      expect(store.tagValues.get('tag-1')?.value).toBe(42);
      expect(store.tagValues.get('tag-2')?.value).toBe(43);
    });

    it('should emit tagValueChanged via ScadaDataManager.eventBus on flush', async () => {
      const { ScadaDataManager } = await import('@scada-editor/core');
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data:update',
      );

      handler[1]({ tagId: 'tag-1', value: 42, quality: 'good', timestamp: 1000 });

      expect(ScadaDataManager.eventBus.emit).toHaveBeenCalledWith(
        'tagValueChanged',
        expect.objectContaining({
          tagId: 'tag-1',
          value: 42,
          quality: 'good',
        }),
      );
    });

    it('should emit tagValueChanged for each tag in batch data:batch', async () => {
      const { ScadaDataManager } = await import('@scada-editor/core');
      const store = useWsStore();
      store.connect('proj-1');

      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data:batch',
      );
      expect(handler).toBeDefined();

      handler[1]({
        data: [
          { tagId: 'tag-1', value: 10, quality: 'good', timestamp: 1 },
          { tagId: 'tag-2', value: 20, quality: 'uncertain', timestamp: 2 },
        ],
      });

      // requestAnimationFrame mock 同步触发 flush
      expect(ScadaDataManager.eventBus.emit).toHaveBeenCalledTimes(2);
      expect(ScadaDataManager.eventBus.emit).toHaveBeenCalledWith(
        'tagValueChanged',
        expect.objectContaining({ tagId: 'tag-1', value: 10 }),
      );
      expect(ScadaDataManager.eventBus.emit).toHaveBeenCalledWith(
        'tagValueChanged',
        expect.objectContaining({ tagId: 'tag-2', quality: 'uncertain' }),
      );
    });
  });
});