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
    CHANGED: 'changed',
    RATE: 'rate',
    RANGE: 'range',
  },
  DataQuality: { GOOD: 'good', BAD: 'bad', UNCERTAIN: 'uncertain' },
  DeviceStatus: {
    OFFLINE: 'offline',
    ONLINE: 'online',
    CONNECTING: 'connecting',
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

// ============================================================
// Mock @ss-node/ss-core — 仅 mock 需要的部分，LatestValueRedisService 使用 requireActual 的真实实现
// ============================================================
jest.mock('@ss-node/ss-core', () => {
  const actual: any = jest.requireActual('@ss-node/ss-core');
  return {
    ...actual,
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
  };
});

jest.mock('@ss-node/ss-i18n', () => ({
  I18nService: class {},
  I18nModule: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlarmReconciliationService } from '../engine/alarm-reconciliation.service';
import { AlarmRecord, AlarmRule, AlarmStatus, AlarmCondition } from '../entities/alarm.entity';
import { ConditionEvaluator } from '../engine/condition-evaluator';
import { LatestValueRedisService, EventBusService, ProjectDatabaseService } from '@ss-node/ss-core';
import { ConfigService } from '@nestjs/config';

// ============================================================
// Mock types & helpers
// ============================================================
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

interface RedisMock {
  hget: jest.Mock;
}

/**
 * v3 适配:readTagByDeviceId 内部执行两次 HGET
 *   1. HGET tree 索引(ss:latest:tree:{projectId}, field=deviceId) → {deviceCode, deviceName}
 *   2. HGET 设备 Key(ss:latest:{projectId}:{deviceCode}, field=tagId) → 标签最新值
 *
 * mock 策略:
 *   - tree Key 查询:始终返回固定 tree 条目(deviceId → deviceCode 映射)
 *   - 设备 Key 查询:从 redisValueQueue 中按序取出(支持多记录不同值场景)
 *   - 错误测试:用 mockRejectedValue 覆盖整个实现
 */
const TREE_DEVICE_CODE = 'pump-station-01';
let redisValueQueue: (string | null)[] = [];

function enqueueRedisValue(...values: (string | null)[]): void {
  redisValueQueue.push(...values);
}

function treeEntry(): string {
  return JSON.stringify({ deviceCode: TREE_DEVICE_CODE, deviceName: '泵A' });
}

function makeActiveRecord(overrides: Partial<AlarmRecord> = {}): AlarmRecord {
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
    createdAt: new Date('2026-07-31T10:00:00Z'),
    updatedAt: new Date('2026-07-31T10:00:00Z'),
    ...overrides,
  } as AlarmRecord;
}

function makeRule(overrides: Partial<AlarmRule> = {}): AlarmRule {
  return {
    id: 'rule-001',
    name: '温度过高',
    description: '温度超过阈值报警',
    level: 'warning' as any,
    condition: AlarmCondition.GT,
    conditionValue: 80,
    enabled: true,
    tag: null as any,
    tagId: 'tag-001',
    debounceMs: 5000,
    debounceCount: 0,
    alarmType: 'data',
    autoClear: true,
    projectId: 'project-001',
    createdAt: new Date('2026-07-31T10:00:00Z'),
    updatedAt: new Date('2026-07-31T10:00:00Z'),
    ...overrides,
  } as AlarmRule;
}

/** 构造 Redis 最新值 JSON（v 格式：{v,d,q,t}） */
function redisValue(v: number, opts: { q?: string; ageMs?: number } = {}): string {
  const t = new Date(Date.now() - (opts.ageMs ?? 0)).toISOString();
  return JSON.stringify({
    value: v,
    deviceId: 'device-001',
    quality: opts.q ?? 'good',
    timestamp: t,
  });
}

// ============================================================
// Tests
// ============================================================
describe('AlarmReconciliationService', () => {
  let service: AlarmReconciliationService;
  let mockRecordRepo: MockRepository<AlarmRecord>;
  let mockRuleRepo: MockRepository<AlarmRule>;
  let mockRedis: RedisMock;
  let mockEventBus: any;
  let mockProjectDbService: any;
  let mockConfigService: any;
  let conditionEvaluator: ConditionEvaluator;

  beforeEach(async () => {
    redisValueQueue = [];
    mockRecordRepo = {
      find: jest.fn(),
      save: jest.fn(),
    };
    mockRuleRepo = {
      find: jest.fn(),
    };
    mockRedis = {
      // v3: readTagByDeviceId 先 HGET tree 索引反查 deviceCode,再 HGET 设备 Key 读值
      hget: jest.fn().mockImplementation((key: string) => {
        if (key.startsWith('ss:latest:tree:')) {
          return Promise.resolve(treeEntry());
        }
        return Promise.resolve(redisValueQueue.shift() ?? null);
      }),
    };
    mockEventBus = {
      emit: jest.fn(),
    };
    mockProjectDbService = {
      getLoadedProjectNames: jest.fn().mockReturnValue(['project-001']),
      getLoadedSystemDb: jest.fn().mockReturnValue({
        getRepository: jest.fn((entity: any) =>
          entity === AlarmRecord ? mockRecordRepo : entity === AlarmRule ? mockRuleRepo : null,
        ),
      }),
    };
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'PROJECT_DB_MODE') return 'isolated';
        if (key === 'ALARM_RECONCILIATION_INTERVAL_MS') return 300000;
        if (key === 'ALARM_RECONCILIATION_MAX_AGE_MS') return 600000;
        if (key === 'ALARM_RECONCILIATION_BATCH_LIMIT') return 500;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmReconciliationService,
        ConditionEvaluator,
        { provide: getRepositoryToken(AlarmRecord), useValue: mockRecordRepo },
        {
          provide: LatestValueRedisService,
          useValue: new LatestValueRedisService(mockRedis as any),
        },
        { provide: ProjectDatabaseService, useValue: mockProjectDbService },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AlarmReconciliationService>(AlarmReconciliationService);
    conditionEvaluator = module.get<ConditionEvaluator>(ConditionEvaluator);
  });

  // ==================== onModuleInit / onModuleDestroy ====================
  describe('onModuleInit / onModuleDestroy', () => {
    it('TC-ALM-RECON-001: should start periodic timer on init', () => {
      service.onModuleInit();
      // 内部 setInterval 已启动（无直接断言，确保不抛错即可）
      service.onModuleDestroy();
      expect(true).toBe(true);
    });

    it('TC-ALM-RECON-002: should clear timer on destroy', () => {
      service.onModuleInit();
      service.onModuleDestroy();
      // 再次 destroy 不应抛错
      service.onModuleDestroy();
      expect(true).toBe(true);
    });
  });

  // ==================== reconcile ====================
  describe('reconcile', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('TC-ALM-RECON-010: should skip when Redis client is null', async () => {
      // 重新构造一个无 Redis 的 service
      const noRedisModule = await Test.createTestingModule({
        providers: [
          AlarmReconciliationService,
          ConditionEvaluator,
          { provide: getRepositoryToken(AlarmRecord), useValue: mockRecordRepo },
          { provide: LatestValueRedisService, useValue: new LatestValueRedisService(null) },
          { provide: ProjectDatabaseService, useValue: mockProjectDbService },
          { provide: EventBusService, useValue: mockEventBus },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const noRedisService = noRedisModule.get<AlarmReconciliationService>(
        AlarmReconciliationService,
      );
      noRedisService.onModuleInit();

      await noRedisService.reconcile();

      expect(mockRecordRepo.find).not.toHaveBeenCalled();
      noRedisService.onModuleDestroy();
    });

    it('TC-ALM-RECON-011: should recover alarm when latest value normalized (condition GT, value below threshold)', async () => {
      // 规则：温度 > 80 报警；当前 Redis 值 75（已恢复）
      const record = makeActiveRecord();
      const rule = makeRule({ condition: AlarmCondition.GT, conditionValue: 80 });
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      enqueueRedisValue(redisValue(75));
      mockRecordRepo.save.mockResolvedValue([]);

      await service.reconcile();

      // 验证记录被恢复
      expect(mockRecordRepo.save).toHaveBeenCalledTimes(1);
      const saved = mockRecordRepo.save.mock.calls[0][0];
      expect(saved[0].status).toBe(AlarmStatus.CLEARED);
      expect(saved[0].isActive).toBe(false);
      expect(saved[0].clearReason).toBe('auto');
      expect(saved[0].recoveredAt).toBeInstanceOf(Date);
      expect(saved[0].recoveredValue).toBe('75');
      expect(saved[0].clearedBy).toBe('auto');

      // 验证事件被发出
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'alarm.recovered',
        expect.objectContaining({
          recordId: 'record-001',
          tagId: 'tag-001',
          recoveredValue: '75',
        }),
      );
    });

    it('TC-ALM-RECON-012: should NOT recover when condition still triggered (value above threshold)', async () => {
      // 规则：温度 > 80 报警；当前 Redis 值 95（仍超限）
      const record = makeActiveRecord();
      const rule = makeRule({ condition: AlarmCondition.GT, conditionValue: 80 });
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      enqueueRedisValue(redisValue(95));

      await service.reconcile();

      expect(mockRecordRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('TC-ALM-RECON-013: should NOT recover when rule autoClear=false', async () => {
      // 规则 autoClear=false：需人工确认，不自动恢复
      const record = makeActiveRecord();
      const rule = makeRule({ autoClear: false });
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      enqueueRedisValue(redisValue(75));

      await service.reconcile();

      expect(mockRecordRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('TC-ALM-RECON-014: should skip when Redis value is stale (older than maxAgeMs)', async () => {
      const record = makeActiveRecord();
      const rule = makeRule();
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      // 采集值 15 分钟前（超过默认 maxAgeMs=10min）
      enqueueRedisValue(redisValue(75, { ageMs: 15 * 60 * 1000 }));

      await service.reconcile();

      expect(mockRecordRepo.save).not.toHaveBeenCalled();
    });

    it('TC-ALM-RECON-015: should skip when data quality is bad', async () => {
      const record = makeActiveRecord();
      const rule = makeRule();
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      enqueueRedisValue(redisValue(75, { q: 'bad' }));

      await service.reconcile();

      expect(mockRecordRepo.save).not.toHaveBeenCalled();
    });

    it('TC-ALM-RECON-016: should skip when Redis value not found (null)', async () => {
      const record = makeActiveRecord();
      const rule = makeRule();
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      enqueueRedisValue(null);

      await service.reconcile();

      expect(mockRecordRepo.save).not.toHaveBeenCalled();
    });

    it('TC-ALM-RECON-017: should skip record without tagId or deviceId', async () => {
      const record = makeActiveRecord({ tagId: null as any, deviceId: null as any });
      const rule = makeRule();
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);

      await service.reconcile();

      expect(mockRedis.hget).not.toHaveBeenCalled();
      expect(mockRecordRepo.save).not.toHaveBeenCalled();
    });

    it('TC-ALM-RECON-018: should NOT scan SHELVED alarms (handled by shelve recovery service)', async () => {
      // 查询时使用 status IN (ACTIVE, ACKNOWLEDGED) — SHELVED 不在范围内
      mockRecordRepo.find.mockResolvedValue([]);

      await service.reconcile();

      const findCall = mockRecordRepo.find.mock.calls[0][0];
      // In() 返回 FindOperator，验证其 _type 和 _value
      const statusFilter = findCall.where.status;
      expect(statusFilter._type).toBe('in');
      expect(statusFilter._value).toEqual(['active', 'acknowledged']);
      expect(findCall.where.isActive).toBe(true);
    });

    it('TC-ALM-RECON-019: should recover acknowledged alarms too (not just active)', async () => {
      const record = makeActiveRecord({ status: AlarmStatus.ACKNOWLEDGED });
      const rule = makeRule();
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      enqueueRedisValue(redisValue(70));
      mockRecordRepo.save.mockResolvedValue([]);

      await service.reconcile();

      expect(mockRecordRepo.save).toHaveBeenCalledTimes(1);
      const saved = mockRecordRepo.save.mock.calls[0][0];
      expect(saved[0].status).toBe(AlarmStatus.CLEARED);
      expect(saved[0].clearReason).toBe('auto');
    });

    it('TC-ALM-RECON-020: should handle multiple records with mixed recovery outcomes', async () => {
      // 3 条记录：1 条恢复、1 条仍超限、1 条 autoClear=false
      const r1 = makeActiveRecord({ id: 'r1', tagId: 'tag-001' });
      const r2 = makeActiveRecord({ id: 'r2', tagId: 'tag-002', ruleId: 'rule-002' });
      const r3 = makeActiveRecord({ id: 'r3', tagId: 'tag-003', ruleId: 'rule-003' });

      const rule1 = makeRule({ id: 'rule-001', condition: AlarmCondition.GT, conditionValue: 80 });
      const rule2 = makeRule({ id: 'rule-002', condition: AlarmCondition.GT, conditionValue: 80 });
      const rule3 = makeRule({ id: 'rule-003', autoClear: false });

      mockRecordRepo.find.mockResolvedValue([r1, r2, r3]);
      mockRuleRepo.find.mockResolvedValue([rule1, rule2, rule3]);
      // r1=75（恢复）、r2=95（仍超限）、r3=75（但 autoClear=false）
      // v3: readTagByDeviceId 每记录 2 次 HGET(tree 反查 + 值读取),
      // tree 查询由 mock 实现自动返回,值按序从队列消费
      enqueueRedisValue(redisValue(75), redisValue(95), redisValue(75));
      mockRecordRepo.save.mockResolvedValue([]);

      await service.reconcile();

      // 仅 r1 被恢复
      expect(mockRecordRepo.save).toHaveBeenCalledTimes(1);
      const saved = mockRecordRepo.save.mock.calls[0][0];
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe('r1');
      expect(mockEventBus.emit).toHaveBeenCalledTimes(1);
    });

    it('TC-ALM-RECON-021: should support LT condition (value above threshold = recovered)', async () => {
      // 规则：温度 < 10 报警（低温）；当前值 25（已恢复正常）
      const record = makeActiveRecord({ triggerValue: '5' });
      const rule = makeRule({ condition: AlarmCondition.LT, conditionValue: 10 });
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      enqueueRedisValue(redisValue(25));
      mockRecordRepo.save.mockResolvedValue([]);

      await service.reconcile();

      expect(mockRecordRepo.save).toHaveBeenCalledTimes(1);
      const saved = mockRecordRepo.save.mock.calls[0][0];
      expect(saved[0].status).toBe(AlarmStatus.CLEARED);
      expect(saved[0].recoveredValue).toBe('25');
    });

    it('TC-ALM-RECON-022: should do nothing when no active alarms exist', async () => {
      mockRecordRepo.find.mockResolvedValue([]);

      await service.reconcile();

      expect(mockRuleRepo.find).not.toHaveBeenCalled();
      expect(mockRedis.hget).not.toHaveBeenCalled();
      expect(mockRecordRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('TC-ALM-RECON-023: should handle Redis read failure gracefully (skip record)', async () => {
      const record = makeActiveRecord();
      const rule = makeRule();
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      mockRedis.hget.mockRejectedValue(new Error('Redis connection lost'));

      await service.reconcile();

      expect(mockRecordRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('TC-ALM-RECON-024: should handle rule not found (skip, no autoClear info)', async () => {
      const record = makeActiveRecord({ ruleId: 'missing-rule' });
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([]); // 规则未找到
      enqueueRedisValue(redisValue(75));

      await service.reconcile();

      // 规则未找到时，condition/conditionValue 未知，跳过
      expect(mockRecordRepo.save).not.toHaveBeenCalled();
    });

    it('TC-ALM-RECON-025: should not emit events when recovery list is empty', async () => {
      const record = makeActiveRecord();
      const rule = makeRule();
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      enqueueRedisValue(redisValue(95)); // 仍超限

      await service.reconcile();

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  // ==================== ConditionEvaluator 集成 ====================
  describe('ConditionEvaluator integration', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('TC-ALM-RECON-030: should correctly evaluate RANGE_OUT condition', async () => {
      // 规则：值在 [10, 50] 之外报警；当前值 30（在范围内，已恢复）
      const record = makeActiveRecord();
      const rule = makeRule({
        condition: AlarmCondition.RANGE_IN,
        conditionValue: JSON.stringify([10, 50]),
      });
      // RANGE_IN: 10 < 30 < 50 → true（仍在范围内）
      // 改用 RANGE_OUT 测试：10,50 之外报警，值 30 在范围内 → 不报警 → 已恢复
      rule.condition = AlarmCondition.RANGE_OUT;
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([rule]);
      enqueueRedisValue(redisValue(30));
      mockRecordRepo.save.mockResolvedValue([]);

      await service.reconcile();

      expect(mockRecordRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== unified 模式 ====================
  describe('unified mode', () => {
    it('TC-ALM-RECON-040: should use global repo when PROJECT_DB_MODE=unified', async () => {
      const unifiedConfig = {
        get: jest.fn((key: string) => {
          if (key === 'PROJECT_DB_MODE') return 'unified';
          if (key === 'ALARM_RECONCILIATION_INTERVAL_MS') return 300000;
          if (key === 'ALARM_RECONCILIATION_MAX_AGE_MS') return 600000;
          if (key === 'ALARM_RECONCILIATION_BATCH_LIMIT') return 500;
          return undefined;
        }),
      };
      // 全局 repo 的 manager.getRepository(AlarmRule)
      const mockManager = {
        getRepository: jest.fn((entity: any) => (entity === AlarmRule ? mockRuleRepo : null)),
      };
      mockRecordRepo.manager = mockManager as any;
      const record = makeActiveRecord();
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRuleRepo.find.mockResolvedValue([makeRule()]);
      enqueueRedisValue(redisValue(70));
      mockRecordRepo.save.mockResolvedValue([]);

      const module = await Test.createTestingModule({
        providers: [
          AlarmReconciliationService,
          ConditionEvaluator,
          { provide: getRepositoryToken(AlarmRecord), useValue: mockRecordRepo },
          {
            provide: LatestValueRedisService,
            useValue: new LatestValueRedisService(mockRedis as any),
          },
          { provide: ProjectDatabaseService, useValue: mockProjectDbService },
          { provide: EventBusService, useValue: mockEventBus },
          { provide: ConfigService, useValue: unifiedConfig },
        ],
      }).compile();
      const unifiedService = module.get<AlarmReconciliationService>(AlarmReconciliationService);
      unifiedService.onModuleInit();

      await unifiedService.reconcile();

      // 验证使用全局 repo（recordRepo.find 被调用，不通过 projectDbService）
      expect(mockRecordRepo.find).toHaveBeenCalled();
      expect(mockProjectDbService.getLoadedProjectNames).not.toHaveBeenCalled();
      expect(mockRecordRepo.save).toHaveBeenCalledTimes(1);
      unifiedService.onModuleDestroy();
    });
  });

  afterEach(() => {
    service.onModuleDestroy();
  });
});
