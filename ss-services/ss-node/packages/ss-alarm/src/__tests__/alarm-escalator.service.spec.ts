// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @ss-node/ss-device — entity 文件中 import DataTag 需要
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
  AlarmCondition: {
    GT: 'gt',
    LT: 'lt',
    EQ: 'eq',
    NEQ: 'neq',
    GTE: 'gte',
    LTE: 'lte',
    RANGE_IN: 'range_in',
    RANGE_OUT: 'range_out',
    RANGE: 'range',
  },
  DataQuality: {
    GOOD: 'good',
    BAD: 'bad',
    UNCERTAIN: 'uncertain',
    COMM_ERROR: 'comm_error',
    CONFIG_ERROR: 'config_error',
    OUT_OF_RANGE: 'out_of_range',
    STALE: 'stale',
    MANUAL: 'manual',
    SIMULATED: 'simulated',
    INITIALIZING: 'initializing',
  },
  DeviceStatus: {
    OFFLINE: 'offline',
    CONNECTING: 'connecting',
    ONLINE: 'online',
    DEGRADED: 'degraded',
    ERROR: 'error',
  },
  DeviceType: {
    MODBUS_TCP: 'modbus_tcp',
    MODBUS_RTU: 'modbus_rtu',
    OPC_UA: 'opc_ua',
    MQTT: 'mqtt',
  },
  SortOrder: { ASC: 'ASC', DESC: 'DESC' },
  PaginationDto: class {},
}));

jest.mock('@ss-node/ss-core', () => ({
  // Stub for ProjectScopedEntity (required by alarm entity import chain)
  ProjectScopedEntity: class {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    projectId: string;
  },
  BaseEntity: class {},
  EventBusService: class {
    emit = jest.fn();
  },
  EventBusModule: class {},
  JwtAuthGuard: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlarmEscalatorService } from '../engine/alarm-escalator.service';
import { AlarmRecord, AlarmStatus, AlarmLevel } from '../entities/alarm.entity';
import { Repository } from 'typeorm';
import { EventBusService } from '@ss-node/ss-core';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockRecordRepo(): MockRepository<AlarmRecord> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };
}

