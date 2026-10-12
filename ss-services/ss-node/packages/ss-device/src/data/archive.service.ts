// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import {
  INFLUX_WRITE_SERVICE,
  DATA_QUERY_SERVICE,
  IInfluxWriteService,
  IDataQueryService,
} from '../archive/device-archive.service';

export interface ArchiveConfig {
  enabled: boolean;
  interval: number; // 归档间隔 (ms)
  retentionDays: number; // 保留天数
  destination: 'influxdb' | 'sqlite' | 'both';
}

export interface ArchivedDataPoint {
  tagId: string;
  deviceId: string;
  value: number;
  quality: string;
  timestamp: Date;
}

/**
 * ArchiveService — 数据归档与历史查询服务（3.17 实现）
 *
 * 行为：
 * - archiveDataPoint(): InfluxWriteService 可用时 → 写入真实 InfluxDB；否则仅记录日志
 * - queryHistory(): DataQueryService 可用时 → 查询 HistoricalData 表；否则返回空数组
 *
 * 使用字符串 Token 注入避免 ss-device 与 ss-storage-influx 的循环包依赖。
 *
 * @see docs/ss-data/02-详细设计/03-设备管理/00-设计-设备管理.md §10
 */
@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);
  private configs = new Map<string, ArchiveConfig>();

  constructor(
    @Optional()
    @Inject(INFLUX_WRITE_SERVICE)
    private influxWriteService?: IInfluxWriteService,
    @Optional()
    @Inject(DATA_QUERY_SERVICE)
    private dataQueryService?: IDataQueryService,
  ) {
    this.logger.log(
      `ArchiveService initialized (InfluxWrite: ${influxWriteService ? 'enabled' : 'disabled'}, DataQuery: ${dataQueryService ? 'enabled' : 'disabled'})`,
    );
  }

  setArchiveConfig(tagId: string, config: ArchiveConfig): void {
    this.configs.set(tagId, config);
    this.logger.log(
      `Archive config set for tag ${tagId}: interval=${config.interval}ms, retention=${config.retentionDays}d`,
    );
  }

  getArchiveConfig(tagId: string): ArchiveConfig | undefined {
    return this.configs.get(tagId);
  }

  /**
   * 归档单个数据点（3.17 实现）
   *
   * 行为：
   * - InfluxWriteService 可用时 → 调用 writePoint() 写入真实 InfluxDB
   * - 不可用时 → 仅记录 debug 日志
   */
  async archiveDataPoint(point: ArchivedDataPoint): Promise<void> {
    if (this.influxWriteService) {
      try {
        await this.influxWriteService.writePoint({
          measurement: 'tag_archive',
          tags: {
            tagId: point.tagId,
            deviceId: point.deviceId || 'unknown',
          },
          fields: {
            value: point.value,
            quality: point.quality,
          },
          timestamp: point.timestamp,
        });
      } catch (error) {
        this.logger.error(
          `Failed to archive data point to InfluxDB for tag ${point.tagId}: ${error instanceof Error ? error.message : error}`,
        );
      }
    } else {
      this.logger.debug(
        `Archive (no-op, InfluxWriteService unavailable): ${point.tagId} = ${point.value} @ ${point.timestamp}`,
      );
    }
  }

  /**
   * 查询历史数据（3.17 实现）
   *
   * 行为：
   * - DataQueryService 可用时 → 调用 queryTimeRange() 查询 HistoricalData 表
   * - 不可用时 → 返回空数组
   */
  async queryHistory(
    tagId: string,
    start: Date,
    end: Date,
    _options?: { interval?: number; aggregation?: 'avg' | 'min' | 'max' },
  ): Promise<ArchivedDataPoint[]> {
    if (this.dataQueryService) {
      try {
        const result = await this.dataQueryService.queryTimeRange({
          tagId,
          startTime: start,
          endTime: end,
          page: 1,
          pageSize: 1000,
        });

        return result.data.map((h) => ({
          tagId: h.tagId,
          deviceId: '',
          value: h.numericValue ?? 0,
          quality: 'good',
          timestamp: h.timestamp,
        }));
      } catch (error) {
        this.logger.error(
          `Failed to query history for tag ${tagId}: ${error instanceof Error ? error.message : error}`,
        );
        return [];
      }
    }

    this.logger.debug(`Query history (no-op): ${tagId} [${start} - ${end}]`);
    return [];
  }
}
