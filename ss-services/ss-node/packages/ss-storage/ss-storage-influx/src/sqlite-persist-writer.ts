// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { IPersistWriter, DataPoint, PersistWriterRegistry } from '@ss-node/ss-collector-sdk';
import { ProjectDatabaseService } from '@ss-node/ss-core';
import { HistoricalData } from './entities/historical-data.entity';

/**
 * SQLite 历史数据 PersistWriter 实现
 *
 * 数据流：Pipeline DataPoint → write() → buffer → flush() → 项目数据库 data_historical_data 表
 *
 * 条件激活：仅当 HISTORICAL_DATA_BACKEND=sqlite 时执行写入，
 * 否则 write/writeBatch/flush 均为 no-op（由 InfluxPersistWriter 接管）。
 *
 * 关键设计：使用项目级 DataSource（通过 ProjectDatabaseService 获取），而非全局
 * DataSource。原因：
 * - HistoricalData 实体通过 @ManyToOne(() => DataTag) 建立外键引用 dev_data_tags.id
 * - DataTag 数据存放在项目数据库（PROJECT_DB_MODE=isolated）
 * - 若使用全局 DataSource（ss-node.db），全局库的 dev_data_tags 为空，外键检查失败
 *
 * HistoricalData 实体已由 DataModule.onModuleInit() 注册到 ProjectDatabaseService，
 * 因此每个项目数据库初始化时都会自动创建 data_historical_data 表。
 *
 * 注册：必须通过 onModuleInit 主动注册到 PersistWriterRegistry，
 * 否则 PersistStep 无法获取到本 Writer（NestJS 模块封装性限制）。
 */
@Injectable()
export class SqlitePersistWriter implements IPersistWriter, OnModuleInit {
  readonly name = 'SQLite';
  private readonly logger = new Logger(SqlitePersistWriter.name);
  /** 按 projectId 分组的待写入缓冲区 */
  private bufferByProject: Map<string, HistoricalData[]> = new Map();
  private readonly batchSize = 100;
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly flushIntervalMs = 5000;
  /** 是否激活：仅当 HISTORICAL_DATA_BACKEND=sqlite */
  private readonly enabled: boolean;

  isActive(): boolean {
    return this.enabled;
  }

  constructor(
    private readonly projectDbService: ProjectDatabaseService,
    private readonly writerRegistry: PersistWriterRegistry,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get('HISTORICAL_DATA_BACKEND', 'influxdb') === 'sqlite';
  }

  onModuleInit(): void {
    this.writerRegistry.register(this);
    this.logger.log(`SqlitePersistWriter registered (enabled=${this.enabled})`);
  }

  /**
   * 获取指定项目的 HistoricalData Repository
   * 通过 ProjectDatabaseService 获取项目级 DataSource，再取 Repository
   */
  private async getRepo(projectId: string): Promise<Repository<HistoricalData>> {
    const ds = await this.projectDbService.getSystemDb(projectId);
    return ds.getRepository(HistoricalData);
  }

  async write(point: DataPoint): Promise<void> {
    if (!this.enabled) return;

    const repo = await this.getRepo(point.projectId);
    const record = repo.create(this.buildRecord(point));

    const buf = this.bufferByProject.get(point.projectId) ?? [];
    buf.push(record);
    this.bufferByProject.set(point.projectId, buf);

    if (buf.length >= this.batchSize) {
      await this.flushProject(point.projectId, buf);
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

  async writeBatch(points: DataPoint[]): Promise<void> {
    if (!this.enabled) return;
    if (points.length === 0) return;

    // 按 projectId 分组，分别写入对应项目数据库
    const grouped = new Map<string, DataPoint[]>();
    for (const point of points) {
      const arr = grouped.get(point.projectId) ?? [];
      arr.push(point);
      grouped.set(point.projectId, arr);
    }

    for (const [projectId, pointsForProject] of grouped) {
      try {
        const repo = await this.getRepo(projectId);
        const records = pointsForProject.map((point) => repo.create(this.buildRecord(point)));
        await repo.save(records);
        this.logger.debug(
          `SQLite batch written: ${records.length} records to project ${projectId}`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'SQLite write failed';
        this.logger.error(`SQLite batch write error (project=${projectId}): ${errorMsg}`);
        throw error;
      }
    }
  }

  /**
   * 根据 DataPoint 构造 HistoricalData 记录
   *
   * 按 value 类型分写到对应列：
   * - number → numericValue
   * - boolean → booleanValue
   * - string → stringValue
   * - null → 三个列均为 null
   *
   * 这样查询时可根据 tag.dataType 选择正确的列读取。
   */
  private buildRecord(point: DataPoint): Partial<HistoricalData> {
    const record: Partial<HistoricalData> = {
      tagId: point.tagId,
      numericValue: null,
      stringValue: null,
      booleanValue: null,
      timestamp: point.timestamp,
    };

    if (point.value === null || point.value === undefined) {
      return record;
    }

    if (typeof point.value === 'boolean') {
      record.booleanValue = point.value;
    } else if (typeof point.value === 'string') {
      record.stringValue = point.value;
    } else {
      record.numericValue = point.value;
    }

    return record;
  }

  async flush(): Promise<void> {
    if (!this.enabled) return;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // 快照当前待刷新项目，避免 flushProject 失败时 re-queue 导致 Map
    // 在迭代中被修改（delete + set 会使迭代器重新访问该 key → 死循环）
    const entries = Array.from(this.bufferByProject.entries());
    for (const [projectId, buf] of entries) {
      if (buf.length === 0) continue;
      await this.flushProject(projectId, buf);
    }
  }

  private async flushProject(projectId: string, buf: HistoricalData[]): Promise<void> {
    if (buf.length === 0) return;

    // 取出并清空对应项目的缓冲区
    const batch = buf.splice(0);
    // 如果缓冲区已空，从 map 中移除（避免 Map 无限增长）
    if (buf.length === 0) {
      this.bufferByProject.delete(projectId);
    }

    this.logger.debug(`SQLite flushing ${batch.length} records for project ${projectId}`);

    try {
      const repo = await this.getRepo(projectId);
      await repo.save(batch);
      this.logger.debug(`SQLite flushed ${batch.length} records for project ${projectId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'SQLite flush failed';
      this.logger.error(`SQLite flush error (project=${projectId}): ${errorMsg}`);
      // 失败时把记录放回缓冲区，下次再试
      const current = this.bufferByProject.get(projectId) ?? [];
      this.bufferByProject.set(projectId, [...batch, ...current]);
    }
  }
}