function makeRecord(overrides: Partial<AlarmRecord> = {}): AlarmRecord {
  return {
    id: 'record-001',
    rule: null as any,
    ruleId: 'rule-001',
    deviceId: null,
    deviceName: null,
    tagId: null,
    tagName: null,
    message: '温度过高',
    triggerValue: '95',
    level: AlarmLevel.INFO,
    status: AlarmStatus.ACTIVE,
    acknowledgedAt: null,
    acknowledgedBy: null,
    clearedAt: null,
    clearedBy: null,
    shelvedAt: null,
    shelvedBy: null,
    shelveReason: null,
    shelvedUntil: null,
    preShelveStatus: null,
    alarmType: 'data',
    dispositionType: 'alarm.triggered',
    isActive: true,
    clearReason: 'manual',
    recoveredAt: null,
    recoveredValue: null,
    projectId: 'project-001',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('AlarmEscalatorService', () => {
  let service: AlarmEscalatorService;
  let mockRecordRepo: MockRepository<AlarmRecord>;
  let mockEventBus: { emit: jest.Mock };

  beforeEach(async () => {
    mockRecordRepo = createMockRecordRepo();
    mockEventBus = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmEscalatorService,
        { provide: getRepositoryToken(AlarmRecord), useValue: mockRecordRepo },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<AlarmEscalatorService>(AlarmEscalatorService);
  });

  afterEach(() => {
    jest.useRealTimers();
    service.onModuleDestroy();
  });

  // ==================== TC-ALM-070: escalate after timeout ====================
  it('TC-ALM-070: should escalate after timeout', async () => {
    const record = makeRecord({ id: 'rec-1', level: AlarmLevel.INFO });
    mockRecordRepo.findOne.mockResolvedValue(record);
    mockRecordRepo.save.mockResolvedValue({ ...record, level: AlarmLevel.WARNING });

    await service.escalate('rec-1');

    expect(mockRecordRepo.findOne).toHaveBeenCalledWith({ where: { id: 'rec-1' } });
    expect(mockRecordRepo.save).toHaveBeenCalled();
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'alarm.escalated',
      expect.objectContaining({
        recordId: 'rec-1',
        fromLevel: AlarmLevel.INFO,
        toLevel: AlarmLevel.WARNING,
      }),
    );
  });

  // ==================== TC-ALM-071: cancel escalation on acknowledge ====================
  it('TC-ALM-071: should cancel escalation on acknowledge', async () => {
    jest.useFakeTimers();

    service.startEscalationTimer('rec-1', {
      timeoutMs: 5000,
      escalateToLevel: AlarmLevel.WARNING,
      notifyChannels: ['email'],
    });

    service.cancelEscalationTimer('rec-1');

    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(mockRecordRepo.findOne).not.toHaveBeenCalled();
  });

  // ==================== TC-ALM-072: max 3 escalation levels ====================
  it('TC-ALM-072: should not exceed max 3 escalation levels', async () => {
    const record1 = makeRecord({ id: 'rec-1', level: AlarmLevel.INFO });
    mockRecordRepo.findOne.mockResolvedValue(record1);
    mockRecordRepo.save.mockResolvedValue(record1);

    await service.escalate('rec-1');

    const record2 = makeRecord({ id: 'rec-1', level: AlarmLevel.WARNING });
    mockRecordRepo.findOne.mockResolvedValue(record2);
    mockRecordRepo.save.mockResolvedValue(record2);

    await service.escalate('rec-1');

    const record3 = makeRecord({ id: 'rec-1', level: AlarmLevel.ERROR });
    mockRecordRepo.findOne.mockResolvedValue(record3);
    mockRecordRepo.save.mockResolvedValue(record3);

    await service.escalate('rec-1');

    const chain = service.getEscalationChain('rec-1');
    expect(chain.length).toBeLessThanOrEqual(3);
  });

  // ==================== TC-ALM-073: escalate level increases ====================
  it('TC-ALM-073: should increase alarm level on escalation', async () => {
    const record = makeRecord({ id: 'rec-1', level: AlarmLevel.WARNING });
    mockRecordRepo.findOne.mockResolvedValue(record);
    mockRecordRepo.save.mockImplementation((r) => Promise.resolve(r));

    await service.escalate('rec-1');

    const savedCall = mockRecordRepo.save.mock.calls[0][0];
    expect(savedCall.level).toBe(AlarmLevel.ERROR);
    expect(savedCall.message).toContain('升级');
    expect(savedCall.dispositionType).toBe('alarm.escalated');
  });

  // ==================== TC-ALM-074: escalation chain tracked ====================
  it('TC-ALM-074: should track escalation chain', async () => {
    const record = makeRecord({ id: 'rec-1', level: AlarmLevel.INFO });
    mockRecordRepo.findOne.mockResolvedValue(record);
    mockRecordRepo.save.mockImplementation((r) => Promise.resolve(r));

    await service.escalate('rec-1');

    const chain = service.getEscalationChain('rec-1');
    expect(chain.length).toBeGreaterThan(0);
    expect(chain).toContain(AlarmLevel.INFO);
  });

  // ==================== TC-ALM-075: periodic check triggers escalation ====================
  it('TC-ALM-075: should periodically check and trigger escalation', async () => {
    const records = [makeRecord({ id: 'rec-1', level: AlarmLevel.INFO })];
    mockRecordRepo.find.mockResolvedValue(records);
    mockRecordRepo.findOne.mockResolvedValue(records[0]);
    mockRecordRepo.save.mockImplementation((r) => Promise.resolve(r));

    await service.periodicCheck();

    expect(mockRecordRepo.find).toHaveBeenCalledWith({
      where: { status: AlarmStatus.ACTIVE },
    });
  });

  // ==================== should not escalate non-active alarms ====================
  it('should not escalate when alarm is not active', async () => {
    jest.useFakeTimers();

    const record = makeRecord({
      id: 'rec-1',
      level: AlarmLevel.INFO,
      status: AlarmStatus.ACKNOWLEDGED,
    });
    mockRecordRepo.findOne.mockResolvedValue(record);

    service.startEscalationTimer('rec-1', {
      timeoutMs: 100,
      escalateToLevel: AlarmLevel.WARNING,
      notifyChannels: ['email'],
    });
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(mockRecordRepo.save).not.toHaveBeenCalled();
  });
});
