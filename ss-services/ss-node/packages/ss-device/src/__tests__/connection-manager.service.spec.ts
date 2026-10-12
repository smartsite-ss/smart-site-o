// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

jest.mock('@ss-node/ss-core', () => ({
  // ProjectScopedEntity 被 device.entity.ts 继承，必须提供否则类声明时抛错
  ProjectScopedEntity: class {},
  BaseEntity: class {},
  EventBusService: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
  CircuitBreakerService: jest.fn().mockImplementation(() => ({
    isOpen: jest.fn().mockReturnValue(false),
    recordFailure: jest.fn(),
    recordSuccess: jest.fn(),
    getState: jest.fn().mockReturnValue('CLOSED'),
    reset: jest.fn(),
  })),
  ConnectionPoolService: jest.fn().mockImplementation(() => ({
    getConnection: jest.fn(),
    releaseConnection: jest.fn(),
    getConnectionStatus: jest.fn(),
  })),
}));

import { ConnectionManagerService } from '../connection/connection-manager.service';
import { Device } from '../entities/device.entity';
import { Repository } from 'typeorm';
import { DeviceStateMachine } from '../state/device-state-machine';
import { DeviceStatus, DeviceType } from '@ss-node/ss-sdk';
import { EventBusService, CircuitBreakerService, ConnectionPoolService } from '@ss-node/ss-core';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockDeviceRepo(): MockRepository<Device> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };
}

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'device-001',
    deviceCode: 'test-device',
    deviceName: 'Test Device',
    nameAlias: null,
    description: null,
    type: DeviceType.MODBUS_TCP,
    config: {},
    status: DeviceStatus.OFFLINE,
    projectId: 'project-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastOnlineAt: null,
    errorCount: 0,
    lastErrorAt: null,
    lastErrorMsg: null,
    templateId: null,
    templateVersion: null,
    templateAppliedAt: null,
    connection: {} as Record<string, any>,
    groupId: null,
    driver: 'modbus',
    ...overrides,
  };
}

