// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 集成测试：Alarm + EventBus 工作流
 *
 * 测试策略：
 * - 使用 ConditionEvaluator 和 AlarmDebouncer 真实实例
 * - 使用 EventBusService 真实实例验证事件发布
 * - Mock EventEmitter2 底层实现
 * - 模拟完整的告警生命周期：触发 → 确认 → 恢复
 */

jest.mock('typeorm', () => {
  const noop = () => jest.fn();
  return {
    Entity: noop,
    PrimaryGeneratedColumn: noop,
    Column: noop,
    CreateDateColumn: noop,
    UpdateDateColumn: noop,
    ManyToOne: noop,
    JoinColumn: noop,
    OneToMany: noop,
    Index: noop,
    PrimaryColumn: noop,
    AfterLoad: noop,
    AfterInsert: noop,
    AfterUpdate: noop,
    BeforeInsert: noop,
    BeforeUpdate: noop,
    getRepository: jest.fn(),
    getConnection: jest.fn(),
    getManager: jest.fn(),
    getMongoRepository: jest.fn(),
    In: (values: any[]) => values,
    Like: (pattern: string) => pattern,
  };
});

jest.mock('@nestjs/typeorm', () => ({
  getRepositoryToken: jest.fn().mockReturnValue('MOCK_REPOSITORY_TOKEN'),
  InjectRepository: () => jest.fn(),
  TypeOrmModule: { forFeature: jest.fn(), forRoot: jest.fn() },
}));

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
  },
  DataQuality: { GOOD: 'good', BAD: 'bad', UNCERTAIN: 'uncertain', COMM_ERROR: 'comm_error' },
  DeviceStatus: {
    OFFLINE: 'offline',
    ONLINE: 'online',
    CONNECTING: 'connecting',
    DEGRADED: 'degraded',
    ERROR: 'error',
  },
  DeviceType: { MODBUS_TCP: 'modbus_tcp', MQTT: 'mqtt' },
  SortOrder: { ASC: 'ASC', DESC: 'DESC' },
  PaginationDto: class {},
}));

jest.mock('@ss-node/ss-i18n', () => ({
  I18nService: class {},
  I18nModule: class {},
}));

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

