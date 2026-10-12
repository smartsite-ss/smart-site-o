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
// Mock @ss-node/ss-sdk — entity 文件中 import enums 需要
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
import { AlarmGroupService } from '../group/alarm-group.service';
import { AlarmGroup } from '../entities/alarm-group.entity';
import { AlarmRecord, AlarmStatus, AlarmLevel } from '../entities/alarm.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockGroupRepo(): MockRepository<AlarmGroup> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };
}

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

function makeGroup(overrides: Partial<AlarmGroup> = {}): AlarmGroup {
  return {
    id: 'group-001',
    name: '温度报警组',
    description: '所有温度相关报警',
    parentId: null,
    parent: null,
    projectId: 'project-001',
    sortOrder: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
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
    level: AlarmLevel.WARNING,
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

describe('AlarmGroupService', () => {
  let service: AlarmGroupService;
  let mockGroupRepo: MockRepository<AlarmGroup>;
  let mockRecordRepo: MockRepository<AlarmRecord>;

  beforeEach(async () => {
    mockGroupRepo = createMockGroupRepo();
    mockRecordRepo = createMockRecordRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmGroupService,
        { provide: getRepositoryToken(AlarmGroup), useValue: mockGroupRepo },
        { provide: getRepositoryToken(AlarmRecord), useValue: mockRecordRepo },
      ],
    }).compile();

    service = module.get<AlarmGroupService>(AlarmGroupService);
  });

  // ==================== createGroup ====================
  describe('createGroup', () => {
    it('TC-ALM-050: should create alarm group', async () => {
      const dto = { name: '温度报警组', projectId: 'project-001' };
      const created = makeGroup({ name: '温度报警组' });
      mockGroupRepo.create.mockReturnValue(created);
      mockGroupRepo.save.mockResolvedValue(created);

      const result = await service.createGroup(dto);

      expect(result).toBeDefined();
      expect(result.name).toBe('温度报警组');
      expect(mockGroupRepo.create).toHaveBeenCalledWith({
        name: '温度报警组',
        description: null,
        parentId: null,
        projectId: 'project-001',
        sortOrder: 0,
      });
      expect(mockGroupRepo.save).toHaveBeenCalled();
    });
  });

  // ==================== getGroupTree ====================
  describe('getGroupTree', () => {
    it('TC-ALM-051: should get group tree structure', async () => {
      const groups: AlarmGroup[] = [
        makeGroup({ id: 'g1', name: 'Root', parentId: null, sortOrder: 0 }),
        makeGroup({ id: 'g2', name: 'Child1', parentId: 'g1', sortOrder: 0 }),
        makeGroup({ id: 'g3', name: 'Child2', parentId: 'g1', sortOrder: 1 }),
        makeGroup({ id: 'g4', name: 'Grandchild', parentId: 'g2', sortOrder: 0 }),
      ];
      mockGroupRepo.find.mockResolvedValue(groups);

      const result = await service.getGroupTree('project-001');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Root');
      expect(result[0].level).toBe(0);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].name).toBe('Child1');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].name).toBe('Grandchild');
    });
  });

  // ==================== updateGroup ====================
  describe('updateGroup', () => {
    it('TC-ALM-052: should update group name', async () => {
      const group = makeGroup({ id: 'group-001', name: '旧名称' });
      mockGroupRepo.findOne.mockResolvedValue(group);
      const updated = { ...group, name: '新名称' };
      mockGroupRepo.save.mockResolvedValue(updated);

      const result = await service.updateGroup('group-001', { name: '新名称' });

      expect(result.name).toBe('新名称');
      expect(mockGroupRepo.save).toHaveBeenCalled();
    });
  });

  // ==================== removeGroup ====================
  describe('removeGroup', () => {
    it('TC-ALM-053: should delete group and cascade unlink children', async () => {
      const parent = makeGroup({ id: 'group-001', name: 'Parent' });
      const child1 = makeGroup({ id: 'child-1', parentId: 'group-001' });
      const child2 = makeGroup({ id: 'child-2', parentId: 'group-001' });

      mockGroupRepo.findOne.mockResolvedValueOnce(parent);
      mockGroupRepo.find.mockResolvedValue([child1, child2]);
      mockGroupRepo.save.mockResolvedValue({} as any);
      mockGroupRepo.remove.mockResolvedValue({} as any);

      await service.removeGroup('group-001');

      expect(mockGroupRepo.find).toHaveBeenCalledWith({ where: { parentId: 'group-001' } });
      expect(mockGroupRepo.save).toHaveBeenCalledTimes(2);
      expect(mockGroupRepo.remove).toHaveBeenCalledWith(parent);
    });
  });

  // ==================== batchAcknowledge ====================
  describe('batchAcknowledge', () => {
    it('TC-ALM-054: should batch acknowledge group alarms', async () => {
      const group = makeGroup({ id: 'group-001', name: 'Test Group' });
      const records = [makeRecord({ id: 'rec-1' }), makeRecord({ id: 'rec-2' })];

      mockGroupRepo.findOne.mockResolvedValueOnce(group);
      mockGroupRepo.find.mockResolvedValue([]);
      mockRecordRepo.find.mockResolvedValue(records);
      mockRecordRepo.save.mockResolvedValue({} as any);

      const result = await service.batchAcknowledge('group-001', 'user-001');

      expect(result).toBe(2);
      expect(mockRecordRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== getGroupStats ====================
  describe('getGroupStats', () => {
    it('TC-ALM-055: should get group stats by level', async () => {
      const group = makeGroup({ id: 'group-001', name: 'Stats Group' });
      const records = [
        makeRecord({ id: 'r1', level: AlarmLevel.WARNING }),
        makeRecord({ id: 'r2', level: AlarmLevel.ERROR }),
        makeRecord({ id: 'r3', level: AlarmLevel.WARNING }),
      ];

      mockGroupRepo.findOne.mockResolvedValueOnce(group);
      mockGroupRepo.find.mockResolvedValue([]);
      mockRecordRepo.find.mockResolvedValue(records);

      const stats = await service.getGroupStats('group-001');

      expect(stats.groupId).toBe('group-001');
      expect(stats.total).toBe(3);
      expect(stats[AlarmLevel.WARNING]).toBe(2);
      expect(stats[AlarmLevel.ERROR]).toBe(1);
      expect(stats[AlarmLevel.INFO]).toBe(0);
    });
  });

  // ==================== parent-child relationship ====================
  describe('parent-child group relationship', () => {
    it('TC-ALM-056: should maintain parent-child group relationship', async () => {
      const child = makeGroup({ id: 'child-1', parentId: 'parent-1' });
      const _parent = makeGroup({ id: 'parent-1', parentId: null });

      mockGroupRepo.findOne.mockResolvedValueOnce(child);
      const updated = { ...child, parentId: null };
      mockGroupRepo.save.mockResolvedValue(updated);

      const result = await service.updateGroup('child-1', { parentId: null });

      expect(result.parentId).toBeNull();
      expect(mockGroupRepo.save).toHaveBeenCalled();
    });
  });

  // ==================== reorder groups ====================
  describe('reorder groups', () => {
    it('TC-ALM-057: should reorder groups by sortOrder', async () => {
      const group = makeGroup({ id: 'group-001', sortOrder: 0 });
      mockGroupRepo.findOne.mockResolvedValue(group);
      const updated = { ...group, sortOrder: 5 };
      mockGroupRepo.save.mockResolvedValue(updated);

      const result = await service.updateGroup('group-001', { sortOrder: 5 });

      expect(result.sortOrder).toBe(5);
    });
  });

  // ==================== findOneGroup ====================
  describe('findOneGroup', () => {
    it('should throw NotFoundException when group not found', async () => {
      mockGroupRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneGroup('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
