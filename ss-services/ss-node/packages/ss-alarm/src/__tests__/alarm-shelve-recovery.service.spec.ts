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
  AlarmCondition: { GT: 'gt', LT: 'lt', EQ: 'eq', NEQ: 'neq', GTE: 'gte', LTE: 'lte' },
  DataQuality: { GOOD: 'good', BAD: 'bad', UNCERTAIN: 'uncertain' },
  DeviceStatus: {
    OFFLINE: 'offline',
    ONLINE: 'online',
    CONNECTING: 'connecting',
    DEGRADED: 'degraded',
    ERROR: 'error',
  },
  SortOrder: { ASC: 'ASC', DESC: 'DESC' },
  PaginationDto: class {},
}));

jest.mock('@ss-node/ss-core', () => ({
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
  ProjectDatabaseService: class {
    getLoadedProjectNames = jest.fn();
    getLoadedSystemDb = jest.fn();
  },
  JwtAuthGuard: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlarmShelveRecoveryService } from '../engine/alarm-shelve-recovery.service';
import { AlarmRecord, AlarmStatus } from '../entities/alarm.entity';
import { Repository } from 'typeorm';
import { EventBusService, ProjectDatabaseService } from '@ss-node/ss-core';
import { ConfigService } from '@nestjs/config';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockRecordRepo(): MockRepository<AlarmRecord> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
}

function makeShelvedRecord(overrides: Partial<AlarmRecord> = {}): AlarmRecord {
  return {
    id: 'record-001',
    rule: null as any,
    ruleId: 'rule-001',
    deviceId: 'device-001',
    deviceName: '泵A',
    tagId: 'tag-001',
    tagName: '温度',
    message: '温度过高',
    triggerValue: '95',
    level: 'warning' as any,
    status: AlarmStatus.SHELVED,
    acknowledgedAt: null,
    acknowledgedBy: null,
    clearedAt: null,
    clearedBy: null,
    shelvedAt: new Date('2026-07-31T10:00:00Z'),
    shelvedBy: 'user-001',
    shelveReason: '维护中',
    shelvedUntil: new Date('2026-07-31T10:30:00Z'), // 已到期
    preShelveStatus: AlarmStatus.ACTIVE,
    alarmType: 'data',
    dispositionType: 'alarm.acknowledged',
    isActive: true,
    clearReason: 'manual',
    recoveredAt: null,
    recoveredValue: null,
    projectId: 'project-001',
    createdAt: new Date('2026-07-31T10:00:00Z'),
    updatedAt: new Date('2026-07-31T10:00:00Z'),
    ...overrides,
  };
}

describe('AlarmShelveRecoveryService', () => {
  let service: AlarmShelveRecoveryService;
  let mockRecordRepo: MockRepository<AlarmRecord>;
  let mockEventBus: { emit: jest.Mock };
  let mockProjectDb: {
    getLoadedProjectNames: jest.Mock;
    getLoadedSystemDb: jest.Mock;
  };
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mockRecordRepo = createMockRecordRepo();
    mockEventBus = { emit: jest.fn() };
    mockProjectDb = {
      getLoadedProjectNames: jest.fn().mockReturnValue([]),
      getLoadedSystemDb: jest.fn().mockReturnValue(undefined),
    };
    // 默认 unified 模式，扫描间隔设大避免触发真实定时器
    mockConfigService = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'PROJECT_DB_MODE') return 'unified';
        if (key === 'ALARM_SHELVE_SCAN_INTERVAL_MS') return 3600000;
        return def;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmShelveRecoveryService,
        { provide: getRepositoryToken(AlarmRecord), useValue: mockRecordRepo },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: ProjectDatabaseService, useValue: mockProjectDb },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AlarmShelveRecoveryService>(AlarmShelveRecoveryService);
  });

  afterEach(() => {
    // 销毁服务以清理 setInterval 定时器
    service.onModuleDestroy();
  });

  // ==================== unified 模式：到期恢复 ====================
  describe('periodicCheck (unified mode)', () => {
    it('TC-ALM-SHR-001: should recover expired shelved alarms and revert to preShelveStatus', async () => {
      const expired = makeShelvedRecord({
        id: 'rec-1',
        preShelveStatus: AlarmStatus.ACKNOWLEDGED,
        shelvedUntil: new Date(Date.now() - 1000), // 已过期
      });
      mockRecordRepo.find!.mockResolvedValue([expired]);
      mockRecordRepo.save!.mockResolvedValue(expired);

      await service.periodicCheck();

      expect(mockRecordRepo.save).toHaveBeenCalledTimes(1);
      const saved = mockRecordRepo.save!.mock.calls[0][0] as AlarmRecord;
      expect(saved.status).toBe(AlarmStatus.ACKNOWLEDGED);
      expect(saved.shelvedUntil).toBeNull();
      expect(saved.preShelveStatus).toBeNull();
      // 暂缓恢复后处置类型更新为 alarm.shelve.expired
      expect(saved.dispositionType).toBe('alarm.shelve.expired');
      // 审计字段保留
      expect(saved.shelvedBy).toBe('user-001');
      expect(saved.shelveReason).toBe('维护中');
    });

    it('TC-ALM-SHR-002: should fall back to ACTIVE when preShelveStatus is null', async () => {
      const expired = makeShelvedRecord({
        id: 'rec-2',
        preShelveStatus: null,
        shelvedUntil: new Date(Date.now() - 1000),
      });
      mockRecordRepo.find!.mockResolvedValue([expired]);
      mockRecordRepo.save!.mockResolvedValue(expired);

      await service.periodicCheck();

      const saved = mockRecordRepo.save!.mock.calls[0][0] as AlarmRecord;
      expect(saved.status).toBe(AlarmStatus.ACTIVE);
    });

    it('TC-ALM-SHR-003: should emit alarm.shelve.expired event on recovery', async () => {
      const expired = makeShelvedRecord({
        id: 'rec-3',
        shelvedUntil: new Date(Date.now() - 1000),
      });
      mockRecordRepo.find!.mockResolvedValue([expired]);
      mockRecordRepo.save!.mockResolvedValue(expired);

      await service.periodicCheck();

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'alarm.shelve.expired',
        expect.objectContaining({
          recordId: 'rec-3',
          recoveredTo: AlarmStatus.ACTIVE,
        }),
      );
    });

    it('TC-ALM-SHR-004: should not recover when no expired shelved alarms exist', async () => {
      mockRecordRepo.find!.mockResolvedValue([]);

      await service.periodicCheck();

      expect(mockRecordRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  // ==================== isolated 模式：跨项目扫描 ====================
  // 注意：dbMode 在构造函数中缓存，需直接 new 一个 isolated 模式实例
  describe('periodicCheck (isolated mode)', () => {
    function makeIsolatedService(): AlarmShelveRecoveryService {
      const isolatedConfig = {
        get: jest.fn((key: string, def?: any) => {
          if (key === 'PROJECT_DB_MODE') return 'isolated';
          if (key === 'ALARM_SHELVE_SCAN_INTERVAL_MS') return 3600000;
          return def;
        }),
      };
      return new AlarmShelveRecoveryService(
        mockRecordRepo as any,
        mockEventBus as any,
        mockProjectDb as any,
        isolatedConfig as any,
      );
    }

    it('TC-ALM-SHR-005: should iterate loaded projects and scan each', async () => {
      const isolatedService = makeIsolatedService();
      mockProjectDb.getLoadedProjectNames.mockReturnValue(['proj-1', 'proj-2']);

      const proj1Repo = createMockRecordRepo();
      const proj2Repo = createMockRecordRepo();
      const expired1 = makeShelvedRecord({
        id: 'p1-rec',
        projectId: 'proj-1',
        shelvedUntil: new Date(Date.now() - 1000),
      });
      const expired2 = makeShelvedRecord({
        id: 'p2-rec',
        projectId: 'proj-2',
        shelvedUntil: new Date(Date.now() - 2000),
      });
      proj1Repo.find!.mockResolvedValue([expired1]);
      proj2Repo.find!.mockResolvedValue([expired2]);
      proj1Repo.save!.mockResolvedValue(expired1);
      proj2Repo.save!.mockResolvedValue(expired2);

      // 模拟每个项目返回独立的 Repository
      mockProjectDb.getLoadedSystemDb.mockImplementation((projectName: string) => {
        if (projectName === 'proj-1') return { getRepository: () => proj1Repo };
        if (projectName === 'proj-2') return { getRepository: () => proj2Repo };
        return undefined;
      });

      await isolatedService.periodicCheck();

      expect(mockProjectDb.getLoadedProjectNames).toHaveBeenCalled();
      expect(proj1Repo.save).toHaveBeenCalledTimes(1);
      expect(proj2Repo.save).toHaveBeenCalledTimes(1);
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2);
    });

    it('TC-ALM-SHR-006: should skip projects with no loaded DataSource', async () => {
      const isolatedService = makeIsolatedService();
      mockProjectDb.getLoadedProjectNames.mockReturnValue(['proj-x']);
      mockProjectDb.getLoadedSystemDb.mockReturnValue(undefined);

      await isolatedService.periodicCheck();

      expect(mockRecordRepo.find).not.toHaveBeenCalled();
    });
  });

  // ==================== 生命周期 ====================
  describe('lifecycle', () => {
    it('TC-ALM-SHR-007: should start and stop periodic timer without throwing', () => {
      expect(() => service.onModuleInit()).not.toThrow();
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});
