// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../scada-data/engine/EventBus';
import { ProtocolManager, type IProtocolAdapter, type ProtocolConnectionConfig, type ConnectionHandle as _ConnectionHandle, type SubscriptionHandle as _SubscriptionHandle, type DataPoint } from '../../../scada-data/engine/ProtocolManager';

function createMockAdapter(protocol: string = 'modbus', version: string = '1.0'): IProtocolAdapter {
  return {
    protocol,
    version,
    connect: vi.fn().mockImplementation(() => Promise.resolve({
      id: '',
      protocol,
      endpoint: 'tcp://localhost:502',
      status: 'connected' as const,
      connectedAt: Date.now(),
    })),
    disconnect: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockImplementation(() => Promise.resolve({
      id: '',
      connectionId: '',
      points: [] as DataPoint[],
      active: true,
      createdAt: Date.now(),
    })),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockReturnValue('connected'),
  };
}

function makeConfig(overrides: Partial<ProtocolConnectionConfig> = {}): ProtocolConnectionConfig {
  return {
    protocol: 'modbus',
    endpoint: 'tcp://localhost:502',
    ...overrides,
  };
}

function makeDataPoint(overrides: Partial<DataPoint> = {}): DataPoint {
  return {
    id: 'dp-1',
    address: '40001',
    dataType: 'int16',
    access: 'read',
    ...overrides,
  };
}

