// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock socket.io-client
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

// Mock token
vi.mock('../../api/client', () => ({
  getToken: vi.fn(() => 'mock-token'),
}));

// Mock i18n
vi.mock('@scada-editor/core', () => ({
  i18n: { global: { t: vi.fn((key: string) => key) } },
}));

import { setActivePinia, createPinia } from 'pinia';
import { useWsStore } from '../ws.store';

describe('WebSocket Outbound Buffer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  describe('safeEmit when disconnected', () => {
    it('should buffer messages when socket is not connected', () => {
      const store = useWsStore();

      store.safeEmit('subscribe:tag', { tagIds: ['tag1'] });
      store.safeEmit('subscribe:device', { deviceId: 'dev1' });

      expect(store.outboundBufferSize).toBe(2);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('safeEmit when connected', () => {
    it('should emit directly when socket is connected', () => {
      const store = useWsStore();
      // Call connect to set socket.value
      store.connect('test-project');
      // Simulate connected state
      mockSocket.connected = true;

      store.safeEmit('subscribe:tag', { tagIds: ['tag1'] });

      expect(store.outboundBufferSize).toBe(0);
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:tag', { tagIds: ['tag1'] });
    });
  });

  describe('buffer limit', () => {
    it('should keep max 100 messages, dropping oldest', () => {
      const store = useWsStore();

      for (let i = 0; i < 100; i++) {
        store.safeEmit('test:event', { index: i });
      }
      expect(store.outboundBufferSize).toBe(100);

      // Add one more — oldest should be dropped, size stays 100
      store.safeEmit('test:event', { index: 100 });
      expect(store.outboundBufferSize).toBe(100);
    });
  });

  describe('flushOutboundBuffer on reconnect', () => {
    it('should flush buffered messages when socket connect event fires', () => {
      const store = useWsStore();

      // Buffer messages while disconnected (before connect)
      store.safeEmit('subscribe:tag', { tagIds: ['tag1'] });
      store.safeEmit('subscribe:device', { deviceId: 'dev1' });
      expect(store.outboundBufferSize).toBe(2);

      // Call connect to set up socket and event handlers
      store.connect('test-project');

      // Find the 'connect' event handler registered via socket.on('connect', ...)
      const connectCall = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect',
      );
      expect(connectCall).toBeDefined();

      // Simulate connected state and fire the connect event
      mockSocket.connected = true;
      const connectHandler = connectCall![1] as () => void;
      connectHandler();

      // Buffer should be flushed
      expect(store.outboundBufferSize).toBe(0);
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:tag', { tagIds: ['tag1'] });
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:device', { deviceId: 'dev1' });
    });
  });

  describe('disconnect clears buffer', () => {
    it('should clear outbound buffer on disconnect', () => {
      const store = useWsStore();

      store.safeEmit('test:event', { data: 'test' });
      expect(store.outboundBufferSize).toBe(1);

      store.disconnect();

      expect(store.outboundBufferSize).toBe(0);
    });
  });
});
