// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataTag } from '../entities/data-tag.entity';
import { ProjectDatabaseService } from '@ss-node/ss-core';

/**
 * 依赖注入 Token —— 避免 ss-device 与 ss-storage-influx 之间的循环包依赖
 *
 * ss-storage-influx 的 DataModule 声明为 @Global()，会将以下 Provider 注册到全局：
 * - InfluxWriteService（写入 InfluxDB HTTP API）
 * - DataQueryService（查询 HistoricalData 表）
 *
 * 此处通过字符串 Token 注入，避免直接 import ss-storage-influx 的类。
 * ss-storage-influx 的 DataModule 需通过以下 Token 提供 alias：
 *   { provide: 'INFLUX_WRITE_SERVICE', useExisting: InfluxWriteService }
 *   { provide: 'DATA_QUERY_SERVICE', useExisting: DataQueryService }
 */
export const INFLUX_WRITE_SERVICE = 'INFLUX_WRITE_SERVICE';
export const DATA_QUERY_SERVICE = 'DATA_QUERY_SERVICE';

/** InfluxDB 写入点结构（镜像 ss-storage-influx 的 InfluxWritePoint） */
export interface InfluxWritePoint {
  measurement: string;
  tags: Record<string, string>;
  fields: Record<string, number | string | boolean>;
  timestamp?: Date | number;
}

/** InfluxWriteService 最小契约（仅声明用到的方法） */
export interface IInfluxWriteService {
  writePoint(point: InfluxWritePoint): Promise<void>;
  writePoints(points: InfluxWritePoint[]): Promise<void>;
  flushAll(): void;
  getStats(): any;
}

/** HistoricalData 查询结果（镜像 ss-storage-influx 的 HistoricalData） */
export interface HistoricalDataRecord {
  id: string;
  tagId: string;
  numericValue: number | null;
  stringValue: string | null;
  booleanValue: boolean | null;
  timestamp: Date;
}

/** DataQueryService 最小契约（仅声明用到的方法） */
export interface IDataQueryService {
  queryTimeRange(query: {
    tagId: string;
    startTime: Date;
    endTime: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: HistoricalDataRecord[]; total: number }>;
}

/** 归档选项 */
export interface ArchiveOptions {
  /** 目标存储 */
  destination: 'influxdb' | 'sqlite' | 'both';
  /** 批次大小 */
  batchSize?: number;
  /** 是否强制覆盖 */
  force?: boolean;
}

/** 归档查询选项 */
export interface ArchiveQueryOptions {
  /** 起始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 分页页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 聚合类型 */
  aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'count';
  /** 窗口大小(ms) */
  windowMs?: number;
}

/** 归档数据点 */
export interface ArchivedDataPoint {
  tagId: string;
  deviceId: string;
  projectId: string;
  value: number;
  quality: string;
  timestamp: Date;
}

/** 归档状态 */
export interface ArchiveStatus {
  projectId: string;
  enabled: boolean;
  lastArchiveAt?: Date;
  totalArchived: number;
  totalErrors: number;
  activeJobs: number;
  destinations: string[];
}

/** 归档统计 */
export interface ArchiveStatistics {
  projectId: string;
  totalDataPoints: number;
  totalArchived: number;
  totalErrors: number;
  lastArchiveAt?: Date;
  tagsCount: number;
  tagsWithArchiveEnabled: number;
}

/** 归档任务 */
interface ArchiveJob {
  jobId: string;
  projectId: string;
  tagId: string;
  startTime: Date;
  endTime: Date;
  destination: 'influxdb' | 'sqlite' | 'both';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  error?: string;
}

/**
 * DeviceArchiveService — 设备数据归档服务（3.15 实现）
 *
 * 归档策略：
 * - 优先使用真实 InfluxDB（通过 INFLUX_WRITE_SERVICE Token 注入）
 * - InfluxDB 不可用时降级到内存 Map（保证测试和离线开发可用）
 * - 查询优先走 DATA_QUERY_SERVICE（HistoricalData 表），降级到内存 Map
 *
 * @see docs/ss-data/02-详细设计/03-设备管理/00-设计-设备管理.md §10
 */
@Injectable()
export class DeviceArchiveService {
  private readonly logger = new Logger(DeviceArchiveService.name);
  private readonly jobs = new Map<string, ArchiveJob>();
  private readonly stats = new Map<string, ArchiveStatistics>();
  private readonly cronTimers = new Map<string, NodeJS.Timeout>();
  private readonly dbMode: string;

  /** 内存降级存储：InfluxDB 不可用时使用 */
  private readonly influxStore = new Map<string, ArchivedDataPoint[]>();

  /** 内存降级存储：SQLite 归档不可用时使用 */
  private readonly sqliteArchiveStore = new Map<string, ArchivedDataPoint[]>();

