// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '@ss-node/ss-core';
import { SystemConfigService } from '../config/system-config.service';

/**
 * 定时器配置条目
 */
export interface TimerEntry {
  /** 唯一标识，对应 .env 变量名 */
  id: string;
  /** 中文名称 */
  name: string;
  /** 所属模块 */
  module: string;
  /** 当前间隔（毫秒） */
  currentInterval: number;
  /** 默认间隔（毫秒） */
  defaultInterval: number;
  /** 功能描述 */
  description: string;
  /** 是否支持运行时热更新 */
  runtimeUpdate: boolean;
  /** 运行时更新回调（需 service 注册时提供） */
  restartFn?: (newInterval: number) => void;
}

/** 系统定时器默认配置（硬编码 fallback） */
const DEFAULT_TIMERS: Omit<TimerEntry, 'currentInterval' | 'restartFn'>[] = [
  {
    id: 'DEVICE_HEARTBEAT_CHECK_INTERVAL_MS',
    name: '设备心跳检测',
    module: '设备管理',
    defaultInterval: 5_000,
    description: '定期检查设备心跳，超时自动标记为 OFFLINE',
    runtimeUpdate: true,
  },
  {
    id: 'DEVICE_CONNECTION_HEARTBEAT_INTERVAL_MS',
    name: '连接心跳检测',
    module: '设备管理',
    defaultInterval: 30_000,
    description: '检查活动连接空闲时间，超时触发降级（ONLINE → DEGRADED）',
    runtimeUpdate: true,
  },
  {
    id: 'DEVICE_PERSIST_INTERVAL_MS',
    name: '设备状态持久化',
    module: '设备管理',
    defaultInterval: 30_000,
    description: '脏标记批量写入 system.db 的周期',
    runtimeUpdate: true,
  },
  {
    id: 'DEVICE_AUTO_RECONNECT_INTERVAL_MS',
    name: '设备自动重连',
    module: '设备管理',
    defaultInterval: 30_000,
    description: '设备断线后重试连接的周期',
    runtimeUpdate: false,
  },
  {
    id: 'DEVICE_SIMULATION_DEFAULT_INTERVAL_MS',
    name: '仿真数据生成',
    module: '设备管理',
    defaultInterval: 1_000,
    description: '虚拟设备仿真数据的生成间隔（设备级可覆盖）',
    runtimeUpdate: false,
  },
  {
    id: 'DEVICE_ARCHIVE_DEFAULT_INTERVAL_MS',
    name: '数据归档兜底间隔',
    module: '设备管理',
    defaultInterval: 300_000,
    description: '设备数据归档 cron 表达式解析失败时的 fallback 间隔',
    runtimeUpdate: false,
  },
];

/** DB 存储的 key 前缀 */
const CONFIG_KEY_PREFIX = 'timer.';

@Injectable()
export class TimerConfigService implements OnModuleInit {
  private readonly logger = new Logger(TimerConfigService.name);
  private readonly configs = new Map<string, TimerEntry>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadDefaults();
  }

  /**
   * 加载默认配置：DB 优先 → .env → 硬编码
   */
  private async loadDefaults(): Promise<void> {
    for (const tpl of DEFAULT_TIMERS) {
      const dbVal = await this.systemConfigService.get(CONFIG_KEY_PREFIX + tpl.id);
      const envVal = this.configService.get<number>(tpl.id);

      const currentInterval = dbVal ? parseInt(String(dbVal), 10) : envVal || tpl.defaultInterval;

      this.configs.set(tpl.id, {
        ...tpl,
        currentInterval,
        runtimeUpdate: false,
      });
    }
    this.logger.log(`Loaded ${this.configs.size} timer configs (${this.allIds.join(', ')})`);
  }

  /**
   * 外部服务注册定时器（支持运行时热更新回调）
   */
  register(id: string, restartFn?: (newInterval: number) => void): void {
    const existing = this.configs.get(id);
    if (!existing) {
      this.logger.warn(`Timer "${id}" not found in defaults, skipping register`);
      return;
    }
    if (restartFn) {
      existing.restartFn = restartFn;
      existing.runtimeUpdate = true;
    }
  }

  /**
   * 获取所有定时器配置
   */
  getAll(): TimerEntry[] {
    return Array.from(this.configs.values()).map((e) => ({
      ...e,
      restartFn: undefined, // 不暴露回调给外部
    }));
  }

  /**
   * 获取单个定时器配置
   */
  getById(id: string): TimerEntry | undefined {
    const entry = this.configs.get(id);
    if (!entry) return undefined;
    return { ...entry, restartFn: undefined };
  }

  /**
   * 更新定时器间隔
   *
   * - 持久化到 system_configs 表
   * - 如服务注册了 restartFn 则运行时热更新
   * - 发射 EventBus 事件通知订阅者
   */
  async updateInterval(id: string, interval: number): Promise<TimerEntry> {
    const entry = this.configs.get(id);
    if (!entry) {
      throw new Error(`Timer "${id}" not found`);
    }

    // 验证间隔范围（至少 100ms）
    if (interval < 100) {
      throw new Error(`Interval must be >= 100ms, got ${interval}`);
    }

    // 持久化到 DB
    await this.systemConfigService.set(CONFIG_KEY_PREFIX + id, String(interval));

    // 更新内存值
    entry.currentInterval = interval;

    // 通知订阅者
    this.eventBus.emit('timer:configChanged', { id, interval });

    // 如有运行时热更新回调，立即重启定时器
    if (entry.restartFn) {
      entry.restartFn(interval);
      this.logger.log(`Timer "${id}" hot-reloaded to ${interval}ms (restarted)`);
    } else {
      this.logger.log(
        `Timer "${id}" interval updated to ${interval}ms (persisted, requires restart to take effect)`,
      );
    }

    return { ...entry, restartFn: undefined };
  }

  /**
   * 重置定时器为默认值
   */
  async resetInterval(id: string): Promise<TimerEntry> {
    const entry = this.configs.get(id);
    if (!entry) {
      throw new Error(`Timer "${id}" not found`);
    }

    // 删除 DB 中的自定义值，恢复为 .env 或硬编码默认
    await this.systemConfigService.delete(CONFIG_KEY_PREFIX + id);

    const envVal = this.configService.get<number>(entry.id);
    entry.currentInterval = envVal || entry.defaultInterval;

    this.eventBus.emit('timer:configChanged', {
      id,
      interval: entry.currentInterval,
    });

    if (entry.restartFn) {
      entry.restartFn(entry.currentInterval);
    }

    return { ...entry, restartFn: undefined };
  }

  /**
   * 获取当前所有定时器 ID（用于调试/日志）
   */
  get allIds(): string[] {
    return Array.from(this.configs.keys());
  }
}
