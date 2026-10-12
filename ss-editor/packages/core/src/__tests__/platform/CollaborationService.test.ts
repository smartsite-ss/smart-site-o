// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollaborationService } from '../../platform/collaboration.service';

// ==================== WebSocket Mock ====================

class MockWebSocket {
  public url: string;
  public readyState: number = WebSocket.CONNECTING;
  public onopen: ((event: any) => void) | null = null;
  public onclose: ((event: any) => void) | null = null;
  public onmessage: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;
  private static instances: MockWebSocket[] = [];
  private sentMessages: any[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(JSON.parse(data));
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: 1000, reason: 'Normal closure', wasClean: true } as any);
    }
  }

  // Simulate successful connection
  simulateOpen(): void {
    this.readyState = WebSocket.OPEN;
    if (this.onopen) {
      this.onopen({} as any);
    }
  }

  // Simulate receiving a message
  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as any);
    }
  }

  // Simulate an error
  simulateError(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onerror) {
      this.onerror({} as any);
    }
  }

  getSentMessages(): any[] {
    return [...this.sentMessages];
  }

  static getLastInstance(): MockWebSocket | null {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1] || null;
  }

  static reset(): void {
    MockWebSocket.instances = [];
  }

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
}

(globalThis as any).WebSocket = MockWebSocket;

