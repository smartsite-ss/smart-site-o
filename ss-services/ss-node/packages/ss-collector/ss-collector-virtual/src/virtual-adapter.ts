// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import {
  BaseCollectorService,
  CollectorPlugin,
  IsolationMode,
  PluginCategory,
  PluginMonitorService,
  type CollectorReadResult,
  type ITagContext,
  type ChannelValidationResult,
} from '@ss-node/ss-collector-sdk';
import { SimulatorFactory } from './simulator-factory';
import { VariableSimulator } from './simulators/variable-simulator.interface';

interface VirtualClient {
  deviceId: string;
  simulators: Map<string, VariableSimulator>;
}

/**
 * 虚拟协议适配器 — 无需真实物理连接，
 * 通过 SimulatorFactory 生成模拟数据。
 */
@Injectable()
@CollectorPlugin({
  protocol: 'virtual',
  displayName: 'Virtual Device',
  version: '0.1.0',
  description: '虚拟数据采集插件，用于开发调试和无设备环境下的仿真测试',
  category: PluginCategory.CUSTOM,
  transport: 'other',
  connectionSchema: {
    type: 'object',
    properties: {
      deviceId: { type: 'string', title: '设备ID', default: 'virtual-device' },
    },
  },
  defaultConnection: { deviceId: 'virtual-device' },
  supportedDataTypes: ['float', 'int', 'bool', 'string', 'enum'],
  isolationMode: IsolationMode.CHILD_PROCESS,
  enabledByDefault: true,
  tags: ['virtual', 'simulation', 'debug', 'testing'],
})
export class VirtualProtocolAdapter extends BaseCollectorService {
  private readCounter = 0;
  private lastSummaryTime = 0;

  private readonly simulatorFactory: SimulatorFactory;

  constructor(
    simulatorFactory?: SimulatorFactory,
    private readonly monitor?: PluginMonitorService,
  ) {
    super();
    // 支持无 NestJS DI 环境运行（如 worker/子进程隔离模式）
    this.simulatorFactory = simulatorFactory ?? new SimulatorFactory();
    this.logger.log('========== VirtualProtocolAdapter CONSTRUCTED ==========');
    this.logger.log(`  - simulatorFactory available: ${!!this.simulatorFactory}`);
    this.logger.log(`  - monitor available: ${!!this.monitor}`);
    this.logger.log('==========================================================');
  }

  /**
   * 插件激活时的初始化钩子
   * 独立于设备加载 — 即使没有设备也会调用。
   * 用于预热仿真器工厂、输出初始化日志等。
   */
  async onActivate(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('VirtualProtocolAdapter.onActivate() — starting initialization...');

    // 预热 SimulatorFactory
    try {
      if (typeof (this.simulatorFactory as any).warmup === 'function') {
        (this.simulatorFactory as any).warmup();
        this.logger.log('SimulatorFactory warmed up');
      }
    } catch (err) {
      this.logger.warn(`SimulatorFactory.warmup() failed: ${(err as Error).message}`);
    }

    // 记录初始化日志到采集日志文件
    this.monitor?.writeLog(
      'virtual',
      'INFO',
      `[INIT] VirtualProtocolAdapter 激活成功 (${Date.now() - startTime}ms)`,
    );

    this.logger.log(
      `VirtualProtocolAdapter.onActivate() — initialized (${Date.now() - startTime}ms)`,
    );
  }

  /**
   * 插件停用时的清理钩子
   */
  async onDeactivate(): Promise<void> {
    this.logger.log('VirtualProtocolAdapter.onDeactivate() — cleaning up connections...');

    // 基类的 onModuleDestroy 会处理连接清理
    await this.onModuleDestroy();

    this.monitor?.writeLog(
      'virtual',
      'INFO',
      '[INIT] VirtualProtocolAdapter 已停用，所有连接已清理',
    );
    this.logger.log('VirtualProtocolAdapter.onDeactivate() — cleanup complete');
  }

  async connect(device: any): Promise<VirtualClient> {
    const deviceId = device.id;
    if (this.getConnectionStatus(deviceId)) {
      // 已连接，从 getClientEntries 中找到并返回
      for (const [, entry] of this.getClientEntries()) {
        if ((entry.client as VirtualClient).deviceId === deviceId) {
          return entry.client as VirtualClient;
        }
      }
    }
    const client: VirtualClient = {
      deviceId,
      simulators: new Map(),
    };
    this.trackClient(deviceId, client);
    this.logger.log(`虚拟设备 ${deviceId} 连接成功`);
    return client;
  }

  protected async doReadTag(client: VirtualClient, tag: ITagContext): Promise<CollectorReadResult> {
    const tagId = tag.id;
    // 获取或创建仿真器
    const simulator = this.simulatorFactory.getOrCreate(tagId, tag);

    // 缓存到 client 以便快速访问
    if (!client.simulators.has(tagId)) {
      client.simulators.set(tagId, simulator);
    }

    const value = simulator.generate();

    // CODE-12: 采集统计与日志降频 — 原 doReadTag 每次调用都通过 monitor.writeLog 写入一条 INFO，
    // 在虚拟采集器 40-58 次/秒的读取频率下产生大量 IO（且 LOG_LEVEL=info 无法拦截）。
    // 改为：每 60 秒输出一次 debug 级别汇总 + 一条 monitor 摘要日志，避免日志 IO 放大服务器负载。
    this.readCounter++;
    const now = Date.now();
    if (now - this.lastSummaryTime >= 60000) {
      const summary = `采集统计: 过去60秒读取 ${this.readCounter} 次 | 最新值: ${tag.name || tagId}=${JSON.stringify(value)}`;
      this.logger.debug(summary);
      // 周期性摘要写入监控日志（DEBUG 级别，生产 LOG_LEVEL=warn 时不入文件）
      this.monitor?.writeLog('virtual', 'DEBUG', `[STATS] ${summary}`);
      this.readCounter = 0;
      this.lastSummaryTime = now;
    }

    return {
      tagId,
      value,
      timestamp: new Date(),
      quality: 'good',
    };
  }

  async readTag(client: VirtualClient, tag: ITagContext): Promise<CollectorReadResult> {
    return this.doReadTag(client, tag);
  }

  protected async doWriteTag(client: VirtualClient, tag: ITagContext, value: any): Promise<void> {
    const simulator = client.simulators.get(tag.id);
    if (simulator) {
      simulator.setValue(value);
    }
  }

  protected async doDisconnect(client: VirtualClient): Promise<void> {
    // 虚拟设备无需实际断开，仅清理模拟器状态
    client.simulators.clear();
  }

  async validateChannelConfig(_config: Record<string, any>): Promise<ChannelValidationResult> {
    return { valid: true, errors: [] };
  }

  /**
   * 通道连通性预检
   *
   * 在创建/编辑设备时验证通道配置是否可达，不依赖 EnhancedScheduler 调度。
   * 虚拟设备始终返回成功（无真实物理连接）。
   */
  async precheckConnection(config: Record<string, any>): Promise<ChannelValidationResult> {
    const startTime = Date.now();
    this.logger.log(`Prechecking virtual connection for device: ${config.deviceId || 'unknown'}`);

    // 虚拟设备不需要真实连接，直接返回成功
    const elapsed = Date.now() - startTime;
    this.logger.log(`Virtual precheck completed in ${elapsed}ms`);

    return {
      valid: true,
      errors: [],
    };
  }
}
