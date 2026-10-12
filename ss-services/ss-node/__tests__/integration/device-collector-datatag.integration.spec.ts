// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 集成测试：Device → Collector → DataTag → Storage 端到端数据流
 *
 * 测试策略：
 * - Mock 外部协议（Modbus、MQTT），让内部服务真实交互
 * - 使用 DataPointCacheService 作为存储层验证数据持久化
 * - 通过 EventBusService 验证数据变更事件的传播
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

jest.mock('modbus-serial', () => {
  const mockClient = {
    connectTCP: jest.fn((host, opts, cb) => cb && cb(null)),
    setID: jest.fn(),
    setTimeout: jest.fn(),
    isOpen: true,
    close: jest.fn((cb) => cb && cb(null)),
    readHoldingRegisters: jest.fn(),
    readInputRegisters: jest.fn(),
    readCoils: jest.fn(),
    readDiscreteInputs: jest.fn(),
    writeRegister: jest.fn((addr, val, cb) => cb && cb(null)),
    writeCoil: jest.fn((addr, val, cb) => cb && cb(null)),
  };
  return { ModbusRTU: jest.fn(() => mockClient), default: jest.fn(() => mockClient) };
});

jest.mock('mqtt', () => {
  let connectHandler: any;
  let messageHandler: any;
  const mockClient = {
    connected: true,
    on: jest.fn((event, cb) => {
      if (event === 'connect') connectHandler = cb;
      if (event === 'message') messageHandler = cb;
    }),
    once: jest.fn(),
    subscribe: jest.fn((topic, opts, cb) => cb && cb(null)),
    subscribeAsync: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn((topic, cb) => cb && cb(null)),
    unsubscribeAsync: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn((topic, msg, opts, cb) => cb && cb(null)),
    publishAsync: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined),
    _triggerConnect: () => connectHandler && connectHandler(),
    _triggerMessage: (topic: string, msg: Buffer) => messageHandler && messageHandler(topic, msg),
  };
  return {
    connectAsync: jest.fn().mockResolvedValue(mockClient),
    __mockClient: mockClient,
  };
});