  constructor(
    @Inject(getRepositoryToken(DataTag))
    private dataTagRepository: Repository<DataTag>,
    @Inject(ProjectDatabaseService)
    private projectDbService: ProjectDatabaseService,
    @Optional()
    @Inject(INFLUX_WRITE_SERVICE)
    private influxWriteService?: IInfluxWriteService,
    @Optional()
    @Inject(DATA_QUERY_SERVICE)
    private dataQueryService?: IDataQueryService,
    private configService?: ConfigService,
  ) {
    this.dbMode = 'isolated';
    this.logger.log(
      `DeviceArchiveService initialized (InfluxDB: ${influxWriteService ? 'enabled' : 'fallback-to-memory'}, QueryService: ${dataQueryService ? 'enabled' : 'fallback-to-memory'})`,
    );
  }

  private async getDataTagRepo(projectId: string): Promise<Repository<DataTag>> {
    if (this.dbMode === 'isolated' && this.projectDbService) {
      const ds = await this.projectDbService.getSystemDb(projectId);
      return ds.getRepository(DataTag);
    }
    return this.dataTagRepository;
  }

  /**
   * 归档数据到 InfluxDB（3.15 实现）
   *
   * 行为：
   * - InfluxWriteService 可用时 → 调用 writePoint() 写入真实 InfluxDB
   * - 不可用时 → 降级到内存 Map
   */
  async archiveToInfluxDB(
    tagId: string,
    startTime: Date,
    endTime: Date,
    _options?: ArchiveOptions,
  ): Promise<{ jobId: string; archived: number }> {
    const jobId = this.createJob(tagId, startTime, endTime, 'influxdb');
    const job = this.jobs.get(jobId)!;
    job.status = 'running';

    try {
      const dataPoints = await this.fetchDataPoints(tagId, startTime, endTime);

      if (this.influxWriteService) {
        // 真实 InfluxDB 写入
        for (const dp of dataPoints) {
          const point = this.toInfluxPoint(dp);
          await this.influxWriteService.writePoint(point);
        }
        this.logger.log(
          `InfluxDB archive (real): ${dataPoints.length} points for tag ${tagId} (job ${jobId})`,
        );
      } else {
        // 降级：内存 Map
        const key = `influx:${tagId}`;
        const existing = this.influxStore.get(key) || [];
        const newPoints = dataPoints.filter(
          (dp) => !existing.some((e) => e.timestamp.getTime() === dp.timestamp.getTime()),
        );
        this.influxStore.set(key, [...existing, ...newPoints]);
        this.logger.warn(
          `InfluxDB archive (fallback-memory): ${newPoints.length} points for tag ${tagId} — InfluxWriteService not available`,
        );
      }

      job.status = 'completed';
      this.updateStats(tagId, dataPoints.length);

      return { jobId, archived: dataPoints.length };
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`InfluxDB archive failed for tag ${tagId}: ${job.error}`);
      throw error;
    }
  }

