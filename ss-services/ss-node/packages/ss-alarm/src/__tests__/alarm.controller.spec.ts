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

// ============================================================
// Mock @ss-node/ss-i18n
// ============================================================
jest.mock('@ss-node/ss-i18n', () => ({
  I18nService: class {},
  I18nModule: class {},
}));

// ============================================================
// Mock @ss-node/ss-project
// ============================================================
jest.mock('@ss-node/ss-project', () => ({
  Project: class {},
  Page: class {},
  ProjectModule: class {},
  ProjectService: class {},
}));

// ============================================================
// Mock @nestjs/swagger decorators to avoid runtime decorator issues
// ============================================================
jest.mock('@nestjs/swagger', () => {
  const deco = (): any => (target: any, key?: string, descriptor?: any) => {
    return descriptor ?? target;
  };
  const propDeco = (): any => () => {};
  return {
    ApiTags: (..._tags: string[]) => deco(),
    ApiBearerAuth: () => deco(),
    ApiOperation: (_opts: any) => deco(),
    ApiParam: (_opts: any) => deco(),
    ApiQuery: (_opts: any) => deco(),
    ApiProperty: (_opts?: any) => propDeco(),
    ApiPropertyOptional: (_opts?: any) => propDeco(),
    ApiBody: (_opts?: any) => deco(),
    ApiResponse: (_opts?: any) => deco(),
    PartialType: (cls: any) => cls,
    OmitType: (cls: any, _keys: string[]) => cls,
    PickType: (cls: any, _keys: string[]) => cls,
    IntersectionType: (...classes: any[]) => classes[0],
  };
});

// ============================================================
// Mock @ss-node/ss-core guards
// ============================================================
jest.mock('@ss-node/ss-core', () => {
  const noopDeco = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  class MockJwtAuthGuard {
    canActivate = () => true;
  }
  class MockRolesGuard {
    canActivate = () => true;
  }
  class MockEventBusService {
    on = jest.fn();
    off = jest.fn();
    emit = jest.fn();
  }
  return {
    JwtAuthGuard: MockJwtAuthGuard,
    RolesGuard: MockRolesGuard,
    Roles: (..._roles: any[]) => noopDeco(),
    UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
    EventBusService: MockEventBusService,
    // Stub for ProjectScopedEntity (required by alarm entity import chain)
    ProjectScopedEntity: class {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      projectId: string;
    },
    BaseEntity: class {},
  };
});

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AlarmController } from '../alarm.controller';
import { AlarmService } from '../alarm.service';
import { AlarmEscalationService } from '../alarm-escalation.service';
import { AlarmSuppressionService } from '../alarm-suppression.service';
import { AlarmNotificationService } from '../alarm-notification.service';
import { AlarmStatisticsService } from '../alarm-statistics.service';
import { EventBusService } from '@ss-node/ss-core';
import { NotFoundException } from '@nestjs/common';

// ============================================================
// Mock services
// ============================================================
const mockAlarmService = {
  findAllRules: jest.fn(),
  findOneRule: jest.fn(),
  getRecords: jest.fn(),
  acknowledgeAlarm: jest.fn(),
  clearAlarm: jest.fn(),
  shelveAlarm: jest.fn(),
  batchAcknowledge: jest.fn(),
  batchClear: jest.fn(),
};

const mockEscalationService = {
  checkAndEscalate: jest.fn(),
  getRules: jest.fn(),
};

const mockSuppressionService = {
  getRules: jest.fn(),
  addRule: jest.fn(),
};

const mockNotificationService = {
  getChannels: jest.fn(),
  configureChannel: jest.fn(),
  sendNotification: jest.fn(),
};

const mockStatisticsService = {
  getStatistics: jest.fn(),
  getTrends: jest.fn(),
  getTopRules: jest.fn(),
  exportReport: jest.fn(),
};

const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

