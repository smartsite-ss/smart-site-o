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
    CHANGED: 'changed',
    RATE: 'rate',
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

// ============================================================
// Mock @ss-node/ss-i18n
// ============================================================
jest.mock('@ss-node/ss-i18n', () => ({
  I18nService: class {},
  I18nModule: class {},
}));

import { AlarmService } from '../alarm.service';
import {
  AlarmRule,
  AlarmRecord,
  AlarmLevel,
  AlarmStatus,
  AlarmCondition,
} from '../entities/alarm.entity';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { I18nService } from '@ss-node/ss-i18n';
import { ProjectDatabaseService } from '@ss-node/ss-core';
import { ConfigService } from '@nestjs/config';

// ============================================================
// Mock types
// ============================================================
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

// ============================================================
// Factory helpers
// ============================================================
function createMockRuleRepo(): MockRepository<AlarmRule> {
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
    count: jest.fn(),
    update: jest.fn(),
  };
}

function makeRule(overrides: Partial<AlarmRule> = {}): AlarmRule {
  return {
    id: 'rule-001',
    name: '温度过高',
    description: '温度超过阈值报警',
    level: AlarmLevel.WARNING,
    condition: AlarmCondition.GT,
    conditionValue: 80,
    enabled: true,
    projectId: 'project-001',
    tag: { id: 'tag-001' } as any,
    tagId: 'tag-001',
    debounceMs: 5000,
    debounceCount: 0,
    alarmType: 'data',
    autoClear: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeRecord(overrides: Partial<AlarmRecord> = {}): AlarmRecord {
  return {
    id: 'record-001',
    rule: makeRule() as any,
    ruleId: 'rule-001',
    deviceId: null,
    deviceName: null,
    tagId: null,
    tagName: null,
    message: '温度值 95 超过阈值 80',
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
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
    ...overrides,
  };
}

// ============================================================
// Mock I18nService
// ============================================================
function createMockI18nService(): I18nService {
  return {
    tSync: jest.fn((key: string, params?: any) => {
      if (key === 'alarm.rule.not_found') return `报警规则不存在: ${params?.id || ''}`;
      if (key === 'alarm.record.not_found') return `报警记录不存在: ${params?.id || ''}`;
      if (key === 'alarm.rule.already_enabled') return `报警规则已启用: ${params?.id || ''}`;
      if (key === 'alarm.rule.already_disabled') return `报警规则已禁用: ${params?.id || ''}`;
      if (key === 'alarm.invalid_transition')
        return `非法状态流转: ${params?.current} -> ${params?.target}`;
      return key;
    }),
  } as any;
}

// ============================================================
// Tests
// ============================================================
describe('AlarmService', () => {
  let service: AlarmService;
  let mockRuleRepo: MockRepository<AlarmRule>;
  let mockRecordRepo: MockRepository<AlarmRecord>;
  let mockI18nService: I18nService;
  let mockProjectDbService: ProjectDatabaseService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockRuleRepo = createMockRuleRepo();
    mockRecordRepo = createMockRecordRepo();
    mockI18nService = createMockI18nService();

    // Mock config: use unified mode so tests exercise the injected repos directly
    mockConfigService = {
      get: jest.fn().mockReturnValue('unified'),
    } as any;

    // Mock ProjectDatabaseService with getSystemDb returning mock repos
    mockProjectDbService = {
      getSystemDb: jest.fn().mockResolvedValue({
        getRepository: jest.fn((entity: any) => {
          if (entity === AlarmRule) return mockRuleRepo;
          if (entity === AlarmRecord) return mockRecordRepo;
          return null;
        }),
      }),
      registerSystemEntities: jest.fn(),
    } as any;

    service = new AlarmService(
      mockRuleRepo as any,
      mockRecordRepo as any,
      mockI18nService,
      mockProjectDbService,
      mockConfigService,
    );
  });

  // ==================== findAllRules ====================
  describe('findAllRules', () => {
    it('TC-ALM-SVC-001: should return all rules for a project with tag relation', async () => {
      const rules = [makeRule({ id: 'rule-001' }), makeRule({ id: 'rule-002', name: '压力过高' })];
      mockRuleRepo.find.mockResolvedValue(rules);

      const result = await service.findAllRules('project-001');

      expect(result).toEqual(rules);
      expect(result).toHaveLength(2);
      expect(mockRuleRepo.find).toHaveBeenCalledWith({
        where: { projectId: 'project-001' },
        relations: ['tag'],
      });
    });

    it('TC-ALM-SVC-002: should return empty array when no rules exist', async () => {
      mockRuleRepo.find.mockResolvedValue([]);

      const result = await service.findAllRules('empty-project');

      expect(result).toEqual([]);
      expect(mockRuleRepo.find).toHaveBeenCalledWith({
        where: { projectId: 'empty-project' },
        relations: ['tag'],
      });
    });
  });

  // ==================== findOneRule ====================
  describe('findOneRule', () => {
    it('TC-ALM-SVC-010: should return rule when found', async () => {
      const rule = makeRule({ id: 'rule-001' });
      mockRuleRepo.findOne.mockResolvedValue(rule);

      const result = await service.findOneRule('rule-001', 'project-001');

      expect(result).toEqual(rule);
      expect(mockRuleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'rule-001', projectId: 'project-001' },
        relations: ['tag'],
      });
    });

    it('TC-ALM-SVC-011: should throw NotFoundException when rule not found', async () => {
      mockRuleRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneRule('non-existent', 'project-001')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOneRule('non-existent', 'project-001')).rejects.toThrow(
        '报警规则不存在',
      );
    });

    it('TC-ALM-SVC-012: should throw NotFoundException when rule belongs to different project', async () => {
      mockRuleRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneRule('rule-001', 'wrong-project')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== getRecords ====================
  describe('getRecords', () => {
    it('TC-ALM-SVC-020: should return records with default limit 50 ordered by DESC', async () => {
      const records = [makeRecord({ id: 'record-001' }), makeRecord({ id: 'record-002' })];
      mockRecordRepo.find.mockResolvedValue(records);

      const result = await service.getRecords('project-001');

      expect(result).toEqual(records);
      expect(mockRecordRepo.find).toHaveBeenCalledWith({
        where: { projectId: 'project-001' },
        order: { createdAt: 'DESC' },
        take: 50,
        relations: ['rule'],
      });
    });

    it('TC-ALM-SVC-021: should use custom limit when provided', async () => {
      mockRecordRepo.find.mockResolvedValue([]);

      await service.getRecords('project-001', 10);

      expect(mockRecordRepo.find).toHaveBeenCalledWith({
        where: { projectId: 'project-001' },
        order: { createdAt: 'DESC' },
        take: 10,
        relations: ['rule'],
      });
    });

    it('TC-ALM-SVC-022: should return empty array when no records exist', async () => {
      mockRecordRepo.find.mockResolvedValue([]);

      const result = await service.getRecords('empty-project');

      expect(result).toEqual([]);
    });

    it('TC-ALM-SVC-023: should return records for a specific project only', async () => {
      const records = [makeRecord({ projectId: 'project-002' })];
      mockRecordRepo.find.mockResolvedValue(records);

      const result = await service.getRecords('project-002');

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('project-002');
    });
  });

  // ==================== acknowledgeAlarm ====================
  describe('acknowledgeAlarm', () => {
    it('TC-ALM-SVC-030: should acknowledge an active alarm', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACTIVE });
      mockRecordRepo.findOne.mockResolvedValue(record);
      const savedRecord = {
        ...record,
        status: AlarmStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedBy: 'user-001',
      };
      mockRecordRepo.save.mockResolvedValue(savedRecord);

      const result = await service.acknowledgeAlarm('record-001', 'user-001', 'project-001');

      expect(result.status).toBe(AlarmStatus.ACKNOWLEDGED);
      expect(result.acknowledgedBy).toBe('user-001');
      expect(result.acknowledgedAt).toBeDefined();
      expect(mockRecordRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'record-001', projectId: 'project-001' },
      });
      expect(mockRecordRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AlarmStatus.ACKNOWLEDGED,
          acknowledgedBy: 'user-001',
        }),
      );
    });

    it('TC-ALM-SVC-031: should throw NotFoundException when record not found', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlarm('non-existent', 'user-001', 'project-001'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.acknowledgeAlarm('non-existent', 'user-001', 'project-001'),
      ).rejects.toThrow('报警记录不存在');
    });

    it('TC-ALM-SVC-032: should throw NotFoundException when record belongs to different project', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlarm('record-001', 'user-001', 'wrong-project'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== clearAlarm ====================
  describe('clearAlarm', () => {
    it('TC-ALM-SVC-040: should clear an acknowledged alarm', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACKNOWLEDGED });
      mockRecordRepo.findOne.mockResolvedValue(record);
      const savedRecord = {
        ...record,
        status: AlarmStatus.CLEARED,
        clearedAt: new Date(),
        clearedBy: 'user-001',
      };
      mockRecordRepo.save.mockResolvedValue(savedRecord);

      const result = await service.clearAlarm('record-001', 'user-001', 'project-001');

      expect(result.status).toBe(AlarmStatus.CLEARED);
      expect(result.clearedBy).toBe('user-001');
      expect(result.clearedAt).toBeDefined();
      expect(mockRecordRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'record-001', projectId: 'project-001' },
      });
      expect(mockRecordRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AlarmStatus.CLEARED,
          clearedBy: 'user-001',
        }),
      );
    });

    it('TC-ALM-SVC-041: should throw NotFoundException when record not found', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null);

      await expect(service.clearAlarm('non-existent', 'user-001', 'project-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== shelveAlarm ====================
  describe('shelveAlarm', () => {
    it('TC-ALM-SVC-050: should shelve an active alarm with reason', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACTIVE });
      mockRecordRepo.findOne.mockResolvedValue(record);
      const savedRecord = {
        ...record,
        status: AlarmStatus.SHELVED,
        shelvedAt: new Date(),
        shelvedBy: 'user-001',
        shelveReason: '设备维护中',
      };
      mockRecordRepo.save.mockResolvedValue(savedRecord);

      const result = await service.shelveAlarm(
        'record-001',
        'user-001',
        '设备维护中',
        'project-001',
      );

      expect(result.status).toBe(AlarmStatus.SHELVED);
      expect(result.shelvedBy).toBe('user-001');
      expect(result.shelveReason).toBe('设备维护中');
      expect(result.shelvedAt).toBeDefined();
      expect(mockRecordRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'record-001', projectId: 'project-001' },
      });
      expect(mockRecordRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AlarmStatus.SHELVED,
          shelvedBy: 'user-001',
          shelveReason: '设备维护中',
        }),
      );
    });

    it('TC-ALM-SVC-051: should shelve with empty reason when reason not provided', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACTIVE });
      mockRecordRepo.findOne.mockResolvedValue(record);
      const savedRecord = {
        ...record,
        status: AlarmStatus.SHELVED,
        shelvedAt: new Date(),
        shelvedBy: 'user-001',
        shelveReason: '',
      };
      mockRecordRepo.save.mockResolvedValue(savedRecord);

      const result = await service.shelveAlarm('record-001', 'user-001', '', 'project-001');

      expect(result.status).toBe(AlarmStatus.SHELVED);
      expect(result.shelveReason).toBe('');
    });

    it('TC-ALM-SVC-052: should throw NotFoundException when record not found', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null);

      await expect(
        service.shelveAlarm('non-existent', 'user-001', 'reason', 'project-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-ALM-SVC-053: should set shelvedUntil and preShelveStatus when durationMs provided', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACTIVE });
      mockRecordRepo.findOne.mockResolvedValue(record);
      mockRecordRepo.save.mockResolvedValue({ ...record, status: AlarmStatus.SHELVED });

      const before = Date.now();
      await service.shelveAlarm('record-001', 'user-001', '维护', 'project-001', 300000);

      expect(mockRecordRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AlarmStatus.SHELVED,
          preShelveStatus: AlarmStatus.ACTIVE,
          shelvedUntil: expect.any(Date),
        }),
      );
      const saved = mockRecordRepo.save.mock.calls[0][0] as AlarmRecord;
      // shelvedUntil ≈ now + 300000ms（允许 ±2s 误差）
      expect(saved.shelvedUntil!.getTime()).toBeGreaterThan(before + 290000);
      expect(saved.shelvedUntil!.getTime()).toBeLessThan(before + 310000);
    });

    it('TC-ALM-SVC-054: should set shelvedUntil to null when durationMs not provided', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACTIVE });
      mockRecordRepo.findOne.mockResolvedValue(record);
      mockRecordRepo.save.mockResolvedValue({ ...record, status: AlarmStatus.SHELVED });

      await service.shelveAlarm('record-001', 'user-001', '维护', 'project-001');

      expect(mockRecordRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AlarmStatus.SHELVED,
          shelvedUntil: null,
          preShelveStatus: AlarmStatus.ACTIVE,
        }),
      );
    });

    it('TC-ALM-SVC-055: should store preShelveStatus as ACKNOWLEDGED when shelving from acknowledged', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACKNOWLEDGED });
      mockRecordRepo.findOne.mockResolvedValue(record);
      mockRecordRepo.save.mockResolvedValue({ ...record, status: AlarmStatus.SHELVED });

      await service.shelveAlarm('record-001', 'user-001', '维护', 'project-001', 60000);

      expect(mockRecordRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AlarmStatus.SHELVED,
          preShelveStatus: AlarmStatus.ACKNOWLEDGED,
        }),
      );
    });
  });

  // ==================== createRule ====================
  describe('createRule', () => {
    it('TC-ALM-SVC-070: should create a new rule with provided data', async () => {
      const inputData = {
        name: '压力过高',
        description: '压力超过阈值',
        level: AlarmLevel.ERROR,
        condition: AlarmCondition.GT,
        conditionValue: 100,
        tagId: 'tag-002',
        debounceMs: 3000,
        debounceCount: 3,
      };
      const createdRule = makeRule({
        id: 'rule-new',
        ...inputData,
        projectId: 'project-001',
      });
      mockRuleRepo.create.mockReturnValue(createdRule);
      mockRuleRepo.save.mockResolvedValue(createdRule);

      const result = await service.createRule('project-001', inputData);

      expect(result).toEqual(createdRule);
      expect(mockRuleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '压力过高',
          level: AlarmLevel.ERROR,
          condition: AlarmCondition.GT,
          conditionValue: 100,
          projectId: 'project-001',
          tagId: 'tag-002',
          debounceMs: 3000,
          debounceCount: 3,
          enabled: true,
        }),
      );
      expect(mockRuleRepo.save).toHaveBeenCalledWith(createdRule);
    });

    it('TC-ALM-SVC-071: should use default values for enabled, debounceMs and debounceCount', async () => {
      const inputData = {
        name: '默认规则',
        condition: AlarmCondition.GT,
        conditionValue: 50,
        tagId: 'tag-001',
      };
      const createdRule = makeRule({ id: 'rule-default', ...inputData });
      mockRuleRepo.create.mockReturnValue(createdRule);
      mockRuleRepo.save.mockResolvedValue(createdRule);

      await service.createRule('project-001', inputData);

      expect(mockRuleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          debounceMs: 5000,
          debounceCount: 0,
        }),
      );
    });
  });

  // ==================== updateRule ====================
  describe('updateRule', () => {
    it('TC-ALM-SVC-080: should update rule fields', async () => {
      const existingRule = makeRule({ id: 'rule-001' });
      mockRuleRepo.findOne.mockResolvedValue(existingRule);
      const updatedRule = { ...existingRule, name: '新名称', level: AlarmLevel.CRITICAL };
      mockRuleRepo.save.mockResolvedValue(updatedRule);

      const result = await service.updateRule('rule-001', 'project-001', {
        name: '新名称',
        level: AlarmLevel.CRITICAL,
      });

      expect(result.name).toBe('新名称');
      expect(result.level).toBe(AlarmLevel.CRITICAL);
      expect(mockRuleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新名称',
          level: AlarmLevel.CRITICAL,
        }),
      );
    });

    it('TC-ALM-SVC-081: should update debounceCount field', async () => {
      const existingRule = makeRule({ id: 'rule-001', debounceCount: 0 });
      mockRuleRepo.findOne.mockResolvedValue(existingRule);
      const updatedRule = { ...existingRule, debounceCount: 5 };
      mockRuleRepo.save.mockResolvedValue(updatedRule);

      const result = await service.updateRule('rule-001', 'project-001', {
        debounceCount: 5,
      });

      expect(result.debounceCount).toBe(5);
    });

    it('TC-ALM-SVC-082: should throw NotFoundException when rule not found', async () => {
      mockRuleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateRule('non-existent', 'project-001', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-ALM-SVC-083: should not modify undefined fields', async () => {
      const existingRule = makeRule({ id: 'rule-001', name: '原名称' });
      mockRuleRepo.findOne.mockResolvedValue(existingRule);
      mockRuleRepo.save.mockImplementation((rule) => Promise.resolve(rule));

      const result = await service.updateRule('rule-001', 'project-001', {
        description: '新描述',
      });

      expect(result.name).toBe('原名称');
      expect(result.description).toBe('新描述');
    });
  });

  // ==================== deleteRule ====================
  describe('deleteRule', () => {
    it('TC-ALM-SVC-090: should delete rule and cascade delete active alarm records', async () => {
      const rule = makeRule({ id: 'rule-001' });
      mockRuleRepo.findOne.mockResolvedValue(rule);
      mockRecordRepo.delete.mockResolvedValue({ affected: 2 });
      mockRuleRepo.remove.mockResolvedValue(rule);

      await service.deleteRule('rule-001', 'project-001');

      expect(mockRecordRepo.delete).toHaveBeenCalledWith({
        ruleId: 'rule-001',
        projectId: 'project-001',
      });
      expect(mockRuleRepo.remove).toHaveBeenCalledWith(rule);
    });

    it('TC-ALM-SVC-091: should throw NotFoundException when rule not found', async () => {
      mockRuleRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteRule('non-existent', 'project-001')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRuleRepo.remove).not.toHaveBeenCalled();
    });
  });

  // ==================== enableRule ====================
  describe('enableRule', () => {
    it('TC-ALM-SVC-100: should enable a disabled rule', async () => {
      const rule = makeRule({ id: 'rule-001', enabled: false });
      mockRuleRepo.findOne.mockResolvedValue(rule);
      const enabledRule = { ...rule, enabled: true };
      mockRuleRepo.save.mockResolvedValue(enabledRule);

      const result = await service.enableRule('rule-001', 'project-001');

      expect(result.enabled).toBe(true);
      expect(mockRuleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    });

    it('TC-ALM-SVC-101: should throw BadRequestException when rule already enabled', async () => {
      const rule = makeRule({ id: 'rule-001', enabled: true });
      mockRuleRepo.findOne.mockResolvedValue(rule);

      await expect(service.enableRule('rule-001', 'project-001')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRuleRepo.save).not.toHaveBeenCalled();
    });

    it('TC-ALM-SVC-102: should throw NotFoundException when rule not found', async () => {
      mockRuleRepo.findOne.mockResolvedValue(null);

      await expect(service.enableRule('non-existent', 'project-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== disableRule ====================
  describe('disableRule', () => {
    it('TC-ALM-SVC-110: should disable an enabled rule and clear active alarms', async () => {
      const rule = makeRule({ id: 'rule-001', enabled: true });
      mockRuleRepo.findOne.mockResolvedValue(rule);
      mockRecordRepo.update.mockResolvedValue({ affected: 1 });
      const disabledRule = { ...rule, enabled: false };
      mockRuleRepo.save.mockResolvedValue(disabledRule);

      const result = await service.disableRule('rule-001', 'project-001');

      expect(result.enabled).toBe(false);
      expect(mockRecordRepo.update).toHaveBeenCalledWith(
        { ruleId: 'rule-001', projectId: 'project-001', status: AlarmStatus.ACTIVE },
        {
          status: AlarmStatus.CLEARED,
          clearedAt: expect.any(Date),
          isActive: false,
          clearReason: 'rule_disabled',
          dispositionType: 'alarm.cleared',
        },
      );
    });

    it('TC-ALM-SVC-111: should throw BadRequestException when rule already disabled', async () => {
      const rule = makeRule({ id: 'rule-001', enabled: false });
      mockRuleRepo.findOne.mockResolvedValue(rule);

      await expect(service.disableRule('rule-001', 'project-001')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRecordRepo.update).not.toHaveBeenCalled();
    });

    it('TC-ALM-SVC-112: should throw NotFoundException when rule not found', async () => {
      mockRuleRepo.findOne.mockResolvedValue(null);

      await expect(service.disableRule('non-existent', 'project-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== State machine validation ====================
  describe('state machine validation', () => {
    it('TC-ALM-SVC-120: should reject clearing an already cleared alarm', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.CLEARED });
      mockRecordRepo.findOne.mockResolvedValue(record);

      await expect(service.clearAlarm('record-001', 'user-001', 'project-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC-ALM-SVC-121: should reject acknowledging a cleared alarm', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.CLEARED });
      mockRecordRepo.findOne.mockResolvedValue(record);

      await expect(
        service.acknowledgeAlarm('record-001', 'user-001', 'project-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-ALM-SVC-122: should reject acknowledging an already acknowledged alarm', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACKNOWLEDGED });
      mockRecordRepo.findOne.mockResolvedValue(record);

      await expect(
        service.acknowledgeAlarm('record-001', 'user-001', 'project-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-ALM-SVC-123: should allow shelving an acknowledged alarm', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACKNOWLEDGED });
      mockRecordRepo.findOne.mockResolvedValue(record);
      mockRecordRepo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.shelveAlarm('record-001', 'user-001', '维护中', 'project-001');

      expect(result.status).toBe(AlarmStatus.SHELVED);
    });

    it('TC-ALM-SVC-124: should allow re-activating a shelved alarm (via acknowledge)', async () => {
      // SHELVED → ACKNOWLEDGED is a valid transition
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.SHELVED });
      mockRecordRepo.findOne.mockResolvedValue(record);
      mockRecordRepo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.acknowledgeAlarm('record-001', 'user-001', 'project-001');

      expect(result.status).toBe(AlarmStatus.ACKNOWLEDGED);
    });

    it('TC-ALM-SVC-125: should allow clearing a shelved alarm', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.SHELVED });
      mockRecordRepo.findOne.mockResolvedValue(record);
      mockRecordRepo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.clearAlarm('record-001', 'user-001', 'project-001');

      expect(result.status).toBe(AlarmStatus.CLEARED);
    });
  });

  // ==================== hasActiveAlarm (duplicate suppression) ====================
  describe('hasActiveAlarm', () => {
    it('TC-ALM-SVC-130: should return true when active alarm exists', async () => {
      mockRecordRepo.count.mockResolvedValue(1);

      const result = await service.hasActiveAlarm('rule-001', 'project-001');

      expect(result).toBe(true);
      expect(mockRecordRepo.count).toHaveBeenCalledWith({
        where: { ruleId: 'rule-001', projectId: 'project-001', status: AlarmStatus.ACTIVE },
      });
    });

    it('TC-ALM-SVC-131: should return false when no active alarm exists', async () => {
      mockRecordRepo.count.mockResolvedValue(0);

      const result = await service.hasActiveAlarm('rule-001', 'project-001');

      expect(result).toBe(false);
    });

    it('TC-ALM-SVC-132: should return false when count is zero for non-existent rule', async () => {
      mockRecordRepo.count.mockResolvedValue(0);

      const result = await service.hasActiveAlarm('non-existent-rule', 'project-001');

      expect(result).toBe(false);
    });
  });

  // ==================== Edge cases ====================
  describe('edge cases', () => {
    it('TC-ALM-SVC-060: should handle multiple rules with different levels', async () => {
      const rules = [
        makeRule({ id: 'rule-001', level: AlarmLevel.INFO }),
        makeRule({ id: 'rule-002', level: AlarmLevel.WARNING }),
        makeRule({ id: 'rule-003', level: AlarmLevel.ERROR }),
        makeRule({ id: 'rule-004', level: AlarmLevel.CRITICAL }),
      ];
      mockRuleRepo.find.mockResolvedValue(rules);

      const result = await service.findAllRules('project-001');

      expect(result).toHaveLength(4);
      expect(result.map((r) => r.level)).toEqual([
        AlarmLevel.INFO,
        AlarmLevel.WARNING,
        AlarmLevel.ERROR,
        AlarmLevel.CRITICAL,
      ]);
    });

    it('TC-ALM-SVC-061: should handle records with various statuses', async () => {
      const records = [
        makeRecord({ id: 'rec-1', status: AlarmStatus.ACTIVE }),
        makeRecord({ id: 'rec-2', status: AlarmStatus.ACKNOWLEDGED }),
        makeRecord({ id: 'rec-3', status: AlarmStatus.CLEARED }),
        makeRecord({ id: 'rec-4', status: AlarmStatus.SHELVED }),
      ];
      mockRecordRepo.find.mockResolvedValue(records);

      const result = await service.getRecords('project-001');

      expect(result).toHaveLength(4);
      expect(result.map((r) => r.status)).toEqual([
        AlarmStatus.ACTIVE,
        AlarmStatus.ACKNOWLEDGED,
        AlarmStatus.CLEARED,
        AlarmStatus.SHELVED,
      ]);
    });
  });

  // ==================== 告警类型与处置类型 (alarmType & dispositionType) ====================
  describe('alarmType & dispositionType', () => {
    it('TC-ALM-TYPE-003: acknowledge should set dispositionType to alarm.acknowledged', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACTIVE });
      mockRecordRepo.findOne.mockResolvedValue(record);
      mockRecordRepo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.acknowledgeAlarm('record-001', 'user-001', 'project-001');

      expect(result.dispositionType).toBe('alarm.acknowledged');
      expect(mockRecordRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ dispositionType: 'alarm.acknowledged' }),
      );
    });

    it('TC-ALM-TYPE-004: clear should set dispositionType to alarm.cleared', async () => {
      const record = makeRecord({ id: 'record-001', status: AlarmStatus.ACKNOWLEDGED });
      mockRecordRepo.findOne.mockResolvedValue(record);
      mockRecordRepo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.clearAlarm('record-001', 'user-001', 'project-001');

      expect(result.dispositionType).toBe('alarm.cleared');
      expect(mockRecordRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ dispositionType: 'alarm.cleared' }),
      );
    });

    it('TC-ALM-TYPE-005a: getRecords should filter by alarmType', async () => {
      const records = [makeRecord({ id: 'rec-1', alarmType: 'device' })];
      mockRecordRepo.find.mockResolvedValue(records);

      await service.getRecords('project-001', undefined, { alarmType: 'device' });

      expect(mockRecordRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ alarmType: 'device' }),
        }),
      );
    });

    it('TC-ALM-TYPE-005b: getRecords should filter by dispositionType', async () => {
      const records = [makeRecord({ id: 'rec-1', dispositionType: 'alarm.acknowledged' })];
      mockRecordRepo.find.mockResolvedValue(records);

      await service.getRecords('project-001', undefined, { dispositionType: 'alarm.acknowledged' });

      expect(mockRecordRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dispositionType: 'alarm.acknowledged' }),
        }),
      );
    });

    it('TC-ALM-TYPE-005c: createRule should accept alarmType and default to data', async () => {
      const createdRule = makeRule({ id: 'rule-new', alarmType: 'device' });
      mockRuleRepo.create.mockReturnValue(createdRule);
      mockRuleRepo.save.mockResolvedValue(createdRule);

      await service.createRule('project-001', {
        name: '设备告警规则',
        condition: AlarmCondition.GT,
        conditionValue: 50,
        tagId: 'tag-001',
        alarmType: 'device',
      } as any);

      expect(mockRuleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ alarmType: 'device' }),
      );
    });

    it('TC-ALM-TYPE-005d: createRule should default alarmType to data when not provided', async () => {
      const createdRule = makeRule({ id: 'rule-default' });
      mockRuleRepo.create.mockReturnValue(createdRule);
      mockRuleRepo.save.mockResolvedValue(createdRule);

      await service.createRule('project-001', {
        name: '默认规则',
        condition: AlarmCondition.GT,
        conditionValue: 50,
        tagId: 'tag-001',
      } as any);

      expect(mockRuleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ alarmType: 'data' }),
      );
    });
  });

  // ==================== batchAcknowledgeIdempotent（二期 07 #10） ====================
  describe('batchAcknowledgeIdempotent', () => {
    it('TC-ALM-BATCH-101: 相同 requestId 重复请求直接返回首次结果（幂等重放）', async () => {
      const record = makeRecord({ id: 'rec-1', status: AlarmStatus.ACTIVE });
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRecordRepo.save.mockImplementation(async (records: any) => records);

      const first = await service.batchAcknowledgeIdempotent(
        ['rec-1'],
        'user-1',
        'project-001',
        'req-1',
      );
      const second = await service.batchAcknowledgeIdempotent(
        ['rec-1'],
        'user-1',
        'project-001',
        'req-1',
      );

      expect(first.succeeded).toEqual(['rec-1']);
      expect(second).toBe(first);
      // 重放不再查库/不再写库，避免重复确认
      expect(mockRecordRepo.find).toHaveBeenCalledTimes(1);
      expect(mockRecordRepo.save).toHaveBeenCalledTimes(1);
    });

    it('TC-ALM-BATCH-102: 幂等缓存超过 10 分钟 TTL 后重新执行', async () => {
      const record = makeRecord({ id: 'rec-1', status: AlarmStatus.ACTIVE });
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRecordRepo.save.mockImplementation(async (records: any) => records);

      const nowSpy = jest.spyOn(Date, 'now');
      const base = 1_700_000_000_000;
      nowSpy.mockReturnValue(base);
      await service.batchAcknowledgeIdempotent(['rec-1'], 'user-1', 'project-001', 'req-1');

      // 模拟记录被外部重置后再次以相同 requestId 请求（已超 10 分钟）
      record.status = AlarmStatus.ACTIVE;
      nowSpy.mockReturnValue(base + 11 * 60 * 1000);
      const second = await service.batchAcknowledgeIdempotent(
        ['rec-1'],
        'user-1',
        'project-001',
        'req-1',
      );

      expect(mockRecordRepo.find).toHaveBeenCalledTimes(2);
      expect(second.succeeded).toEqual(['rec-1']);
      nowSpy.mockRestore();
    });

    it('TC-ALM-BATCH-103: 部分失败分类（已确认/已清除/非法状态/不存在）不整体报错', async () => {
      mockRecordRepo.find.mockResolvedValue([
        makeRecord({ id: 'rec-active', status: AlarmStatus.ACTIVE }),
        makeRecord({ id: 'rec-ack', status: AlarmStatus.ACKNOWLEDGED }),
        makeRecord({ id: 'rec-cleared', status: AlarmStatus.CLEARED }),
        makeRecord({ id: 'rec-shelved', status: AlarmStatus.SHELVED }),
      ]);
      mockRecordRepo.save.mockImplementation(async (records: any) => records);

      const result = await service.batchAcknowledgeIdempotent(
        ['rec-active', 'rec-ack', 'rec-cleared', 'rec-shelved', 'rec-missing'],
        'user-1',
        'project-001',
        'req-partial',
      );

      expect(result.succeeded).toEqual(['rec-active']);
      expect(result.failed).toEqual([
        { alarmRecordId: 'rec-ack', reason: 'already_acknowledged' },
        { alarmRecordId: 'rec-cleared', reason: 'already_cleared' },
        { alarmRecordId: 'rec-shelved', reason: 'invalid_status' },
        { alarmRecordId: 'rec-missing', reason: 'not_found' },
      ]);
      // 仅保存成功项，且携带确认人/处置类型
      expect(mockRecordRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'rec-active',
          status: AlarmStatus.ACKNOWLEDGED,
          acknowledgedBy: 'user-1',
          dispositionType: 'alarm.acknowledged',
        }),
      ]);
    });

    it('TC-ALM-BATCH-104: 重复 ID 去重后仅确认一次', async () => {
      const record = makeRecord({ id: 'rec-1', status: AlarmStatus.ACTIVE });
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRecordRepo.save.mockImplementation(async (records: any) => records);

      const result = await service.batchAcknowledgeIdempotent(
        ['rec-1', 'rec-1'],
        'user-1',
        'project-001',
        'req-dup',
      );

      expect(result.succeeded).toEqual(['rec-1']);
      expect(result.failed).toEqual([]);
      expect(mockRecordRepo.save).toHaveBeenCalledWith([expect.objectContaining({ id: 'rec-1' })]);
    });

    it('TC-ALM-BATCH-105: 不携带 requestId 时不缓存（每次执行）', async () => {
      const record = makeRecord({ id: 'rec-1', status: AlarmStatus.ACTIVE });
      mockRecordRepo.find.mockResolvedValue([record]);
      mockRecordRepo.save.mockImplementation(async (records: any) => records);

      await service.batchAcknowledgeIdempotent(['rec-1'], 'user-1', 'project-001');
      record.status = AlarmStatus.ACTIVE;
      await service.batchAcknowledgeIdempotent(['rec-1'], 'user-1', 'project-001');

      expect(mockRecordRepo.find).toHaveBeenCalledTimes(2);
    });

    it('TC-ALM-BATCH-106: 空 ID 列表返回空结果且不写库', async () => {
      mockRecordRepo.find.mockResolvedValue([]);

      const result = await service.batchAcknowledgeIdempotent(
        [],
        'user-1',
        'project-001',
        'req-empty',
      );

      expect(result.succeeded).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(mockRecordRepo.save).not.toHaveBeenCalled();
    });
  });
});