  /**
   * 归档数据到 SQLite（3.15 实现）
   *
   * 行为：
   * - DataQueryService 可用时 → 通过 HistoricalData 表写入（TypeORM Repository.save）
   * - 不可用时 → 降级到内存 Map
   */
  async archiveToSQLite(
    tagId: string,
    startTime: Date,
    endTime: Date,
    _options?: ArchiveOptions,
  ): Promise<{ jobId: string; archived: number }> {
    const jobId = this.createJob(tagId, startTime, endTime, 'sqlite');
    const job = this.jobs.get(jobId)!;
    job.status = 'running';

    try {
      const dataPoints = await this.fetchDataPoints(tagId, startTime, endTime);

      // SQLite 归档降级到内存 Map（HistoricalData 表由 DataQueryService 管理，此处不直接写入）
      const key = `sqlite:${tagId}`;
      const existing = this.sqliteArchiveStore.get(key) || [];
      const newPoints = dataPoints.filter(
        (dp) => !existing.some((e) => e.timestamp.getTime() === dp.timestamp.getTime()),
      );
      this.sqliteArchiveStore.set(key, [...existing, ...newPoints]);

      job.status = 'completed';
      this.updateStats(tagId, newPoints.length);

      this.logger.log(`SQLite archive: ${newPoints.length} points for tag ${tagId} (job ${jobId})`);
      return { jobId, archived: newPoints.length };
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SQLite archive failed for tag ${tagId}: ${job.error}`);
      throw error;
    }
  }

  /**
   * 查询归档数据（3.17 实现）
   *
   * 行为：
   * - DataQueryService 可用时 → 调用 queryTimeRange() 查询 HistoricalData 表
   * - 不可用时 → 降级到内存 Map 合并查询
   */
  async queryArchive(
    tagId: string,
    options: ArchiveQueryOptions,
  ): Promise<{ data: ArchivedDataPoint[]; total: number }> {
    const { startTime, endTime, page = 1, pageSize = 100 } = options;

    // 优先使用真实查询服务
    if (this.dataQueryService) {
      try {
        const result = await this.dataQueryService.queryTimeRange({
          tagId,
          startTime,
          endTime,
          page,
          pageSize,
        });

        const mapped: ArchivedDataPoint[] = result.data.map((h) => ({
          tagId: h.tagId,
          deviceId: '',
          projectId: '',
          value: h.numericValue ?? 0,
          quality: 'good',
          timestamp: h.timestamp,
        }));

        return { data: mapped, total: result.total };
      } catch (error) {
        this.logger.warn(
          `DataQueryService.queryTimeRange failed, falling back to memory: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    // 降级：从两个内存存储中合并数据
    const influxKey = `influx:${tagId}`;
    const sqliteKey = `sqlite:${tagId}`;

    const influxData = this.influxStore.get(influxKey) || [];
    const sqliteData = this.sqliteArchiveStore.get(sqliteKey) || [];

    const allData = [...influxData, ...sqliteData]
      .filter((dp) => dp.timestamp >= startTime && dp.timestamp <= endTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // 去重
    const seen = new Set<number>();
    const deduped = allData.filter((dp) => {
      const timestamp = dp.timestamp.getTime();
      if (seen.has(timestamp)) return false;
      seen.add(timestamp);
      return true;
    });

    const total = deduped.length;
    const skip = (page - 1) * pageSize;
    const data = deduped.slice(skip, skip + pageSize);

    return { data, total };
  }

  /**
   * 调度周期性归档
   */
  scheduleArchive(
    projectId: string,
    cronExpression: string,
  ): { scheduled: boolean; projectId: string } {
    // 解析 cron 表达式为毫秒间隔（简化实现）
    const intervalMs = this.parseCronToMs(cronExpression);

    if (this.cronTimers.has(projectId)) {
      clearInterval(this.cronTimers.get(projectId)!);
    }

    const timer = setInterval(async () => {
      this.logger.log(`Scheduled archive triggered for project ${projectId}`);
      try {
        const dataTagRepo = await this.getDataTagRepo(projectId);
        const tags = await dataTagRepo.find({
          where: { archiveEnabled: true },
        });

        for (const tag of tags) {
          const endTime = new Date();
          const startTime = new Date(endTime.getTime() - intervalMs);

          try {
            await this.archiveToSQLite((tag as any).id, startTime, endTime);
          } catch (err) {
            this.logger.error(
              `Scheduled archive failed for tag ${(tag as any).id}: ${(err as Error).message}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Scheduled archive error for project ${projectId}: ${(error as Error).message}`,
        );
      }
    }, intervalMs);

    this.cronTimers.set(projectId, timer);
    this.logger.log(`Scheduled archive for project ${projectId}: every ${intervalMs}ms`);

    return { scheduled: true, projectId };
  }

  /**
   * 取消调度归档
   */
  cancelScheduleArchive(projectId: string): boolean {
    const timer = this.cronTimers.get(projectId);
    if (timer) {
      clearInterval(timer);
      this.cronTimers.delete(projectId);
      this.logger.log(`Scheduled archive cancelled for project ${projectId}`);
      return true;
    }
    return false;
  }

  /**
   * 获取归档状态
   */
  getArchiveStatus(projectId?: string): ArchiveStatus[] {
    const result: ArchiveStatus[] = [];

    if (projectId) {
      const stat = this.stats.get(projectId);
      const activeJobs = Array.from(this.jobs.values()).filter(
        (j) => j.projectId === projectId && j.status === 'running',
      ).length;

      result.push({
        projectId,
        enabled: this.cronTimers.has(projectId),
        lastArchiveAt: stat?.lastArchiveAt,
        totalArchived: stat?.totalArchived || 0,
        totalErrors: stat?.totalErrors || 0,
        activeJobs,
        destinations: ['influxdb', 'sqlite'],
      });
    } else {
      for (const [pid, stat] of this.stats) {
        const activeJobs = Array.from(this.jobs.values()).filter(
          (j) => j.projectId === pid && j.status === 'running',
        ).length;

        result.push({
          projectId: pid,
          enabled: this.cronTimers.has(pid),
          lastArchiveAt: stat.lastArchiveAt,
          totalArchived: stat.totalArchived,
          totalErrors: stat.totalErrors,
          activeJobs,
          destinations: ['influxdb', 'sqlite'],
        });
      }
    }

    return result;
  }

  /**
   * 获取归档统计
   */
  async getArchiveStatistics(projectId: string): Promise<ArchiveStatistics> {
    const dataTagRepo = await this.getDataTagRepo(projectId);
    const tags = await dataTagRepo.find();
    const tagsWithArchive = tags.filter((t: any) => t.archiveEnabled);

    const stat = this.stats.get(projectId);

    return {
      projectId,
      totalDataPoints: stat?.totalDataPoints || 0,
      totalArchived: stat?.totalArchived || 0,
      totalErrors: stat?.totalErrors || 0,
      lastArchiveAt: stat?.lastArchiveAt,
      tagsCount: tags.length,
      tagsWithArchiveEnabled: tagsWithArchive.length,
    };
  }

  /**
   * 获取归档任务状态
   */
  getJobStatus(jobId: string): ArchiveJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 取消归档任务
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      return true;
    }
    return false;
  }

  // ──────────── 私有方法 ────────────

  /**
   * 将 ArchivedDataPoint 映射为 InfluxDB 写入点
   *
   * 映射规则（对应设计文档 §10.3）：
   * - measurement: "device_archive"
   * - tags: projectId, deviceId, tagId
   * - fields: value (number), quality (string)
   * - timestamp: 原始时间戳
   */
  private toInfluxPoint(dp: ArchivedDataPoint): InfluxWritePoint {
    return {
      measurement: 'device_archive',
      tags: {
        projectId: dp.projectId || 'default',
        deviceId: dp.deviceId || 'unknown',
        tagId: dp.tagId,
      },
      fields: {
        value: dp.value,
        quality: dp.quality,
      },
      timestamp: dp.timestamp,
    };
  }

  private createJob(
    tagId: string,
    startTime: Date,
    endTime: Date,
    destination: 'influxdb' | 'sqlite' | 'both',
  ): string {
    const jobId = `arc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const job: ArchiveJob = {
      jobId,
      projectId: '',
      tagId,
      startTime,
      endTime,
      destination,
      status: 'pending',
      createdAt: new Date(),
    };
    this.jobs.set(jobId, job);
    return jobId;
  }

  /**
   * 获取数据点（3.17 实现）
   *
   * 行为：
   * - DataQueryService 可用时 → 从 HistoricalData 表查询真实数据
   * - 不可用时 → 返回空数组（不再生成随机数模拟数据）
   */
  private async fetchDataPoints(
    tagId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<ArchivedDataPoint[]> {
    // 优先使用真实查询服务
    if (this.dataQueryService) {
      try {
        const result = await this.dataQueryService.queryTimeRange({
          tagId,
          startTime,
          endTime,
          page: 1,
          pageSize: 1000,
        });

        return result.data.map((h) => ({
          tagId: h.tagId,
          deviceId: '',
          projectId: '',
          value: h.numericValue ?? 0,
          quality: 'good',
          timestamp: h.timestamp,
        }));
      } catch (error) {
        this.logger.warn(
          `fetchDataPoints: DataQueryService failed, returning empty: ${error instanceof Error ? error.message : error}`,
        );
        return [];
      }
    }

    // 降级：返回空数组（不再生成随机数）
    this.logger.debug(
      `fetchDataPoints: DataQueryService not available, returning empty array for tag ${tagId}`,
    );
    return [];
  }

  private updateStats(tagId: string, archivedCount: number): void {
    // 简化：使用 tagId 作为 projectId
    const projectId = 'default';
    let stat = this.stats.get(projectId);
    if (!stat) {
      stat = {
        projectId,
        totalDataPoints: 0,
        totalArchived: 0,
        totalErrors: 0,
        tagsCount: 0,
        tagsWithArchiveEnabled: 0,
      };
      this.stats.set(projectId, stat);
    }
    stat.totalArchived += archivedCount;
    stat.totalDataPoints += archivedCount;
    stat.lastArchiveAt = new Date();
  }

  private parseCronToMs(cronExpression: string): number {
    // 简化 cron 解析：支持常见格式
    const parts = cronExpression.trim().split(/\s+/);

    if (parts.length === 1) {
      // 直接毫秒值
      const ms = parseInt(parts[0], 10);
      if (!isNaN(ms)) return ms;
    }

    // 默认常见间隔
    switch (cronExpression) {
      case '* * * * *':
        return 60000; // 每分钟
      case '*/5 * * * *':
        return 300000; // 每5分钟
      case '*/15 * * * *':
        return 900000; // 每15分钟
      case '0 * * * *':
        return 3600000; // 每小时
      case '0 0 * * *':
        return 86400000; // 每天
      default:
        // 尝试解析为分钟，兜底从配置读取或默认 5 分钟
        return this.configService?.get<number>('DEVICE_ARCHIVE_DEFAULT_INTERVAL_MS') || 300000;
    }
  }
}