describe('ConnectionManagerService', () => {
  let service: ConnectionManagerService;
  let mockDeviceRepo: MockRepository<Device>;
  let mockStateMachine: jest.Mocked<DeviceStateMachine>;
  let mockEventBus: jest.Mocked<EventBusService>;
  let mockCircuitBreaker: jest.Mocked<CircuitBreakerService>;
  let mockConnectionPool: jest.Mocked<ConnectionPoolService>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockDeviceRepo = createMockDeviceRepo();

    mockStateMachine = {
      transitionTo: jest.fn(),
      onConnectSuccess: jest.fn(),
      onConnectFailure: jest.fn(),
      onDisconnect: jest.fn(),
      onDegrade: jest.fn(),
      onRecover: jest.fn(),
      getRetryCount: jest.fn(),
      resetRetry: jest.fn(),
    } as any;

    mockEventBus = {
      emit: jest.fn(),
    } as any;

    mockCircuitBreaker = {
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
    } as any;

    mockConnectionPool = {
      getConnection: jest.fn(),
      releaseConnection: jest.fn(),
    } as any;

    service = new ConnectionManagerService(
      mockDeviceRepo as any,
      mockStateMachine,
      mockEventBus,
      mockCircuitBreaker,
      mockConnectionPool,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==================== connect ====================
  describe('connect', () => {
    it('should establish connection successfully', async () => {
      const device = makeDevice({ id: 'device-001', status: 'offline' as any });
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockStateMachine.transitionTo.mockResolvedValue(device);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device);

      await service.connect('device-001');

      expect(mockStateMachine.transitionTo).toHaveBeenCalledWith(device, DeviceStatus.CONNECTING);
      expect(mockConnectionPool.getConnection).toHaveBeenCalledWith('device-001');
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalledWith('device-001');
      expect(mockStateMachine.onConnectSuccess).toHaveBeenCalledWith(device);
    });

    it('should throw for invalid device', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      await expect(service.connect('non-existent')).rejects.toThrow(
        'Device not found: non-existent',
      );
    });

    it('should skip if already connected', async () => {
      const device = makeDevice({ id: 'device-001' });
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockStateMachine.transitionTo.mockResolvedValue(device);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device);

      // First connect
      await service.connect('device-001');

      // Second connect should skip
      await service.connect('device-001');

      // getConnection should only be called once
      expect(mockConnectionPool.getConnection).toHaveBeenCalledTimes(1);
    });

    it('should handle connection failure with circuit breaker', async () => {
      const device = makeDevice({ id: 'device-001', status: 'offline' as any });
      mockDeviceRepo.findOne.mockResolvedValue(device);
      const error = new Error('Connection timeout');
      mockConnectionPool.getConnection.mockRejectedValue(error);
      mockStateMachine.transitionTo.mockResolvedValue(device);
      mockStateMachine.onConnectFailure.mockResolvedValue(device);

      await expect(service.connect('device-001')).rejects.toThrow('Connection timeout');

      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalledWith('device-001');
      expect(mockStateMachine.onConnectFailure).toHaveBeenCalledWith(device, error);
    });
  });

  // ==================== disconnect ====================
  describe('disconnect', () => {
    it('should close connection', async () => {
      const device = makeDevice({ id: 'device-001' });
      mockDeviceRepo.findOne
        .mockResolvedValueOnce(device) // connect
        .mockResolvedValueOnce(device); // disconnect
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockStateMachine.transitionTo.mockResolvedValue(device);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device);
      mockStateMachine.onDisconnect.mockResolvedValue(device);

      await service.connect('device-001');
      await service.disconnect('device-001');

      expect(mockConnectionPool.releaseConnection).toHaveBeenCalledWith('device-001');
      expect(mockStateMachine.onDisconnect).toHaveBeenCalledWith(device);
    });

    it('should handle already disconnected device', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      await service.disconnect('non-existent');

      // Should not throw
      expect(mockConnectionPool.releaseConnection).not.toHaveBeenCalled();
    });

    it('should handle release connection error gracefully', async () => {
      const device = makeDevice({ id: 'device-001' });
      mockDeviceRepo.findOne
        .mockResolvedValueOnce(device) // connect
        .mockResolvedValueOnce(device); // disconnect
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockConnectionPool.releaseConnection.mockRejectedValue(new Error('Release failed'));
      mockStateMachine.transitionTo.mockResolvedValue(device);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device);
      mockStateMachine.onDisconnect.mockResolvedValue(device);

      await service.connect('device-001');
      await service.disconnect('device-001');

      // Should still clear the active connection
      expect(service.isConnected('device-001')).toBe(false);
    });
  });

  // ==================== registerTag ====================
  describe('registerTags', () => {
    it('should register tags for polling', async () => {
      const device = makeDevice({ id: 'device-001' });
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockStateMachine.transitionTo.mockResolvedValue(device);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device);

      await service.connect('device-001');
      await service.registerTags('device-001', ['tag-001', 'tag-002', 'tag-003']);

      expect(service.getTagCount('device-001')).toBe(3);
    });

    it('should throw if device is not connected', async () => {
      await expect(service.registerTags('device-001', ['tag-001'])).rejects.toThrow(
        'Device device-001 is not connected',
      );
    });

    it('should deduplicate tags', async () => {
      const device = makeDevice({ id: 'device-001' });
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockStateMachine.transitionTo.mockResolvedValue(device);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device);

      await service.connect('device-001');
      await service.registerTags('device-001', ['tag-001', 'tag-002']);
      await service.registerTags('device-001', ['tag-001', 'tag-003']);

      expect(service.getTagCount('device-001')).toBe(3);
    });
  });

  // ==================== getConnectionStatus ====================
  describe('isConnected', () => {
    it('should return true when connected', async () => {
      const device = makeDevice({ id: 'device-001' });
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockStateMachine.transitionTo.mockResolvedValue(device);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device);

      await service.connect('device-001');

      expect(service.isConnected('device-001')).toBe(true);
    });

    it('should return false when not connected', () => {
      expect(service.isConnected('device-001')).toBe(false);
    });
  });

  // ==================== getAllConnections ====================
  describe('getActiveConnections', () => {
    it('should return all active connections', async () => {
      const device1 = makeDevice({ id: 'device-001' });
      const device2 = makeDevice({ id: 'device-002' });
      mockDeviceRepo.findOne.mockResolvedValueOnce(device1).mockResolvedValueOnce(device2);
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockStateMachine.transitionTo.mockResolvedValue(device1);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device1);

      await service.connect('device-001');
      await service.connect('device-002');

      const connections = service.getActiveConnections();
      expect(connections).toHaveLength(2);
      expect(connections[0].deviceId).toBe('device-001');
      expect(connections[1].deviceId).toBe('device-002');
    });

    it('should return empty array when no connections', () => {
      const connections = service.getActiveConnections();
      expect(connections).toEqual([]);
    });
  });

  // ==================== getActiveConnections count ====================
  describe('getConnectionCount', () => {
    it('should return active connection count', async () => {
      const device = makeDevice({ id: 'device-001' });
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockStateMachine.transitionTo.mockResolvedValue(device);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device);

      expect(service.getConnectionCount()).toBe(0);

      await service.connect('device-001');

      expect(service.getConnectionCount()).toBe(1);
    });
  });

  // ==================== touchActivity ====================
  describe('touchActivity', () => {
    it('should update last activity timestamp', async () => {
      const device = makeDevice({ id: 'device-001' });
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockStateMachine.transitionTo.mockResolvedValue(device);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device);

      await service.connect('device-001');
      const _before = Date.now();

      jest.advanceTimersByTime(1000);
      service.touchActivity('device-001');

      // Should not throw
      expect(() => service.touchActivity('device-001')).not.toThrow();
    });

    it('should handle non-existent device gracefully', () => {
      expect(() => service.touchActivity('non-existent')).not.toThrow();
    });
  });

  // ==================== shutdown ====================
  describe('shutdown', () => {
    it('should disconnect all devices', async () => {
      const device1 = makeDevice({ id: 'device-001' });
      const device2 = makeDevice({ id: 'device-002' });
      mockDeviceRepo.findOne
        .mockResolvedValueOnce(device1)
        .mockResolvedValueOnce(device2)
        .mockResolvedValueOnce(device1)
        .mockResolvedValueOnce(device2);
      mockConnectionPool.getConnection.mockResolvedValue({} as any);
      mockStateMachine.transitionTo.mockResolvedValue(device1);
      mockStateMachine.onConnectSuccess.mockResolvedValue(device1);
      mockStateMachine.onDisconnect.mockResolvedValue(device1);

      await service.connect('device-001');
      await service.connect('device-002');

      await service.shutdown();

      expect(service.getConnectionCount()).toBe(0);
      expect(mockConnectionPool.releaseConnection).toHaveBeenCalledTimes(2);
    });
  });
});