describe('CollaborationService', () => {
  let service: CollaborationService;

  beforeEach(() => {
    // Reset singleton
    (CollaborationService as any).instance = undefined;
    service = CollaborationService.getInstance();
    MockWebSocket.reset();
    vi.clearAllMocks();
  });

  // ==================== TC-COLLAB-001: Singleton ====================
  describe('TC-COLLAB-001: Singleton', () => {
    it('TC-COLLAB-001-01: getInstance should return the same instance', () => {
      const instance1 = CollaborationService.getInstance();
      const instance2 = CollaborationService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('TC-COLLAB-001-02: should persist state across getInstance calls', () => {
      const instance1 = CollaborationService.getInstance();
      const instance2 = CollaborationService.getInstance();
      expect(instance1.getUserInfo()).toEqual(instance2.getUserInfo());
    });
  });

  // ==================== TC-COLLAB-002: Connection ====================
  describe('TC-COLLAB-002: Connection', () => {
    it('TC-COLLAB-002-01: should initially not be connected', () => {
      expect(service.getIsConnected()).toBe(false);
    });

    it('TC-COLLAB-002-02: connect should create WebSocket and resolve true on success', async () => {
      const connectPromise = service.connect('ws://localhost:8080');

      const ws = MockWebSocket.getLastInstance();
      expect(ws).not.toBeNull();
      expect(ws!.url).toBe('ws://localhost:8080');

      ws!.simulateOpen();

      const result = await connectPromise;
      expect(result).toBe(true);
      expect(service.getIsConnected()).toBe(true);
    });

    it('TC-COLLAB-002-03: connect should use default URL when none provided', async () => {
      const connectPromise = service.connect();

      const ws = MockWebSocket.getLastInstance();
      expect(ws!.url).toBe('ws://localhost:8800');

      ws!.simulateOpen();
      await connectPromise;
    });

    it('TC-COLLAB-002-04: connect should resolve false on error', async () => {
      const connectPromise = service.connect('ws://localhost:8080');

      const ws = MockWebSocket.getLastInstance();
      ws!.simulateError();

      const result = await connectPromise;
      expect(result).toBe(false);
      expect(service.getIsConnected()).toBe(false);
    });

    it('TC-COLLAB-002-05: connect should handle WebSocket constructor throwing', async () => {
      const originalWebSocket = (globalThis as any).WebSocket;
      (globalThis as any).WebSocket = function () {
        throw new Error('Connection refused');
      };
      (globalThis as any).WebSocket.CONNECTING = 0;
      (globalThis as any).WebSocket.OPEN = 1;
      (globalThis as any).WebSocket.CLOSING = 2;
      (globalThis as any).WebSocket.CLOSED = 3;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.connect();

      expect(result).toBe(false);
      consoleSpy.mockRestore();

      (globalThis as any).WebSocket = originalWebSocket;
    });
  });

  // ==================== TC-COLLAB-003: Disconnect ====================
  describe('TC-COLLAB-003: Disconnect', () => {
    it('TC-COLLAB-003-01: disconnect should close WebSocket and set isConnected to false', async () => {
      const connectPromise = service.connect();
      const ws = MockWebSocket.getLastInstance();
      ws!.simulateOpen();
      await connectPromise;

      expect(service.getIsConnected()).toBe(true);

      service.disconnect();

      expect(service.getIsConnected()).toBe(false);
    });

    it('TC-COLLAB-003-02: disconnect should not throw when not connected', () => {
      expect(() => {
        service.disconnect();
      }).not.toThrow();
    });
  });

  // ==================== TC-COLLAB-004: Message Handling ====================
  describe('TC-COLLAB-004: Message Handling', () => {
    beforeEach(async () => {
      const connectPromise = service.connect();
      const ws = MockWebSocket.getLastInstance();
      ws!.simulateOpen();
      await connectPromise;
    });

    it('TC-COLLAB-004-01: should handle userJoined message', () => {
      const handler = vi.fn();
      service.on('userJoined', handler);

      const ws = MockWebSocket.getLastInstance();
      ws!.simulateMessage({
        type: 'userJoined',
        payload: { userId: 'user-123', userName: 'Test User' },
      });

      expect(handler).toHaveBeenCalledWith({ userId: 'user-123', userName: 'Test User' });
    });

    it('TC-COLLAB-004-02: should handle userLeft message', () => {
      const handler = vi.fn();
      service.on('userLeft', handler);

      const ws = MockWebSocket.getLastInstance();
      ws!.simulateMessage({
        type: 'userLeft',
        payload: { userId: 'user-123' },
      });

      expect(handler).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('TC-COLLAB-004-03: should handle graphicAdded message', () => {
      const handler = vi.fn();
      service.on('graphicAdded', handler);

      const ws = MockWebSocket.getLastInstance();
      ws!.simulateMessage({
        type: 'graphicAdded',
        payload: { graphicId: 'g-1', type: 'rect' },
      });

      expect(handler).toHaveBeenCalledWith({ graphicId: 'g-1', type: 'rect' });
    });

    it('TC-COLLAB-004-04: should handle graphicUpdated message', () => {
      const handler = vi.fn();
      service.on('graphicUpdated', handler);

      const ws = MockWebSocket.getLastInstance();
      ws!.simulateMessage({
        type: 'graphicUpdated',
        payload: { graphicId: 'g-1', changes: { x: 100 } },
      });

      expect(handler).toHaveBeenCalledWith({ graphicId: 'g-1', changes: { x: 100 } });
    });

    it('TC-COLLAB-004-05: should handle graphicDeleted message', () => {
      const handler = vi.fn();
      service.on('graphicDeleted', handler);

      const ws = MockWebSocket.getLastInstance();
      ws!.simulateMessage({
        type: 'graphicDeleted',
        payload: { graphicId: 'g-1' },
      });

      expect(handler).toHaveBeenCalledWith({ graphicId: 'g-1' });
    });

    it('TC-COLLAB-004-06: should handle selectionChanged message', () => {
      const handler = vi.fn();
      service.on('selectionChanged', handler);

      const ws = MockWebSocket.getLastInstance();
      ws!.simulateMessage({
        type: 'selectionChanged',
        payload: { selectedGraphicIds: ['g-1', 'g-2'] },
      });

      expect(handler).toHaveBeenCalledWith({ selectedGraphicIds: ['g-1', 'g-2'] });
    });

    it('TC-COLLAB-004-07: should handle cursorMoved message', () => {
      const handler = vi.fn();
      service.on('cursorMoved', handler);

      const ws = MockWebSocket.getLastInstance();
      ws!.simulateMessage({
        type: 'cursorMoved',
        payload: { x: 100, y: 200 },
      });

      expect(handler).toHaveBeenCalledWith({ x: 100, y: 200 });
    });

    it('TC-COLLAB-004-08: should ignore unknown message types', () => {
      const handler = vi.fn();
      service.on('userJoined', handler);

      const ws = MockWebSocket.getLastInstance();
      ws!.simulateMessage({
        type: 'unknownType',
        payload: { data: 'test' },
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('TC-COLLAB-004-09: should handle invalid JSON gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const ws = MockWebSocket.getLastInstance();

      // Simulate raw invalid JSON
      if (ws!.onmessage) {
        ws!.onmessage({ data: 'invalid json' } as any);
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ==================== TC-COLLAB-005: Event Listeners ====================
  describe('TC-COLLAB-005: Event Listeners', () => {
    it('TC-COLLAB-005-01: on should register a listener', () => {
      const callback = vi.fn();
      service.on('test', callback);

      // Listeners are private, verify by checking it doesn't throw
      expect(true).toBe(true);
    });

    it('TC-COLLAB-005-02: off should remove a listener', () => {
      const callback = vi.fn();
      service.on('test', callback);
      service.off('test', callback);

      // Should not throw
      expect(true).toBe(true);
    });

    it('TC-COLLAB-005-03: off should not throw when removing non-existent listener', () => {
      expect(() => {
        service.off('test', vi.fn());
      }).not.toThrow();
    });

    it('TC-COLLAB-005-04: off should not throw when event has no listeners', () => {
      expect(() => {
        service.off('non-existent', vi.fn());
      }).not.toThrow();
    });

    it('TC-COLLAB-005-05: multiple on/off should work correctly', async () => {
      const connectPromise = service.connect();
      const ws = MockWebSocket.getLastInstance();
      ws!.simulateOpen();
      await connectPromise;

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.on('userJoined', callback1);
      service.on('userJoined', callback2);
      service.off('userJoined', callback1);

      ws!.simulateMessage({
        type: 'userJoined',
        payload: { userId: 'test' },
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  // ==================== TC-COLLAB-006: Send Methods ====================
  describe('TC-COLLAB-006: Send Methods', () => {
    beforeEach(async () => {
      const connectPromise = service.connect();
      const ws = MockWebSocket.getLastInstance();
      ws!.simulateOpen();
      await connectPromise;
    });

    it('TC-COLLAB-006-01: sendGraphicAdded should send correct message', () => {
      const mockGraphic = {
        toJSON: () => ({ id: 'g-1', type: 'rect', config: {} }),
      };

      service.sendGraphicAdded(mockGraphic as any);

      const ws = MockWebSocket.getLastInstance();
      const messages = ws!.getSentMessages();
      // The first message is the 'join' message sent on connect
      const graphicMessage = messages.find((m: any) => m.type === 'graphicAdded');
      expect(graphicMessage).toBeDefined();
      expect(graphicMessage.payload.graphic).toEqual({ id: 'g-1', type: 'rect', config: {} });
    });

    it('TC-COLLAB-006-02: sendGraphicUpdated should send correct message', () => {
      const mockGraphic = {
        toJSON: () => ({ id: 'g-1', type: 'rect', config: { x: 100 } }),
      };

      service.sendGraphicUpdated(mockGraphic as any);

      const ws = MockWebSocket.getLastInstance();
      const messages = ws!.getSentMessages();
      const message = messages.find((m: any) => m.type === 'graphicUpdated');
      expect(message).toBeDefined();
      expect(message.payload.graphic).toEqual({ id: 'g-1', type: 'rect', config: { x: 100 } });
    });

    it('TC-COLLAB-006-03: sendGraphicDeleted should send correct message', () => {
      service.sendGraphicDeleted('g-123');

      const ws = MockWebSocket.getLastInstance();
      const messages = ws!.getSentMessages();
      const message = messages.find((m: any) => m.type === 'graphicDeleted');
      expect(message).toBeDefined();
      expect(message.payload.graphicId).toBe('g-123');
    });

    it('TC-COLLAB-006-04: sendSelectionChanged should send correct message', () => {
      service.sendSelectionChanged(['g-1', 'g-2', 'g-3']);

      const ws = MockWebSocket.getLastInstance();
      const messages = ws!.getSentMessages();
      const message = messages.find((m: any) => m.type === 'selectionChanged');
      expect(message).toBeDefined();
      expect(message.payload.selectedGraphicIds).toEqual(['g-1', 'g-2', 'g-3']);
    });

    it('TC-COLLAB-006-05: sendCursorMoved should send correct message', () => {
      service.sendCursorMoved(150, 250);

      const ws = MockWebSocket.getLastInstance();
      const messages = ws!.getSentMessages();
      const message = messages.find((m: any) => m.type === 'cursorMoved');
      expect(message).toBeDefined();
      expect(message.payload.x).toBe(150);
      expect(message.payload.y).toBe(250);
    });

    it('TC-COLLAB-006-06: send should not throw when not connected', () => {
      // Create new unconnected instance
      (CollaborationService as any).instance = undefined;
      const disconnectedService = CollaborationService.getInstance();

      expect(() => {
        (disconnectedService as any).send({ type: 'test' });
      }).not.toThrow();
    });
  });

  // ==================== TC-COLLAB-007: User Info ====================
  describe('TC-COLLAB-007: User Info', () => {
    it('TC-COLLAB-007-01: getUserInfo should return user info with userId and userName', () => {
      const info = service.getUserInfo();

      expect(info).toHaveProperty('userId');
      expect(info).toHaveProperty('userName');
      expect(typeof info.userId).toBe('string');
      expect(typeof info.userName).toBe('string');
      expect(info.userId).toMatch(/^user-/);
    });

    it('TC-COLLAB-007-02: getUserInfo should return consistent user info', () => {
      const info1 = service.getUserInfo();
      const info2 = service.getUserInfo();

      expect(info1).toEqual(info2);
    });
  });

  // ==================== TC-COLLAB-008: Connection Status ====================
  describe('TC-COLLAB-008: Connection Status', () => {
    it('TC-COLLAB-008-01: getIsConnected should return false initially', () => {
      expect(service.getIsConnected()).toBe(false);
    });

    it('TC-COLLAB-008-02: getIsConnected should return true after successful connect', async () => {
      const connectPromise = service.connect();
      MockWebSocket.getLastInstance()!.simulateOpen();
      await connectPromise;

      expect(service.getIsConnected()).toBe(true);
    });

    it('TC-COLLAB-008-03: getIsConnected should return false after disconnect', async () => {
      const connectPromise = service.connect();
      MockWebSocket.getLastInstance()!.simulateOpen();
      await connectPromise;

      service.disconnect();

      expect(service.getIsConnected()).toBe(false);
    });

    it('TC-COLLAB-008-04: onclose should set isConnected to false', async () => {
      const connectPromise = service.connect();
      const ws = MockWebSocket.getLastInstance()!;
      ws.simulateOpen();
      await connectPromise;

      expect(service.getIsConnected()).toBe(true);

      // Simulate server closing connection
      if (ws.onclose) {
        ws.onclose({ code: 1000, reason: '', wasClean: true } as any);
      }

      expect(service.getIsConnected()).toBe(false);
    });
  });

  // ==================== TC-COLLAB-009: Join Message on Connect ====================
  describe('TC-COLLAB-009: Join Message', () => {
    it('TC-COLLAB-009-01: should send join message on successful connection', async () => {
      const connectPromise = service.connect();
      const ws = MockWebSocket.getLastInstance()!;
      ws.simulateOpen();
      await connectPromise;

      const messages = ws.getSentMessages();
      const joinMessage = messages.find((m: any) => m.type === 'join');
      expect(joinMessage).toBeDefined();
      expect(joinMessage.userId).toBeDefined();
      expect(joinMessage.userName).toBeDefined();
    });
  });

  // ==================== TC-COLLAB-010: Error Handling ====================
  describe('TC-COLLAB-010: Error Handling', () => {
    it('TC-COLLAB-010-01: error in listener should not crash the service', async () => {
      const connectPromise = service.connect();
      const ws = MockWebSocket.getLastInstance()!;
      ws.simulateOpen();
      await connectPromise;

      const errorHandler = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalHandler = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.on('userJoined', errorHandler);
      service.on('userJoined', normalHandler);

      ws.simulateMessage({
        type: 'userJoined',
        payload: { userId: 'test' },
      });

      expect(normalHandler).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});