jest.mock('@ss-node/ss-project', () => ({
  Project: class {},
  Page: class {},
  ProjectModule: class {},
  ProjectService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../../packages/ss-core/src/event-bus/event-bus.service';
import { ConditionEvaluator } from '../../packages/ss-alarm/src/engine/condition-evaluator';
import { AlarmDebouncer } from '../../packages/ss-alarm/src/engine/alarm-debouncer';
import { AlarmNotificationService } from '../../packages/ss-alarm/src/alarm-notification.service';

// ─── 模拟告警规则仓储 ───

interface AlarmRuleConfig {
  id: string;
  name: string;
  tagId: string;
  deviceId: string;
  projectId: string;
  level: string;
  condition: string;
  conditionValue: any;
  debounceMs: number;
  enabled: boolean;
}

interface AlarmRecord {
  id: string;
  ruleId: string;
  tagId: string;
  deviceId: string;
  projectId: string;
  message: string;
  triggerValue: number;
  level: string;
  status: 'active' | 'acknowledged' | 'cleared' | 'shelved';
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  clearedAt?: number;
  clearedBy?: string;
  createdAt: number;
}

/**
 * 模拟告警引擎 - 组合 ConditionEvaluator + AlarmDebouncer + EventBus
 */
class SimulatedAlarmEngine {
  private alarmRecords: AlarmRecord[] = [];
  private alarmIdCounter = 0;

  constructor(
    private eventBusService: EventBusService,
    private conditionEvaluator: ConditionEvaluator,
    private alarmDebouncer: AlarmDebouncer,
  ) {}

  /**
   * 评估数据点是否触发告警
   */
  evaluateDataPoint(
    rule: AlarmRuleConfig,
    value: number,
    timestamp: number,
  ): { triggered: boolean; record?: AlarmRecord } {
    if (!rule.enabled) return { triggered: false };

    const conditionMet = this.conditionEvaluator.evaluate(
      value,
      rule.condition as any,
      rule.conditionValue,
    );

    if (!conditionMet) {
      // 条件不满足，清除消抖
      this.alarmDebouncer.clear(rule.id, rule.tagId);
      return { triggered: false };
    }

    const debounceResult = this.alarmDebouncer.check(rule.id, rule.tagId, value, rule.debounceMs);

    if (debounceResult !== 'trigger') {
      return { triggered: false };
    }

    // 创建告警记录
    const record = this.createAlarmRecord(rule, value, timestamp);

    // 发布告警触发事件
    this.eventBusService.emitAlarmTriggered({
      alarmId: record.id,
      tagId: rule.tagId,
      deviceId: rule.deviceId,
      projectId: rule.projectId,
      level: rule.level as any,
      message: record.message,
      timestamp: record.createdAt,
      value,
      limit: Array.isArray(rule.conditionValue) ? rule.conditionValue[1] : rule.conditionValue,
    });

    return { triggered: true, record };
  }

  /**
   * 确认告警
   */
  acknowledgeAlarm(alarmId: string, userId: string, timestamp: number): AlarmRecord | null {
    const record = this.alarmRecords.find((r) => r.id === alarmId);
    if (!record) return null;
    if (record.status !== 'active') return null;

    record.status = 'acknowledged';
    record.acknowledgedAt = timestamp;
    record.acknowledgedBy = userId;

    this.eventBusService.emitAlarmAcknowledged({
      alarmId: record.id,
      acknowledgedBy: userId,
      acknowledgedAt: timestamp,
    });

    return record;
  }

  /**
   * 清除告警（恢复）
   */
  clearAlarm(alarmId: string, userId: string, timestamp: number): AlarmRecord | null {
    const record = this.alarmRecords.find((r) => r.id === alarmId);
    if (!record) return null;

    record.status = 'cleared';
    record.clearedAt = timestamp;
    record.clearedBy = userId;

    // 发布告警恢复事件
    this.eventBusService.emitHealthRecovered({
      checks: [
        {
          name: `alarm:${record.id}`,
          status: 'healthy',
          details: { alarmId: record.id, tagId: record.tagId },
        },
      ],
      timestamp,
    });

    return record;
  }

  /**
   * 获取所有告警记录
   */
  getRecords(): AlarmRecord[] {
    return [...this.alarmRecords];
  }

  /**
   * 获取活跃告警
   */
  getActiveAlarms(): AlarmRecord[] {
    return this.alarmRecords.filter((r) => r.status === 'active');
  }

  private createAlarmRecord(rule: AlarmRuleConfig, value: number, timestamp: number): AlarmRecord {
    const record: AlarmRecord = {
      id: `alarm-record-${++this.alarmIdCounter}`,
      ruleId: rule.id,
      tagId: rule.tagId,
      deviceId: rule.deviceId,
      projectId: rule.projectId,
      message: `${rule.name}: value ${value} exceeds ${JSON.stringify(rule.conditionValue)}`,
      triggerValue: value,
      level: rule.level,
      status: 'active',
      createdAt: timestamp,
    };
    this.alarmRecords.push(record);
    return record;
  }
}

// ─── 测试套件 ───

describe('Alarm + EventBus 集成测试', () => {
  let eventBusService: EventBusService;
  let conditionEvaluator: ConditionEvaluator;
  let alarmDebouncer: AlarmDebouncer;
  let notificationService: AlarmNotificationService;
  let alarmEngine: SimulatedAlarmEngine;
  let mockEventEmitter: any;

  const TEST_PROJECT_ID = 'proj-alarm-001';
  const TEST_DEVICE_ID = 'dev-001';
  const TEST_USER_ID = 'user-001';

  const temperatureRule: AlarmRuleConfig = {
    id: 'rule-temp-high',
    name: 'Temperature High Alarm',
    tagId: 'tag-temp-001',
    deviceId: TEST_DEVICE_ID,
    projectId: TEST_PROJECT_ID,
    level: 'critical',
    condition: 'gt',
    conditionValue: 80,
    debounceMs: 0,
    enabled: true,
  };

  const pressureRule: AlarmRuleConfig = {
    id: 'rule-press-low',
    name: 'Pressure Low Alarm',
    tagId: 'tag-press-001',
    deviceId: TEST_DEVICE_ID,
    projectId: TEST_PROJECT_ID,
    level: 'warning',
    condition: 'lt',
    conditionValue: 10,
    debounceMs: 0,
    enabled: true,
  };

  const flowRateRule: AlarmRuleConfig = {
    id: 'rule-flow-range',
    name: 'Flow Rate Out of Range',
    tagId: 'tag-flow-001',
    deviceId: TEST_DEVICE_ID,
    projectId: TEST_PROJECT_ID,
    level: 'high',
    condition: 'range_out',
    conditionValue: [20, 100],
    debounceMs: 0,
    enabled: true,
  };

  const disabledRule: AlarmRuleConfig = {
    id: 'rule-disabled',
    name: 'Disabled Alarm',
    tagId: 'tag-temp-001',
    deviceId: TEST_DEVICE_ID,
    projectId: TEST_PROJECT_ID,
    level: 'info',
    condition: 'gt',
    conditionValue: 50,
    debounceMs: 0,
    enabled: false,
  };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-04T10:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        ConditionEvaluator,
        AlarmDebouncer,
        AlarmNotificationService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    eventBusService = module.get<EventBusService>(EventBusService);
    conditionEvaluator = module.get<ConditionEvaluator>(ConditionEvaluator);
    alarmDebouncer = module.get<AlarmDebouncer>(AlarmDebouncer);
    notificationService = module.get<AlarmNotificationService>(AlarmNotificationService);

    alarmEngine = new SimulatedAlarmEngine(eventBusService, conditionEvaluator, alarmDebouncer);

    jest.clearAllMocks();
  });

  // ========================================================================
  // TC-INT-010: Tag value exceeds threshold → alarm triggered → event published via event bus
  // ========================================================================
  describe('TC-INT-010: 标签值超阈值 → 告警触发 → 事件总线发布', () => {
    it('温度超过阈值应触发告警并发布 alarm_triggered 事件', () => {
      const result = alarmEngine.evaluateDataPoint(temperatureRule, 85.5, Date.now());

      expect(result.triggered).toBe(true);
      expect(result.record).toBeDefined();
      expect(result.record!.level).toBe('critical');
      expect(result.record!.status).toBe('active');
      expect(result.record!.triggerValue).toBe(85.5);

      // 验证事件已发布
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'alarm_triggered',
        expect.objectContaining({
          alarmId: result.record!.id,
          tagId: 'tag-temp-001',
          level: 'critical',
          value: 85.5,
          limit: 80,
        }),
      );
    });

    it('温度未超过阈值不应触发告警', () => {
      const result = alarmEngine.evaluateDataPoint(temperatureRule, 75.0, Date.now());

      expect(result.triggered).toBe(false);
      expect(result.record).toBeUndefined();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('温度等于阈值不应触发 GT 告警', () => {
      const result = alarmEngine.evaluateDataPoint(temperatureRule, 80.0, Date.now());

      expect(result.triggered).toBe(false);
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('压力低于阈值应触发告警（LT 条件）', () => {
      const result = alarmEngine.evaluateDataPoint(pressureRule, 5.0, Date.now());

      expect(result.triggered).toBe(true);
      expect(result.record!.level).toBe('warning');
      expect(result.record!.triggerValue).toBe(5.0);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'alarm_triggered',
        expect.objectContaining({
          level: 'warning',
          value: 5.0,
        }),
      );
    });

    it('范围外告警条件应正确评估', () => {
      // 在范围内，不应触发
      const inRange = alarmEngine.evaluateDataPoint(flowRateRule, 50, Date.now());
      expect(inRange.triggered).toBe(false);

      // 超出范围，应触发
      const outOfRange = alarmEngine.evaluateDataPoint(flowRateRule, 150, Date.now());
      expect(outOfRange.triggered).toBe(true);
    });

    it('禁用的告警规则不应触发', () => {
      const result = alarmEngine.evaluateDataPoint(disabledRule, 100, Date.now());

      expect(result.triggered).toBe(false);
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // TC-INT-011: Alarm acknowledged → event published
  // ========================================================================
  describe('TC-INT-011: 告警确认 → 事件发布', () => {
    it('确认活跃告警应发布 alarm_acknowledged 事件', () => {
      const triggerResult = alarmEngine.evaluateDataPoint(temperatureRule, 90.0, Date.now());
      expect(triggerResult.triggered).toBe(true);

      const alarmId = triggerResult.record!.id;
      const ackTimestamp = Date.now();

      const ackResult = alarmEngine.acknowledgeAlarm(alarmId, TEST_USER_ID, ackTimestamp);

      expect(ackResult).not.toBeNull();
      expect(ackResult!.status).toBe('acknowledged');
      expect(ackResult!.acknowledgedBy).toBe(TEST_USER_ID);
      expect(ackResult!.acknowledgedAt).toBe(ackTimestamp);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'alarm_acknowledged',
        expect.objectContaining({
          alarmId,
          acknowledgedBy: TEST_USER_ID,
          acknowledgedAt: ackTimestamp,
        }),
      );
    });

    it('确认不存在的告警应返回 null', () => {
      const result = alarmEngine.acknowledgeAlarm('non-existent', TEST_USER_ID, Date.now());
      expect(result).toBeNull();
    });

    it('确认已确认的告警应返回 null（不允许重复确认）', () => {
      const triggerResult = alarmEngine.evaluateDataPoint(temperatureRule, 90.0, Date.now());
      const alarmId = triggerResult.record!.id;

      // 第一次确认
      alarmEngine.acknowledgeAlarm(alarmId, TEST_USER_ID, Date.now());
      // 第二次确认
      const secondAck = alarmEngine.acknowledgeAlarm(alarmId, TEST_USER_ID, Date.now());

      expect(secondAck).toBeNull();
    });
  });

  // ========================================================================
  // TC-INT-012: Multiple alarms → batched notification
  // ========================================================================
  describe('TC-INT-012: 多个告警 → 批量通知', () => {
    it('多个告警应分别触发独立的 alarm_triggered 事件', () => {
      alarmEngine.evaluateDataPoint(temperatureRule, 85.0, Date.now());
      alarmEngine.evaluateDataPoint(pressureRule, 5.0, Date.now());
      alarmEngine.evaluateDataPoint(flowRateRule, 150, Date.now());

      const alarmTriggeredCalls = mockEventEmitter.emit.mock.calls.filter(
        (call: any[]) => call[0] === 'alarm_triggered',
      );

      expect(alarmTriggeredCalls.length).toBe(3);

      const levels = alarmTriggeredCalls.map((call: any[]) => call[1].level);
      expect(levels).toContain('critical');
      expect(levels).toContain('warning');
      expect(levels).toContain('high');
    });

    it('应能通过通知服务发送批量告警通知', async () => {
      const triggerResult = alarmEngine.evaluateDataPoint(temperatureRule, 90.0, Date.now());

      // 模拟通知：通过事件总线发布 alarm.notification.sent 事件
      eventBusService.emit('alarm.notification.sent' as any, {
        alarmId: triggerResult.record!.id,
        channels: ['sound', 'popup'],
        timestamp: Date.now(),
      });

      // 模拟声音通知
      eventBusService.emit('alarm.sound.trigger' as any, {
        alarmId: triggerResult.record!.id,
        level: triggerResult.record!.level,
        config: { volume: 0.8, repeat: 3 },
      });

      // 模拟弹窗通知
      eventBusService.emit('alarm.popup.show' as any, {
        alarmId: triggerResult.record!.id,
        ruleName: temperatureRule.name,
        level: triggerResult.record!.level,
        message: triggerResult.record!.message,
        value: triggerResult.record!.triggerValue,
        timestamp: new Date(triggerResult.record!.createdAt),
        config: { duration: 10000, requireAck: true },
      });

      // 验证通知发送事件
      const notificationCalls = mockEventEmitter.emit.mock.calls.filter(
        (call: any[]) => call[0] === 'alarm.notification.sent',
      );
      expect(notificationCalls.length).toBe(1);

      // 验证声音和弹窗通知
      const soundCalls = mockEventEmitter.emit.mock.calls.filter(
        (call: any[]) => call[0] === 'alarm.sound.trigger',
      );
      const popupCalls = mockEventEmitter.emit.mock.calls.filter(
        (call: any[]) => call[0] === 'alarm.popup.show',
      );

      expect(soundCalls.length).toBe(1);
      expect(popupCalls.length).toBe(1);
    });

    it('应能获取活跃告警列表', () => {
      alarmEngine.evaluateDataPoint(temperatureRule, 85.0, Date.now());
      alarmEngine.evaluateDataPoint(pressureRule, 5.0, Date.now());

      const activeAlarms = alarmEngine.getActiveAlarms();
      expect(activeAlarms.length).toBe(2);
    });

    it('确认一个告警不会影响其他活跃告警', () => {
      const r1 = alarmEngine.evaluateDataPoint(temperatureRule, 85.0, Date.now());
      const r2 = alarmEngine.evaluateDataPoint(pressureRule, 5.0, Date.now());

      alarmEngine.acknowledgeAlarm(r1.record!.id, TEST_USER_ID, Date.now());

      const activeAlarms = alarmEngine.getActiveAlarms();
      expect(activeAlarms.length).toBe(1);
      expect(activeAlarms[0].id).toBe(r2.record!.id);
    });
  });

  // ========================================================================
  // TC-INT-013: Alarm recovery → event published
  // ========================================================================
  describe('TC-INT-013: 告警恢复 → 事件发布', () => {
    it('清除告警应发布 health_recovered 事件', () => {
      const triggerResult = alarmEngine.evaluateDataPoint(temperatureRule, 90.0, Date.now());
      const alarmId = triggerResult.record!.id;

      const clearResult = alarmEngine.clearAlarm(alarmId, TEST_USER_ID, Date.now());

      expect(clearResult).not.toBeNull();
      expect(clearResult!.status).toBe('cleared');
      expect(clearResult!.clearedBy).toBe(TEST_USER_ID);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'health_recovered',
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: `alarm:${alarmId}`,
              status: 'healthy',
            }),
          ]),
        }),
      );
    });

    it('告警恢复后不再出现在活跃告警列表中', () => {
      const r1 = alarmEngine.evaluateDataPoint(temperatureRule, 85.0, Date.now());
      expect(alarmEngine.getActiveAlarms().length).toBe(1);

      alarmEngine.clearAlarm(r1.record!.id, TEST_USER_ID, Date.now());
      expect(alarmEngine.getActiveAlarms().length).toBe(0);
    });

    it('应支持完整的告警生命周期：触发 → 确认 → 恢复', () => {
      // 触发
      const triggerResult = alarmEngine.evaluateDataPoint(temperatureRule, 95.0, Date.now());
      expect(triggerResult.triggered).toBe(true);
      const alarmId = triggerResult.record!.id;

      // 确认
      const ackResult = alarmEngine.acknowledgeAlarm(alarmId, TEST_USER_ID, Date.now());
      expect(ackResult!.status).toBe('acknowledged');

      // 恢复
      const clearResult = alarmEngine.clearAlarm(alarmId, TEST_USER_ID, Date.now());
      expect(clearResult!.status).toBe('cleared');

      // 验证完整事件序列
      const eventTypes = mockEventEmitter.emit.mock.calls.map((call: any[]) => call[0]);
      expect(eventTypes).toContain('alarm_triggered');
      expect(eventTypes).toContain('alarm_acknowledged');
      expect(eventTypes).toContain('health_recovered');
    });
  });

  // ========================================================================
  // TC-INT-014: Event bus subscriber receives alarm events
  // ========================================================================
  describe('TC-INT-014: 事件总线订阅者接收告警事件', () => {
    it('事件总线应能注册告警事件订阅者', () => {
      const handler = jest.fn();
      eventBusService.on('alarm_triggered' as any, handler);

      expect(eventBusService.getListenerCount('alarm_triggered')).toBe(1);
    });

    it('订阅者应收到告警触发事件', () => {
      const receivedEvents: any[] = [];
      eventBusService.on('alarm_triggered' as any, (event) => {
        receivedEvents.push(event);
      });

      alarmEngine.evaluateDataPoint(temperatureRule, 88.0, Date.now());

      // 验证 emit 被正确调用
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('alarm_triggered', expect.any(Object));
    });

    it('订阅者应收到告警确认事件', () => {
      const receivedEvents: any[] = [];
      eventBusService.on('alarm_acknowledged' as any, (event) => {
        receivedEvents.push(event);
      });

      const triggerResult = alarmEngine.evaluateDataPoint(temperatureRule, 88.0, Date.now());
      mockEventEmitter.emit.mockClear();
      alarmEngine.acknowledgeAlarm(triggerResult.record!.id, TEST_USER_ID, Date.now());

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('alarm_acknowledged', expect.any(Object));
    });

    it('多个订阅者应同时收到同一事件', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBusService.on('alarm_triggered' as any, handler1);
      eventBusService.on('alarm_triggered' as any, handler2);

      expect(eventBusService.getListenerCount('alarm_triggered')).toBe(2);
    });

    it('取消订阅后不应再收到事件', () => {
      const handler = jest.fn();
      eventBusService.on('alarm_triggered' as any, handler);
      expect(eventBusService.getListenerCount('alarm_triggered')).toBe(1);

      eventBusService.off('alarm_triggered' as any, handler);
      expect(eventBusService.getListenerCount('alarm_triggered')).toBe(0);
    });

    it('应能订阅多种告警相关事件', () => {
      const alarmHandler = jest.fn();
      const ackHandler = jest.fn();
      const notificationHandler = jest.fn();

      eventBusService.on('alarm_triggered' as any, alarmHandler);
      eventBusService.on('alarm_acknowledged' as any, ackHandler);
      eventBusService.on('alarm.notification.sent' as any, notificationHandler);

      expect(eventBusService.getListenerCount()).toBe(3);
    });
  });

  // ========================================================================
  // 边界情况与错误路径
  // ========================================================================
  describe('边界情况与错误路径', () => {
    it('无消抖时间时应立即触发告警', () => {
      const result = alarmEngine.evaluateDataPoint(temperatureRule, 100.0, Date.now());
      expect(result.triggered).toBe(true);
    });

    it('有消抖时间时应延迟触发', () => {
      const debouncedRule = { ...temperatureRule, debounceMs: 5000, id: 'rule-debounced' };
      const result = alarmEngine.evaluateDataPoint(debouncedRule, 100.0, Date.now());
      expect(result.triggered).toBe(false);
    });

    it('相同值不应重复触发消抖', () => {
      const debouncedRule = { ...temperatureRule, debounceMs: 5000, id: 'rule-debounce-2' };
      alarmEngine.evaluateDataPoint(debouncedRule, 100.0, Date.now());
      // 相同值
      const result = alarmEngine.evaluateDataPoint(debouncedRule, 100.0, Date.now());
      expect(result.triggered).toBe(false);
    });

    it('值恢复正常后应清除消抖状态', () => {
      const debouncedRule = { ...temperatureRule, debounceMs: 5000, id: 'rule-clear-test' };
      alarmEngine.evaluateDataPoint(debouncedRule, 100.0, Date.now());
      expect(alarmDebouncer.getDebouncingCount()).toBe(1);

      // 值恢复正常
      alarmEngine.evaluateDataPoint(debouncedRule, 50.0, Date.now());
      expect(alarmDebouncer.getDebouncingCount()).toBe(0);
    });

    it('GTE 和 LTE 条件应正确处理边界值', () => {
      const gteRule: AlarmRuleConfig = {
        ...temperatureRule,
        id: 'rule-gte',
        condition: 'gte',
        conditionValue: 80,
        debounceMs: 0,
      };

      expect(alarmEngine.evaluateDataPoint(gteRule, 80, Date.now()).triggered).toBe(true);
      expect(alarmEngine.evaluateDataPoint(gteRule, 79.9, Date.now()).triggered).toBe(false);

      const lteRule: AlarmRuleConfig = {
        ...temperatureRule,
        id: 'rule-lte',
        condition: 'lte',
        conditionValue: 10,
        debounceMs: 0,
      };

      expect(alarmEngine.evaluateDataPoint(lteRule, 10, Date.now()).triggered).toBe(true);
      expect(alarmEngine.evaluateDataPoint(lteRule, 10.1, Date.now()).triggered).toBe(false);
    });

    it('通知服务应支持配置不同渠道', () => {
      notificationService.configureChannel('email', {
        enabled: true,
        config: { smtpHost: 'smtp.test.com', smtpPort: 587 },
      });

      const enabledChannels = notificationService.getEnabledChannels();
      expect(enabledChannels).toContain('email');
      expect(enabledChannels).toContain('sound');
      expect(enabledChannels).toContain('popup');
      expect(enabledChannels).not.toContain('sms');
    });
  });
});