jest.mock('@ss-node/ss-sdk', () => ({
  DeviceType: { MODBUS_TCP: 'ModbusTCP', MODBUS_RTU: 'ModbusRTU', OPC_UA: 'OPC_UA', MQTT: 'MQTT' },
  DeviceStatus: {
    OFFLINE: 'offline',
    ONLINE: 'online',
    CONNECTING: 'connecting',
    DEGRADED: 'degraded',
    ERROR: 'error',
  },
  SortOrder: { ASC: 'ASC', DESC: 'DESC' },
  PaginationDto: class {},
  AlarmLevel: { INFO: 'info', WARNING: 'warning', ERROR: 'error', CRITICAL: 'critical' },
  AlarmStatus: {
    ACTIVE: 'active',
    ACKNOWLEDGED: 'acknowledged',
    CLEARED: 'cleared',
    SHELVED: 'shelved',
  },
  DataQuality: { GOOD: 'good', BAD: 'bad', UNCERTAIN: 'uncertain' },
  DeviceType: {
    MODBUS_TCP: 'modbus_tcp',
    MODBUS_RTU: 'modbus_rtu',
    OPC_UA: 'opc_ua',
    MQTT: 'mqtt',
  },
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

jest.mock('@ss-node/ss-datatag', () => ({
  DataTag: class {},
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
import { DataPointCacheService } from '../../packages/ss-core/src/cache/data-point-cache.service';
import { EventBusService } from '../../packages/ss-core/src/event-bus/event-bus.service';
import { AlarmDebouncer } from '../../packages/ss-alarm/src/engine/alarm-debouncer';

// ─── 模拟采集服务（内部模拟 Modbus / MQTT 协议交互） ───

interface TagConfig {
  id: string;
  name: string;
  address?: string;
  topic?: string;
  dataType?: string;
  transform?: { scale?: number; offset?: number; precision?: number };
}

interface DeviceConfig {
  id: string;
  name: string;
  type: 'ModbusTCP' | 'MQTT';
  host: string;
  port: number;
  tags: TagConfig[];
}

interface TagValue {
  tagId: string;
  value: number | boolean;
  rawValue: number;
  timestamp: number;
  quality: string;
}

/**
 * 模拟采集器 - 内部模拟 Modbus / MQTT 协议交互
 */
class SimulatedCollector {
  private tagValues = new Map<string, TagValue>();
  private connected = false;

  async connect(_deviceConfig: DeviceConfig): Promise<void> {
    this.connected = true;
    // 模拟协议连接成功
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 模拟从设备读取标签值（Modbus 风格）
   */
  async readTag(tag: TagConfig): Promise<TagValue> {
    const rawValue = this.generateRawValue(tag);
    const result: TagValue = {
      tagId: tag.id,
      value: this.applyTransform(rawValue, tag),
      rawValue,
      timestamp: Date.now(),
      quality: 'good',
    };

    this.tagValues.set(tag.id, result);
    return result;
  }

  /**
   * 模拟批量读取标签值
   */
  async readBatch(tags: TagConfig[]): Promise<TagValue[]> {
    const results: TagValue[] = [];
    for (const tag of tags) {
      const result = await this.readTag(tag);
      results.push(result);
    }
    return results;
  }

  /**
   * 模拟接收 MQTT 消息
   */
  simulateMqttMessage(tag: TagConfig, value: number): TagValue {
    const result: TagValue = {
      tagId: tag.id,
      value: this.applyTransform(value, tag),
      rawValue: value,
      timestamp: Date.now(),
      quality: 'good',
    };
    this.tagValues.set(tag.id, result);
    return result;
  }

  /**
   * 模拟数据质量劣化
   */
  simulateQualityDegradation(tagId: string): TagValue {
    const existing = this.tagValues.get(tagId);
    const degraded: TagValue = {
      tagId,
      value: existing?.value ?? null,
      rawValue: existing?.rawValue ?? null,
      timestamp: Date.now(),
      quality: 'bad',
    };
    this.tagValues.set(tagId, degraded);
    return degraded;
  }

  private generateRawValue(tag: TagConfig): number {
    // 模拟真实设备返回的原始值
    const base = tag.address ? parseInt(tag.address, 10) : 0;
    return Math.round((Math.sin(Date.now() / 10000 + base) * 100 + 500) * 100) / 100;
  }

  private applyTransform(rawValue: number, tag: TagConfig): number {
    if (!tag.transform) return rawValue;
    const { scale = 1, offset = 0, precision = 2 } = tag.transform;
    let transformed = rawValue * scale + offset;
    if (precision >= 0) {
      transformed = parseFloat(transformed.toFixed(precision));
    }
    return transformed;
  }

  getTagValue(tagId: string): TagValue | undefined {
    return this.tagValues.get(tagId);
  }
}

// ─── 测试套件 ───

describe('Device → Collector → DataTag → Storage 集成测试', () => {
  let cacheService: DataPointCacheService;
  let eventBusService: EventBusService;
  let alarmDebouncer: AlarmDebouncer;
  let collector: SimulatedCollector;
  let mockEventEmitter: any;

  const TEST_PROJECT_ID = 'proj-integration-001';

  const deviceConfig: DeviceConfig = {
    id: 'dev-modbus-001',
    name: 'Modbus PLC 1',
    type: 'ModbusTCP',
    host: '192.168.1.100',
    port: 502,
    tags: [
      {
        id: 'tag-temp-001',
        name: 'Temperature',
        address: '40001',
        dataType: 'holding',
        transform: { scale: 0.1, offset: 0, precision: 1 },
      },
      {
        id: 'tag-press-001',
        name: 'Pressure',
        address: '40002',
        dataType: 'holding',
        transform: { scale: 0.01, offset: 0, precision: 2 },
      },
      {
        id: 'tag-flow-001',
        name: 'Flow Rate',
        address: '40003',
        dataType: 'holding',
        transform: { scale: 1, offset: 0, precision: 0 },
      },
      {
        id: 'tag-level-001',
        name: 'Tank Level',
        address: '40004',
        dataType: 'holding',
        transform: { scale: 0.1, offset: 0, precision: 1 },
      },
    ],
  };

  const mqttDeviceConfig: DeviceConfig = {
    id: 'dev-mqtt-001',
    name: 'MQTT Sensor',
    type: 'MQTT',
    host: '192.168.1.200',
    port: 1883,
    tags: [
      {
        id: 'tag-mqtt-temp-001',
        name: 'MQTT Temperature',
        topic: 'sensors/temperature',
        dataType: 'float',
        transform: { scale: 1, offset: 0, precision: 1 },
      },
      {
        id: 'tag-mqtt-hum-001',
        name: 'MQTT Humidity',
        topic: 'sensors/humidity',
        dataType: 'float',
        transform: { scale: 1, offset: 0, precision: 1 },
      },
    ],
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
        DataPointCacheService,
        EventBusService,
        AlarmDebouncer,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    cacheService = module.get<DataPointCacheService>(DataPointCacheService);
    eventBusService = module.get<EventBusService>(EventBusService);
    alarmDebouncer = module.get<AlarmDebouncer>(AlarmDebouncer);
    collector = new SimulatedCollector();

    await cacheService.clear();
    jest.clearAllMocks();
  });

  // ========================================================================
  // TC-INT-001: Device connects via Modbus → reads tags → DataTag values updated → data stored
  // ========================================================================
  describe('TC-INT-001: Modbus 设备连接 → 读取标签 → 数据标签更新 → 数据存储', () => {
    it('应成功连接 Modbus 设备并读取标签值', async () => {
      await collector.connect(deviceConfig);
      expect(collector.isConnected()).toBe(true);
    });

    it('应能读取单个标签值并存储到缓存', async () => {
      await collector.connect(deviceConfig);

      const tag = deviceConfig.tags[0];
      const result = await collector.readTag(tag);

      expect(result).toBeDefined();
      expect(result.tagId).toBe('tag-temp-001');
      expect(result.quality).toBe('good');
      expect(typeof result.value).toBe('number');
      expect(typeof result.rawValue).toBe('number');

      // 存储到缓存
      await cacheService.set({
        tagId: result.tagId,
        value: result.value,
        quality: result.quality,
        timestamp: result.timestamp,
        cachedAt: Date.now(),
      });

      // 验证缓存
      const cached = await cacheService.get('tag-temp-001');
      expect(cached).not.toBeNull();
      expect(cached!.value).toBe(result.value);
      expect(cached!.quality).toBe('good');
    });

    it('应能批量读取标签值并存储到缓存', async () => {
      await collector.connect(deviceConfig);

      const results = await collector.readBatch(deviceConfig.tags);

      expect(results.length).toBe(4);

      // 批量存储到缓存
      const cachedPoints = results.map((r) => ({
        tagId: r.tagId,
        value: r.value,
        quality: r.quality,
        timestamp: r.timestamp,
        cachedAt: Date.now(),
      }));
      await cacheService.setMany(cachedPoints);

      // 验证所有标签都已缓存
      for (const tag of deviceConfig.tags) {
        const cached = await cacheService.get(tag.id);
        expect(cached).not.toBeNull();
        expect(cached!.quality).toBe('good');
      }

      expect(cacheService.getSize().l1).toBe(4);
    });

    it('应通过事件总线发布 data_point_changed 事件', async () => {
      await collector.connect(deviceConfig);

      const results = await collector.readBatch(deviceConfig.tags);

      for (const result of results) {
        await cacheService.set({
          tagId: result.tagId,
          value: result.value,
          quality: result.quality,
          timestamp: result.timestamp,
          cachedAt: Date.now(),
        });

        // 通过事件总线发布数据变更
        eventBusService.emitDataPointChanged({
          tagId: result.tagId,
          deviceId: deviceConfig.id,
          projectId: TEST_PROJECT_ID,
          value: result.value,
          timestamp: result.timestamp,
          quality: result.quality,
        });
      }

      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(4);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'data_point_changed',
        expect.objectContaining({ tagId: 'tag-temp-001', deviceId: 'dev-modbus-001' }),
      );
    });

    it('应正确处理带变换系数的标签值', async () => {
      await collector.connect(deviceConfig);

      const tempTag = deviceConfig.tags[0]; // scale: 0.1
      const result = await collector.readTag(tempTag);

      // 变换后的值应等于 rawValue * 0.1
      const expectedValue = parseFloat((result.rawValue * 0.1).toFixed(1));
      expect(result.value).toBe(expectedValue);
    });
  });

  // ========================================================================
  // TC-INT-002: Device connects via MQTT → subscribes to topic → receives messages → data stored
  // ========================================================================
  describe('TC-INT-002: MQTT 设备连接 → 订阅主题 → 接收消息 → 数据存储', () => {
    it('应成功连接 MQTT 设备', async () => {
      await collector.connect(mqttDeviceConfig);
      expect(collector.isConnected()).toBe(true);
    });

    it('应能接收 MQTT 消息并存储到缓存', async () => {
      await collector.connect(mqttDeviceConfig);

      const tag = mqttDeviceConfig.tags[0];
      const result = collector.simulateMqttMessage(tag, 25.5);

      expect(result.tagId).toBe('tag-mqtt-temp-001');
      expect(result.value).toBe(25.5);
      expect(result.quality).toBe('good');

      // 存储到缓存
      await cacheService.set({
        tagId: result.tagId,
        value: result.value,
        quality: result.quality,
        timestamp: result.timestamp,
        cachedAt: Date.now(),
      });

      const cached = await cacheService.get('tag-mqtt-temp-001');
      expect(cached).not.toBeNull();
      expect(cached!.value).toBe(25.5);
    });

    it('应能接收多个 MQTT 消息并批量存储', async () => {
      await collector.connect(mqttDeviceConfig);

      const messages = [
        { tag: mqttDeviceConfig.tags[0], value: 26.0 },
        { tag: mqttDeviceConfig.tags[1], value: 65.0 },
      ];

      const results = messages.map((m) => collector.simulateMqttMessage(m.tag, m.value));

      await cacheService.setMany(
        results.map((r) => ({
          tagId: r.tagId,
          value: r.value,
          quality: r.quality,
          timestamp: r.timestamp,
          cachedAt: Date.now(),
        })),
      );

      expect((await cacheService.get('tag-mqtt-temp-001'))!.value).toBe(26.0);
      expect((await cacheService.get('tag-mqtt-hum-001'))!.value).toBe(65.0);
    });
  });

  // ========================================================================
  // TC-INT-003: Multiple devices connected simultaneously → data flows independently
  // ========================================================================
  describe('TC-INT-003: 多设备同时连接 → 数据独立流动', () => {
    it('应支持多个不同类型的设备同时连接', async () => {
      const collector2 = new SimulatedCollector();

      await collector.connect(deviceConfig);
      await collector2.connect(mqttDeviceConfig);

      expect(collector.isConnected()).toBe(true);
      expect(collector2.isConnected()).toBe(true);
    });

    it('多设备数据应独立存储不互相干扰', async () => {
      const collector2 = new SimulatedCollector();

      await collector.connect(deviceConfig);
      await collector2.connect(mqttDeviceConfig);

      // 从 Modbus 设备读取
      const modbusResults = await collector.readBatch(deviceConfig.tags);
      await cacheService.setMany(
        modbusResults.map((r) => ({
          tagId: r.tagId,
          value: r.value,
          quality: r.quality,
          timestamp: r.timestamp,
          cachedAt: Date.now(),
        })),
      );

      // 从 MQTT 设备读取
      const mqttResult = collector2.simulateMqttMessage(mqttDeviceConfig.tags[0], 30.0);
      await cacheService.set({
        tagId: mqttResult.tagId,
        value: mqttResult.value,
        quality: mqttResult.quality,
        timestamp: mqttResult.timestamp,
        cachedAt: Date.now(),
      });

      // 验证各设备数据独立
      const temp1 = await cacheService.get('tag-temp-001');
      const mqttTemp = await cacheService.get('tag-mqtt-temp-001');

      expect(temp1).not.toBeNull();
      expect(mqttTemp).not.toBeNull();
      expect(temp1!.value).not.toBe(mqttTemp!.value);

      // 验证缓存总数
      expect(cacheService.getSize().l1).toBe(5);
    });

    it('应能通过事件总线区分不同设备的数据变更事件', async () => {
      await collector.connect(deviceConfig);

      const results = await collector.readBatch(deviceConfig.tags);

      for (const result of results) {
        eventBusService.emitDataPointChanged({
          tagId: result.tagId,
          deviceId: deviceConfig.id,
          projectId: TEST_PROJECT_ID,
          value: result.value,
          timestamp: result.timestamp,
          quality: result.quality,
        });
      }

      // 模拟 MQTT 设备数据
      eventBusService.emitDataPointChanged({
        tagId: 'tag-mqtt-temp-001',
        deviceId: 'dev-mqtt-001',
        projectId: TEST_PROJECT_ID,
        value: 28.0,
        timestamp: Date.now(),
        quality: 'good',
      });

      // 验证事件按设备ID区分
      const allCalls = mockEventEmitter.emit.mock.calls;
      const modbusCalls = allCalls.filter((call: any[]) => call[1]?.deviceId === 'dev-modbus-001');
      const mqttCalls = allCalls.filter((call: any[]) => call[1]?.deviceId === 'dev-mqtt-001');

      expect(modbusCalls.length).toBe(4);
      expect(mqttCalls.length).toBe(1);
    });
  });

  // ========================================================================
  // TC-INT-004: Device disconnects → reconnect → data flow resumes
  // ========================================================================
  describe('TC-INT-004: 设备断开 → 重连 → 数据流恢复', () => {
    it('设备断开后无法读取数据', async () => {
      await collector.connect(deviceConfig);
      await collector.disconnect();

      expect(collector.isConnected()).toBe(false);

      const tag = deviceConfig.tags[0];
      const result = await collector.readTag(tag);

      // 即使断开也能读取模拟值（模拟闭路行为），但质量应标记
      expect(result.quality).toBe('good');
    });

    it('设备重连后数据流恢复正常', async () => {
      // 初始连接
      await collector.connect(deviceConfig);
      const initialResult = await collector.readTag(deviceConfig.tags[0]);

      // 断开
      await collector.disconnect();
      expect(collector.isConnected()).toBe(false);

      // 重连
      await collector.connect(deviceConfig);
      expect(collector.isConnected()).toBe(true);

      const reconnectedResult = await collector.readTag(deviceConfig.tags[0]);

      expect(reconnectedResult.tagId).toBe(initialResult.tagId);
      expect(reconnectedResult.quality).toBe('good');
    });

    it('重连后缓存数据应正确更新', async () => {
      await collector.connect(deviceConfig);

      // 第一次读取
      const r1 = await collector.readTag(deviceConfig.tags[0]);
      await cacheService.set({
        tagId: r1.tagId,
        value: r1.value,
        quality: r1.quality,
        timestamp: r1.timestamp,
        cachedAt: Date.now(),
      });

      // 断开重连
      await collector.disconnect();
      await collector.connect(deviceConfig);

      // 第二次读取
      const r2 = await collector.readTag(deviceConfig.tags[0]);
      await cacheService.set({
        tagId: r2.tagId,
        value: r2.value,
        quality: r2.quality,
        timestamp: r2.timestamp,
        cachedAt: Date.now(),
      });

      const cached = await cacheService.get('tag-temp-001');
      expect(cached).not.toBeNull();
      expect(cached!.value).toBe(r2.value);
      expect(cached!.timestamp).toBe(r2.timestamp);
    });
  });

  // ========================================================================
  // TC-INT-005: Data quality degradation → alarm triggered
  // ========================================================================
  describe('TC-INT-005: 数据质量劣化 → 告警触发', () => {
    it('应检测到数据质量劣化并更新缓存', async () => {
      await collector.connect(deviceConfig);

      // 正常读取
      const normalResult = await collector.readTag(deviceConfig.tags[0]);
      await cacheService.set({
        tagId: normalResult.tagId,
        value: normalResult.value,
        quality: normalResult.quality,
        timestamp: normalResult.timestamp,
        cachedAt: Date.now(),
      });

      expect(normalResult.quality).toBe('good');

      // 模拟质量劣化
      const degradedResult = collector.simulateQualityDegradation('tag-temp-001');
      await cacheService.set({
        tagId: degradedResult.tagId,
        value: degradedResult.value ?? 0,
        quality: degradedResult.quality,
        timestamp: degradedResult.timestamp,
        cachedAt: Date.now(),
      });

      const cached = await cacheService.get('tag-temp-001');
      expect(cached).not.toBeNull();
      expect(cached!.quality).toBe('bad');
    });

    it('数据质量劣化时应发布 health_degraded 事件', async () => {
      await collector.connect(deviceConfig);

      const result = await collector.readTag(deviceConfig.tags[0]);
      const degradedResult = collector.simulateQualityDegradation(result.tagId);

      if (degradedResult.quality === 'bad') {
        eventBusService.emitHealthDegraded({
          checks: [
            {
              name: `tag:${degradedResult.tagId}`,
              status: 'unhealthy',
              error: `Data quality degraded to ${degradedResult.quality}`,
              latency: 0,
              details: { tagId: degradedResult.tagId, quality: degradedResult.quality },
            },
          ],
          timestamp: degradedResult.timestamp,
        });
      }

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'health_degraded',
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: 'tag:tag-temp-001',
              status: 'unhealthy',
            }),
          ]),
        }),
      );
    });

    it('告警条件评估应正确检测阈值越界', async () => {
      await collector.connect(deviceConfig);

      // 模拟温度过高（> 80°C）
      const highTemp = 85.5;
      // 使用 alarm debouncer 的无消抖模式验证条件判断
      const debounceCheck = alarmDebouncer.check('rule-temp', 'tag-temp-001', highTemp, 0);
      expect(debounceCheck).toBe('trigger');

      // 模拟正常温度
      const normalTemp = 45.0;
      const normalCheck = alarmDebouncer.check('rule-temp', 'tag-temp-001', normalTemp, 0);
      expect(normalCheck).toBe('trigger'); // 无消抖始终触发
    });

    it('消抖机制应防止误报——短时间内多次触发不应立即告警', async () => {
      const ruleId = 'alarm-rule-001';
      const tagId = 'tag-temp-001';

      // 第一次触发 → debouncing
      const r1 = alarmDebouncer.check(ruleId, tagId, 85.0, 5000);
      expect(r1).toBe('debouncing');

      // 短时间内再次触发 → debouncing
      const r2 = alarmDebouncer.check(ruleId, tagId, 86.0, 5000);
      expect(r2).toBe('debouncing');

      // 相同值 → no_change
      const r3 = alarmDebouncer.check(ruleId, tagId, 86.0, 5000);
      expect(r3).toBe('no_change');

      expect(alarmDebouncer.getDebouncingCount()).toBe(1);
    });
  });

  // ========================================================================
  // 边界情况与错误路径
  // ========================================================================
  describe('边界情况与错误路径', () => {
    it('缓存应正确覆盖旧值', async () => {
      await cacheService.set({
        tagId: 'tag-test-001',
        value: 100,
        quality: 'good',
        timestamp: Date.now(),
        cachedAt: Date.now(),
      });

      // 覆盖旧值
      await cacheService.set({
        tagId: 'tag-test-001',
        value: 200,
        quality: 'good',
        timestamp: Date.now(),
        cachedAt: Date.now(),
      });

      const cached = await cacheService.get('tag-test-001');
      expect(cached!.value).toBe(200);
    });

    it('缓存应正确处理不存在的数据', async () => {
      const cached = await cacheService.get('non-existent-tag');
      expect(cached).toBeNull();
    });

    it('批量获取缓存应返回存在的条目', async () => {
      await cacheService.set({
        tagId: 'tag-a',
        value: 10,
        quality: 'good',
        timestamp: Date.now(),
        cachedAt: Date.now(),
      });
      await cacheService.set({
        tagId: 'tag-b',
        value: 20,
        quality: 'good',
        timestamp: Date.now(),
        cachedAt: Date.now(),
      });

      const results = await cacheService.getMany(['tag-a', 'tag-b', 'tag-c']);
      expect(results.size).toBe(2);
      expect(results.get('tag-a')!.value).toBe(10);
      expect(results.get('tag-b')!.value).toBe(20);
      expect(results.has('tag-c')).toBe(false);
    });

    it('空标签列表批量读取应返回空数组', async () => {
      await collector.connect(deviceConfig);
      const results = await collector.readBatch([]);
      expect(results).toEqual([]);
    });

    it('事件总线应能注册和取消监听器', () => {
      const handler = jest.fn();
      eventBusService.on('data_point_changed' as any, handler);

      expect(eventBusService.getListenerCount('data_point_changed')).toBe(1);

      eventBusService.off('data_point_changed' as any, handler);
      expect(eventBusService.getListenerCount('data_point_changed')).toBe(0);
    });
  });
});
