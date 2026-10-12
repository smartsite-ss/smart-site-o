// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ConnectionPoolService } from '../connection/connection-pool.service';
import { CircuitBreakerService } from '../connection/circuit-breaker.service';
import { EventBusService } from '../event-bus/event-bus.service';

import { Logger } from '@nestjs/common';

type MockCircuitBreaker = Partial<Record<keyof CircuitBreakerService, jest.Mock>>;
type MockEventBus = Partial<Record<keyof EventBusService, jest.Mock>>;

function createMockCircuitBreaker(): MockCircuitBreaker {
  return {
    isOpen: jest.fn().mockReturnValue(false),
    isClosed: jest.fn().mockReturnValue(true),
    getState: jest.fn().mockReturnValue('closed'),
    recordFailure: jest.fn(),
    recordSuccess: jest.fn(),
    reset: jest.fn(),
    clearAll: jest.fn(),
    setConfig: jest.fn(),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    emit: jest.fn(),
    emitDeviceStatusChanged: jest.fn(),
    emitDataPointChanged: jest.fn(),
    emitAlarmTriggered: jest.fn(),
    emitAlarmAcknowledged: jest.fn(),
    emitConfigChanged: jest.fn(),
    emitProcessingError: jest.fn(),
    emitHealthDegraded: jest.fn(),
    emitHealthRecovered: jest.fn(),
    emitPluginDiscovered: jest.fn(),
    emitPluginRegistered: jest.fn(),
    emitPluginActivated: jest.fn(),
    emitPluginDeactivated: jest.fn(),
    emitPluginError: jest.fn(),
    emitPluginUnregistered: jest.fn(),
    emitPluginUpdated: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    getListenerCount: jest.fn(),
  };
}

describe('ConnectionPoolService', () => {
  let service: ConnectionPoolService;
  let mockCircuitBreaker: MockCircuitBreaker;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    mockCircuitBreaker = createMockCircuitBreaker();
    mockEventBus = createMockEventBus();
    service = new ConnectionPoolService(mockCircuitBreaker as any, mockEventBus as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getConnection', () => {
    it('should create new connection if not exists', async () => {
      const conn = await service.getConnection('device-1');
      expect(conn).not.toBeNull();
      expect(conn!.deviceId).toBe('device-1');
      expect(conn!.status).toBe('online');
    });

    it('should return existing connection', async () => {
      const conn1 = await service.getConnection('device-1');
      const conn2 = await service.getConnection('device-1');

      expect(conn1).not.toBeNull();
      expect(conn2).not.toBeNull();
      expect(conn1!.deviceId).toBe(conn2!.deviceId);
    });

    it('should return null when circuit breaker is open', async () => {
      mockCircuitBreaker.isOpen.mockReturnValue(true);

      const conn = await service.getConnection('device-1');
      expect(conn).toBeNull();
    });

    it('should record success on circuit breaker after successful connection', async () => {
      await service.getConnection('device-1');
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalledWith('device:device-1');
    });
  });

  describe('releaseConnection', () => {
    it('should disconnect and remove connection', async () => {
      await service.getConnection('device-1');
      await service.releaseConnection('device-1');

      const status = service.getConnectionStatus('device-1');
      expect(status).toBeUndefined();
    });

    it('should not throw when releasing non-existent connection', async () => {
      await expect(service.releaseConnection('non-existent')).resolves.not.toThrow();
    });
  });

  describe('disconnectDevice', () => {
    it('should disconnect specific device', async () => {
      const conn = await service.getConnection('device-1');
      expect(conn!.status).toBe('online');

      await service.disconnectDevice('device-1');

      const status = service.getConnectionStatus('device-1');
      expect(status).toBe('offline');
    });
  });

  describe('reconnectDevice', () => {
    it('should reconnect device', async () => {
      const _conn = await service.getConnection('device-1');
      await service.disconnectDevice('device-1');

      const result = await service.reconnectDevice('device-1');
      expect(result).toBe(true);
    });

    it('should return false for non-existent device', async () => {
      const result = await service.reconnectDevice('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return status for existing connection', async () => {
      await service.getConnection('device-1');
      const status = service.getConnectionStatus('device-1');
      expect(status).toBe('online');
    });

    it('should return undefined for non-existent connection', () => {
      const status = service.getConnectionStatus('non-existent');
      expect(status).toBeUndefined();
    });
  });

  describe('getAllConnections', () => {
    it('should return all connections', async () => {
      await service.getConnection('device-1');
      await service.getConnection('device-2');

      const all = service.getAllConnections();
      expect(all).toHaveLength(2);
    });

    it('should return empty array when no connections', () => {
      const all = service.getAllConnections();
      expect(all).toEqual([]);
    });
  });

  describe('getActiveConnectionsCount', () => {
    it('should return count of online connections', async () => {
      await service.getConnection('device-1');
      await service.getConnection('device-2');

      const count = service.getActiveConnectionsCount();
      expect(count).toBe(2);
    });

    it('should exclude offline connections', async () => {
      await service.getConnection('device-1');
      await service.disconnectDevice('device-1');

      const count = service.getActiveConnectionsCount();
      expect(count).toBe(0);
    });
  });
});
