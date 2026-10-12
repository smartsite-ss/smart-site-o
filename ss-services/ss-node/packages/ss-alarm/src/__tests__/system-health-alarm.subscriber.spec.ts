// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @ss-node/ss-sdk
// ============================================================
jest.mock('@ss-node/ss-sdk', () => ({
  AlarmLevel: { INFO: 'info', WARNING: 'warning', ERROR: 'error', CRITICAL: 'critical' },
  AlarmStatus: {
    ACTIVE: 'active',
    ACKNOWLEDGED: 'acknowledged',
    CLEARED: 'cleared',
    SHELVED: 'shelved',
  },
  AlarmCondition: {},
  DataQuality: {},
  DeviceStatus: {},
  DeviceType: {},
  SortOrder: { ASC: 'ASC', DESC: 'DESC' },
  PaginationDto: class {},
}));

// ============================================================
// Mock @ss-node/ss-device
// ============================================================
jest.mock('@ss-node/ss-device', () => ({
  DataTag: class {},
  Device: class {},
  DeviceGroup: class {},
  DeviceModule: class {},
  DeviceService: class {},
  TagDataType: {},
  DeadbandMode: {},
  ConversionType: {},
}));

// ============================================================
// Mock @ss-node/ss-collector-sdk
// ============================================================
jest.mock('@ss-node/ss-collector-sdk', () => ({
  PluginRegistry: class {},
  PipelineModule: class {},
  PERSIST_WRITER: 'PERSIST_WRITER',
}));

// ============================================================
// Mock @ss-node/ss-core (SystemEventService, SystemEventLevel, EventBusService)
// ============================================================
const mockSystemEventService = {
  create: jest.fn().mockResolvedValue({ id: 'sys-health-test' }),
  recover: jest.fn().mockResolvedValue({ id: 'sys-health-test' }),
};

jest.mock('@ss-node/ss-core', () => {
  const actual = jest.requireActual('@ss-node/ss-core');
  return {
    ...actual,
    SystemEventService: jest.fn().mockImplementation(() => mockSystemEventService),
  };
});

import { SystemHealthAlarmSubscriber } from '../engine/system-health-alarm.subscriber';

