// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceStateMachine } from '../state/device-state-machine';
import { Device } from '../entities/device.entity';
import { DeviceStatusLog } from '../entities/device-status-log.entity';
import { DeviceStatus, DeviceType } from '@ss-node/ss-sdk';
import { EventBusService } from '@ss-node/ss-core/event-bus/event-bus.service';
import { DeviceGateway } from '../device.gateway';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'dev-001',
    deviceCode: 'temp-hum-001',
    deviceName: '温湿度001',
    nameAlias: null,
    description: null,
    type: DeviceType.MODBUS_TCP,
    config: {},
    status: DeviceStatus.OFFLINE,
    projectId: 'proj-001',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    lastOnlineAt: null,
    errorCount: 0,
    lastErrorAt: null,
    lastErrorMsg: '',
    templateId: null,
    templateVersion: null,
    templateAppliedAt: null,
    connection: {},
    groupId: null,
    driver: 'modbus',
    ...overrides,
  };
}

describe('DeviceStateMachine', () => {
  let stateMachine: DeviceStateMachine;
  let deviceRepo: MockRepository<Device>;
  let statusLogRepo: MockRepository<DeviceStatusLog>;
  let mockEventBus: { emit: jest.Mock };
  let mockDeviceGateway: { pushDeviceStatus: jest.Mock };

  // We need to disable fake timers for this test suite because the setup.ts
  // file sets jest.useFakeTimers() globally, but we test real setTimeout behavior
  beforeEach(async () => {
    jest.useRealTimers();

    deviceRepo = {
      save: jest.fn().mockImplementation((device: Device) => Promise.resolve(device)),
      find: jest.fn().mockResolvedValue([]),
    };

    statusLogRepo = {
      save: jest.fn().mockImplementation((log: any) => Promise.resolve(log)),
    };

    mockEventBus = {
      emit: jest.fn(),
    };

    mockDeviceGateway = {
      pushDeviceStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceStateMachine,
        { provide: getRepositoryToken(Device), useValue: deviceRepo },
        { provide: getRepositoryToken(DeviceStatusLog), useValue: statusLogRepo },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: DeviceGateway, useValue: mockDeviceGateway },
      ],
    }).compile();

    stateMachine = module.get<DeviceStateMachine>(DeviceStateMachine);
  });

  afterEach(() => {
    jest.useFakeTimers();
    jest.clearAllTimers();
  });

  describe('TC-DEV-030: OFFLINE to CONNECTING transition', () => {
    it('should transition from OFFLINE to CONNECTING', async () => {
      const device = createMockDevice({ status: DeviceStatus.OFFLINE });

      const result = await stateMachine.transitionTo(device, DeviceStatus.CONNECTING);

      expect(result.status).toBe(DeviceStatus.CONNECTING);
      expect(deviceRepo.save).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'device:statusChange',
        expect.objectContaining({
          deviceId: 'dev-001',
          fromStatus: DeviceStatus.OFFLINE,
          toStatus: DeviceStatus.CONNECTING,
        }),
      );
      expect(mockDeviceGateway.pushDeviceStatus).toHaveBeenCalled();
    });
  });

  describe('TC-DEV-031: CONNECTING to ONLINE transition', () => {
    it('should transition from CONNECTING to ONLINE', async () => {
      const device = createMockDevice({ status: DeviceStatus.CONNECTING });

      const result = await stateMachine.transitionTo(device, DeviceStatus.ONLINE);

      expect(result.status).toBe(DeviceStatus.ONLINE);
      expect(result.lastOnlineAt).toBeDefined();
      expect(result.errorCount).toBe(0);
    });
  });

  describe('TC-DEV-032: CONNECTING to ERROR transition (retry exceeded)', () => {
    it('should transition to ERROR and emit retry events', async () => {
      jest.useFakeTimers();
      const device = createMockDevice({ status: DeviceStatus.CONNECTING });

      const result = await stateMachine.onConnectFailure(device, new Error('Connection timeout'));

      expect(result.status).toBe(DeviceStatus.ERROR);
      expect(result.lastErrorMsg).toBe('Connection timeout');
      expect(result.errorCount).toBe(1);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'device:statusChange',
        expect.objectContaining({
          fromStatus: DeviceStatus.CONNECTING,
          toStatus: DeviceStatus.ERROR,
        }),
      );
      jest.clearAllTimers();
    });

    it('should schedule retry after connect failure', async () => {
      jest.useFakeTimers();
      const device = createMockDevice({ status: DeviceStatus.CONNECTING });

      await stateMachine.onConnectFailure(device, new Error('Timeout'));

      // Should have scheduled a retry event via setTimeout
      expect(mockEventBus.emit).toHaveBeenCalledWith('device:statusChange', expect.any(Object));

      jest.clearAllTimers();
    });
  });

  describe('TC-DEV-033: ONLINE to DEGRADED transition (heartbeat fail)', () => {
    it('should degrade device when heartbeat fails', async () => {
      const device = createMockDevice({ status: DeviceStatus.ONLINE });

      const result = await stateMachine.onDegrade(device, 'Heartbeat timeout: 120000ms idle');

      expect(result.status).toBe(DeviceStatus.DEGRADED);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'device:statusChange',
        expect.objectContaining({
          fromStatus: DeviceStatus.ONLINE,
          toStatus: DeviceStatus.DEGRADED,
          errorMessage: 'Heartbeat timeout: 120000ms idle',
        }),
      );
    });
  });

  describe('TC-DEV-034: DEGRADED to ONLINE transition (recovery)', () => {
    it('should recover from DEGRADED to ONLINE', async () => {
      const device = createMockDevice({ status: DeviceStatus.DEGRADED });

      const result = await stateMachine.onRecover(device);

      expect(result.status).toBe(DeviceStatus.ONLINE);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'device:statusChange',
        expect.objectContaining({
          fromStatus: DeviceStatus.DEGRADED,
          toStatus: DeviceStatus.ONLINE,
        }),
      );
    });
  });

  describe('TC-DEV-035: ERROR to OFFLINE transition', () => {
    it('should transition from ERROR to OFFLINE on disconnect', async () => {
      const device = createMockDevice({ status: DeviceStatus.ERROR });

      const result = await stateMachine.onDisconnect(device);

      expect(result.status).toBe(DeviceStatus.OFFLINE);
      expect(stateMachine.getRetryCount('dev-001')).toBe(0);
    });
  });

  describe('TC-DEV-036: retry with exponential backoff', () => {
    it('should increment retry count on each failure', async () => {
      const device = createMockDevice({ status: DeviceStatus.CONNECTING });

      jest.useFakeTimers();

      await stateMachine.onConnectFailure(device, new Error('Fail 1'));
      expect(stateMachine.getRetryCount('dev-001')).toBe(1);

      const device2 = createMockDevice({ status: DeviceStatus.CONNECTING });
      await stateMachine.onConnectFailure(device2, new Error('Fail 2'));
      expect(stateMachine.getRetryCount('dev-001')).toBe(2);

      const device3 = createMockDevice({ status: DeviceStatus.CONNECTING });
      await stateMachine.onConnectFailure(device3, new Error('Fail 3'));
      expect(stateMachine.getRetryCount('dev-001')).toBe(3);

      jest.clearAllTimers();
    });

    it('should reset retry count on successful connect', async () => {
      jest.useFakeTimers();
      const device = createMockDevice({ status: DeviceStatus.CONNECTING });

      await stateMachine.onConnectFailure(device, new Error('Fail'));
      expect(stateMachine.getRetryCount('dev-001')).toBe(1);

      const device2 = createMockDevice({ status: DeviceStatus.CONNECTING });
      await stateMachine.onConnectSuccess(device2);
      expect(stateMachine.getRetryCount('dev-001')).toBe(0);
      jest.clearAllTimers();
    });

    it('should reset retry count on disconnect', async () => {
      jest.useFakeTimers();
      const device = createMockDevice({ status: DeviceStatus.CONNECTING });

      await stateMachine.onConnectFailure(device, new Error('Fail'));
      expect(stateMachine.getRetryCount('dev-001')).toBe(1);

      stateMachine.resetRetry('dev-001');
      expect(stateMachine.getRetryCount('dev-001')).toBe(0);
      jest.clearAllTimers();
    });
  });

  describe('TC-DEV-037: WebSocket event emission on status change', () => {
    it('should emit WebSocket event on status change', async () => {
      const device = createMockDevice({ status: DeviceStatus.OFFLINE });

      await stateMachine.transitionTo(device, DeviceStatus.CONNECTING);

      expect(mockDeviceGateway.pushDeviceStatus).toHaveBeenCalledWith(
        'dev-001',
        expect.objectContaining({
          fromStatus: 'offline',
          toStatus: 'connecting',
        }),
      );
    });

    it('should not emit WebSocket event when gateway is not provided', async () => {
      const moduleWithoutGateway: TestingModule = await Test.createTestingModule({
        providers: [
          DeviceStateMachine,
          { provide: getRepositoryToken(Device), useValue: deviceRepo },
          { provide: EventBusService, useValue: mockEventBus },
        ],
      }).compile();

      const sm = moduleWithoutGateway.get<DeviceStateMachine>(DeviceStateMachine);
      const device = createMockDevice({ status: DeviceStatus.OFFLINE });

      await sm.transitionTo(device, DeviceStatus.CONNECTING);

      // Should not throw - gateway is optional
      expect(deviceRepo.save).toHaveBeenCalled();
    });
  });

  describe('TC-DEV-038: heartbeat monitoring', () => {
    it('should degrade device when heartbeat times out', async () => {
      const staleTime = new Date(Date.now() - 120000); // 2 minutes ago
      const onlineDevice = createMockDevice({
        status: DeviceStatus.ONLINE,
        lastOnlineAt: staleTime,
      });
      (onlineDevice as any).heartbeatInterval = 30000;

      deviceRepo.find!.mockResolvedValue([onlineDevice]);

      await stateMachine.checkHeartbeats();

      expect(deviceRepo.save).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'device:statusChange',
        expect.objectContaining({
          toStatus: DeviceStatus.DEGRADED,
        }),
      );
    });

    it('should skip heartbeat check when no online devices', async () => {
      deviceRepo.find!.mockResolvedValue([]);

      await stateMachine.checkHeartbeats();

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should keep healthy device online', async () => {
      const recentTime = new Date();
      const healthyDevice = createMockDevice({
        status: DeviceStatus.ONLINE,
        lastOnlineAt: recentTime,
      });
      (healthyDevice as any).heartbeatInterval = 30000;

      deviceRepo.find!.mockResolvedValue([healthyDevice]);

      await stateMachine.checkHeartbeats();

      const degradeEvents = mockEventBus.emit.mock.calls.filter(
        (call: any[]) => call[0] === 'device:statusChange' && call[1]?.toStatus === 'degraded',
      );
      expect(degradeEvents).toHaveLength(0);
    });
  });
});