// ============================================================
// Tests
// ============================================================
describe('AlarmController', () => {
  let controller: AlarmController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlarmController],
      providers: [
        { provide: AlarmService, useValue: mockAlarmService },
        { provide: AlarmEscalationService, useValue: mockEscalationService },
        { provide: AlarmSuppressionService, useValue: mockSuppressionService },
        { provide: AlarmNotificationService, useValue: mockNotificationService },
        { provide: AlarmStatisticsService, useValue: mockStatisticsService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    controller = module.get<AlarmController>(AlarmController);
    jest.clearAllMocks();
  });

  // ==================== GET /projects/:projectId/alarms/rules ====================
  describe('GET /projects/:projectId/alarms/rules', () => {
    it('TC-ALM-CTL-001: should return all alarm rules for a project', async () => {
      const rules = [
        { id: 'rule-001', name: '温度过高', level: 'warning' },
        { id: 'rule-002', name: '压力过高', level: 'error' },
      ];
      mockAlarmService.findAllRules.mockResolvedValue(rules);

      const result = await controller.getAlarmRules('project-001');

      expect(result).toEqual(rules);
      expect(result).toHaveLength(2);
      expect(mockAlarmService.findAllRules).toHaveBeenCalledWith('project-001');
    });

    it('TC-ALM-CTL-002: should return empty array when no rules exist', async () => {
      mockAlarmService.findAllRules.mockResolvedValue([]);

      const result = await controller.getAlarmRules('empty-project');

      expect(result).toEqual([]);
    });
  });

  // ==================== GET /projects/:projectId/alarms/records ====================
  describe('GET /projects/:projectId/alarms/records', () => {
    it('TC-ALM-CTL-010: should return alarm records for a project', async () => {
      const records = [
        { id: 'record-001', message: '温度过高', status: 'active' },
        { id: 'record-002', message: '压力过高', status: 'acknowledged' },
      ];
      mockAlarmService.getRecords.mockResolvedValue(records);

      const result = await controller.getAlarmRecords('project-001');

      expect(result).toEqual(records);
      expect(result).toHaveLength(2);
      expect(mockAlarmService.getRecords).toHaveBeenCalledWith('project-001', undefined, {
        level: undefined,
        status: undefined,
        keyword: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('TC-ALM-CTL-011: should return empty array when no records exist', async () => {
      mockAlarmService.getRecords.mockResolvedValue([]);

      const result = await controller.getAlarmRecords('empty-project');

      expect(result).toEqual([]);
    });
  });

  // ==================== POST /projects/:projectId/alarms/records/:id/acknowledge ====================
  describe('POST /projects/:projectId/alarms/records/:id/acknowledge', () => {
    it('TC-ALM-CTL-020: should acknowledge an alarm record', async () => {
      const acknowledgedRecord = {
        id: 'record-001',
        status: 'acknowledged',
        acknowledgedBy: 'user-001',
        acknowledgedAt: new Date(),
      };
      mockAlarmService.acknowledgeAlarm.mockResolvedValue(acknowledgedRecord);

      const req = { user: { id: 'user-001' } };
      const result = await controller.acknowledgeAlarm('project-001', 'record-001', req);

      expect(result).toEqual(acknowledgedRecord);
      expect(result.status).toBe('acknowledged');
      expect(mockAlarmService.acknowledgeAlarm).toHaveBeenCalledWith(
        'record-001',
        'user-001',
        'project-001',
      );
      // P0-1: verify emit alarm_acknowledged event
      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm_acknowledged', {
        alarmId: 'record-001',
        projectId: 'project-001',
        acknowledgedBy: 'user-001',
        timestamp: expect.any(Number),
      });
    });

    it('TC-ALM-CTL-021: should propagate NotFoundException from service', async () => {
      mockAlarmService.acknowledgeAlarm.mockRejectedValue(new NotFoundException('报警记录不存在'));

      const req = { user: { id: 'user-001' } };
      await expect(controller.acknowledgeAlarm('project-001', 'non-existent', req)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== POST /projects/:projectId/alarms/records/:id/clear ====================
  describe('POST /projects/:projectId/alarms/records/:id/clear', () => {
    it('TC-ALM-CTL-030: should clear an alarm record', async () => {
      const clearedRecord = {
        id: 'record-001',
        status: 'cleared',
        clearedBy: 'user-001',
        clearedAt: new Date(),
      };
      mockAlarmService.clearAlarm.mockResolvedValue(clearedRecord);

      const req = { user: { id: 'user-001' } };
      const result = await controller.clearAlarm('project-001', 'record-001', req);

      expect(result).toEqual(clearedRecord);
      expect(result.status).toBe('cleared');
      expect(mockAlarmService.clearAlarm).toHaveBeenCalledWith(
        'record-001',
        'user-001',
        'project-001',
      );
      // P0-1: verify emit alarm.cleared event
      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm.cleared', {
        alarmId: 'record-001',
        projectId: 'project-001',
        clearedBy: 'user-001',
        timestamp: expect.any(Number),
      });
    });

    it('TC-ALM-CTL-031: should propagate NotFoundException from service', async () => {
      mockAlarmService.clearAlarm.mockRejectedValue(new NotFoundException('报警记录不存在'));

      const req = { user: { id: 'user-001' } };
      await expect(controller.clearAlarm('project-001', 'non-existent', req)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== POST /projects/:projectId/alarms/records/:id/shelve ====================
  describe('POST /projects/:projectId/alarms/records/:id/shelve', () => {
    it('TC-ALM-CTL-040: should shelve an alarm record with reason', async () => {
      const shelvedRecord = {
        id: 'record-001',
        status: 'shelved',
        shelvedBy: 'user-001',
        shelveReason: '设备维护中',
        shelvedAt: new Date(),
      };
      mockAlarmService.shelveAlarm.mockResolvedValue(shelvedRecord);

      const req = { user: { id: 'user-001' } };
      const result = await controller.shelveAlarm('project-001', 'record-001', req, '设备维护中');

      expect(result).toEqual(shelvedRecord);
      expect(result.status).toBe('shelved');
      expect(result.shelveReason).toBe('设备维护中');
      expect(mockAlarmService.shelveAlarm).toHaveBeenCalledWith(
        'record-001',
        'user-001',
        '设备维护中',
        'project-001',
        undefined,
      );
    });

    it('TC-ALM-CTL-041: should shelve with empty reason when reason is undefined', async () => {
      const shelvedRecord = {
        id: 'record-001',
        status: 'shelved',
        shelvedBy: 'user-001',
        shelveReason: '',
        shelvedAt: new Date(),
      };
      mockAlarmService.shelveAlarm.mockResolvedValue(shelvedRecord);

      const req = { user: { id: 'user-001' } };
      const result = await controller.shelveAlarm('project-001', 'record-001', req, undefined);

      expect(result).toEqual(shelvedRecord);
      expect(mockAlarmService.shelveAlarm).toHaveBeenCalledWith(
        'record-001',
        'user-001',
        '',
        'project-001',
        undefined,
      );
    });

    it('TC-ALM-CTL-042: should propagate NotFoundException from service', async () => {
      mockAlarmService.shelveAlarm.mockRejectedValue(new NotFoundException('报警记录不存在'));

      const req = { user: { id: 'user-001' } };
      await expect(
        controller.shelveAlarm('project-001', 'non-existent', req, 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== POST /projects/:projectId/alarms/records/batch-acknowledge ====================
  describe('POST /projects/:projectId/alarms/records/batch-acknowledge', () => {
    it('TC-ALM-CTL-045: should batch acknowledge alarms and emit events', async () => {
      mockAlarmService.batchAcknowledge = jest.fn().mockResolvedValue(2);
      const req = { user: { id: 'user-001' } };
      const ids = ['rec-001', 'rec-002'];

      const result = await controller.batchAcknowledge('project-001', req, ids);

      expect(result).toBe(2);
      expect(mockAlarmService.batchAcknowledge).toHaveBeenCalledWith(
        ids,
        'user-001',
        'project-001',
      );
      // P0-1: verify emit for each ID
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2);
      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm_acknowledged', {
        alarmId: 'rec-001',
        projectId: 'project-001',
        acknowledgedBy: 'user-001',
        timestamp: expect.any(Number),
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm_acknowledged', {
        alarmId: 'rec-002',
        projectId: 'project-001',
        acknowledgedBy: 'user-001',
        timestamp: expect.any(Number),
      });
    });
  });

  // ==================== POST /projects/:projectId/alarms/records/batch-clear ====================
  describe('POST /projects/:projectId/alarms/records/batch-clear', () => {
    it('TC-ALM-CTL-046: should batch clear alarms and emit events', async () => {
      mockAlarmService.batchClear = jest.fn().mockResolvedValue(2);
      const req = { user: { id: 'user-001' } };
      const ids = ['rec-001', 'rec-002'];

      const result = await controller.batchClear('project-001', req, ids);

      expect(result).toBe(2);
      expect(mockAlarmService.batchClear).toHaveBeenCalledWith(ids, 'user-001', 'project-001');
      // P0-1: verify emit for each ID
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2);
      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm.cleared', {
        alarmId: 'rec-001',
        projectId: 'project-001',
        clearedBy: 'user-001',
        timestamp: expect.any(Number),
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm.cleared', {
        alarmId: 'rec-002',
        projectId: 'project-001',
        clearedBy: 'user-001',
        timestamp: expect.any(Number),
      });
    });
  });

  // ==================== POST /projects/:projectId/alarms/escalate ====================
  describe('POST /projects/:projectId/alarms/escalate', () => {
    it('TC-ALM-CTL-050: should trigger escalation check', async () => {
      mockEscalationService.checkAndEscalate.mockResolvedValue(3);

      const result = await controller.triggerEscalation();

      expect(result).toBe(3);
      expect(mockEscalationService.checkAndEscalate).toHaveBeenCalled();
    });

    it('TC-ALM-CTL-051: should return 0 when no alarms escalated', async () => {
      mockEscalationService.checkAndEscalate.mockResolvedValue(0);

      const result = await controller.triggerEscalation();

      expect(result).toBe(0);
    });
  });

  // ==================== GET /projects/:projectId/alarms/escalation-rules ====================
  describe('GET /projects/:projectId/alarms/escalation-rules', () => {
    it('TC-ALM-CTL-060: should return escalation rules', async () => {
      const rules = [
        { id: 'esc-001', name: 'Info → Warning', delayMs: 300000 },
        { id: 'esc-002', name: 'Warning → Error', delayMs: 180000 },
      ];
      mockEscalationService.getRules.mockReturnValue(rules);

      const result = await controller.getEscalationRules();

      expect(result).toEqual(rules);
      expect(result).toHaveLength(2);
      expect(mockEscalationService.getRules).toHaveBeenCalled();
    });
  });

  // ==================== GET /projects/:projectId/alarms/suppression-rules ====================
  describe('GET /projects/:projectId/alarms/suppression-rules', () => {
    it('TC-ALM-CTL-070: should return suppression rules', async () => {
      const rules = [{ id: 'sup-001', name: '维护模式', type: 'maintenance' }];
      mockSuppressionService.getRules.mockReturnValue(rules);

      const result = await controller.getSuppressionRules();

      expect(result).toEqual(rules);
      expect(mockSuppressionService.getRules).toHaveBeenCalled();
    });

    it('TC-ALM-CTL-071: should return empty array when no suppression rules', async () => {
      mockSuppressionService.getRules.mockReturnValue([]);

      const result = await controller.getSuppressionRules();

      expect(result).toEqual([]);
    });
  });

  // ==================== POST /projects/:projectId/alarms/suppression-rules ====================
  describe('POST /projects/:projectId/alarms/suppression-rules', () => {
    it('TC-ALM-CTL-080: should add a suppression rule', async () => {
      const rule = {
        id: 'sup-001',
        name: '维护模式',
        type: 'maintenance',
        targetIds: ['tag-001'],
        suppressAlarms: true,
        suppressNotifications: false,
      };
      mockSuppressionService.addRule.mockReturnValue(undefined);

      const result = await controller.addSuppressionRule(rule);

      expect(result).toEqual({ ok: true });
      expect(mockSuppressionService.addRule).toHaveBeenCalledWith(rule);
    });
  });

  // ==================== GET /projects/:projectId/alarms/statistics ====================
  describe('GET /projects/:projectId/alarms/statistics', () => {
    it('TC-ALM-CTL-090: should return alarm statistics', async () => {
      const stats = {
        total: 100,
        active: 5,
        acknowledged: 10,
        cleared: 80,
        shelved: 5,
        byLevel: { info: 20, warning: 50, error: 25, critical: 5 },
        byStatus: { active: 5, acknowledged: 10, cleared: 80, shelved: 5 },
      };
      mockStatisticsService.getStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics('project-001');

      expect(result).toEqual(stats);
      expect(result.total).toBe(100);
      expect(mockStatisticsService.getStatistics).toHaveBeenCalledWith('project-001');
    });
  });

  // ==================== GET /projects/:projectId/alarms/trends ====================
  describe('GET /projects/:projectId/alarms/trends', () => {
    it('TC-ALM-CTL-100: should return alarm trends with default 7 days', async () => {
      const trends = [
        { date: '2025-01-01', count: 5, level: 'warning' },
        { date: '2025-01-02', count: 3, level: 'warning' },
      ];
      mockStatisticsService.getTrends.mockResolvedValue(trends);

      const result = await controller.getTrends('project-001');

      expect(result).toEqual(trends);
      expect(mockStatisticsService.getTrends).toHaveBeenCalledWith('project-001', 7);
    });

    it('TC-ALM-CTL-101: should use custom days when provided', async () => {
      mockStatisticsService.getTrends.mockResolvedValue([]);

      await controller.getTrends('project-001', '30');

      expect(mockStatisticsService.getTrends).toHaveBeenCalledWith('project-001', 30);
    });

    it('TC-ALM-CTL-102: should pass NaN when days is not a valid number', async () => {
      mockStatisticsService.getTrends.mockResolvedValue([]);

      await controller.getTrends('project-001', 'invalid');

      expect(mockStatisticsService.getTrends).toHaveBeenCalledWith('project-001', NaN);
    });
  });

  // ==================== GET /projects/:projectId/alarms/top-rules ====================
  describe('GET /projects/:projectId/alarms/top-rules', () => {
    it('TC-ALM-CTL-110: should return top triggered alarm rules', async () => {
      const topRules = [
        { ruleId: 'rule-001', ruleName: '温度过高', count: 50, lastTriggered: new Date() },
        { ruleId: 'rule-002', ruleName: '压力过高', count: 30, lastTriggered: new Date() },
      ];
      mockStatisticsService.getTopRules.mockResolvedValue(topRules);

      const result = await controller.getTopRules('project-001');

      expect(result).toEqual(topRules);
      expect(result).toHaveLength(2);
      expect(mockStatisticsService.getTopRules).toHaveBeenCalledWith('project-001');
    });

    it('TC-ALM-CTL-111: should return empty array when no rules', async () => {
      mockStatisticsService.getTopRules.mockResolvedValue([]);

      const result = await controller.getTopRules('empty-project');

      expect(result).toEqual([]);
    });
  });

  // ==================== GET /projects/:projectId/alarms/export ====================
  describe('GET /projects/:projectId/alarms/export', () => {
    it('TC-ALM-CTL-120: should export report in JSON format by default', async () => {
      const jsonReport = JSON.stringify([{ id: 'record-001', level: 'warning' }]);
      mockStatisticsService.exportReport.mockResolvedValue(jsonReport);

      const result = await controller.exportReport('project-001');

      expect(result).toBe(jsonReport);
      expect(mockStatisticsService.exportReport).toHaveBeenCalledWith('project-001', 'json');
    });

    it('TC-ALM-CTL-121: should export report in CSV format when specified', async () => {
      const csvReport = 'ID,级别,状态\nrecord-001,warning,active';
      mockStatisticsService.exportReport.mockResolvedValue(csvReport);

      const result = await controller.exportReport('project-001', 'csv');

      expect(result).toBe(csvReport);
      expect(mockStatisticsService.exportReport).toHaveBeenCalledWith('project-001', 'csv');
    });

    it('TC-ALM-CTL-122: should pass through unknown format as-is', async () => {
      mockStatisticsService.exportReport.mockResolvedValue('{}');

      await controller.exportReport('project-001', 'xml');

      expect(mockStatisticsService.exportReport).toHaveBeenCalledWith('project-001', 'xml');
    });
  });
});