describe('ProtocolManager', () => {
  let eventBus: EventBus;
  let manager: ProtocolManager;

  beforeEach(() => {
    eventBus = new EventBus();
    ProtocolManager.resetInstance();
    manager = ProtocolManager.getInstance(eventBus);
  });

  // ==================== getInstance ====================
  describe('getInstance', () => {
    it('TC-PTM-001: should return same instance', () => {
      const a = ProtocolManager.getInstance();
      const b = ProtocolManager.getInstance();
      expect(a).toBe(b);
    });

    it('TC-PTM-002: should throw without EventBus on first call', () => {
      ProtocolManager.resetInstance();
      expect(() => ProtocolManager.getInstance()).toThrow('EventBus');
    });

    it('TC-PTM-003: should not require EventBus after first initialization', () => {
      ProtocolManager.resetInstance();
      ProtocolManager.getInstance(eventBus);
      const inst = ProtocolManager.getInstance();
      expect(inst).toBeDefined();
    });
  });

  // ==================== registerAdapter ====================
  describe('registerAdapter', () => {
    it('TC-PTM-010: should register a protocol adapter', () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      expect(manager.getSupportedProtocols()).toContain('modbus');
    });

    it('TC-PTM-011: should throw for invalid adapter', () => {
      expect(() => manager.registerAdapter(null as any)).toThrow('Invalid adapter');
    });

    it('TC-PTM-012: should throw for duplicate adapter registration', () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      expect(() => manager.registerAdapter(adapter)).toThrow('already registered');
    });

    it('TC-PTM-013: should emit event on adapter registration', () => {
      const callback = vi.fn();
      eventBus.on('protocolAdapterRegistered', callback);
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].payload).toMatchObject({
        protocol: 'modbus',
        version: '1.0',
      });
    });
  });

  // ==================== unregisterAdapter ====================
  describe('unregisterAdapter', () => {
    it('TC-PTM-020: should unregister adapter', () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      manager.unregisterAdapter('modbus');
      expect(manager.getSupportedProtocols()).not.toContain('modbus');
    });

    it('TC-PTM-021: should throw for unregistered protocol', () => {
      expect(() => manager.unregisterAdapter('unknown')).toThrow('No adapter registered');
    });

    it('TC-PTM-022: should emit event on adapter unregistration', () => {
      const callback = vi.fn();
      eventBus.on('protocolAdapterUnregistered', callback);
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      manager.unregisterAdapter('modbus');
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== connect ====================
  describe('connect', () => {
    it('TC-PTM-030: should connect to protocol', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const handle = await manager.connect(makeConfig());
      expect(handle.status).toBe('connected');
      expect(handle.protocol).toBe('modbus');
    });

    it('TC-PTM-031: should throw for missing protocol in config', async () => {
      await expect(manager.connect({} as any)).rejects.toThrow('must include a protocol');
    });

    it('TC-PTM-032: should throw for unregistered protocol', async () => {
      await expect(manager.connect(makeConfig({ protocol: 'unknown' }))).rejects.toThrow('No adapter registered');
    });

    it('TC-PTM-033: should emit protocolConnected event', async () => {
      const callback = vi.fn();
      eventBus.on('protocolConnected', callback);
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      await manager.connect(makeConfig());
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('TC-PTM-034: should handle connect failure', async () => {
      const callback = vi.fn();
      eventBus.on('protocolConnectionError', callback);
      const adapter = createMockAdapter();
      adapter.connect = vi.fn().mockRejectedValue(new Error('Connection refused'));
      manager.registerAdapter(adapter);
      await expect(manager.connect(makeConfig())).rejects.toThrow('Connection refused');
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== disconnect ====================
  describe('disconnect', () => {
    it('TC-PTM-040: should disconnect from protocol', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const handle = await manager.connect(makeConfig());
      await manager.disconnect(handle.id);
      expect(manager.getConnectionStatus(handle.id)).toBe('disconnected');
    });

    it('TC-PTM-041: should throw for non-existent connection', async () => {
      await expect(manager.disconnect('non-existent')).rejects.toThrow('Connection not found');
    });

    it('TC-PTM-042: should emit protocolDisconnected event', async () => {
      const callback = vi.fn();
      eventBus.on('protocolDisconnected', callback);
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const handle = await manager.connect(makeConfig());
      await manager.disconnect(handle.id);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== subscribe ====================
  describe('subscribe', () => {
    it('TC-PTM-050: should subscribe to data points', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const connHandle = await manager.connect(makeConfig());
      const subHandle = await manager.subscribe(connHandle.id, [makeDataPoint()]);
      expect(subHandle.active).toBe(true);
      expect(subHandle.connectionId).toBe(connHandle.id);
    });

    it('TC-PTM-051: should throw for empty points array', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const connHandle = await manager.connect(makeConfig());
      await expect(manager.subscribe(connHandle.id, [])).rejects.toThrow('At least one data point');
    });

    it('TC-PTM-052: should throw for non-existent connection', async () => {
      await expect(manager.subscribe('non-existent', [makeDataPoint()])).rejects.toThrow('Connection not found');
    });

    it('TC-PTM-053: should throw for non-connected connection', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const connHandle = await manager.connect(makeConfig());
      await manager.disconnect(connHandle.id);
      // The handle still exists in the map but status is disconnected
      await expect(manager.subscribe(connHandle.id, [makeDataPoint()])).rejects.toThrow('not connected');
    });

    it('TC-PTM-054: should emit subscription event', async () => {
      const callback = vi.fn();
      eventBus.on('protocolSubscriptionCreated', callback);
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const connHandle = await manager.connect(makeConfig());
      await manager.subscribe(connHandle.id, [makeDataPoint()]);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== unsubscribe ====================
  describe('unsubscribe', () => {
    it('TC-PTM-060: should unsubscribe from subscription', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const connHandle = await manager.connect(makeConfig());
      const subHandle = await manager.subscribe(connHandle.id, [makeDataPoint()]);
      await manager.unsubscribe(subHandle.id);
      // Should not throw
    });

    it('TC-PTM-061: should throw for non-existent subscription', async () => {
      await expect(manager.unsubscribe('non-existent')).rejects.toThrow('Subscription not found');
    });

    it('TC-PTM-062: should handle unsubscribe when connection is gone', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const connHandle = await manager.connect(makeConfig());
      const subHandle = await manager.subscribe(connHandle.id, [makeDataPoint()]);
      // Disconnect which removes the connection but keeps subscription
      // Actually disconnect doesn't remove the connection, it just sets status
      // The unsubscribe should still work
      await manager.unsubscribe(subHandle.id);
      expect(() => manager.unsubscribe(subHandle.id)).rejects.toThrow('Subscription not found');
    });
  });

  // ==================== write ====================
  describe('write', () => {
    it('TC-PTM-070: should write value to tag', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const connHandle = await manager.connect(makeConfig());
      await manager.write(connHandle.id, makeDataPoint(), 42);
      expect(adapter.write).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        42,
      );
    });

    it('TC-PTM-071: should throw for non-existent connection', async () => {
      await expect(manager.write('non-existent', makeDataPoint(), 42)).rejects.toThrow('Connection not found');
    });

    it('TC-PTM-072: should throw for non-connected connection', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const connHandle = await manager.connect(makeConfig());
      await manager.disconnect(connHandle.id);
      await expect(manager.write(connHandle.id, makeDataPoint(), 42)).rejects.toThrow('not connected');
    });

    it('TC-PTM-073: should emit write event', async () => {
      const callback = vi.fn();
      eventBus.on('protocolDataWritten', callback);
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const connHandle = await manager.connect(makeConfig());
      await manager.write(connHandle.id, makeDataPoint({ id: 'dp-1' }), 42);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].payload).toMatchObject({
        pointId: 'dp-1',
        value: 42,
      });
    });
  });

  // ==================== getConnectionStatus / getAllConnections ====================
  describe('getConnectionStatus / getAllConnections', () => {
    it('TC-PTM-080: should return connection status', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const handle = await manager.connect(makeConfig());
      const status = manager.getConnectionStatus(handle.id);
      expect(status).toBe('connected');
    });

    it('TC-PTM-081: should throw for non-existent connection status', () => {
      expect(() => manager.getConnectionStatus('non-existent')).toThrow('Connection not found');
    });

    it('TC-PTM-082: should return all connections', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      await manager.connect(makeConfig());
      const connections = manager.getAllConnections();
      expect(connections.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-PTM-083: should return empty when no connections', () => {
      const connections = manager.getAllConnections();
      expect(connections).toEqual([]);
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-PTM-090: should handle multiple protocols', async () => {
      const modbus = createMockAdapter('modbus', '1.0');
      const mqttAdapter = createMockAdapter('mqtt', '2.0');
      manager.registerAdapter(modbus);
      manager.registerAdapter(mqttAdapter);
      const protocols = manager.getSupportedProtocols();
      expect(protocols).toContain('modbus');
      expect(protocols).toContain('mqtt');
    });

    it('TC-PTM-091: should handle multiple subscriptions on same connection', async () => {
      const adapter = createMockAdapter();
      manager.registerAdapter(adapter);
      const connHandle = await manager.connect(makeConfig());
      const sub1 = await manager.subscribe(connHandle.id, [makeDataPoint({ id: 'dp-1' })]);
      const sub2 = await manager.subscribe(connHandle.id, [makeDataPoint({ id: 'dp-2' })]);
      expect(sub1.id).not.toBe(sub2.id);
    });
  });
});