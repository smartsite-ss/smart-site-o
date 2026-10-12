// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPersistWriter, DataPoint, PersistWriterRegistry } from '@ss-node/ss-collector-sdk';
import { InfluxWriteService } from './influx-write.service';

/**
 * InfluxDB 时序数据 PersistWriter 实现
 *
 * 数据流：Pipeline DataPoint → write() → InfluxWriteService → InfluxDB tag_values measurement
 *
 * 条件激活：当 HISTORICAL_DATA_BACKEND=influxdb（默认）时执行写入，
 * 否则 write/writeBatch/flush 均为 no-op（由 SqlitePersistWriter 接管）。
 *
 * 注意：必须通过 onModuleInit 主动注册到 PersistWriterRegistry，
 * 否则 PersistStep 无法获取到本 Writer（NestJS 模块封装性限制）。
 *
 * 容错策略：InfluxDB 不可用（如未配置 TOKEN）时，InfluxWriteService 内部会捕获错误，
 * 不影响 Pipeline 主流程。
 */
@Injectable()
export class InfluxPersistWriter implements IPersistWriter, OnModuleInit {
  readonly name = 'InfluxDB';
  /**
   * InfluxDB 写入相对较慢（HTTP 协议、批量提交），声明为 best_effort
   * 使 PersistStep 异步 fire-and-forget，不阻塞 Pipeline 周期。
   * 失败时由 InfluxWriteService 内部缓冲重试。
   */
  readonly priority = 'best_effort' as const;
  private readonly logger = new Logger(InfluxPersistWriter.name);
  /** 是否激活：仅当 HISTORICAL_DATA_BACKEND=influxdb（默认） */
  private readonly enabled: boolean;

  isActive(): boolean {
    return this.enabled;
  }

  constructor(
    private readonly influxWriteService: InfluxWriteService,
    private readonly writerRegistry: PersistWriterRegistry,
    private readonly configService: ConfigService,
  ) {
    const backend = this.configService.get('HISTORICAL_DATA_BACKEND', 'influxdb');
    this.enabled = backend === 'influxdb';
  }

  onModuleInit(): void {
    this.writerRegistry.register(this);
    this.logger.log(`InfluxPersistWriter registered (enabled=${this.enabled})`);
  }

  async write(point: DataPoint): Promise<void> {
    if (!this.enabled) return;

    await this.influxWriteService.writePoint({
      measurement: 'tag_values',
      tags: {
        tagId: point.tagId,
        deviceId: point.deviceId,
        projectId: point.projectId,
      },
      fields: this.buildFields(point),
      timestamp: point.timestamp,
    });
  }

  async writeBatch(points: DataPoint[]): Promise<void> {
    if (!this.enabled) return;
    if (points.length === 0) return;

    const influxPoints = points.map((point) => ({
      measurement: 'tag_values',
      tags: {
        tagId: point.tagId,
        deviceId: point.deviceId,
        projectId: point.projectId,
      },
      fields: this.buildFields(point),
      timestamp: point.timestamp,
    }));

    await this.influxWriteService.writePoints(influxPoints);

    // 先缓冲数据（保证定时器持续运行以便探测恢复），再检查后端状态
    if (!this.influxWriteService.isBackendReachable) {
      throw new Error('InfluxDB backend is unreachable (previous flush failed)');
    }
  }

  /**
   * 构造 InfluxDB fields，保留 value 的原始类型语义。
   *
   * InfluxDB 支持 boolean/float/integer/unsigned/string 字段类型，
   * 由值的 JS 类型自动推断：
   * - JS boolean → InfluxDB boolean
   * - JS number → InfluxDB float
   * - JS string → InfluxDB string
   *
   * quality 始终以 string 存储。
   */
  private buildFields(point: DataPoint): Record<string, any> {
    const fields: Record<string, any> = { quality: point.quality };
    if (point.value === null || point.value === undefined) {
      fields.value = 0; // InfluxDB 不支持 null 字段值，用 0 兜底
    } else {
      fields.value = point.value;
    }
    return fields;
  }

  async flush(): Promise<void> {
    if (!this.enabled) return;
    this.influxWriteService.flushAll();
  }
}