// ============================================================
// Tests
// ============================================================
describe('SystemHealthAlarmSubscriber', () => {
  let subscriber: SystemHealthAlarmSubscriber;
  let mockEventBus: any;
  let degradedHandler: ((event: any) => void) | null;
  let recoveredHandler: ((event: any) => void) | null;

  beforeEach(() => {
    degradedHandler = null;
    recoveredHandler = null;

    mockEventBus = {
      on: jest.fn((event: string, handler: any) => {
        if (event === 'health_degraded') degradedHandler = handler;
        if (event === 'health_recovered') recoveredHandler = handler;
      }),
      off: jest.fn(),
      emit: jest.fn(),
    };

    jest.clearAllMocks();
    subscriber = new SystemHealthAlarmSubscriber(mockEventBus, mockSystemEventService as any);
  });

  describe('onModuleInit', () => {
    it('TC-ALM-HEALTH-001: should subscribe to health_degraded and health_recovered events', () => {
      subscriber.onModuleInit();
      expect(mockEventBus.on).toHaveBeenCalledWith('health_degraded', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('health_recovered', expect.any(Function));
    });

    it('TC-ALM-HEALTH-002: should not subscribe when eventBus is missing', () => {
      const sub = new SystemHealthAlarmSubscriber(undefined, mockSystemEventService as any);
      sub.onModuleInit();
      // no crash expected
    });
  });

  describe('handleHealthDegraded', () => {
    beforeEach(() => {
      subscriber.onModuleInit();
    });

    it('TC-ALM-HEALTH-003: should create system event in global sys_events table', async () => {
      mockSystemEventService.create.mockResolvedValue({ id: 'sys-health-influxdb' });

      await degradedHandler!({
        checks: [
          { name: 'influxdb', status: 'unhealthy', error: 'Connection refused' },
          { name: 'redis', status: 'healthy' },
        ],
        timestamp: 1700000000000,
      });

      expect(mockSystemEventService.create).toHaveBeenCalledTimes(1);
      expect(mockSystemEventService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deterministicId: 'sys-health-influxdb',
          eventType: 'health',
          subType: 'influxdb',
          level: 'critical',
          message: '系统服务异常: influxdb - Connection refused',
          source: 'health-checker',
          metadata: { latency: undefined, timestamp: 1700000000000 },
        }),
      );
    });

    it('TC-ALM-HEALTH-004: should not emit alarm_triggered (global events, not per-project)', async () => {
      mockSystemEventService.create.mockResolvedValue({ id: 'sys-health-redis' });

      await degradedHandler!({
        checks: [{ name: 'redis', status: 'unhealthy', error: 'timeout' }],
        timestamp: 1700000000000,
      });

      // No emit since system events are global, not per-project
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('TC-ALM-HEALTH-005: should create event even if already exists (dedup handled by service)', async () => {
      await degradedHandler!({
        checks: [{ name: 'influxdb', status: 'unhealthy', error: 'down' }],
        timestamp: Date.now(),
      });

      expect(mockSystemEventService.create).toHaveBeenCalledWith(
        expect.objectContaining({ deterministicId: 'sys-health-influxdb' }),
      );
    });

    it('TC-ALM-HEALTH-006: should skip when no unhealthy checks', async () => {
      await degradedHandler!({
        checks: [
          { name: 'influxdb', status: 'healthy' },
          { name: 'redis', status: 'healthy' },
        ],
        timestamp: Date.now(),
      });

      expect(mockSystemEventService.create).not.toHaveBeenCalled();
    });

    it('TC-ALM-HEALTH-007: should handle missing systemEventService gracefully', async () => {
      const sub = new SystemHealthAlarmSubscriber(mockEventBus, undefined);
      sub.onModuleInit();

      // Use degradedHandler (set by last onModuleInit call) to get the subscriber's handler
      await degradedHandler!({
        checks: [{ name: 'influxdb', status: 'unhealthy', error: 'down' }],
        timestamp: Date.now(),
      });

      expect(mockSystemEventService.create).not.toHaveBeenCalled();
    });
  });

  describe('handleHealthRecovered', () => {
    beforeEach(() => {
      subscriber.onModuleInit();
    });

    it('TC-ALM-HEALTH-008: should recover system events by ID', async () => {
      mockSystemEventService.recover.mockResolvedValue({ id: 'sys-health-influxdb' });

      await recoveredHandler!({
        checks: [{ name: 'influxdb', status: 'healthy' }],
        timestamp: Date.now(),
      });

      expect(mockSystemEventService.recover).toHaveBeenCalledWith('sys-health-influxdb');
    });

    it('TC-ALM-HEALTH-009: should recover multiple events', async () => {
      mockSystemEventService.recover.mockResolvedValue({});

      await recoveredHandler!({
        checks: [
          { name: 'influxdb', status: 'healthy' },
          { name: 'redis', status: 'healthy' },
        ],
        timestamp: Date.now(),
      });

      expect(mockSystemEventService.recover).toHaveBeenCalledTimes(2);
      expect(mockSystemEventService.recover).toHaveBeenCalledWith('sys-health-influxdb');
      expect(mockSystemEventService.recover).toHaveBeenCalledWith('sys-health-redis');
    });

    it('TC-ALM-HEALTH-010: should skip non-healthy checks', async () => {
      await recoveredHandler!({
        checks: [
          { name: 'influxdb', status: 'unhealthy' },
          { name: 'redis', status: 'healthy' },
        ],
        timestamp: Date.now(),
      });

      expect(mockSystemEventService.recover).toHaveBeenCalledTimes(1);
      expect(mockSystemEventService.recover).toHaveBeenCalledWith('sys-health-redis');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      subscriber.onModuleInit();
    });

    it('TC-ALM-HEALTH-011: should handle errors gracefully on degraded', async () => {
      mockSystemEventService.create.mockRejectedValue(new Error('DB write failed'));

      // Should not throw
      await degradedHandler!({
        checks: [{ name: 'influxdb', status: 'unhealthy', error: 'down' }],
        timestamp: Date.now(),
      });
    });

    it('TC-ALM-HEALTH-012: should handle errors gracefully on recovered', async () => {
      mockSystemEventService.recover.mockRejectedValue(new Error('DB write failed'));

      // Should not throw
      await recoveredHandler!({
        checks: [{ name: 'influxdb', status: 'healthy' }],
        timestamp: Date.now(),
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('TC-ALM-HEALTH-013: should unsubscribe from both events', () => {
      subscriber.onModuleInit();
      subscriber.onModuleDestroy();
      expect(mockEventBus.off).toHaveBeenCalledWith('health_degraded', expect.any(Function));
      expect(mockEventBus.off).toHaveBeenCalledWith('health_recovered', expect.any(Function));
    });
  });
});
