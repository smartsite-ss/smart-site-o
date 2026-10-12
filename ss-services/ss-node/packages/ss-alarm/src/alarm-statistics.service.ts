// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlarmRecord, AlarmStatus, AlarmLevel } from './entities/alarm.entity';
import { ProjectDatabaseService } from '@ss-node/ss-core';
import { ConfigService } from '@nestjs/config';

export interface AlarmStatistics {
  total: number;
  active: number;
  acknowledged: number;
  cleared: number;
  shelved: number;
  byLevel: Record<AlarmLevel, number>;
  byStatus: Record<AlarmStatus, number>;
}

export interface AlarmTrend {
  date: string;
  count: number;
  level: AlarmLevel;
}

export interface AlarmTopRule {
  ruleId: string;
  ruleName: string;
  count: number;
  lastTriggered: Date;
}

export interface DeviceStats {
  deviceId: string;
  deviceName: string;
  count: number;
}

export interface TagStats {
  tagId: string;
  tagName: string;
  count: number;
}

@Injectable()
export class AlarmStatisticsService {
  private readonly logger = new Logger(AlarmStatisticsService.name);
  private readonly dbMode: string;

  constructor(
    @Inject(getRepositoryToken(AlarmRecord))
    private readonly alarmRecordRepo: Repository<AlarmRecord>,
    @Optional()
    private readonly projectDbService?: ProjectDatabaseService,
    private readonly configService?: ConfigService,
  ) {
    this.dbMode = this.configService?.get<string>('PROJECT_DB_MODE', 'isolated') ?? 'isolated';
  }

  private async getRepo(projectId: string): Promise<Repository<AlarmRecord>> {
    if (this.dbMode === 'isolated' && this.projectDbService) {
      const ds = await this.projectDbService.getSystemDb(projectId);
      return ds.getRepository(AlarmRecord);
    }
    return this.alarmRecordRepo;
  }

  async getStatistics(projectId: string): Promise<AlarmStatistics> {
    const repo = await this.getRepo(projectId);

    // 单条聚合查询替代全表加载：用条件 SUM 在数据库侧完成所有 COUNT，
    // 避免将数万条报警记录拉入内存 → 内存 GC 暂停阻塞事件循环
    const raw = await repo
      .createQueryBuilder('r')
      .select('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN r.status = :active THEN 1 ELSE 0 END)`, 'active')
      .addSelect(`SUM(CASE WHEN r.status = :acknowledged THEN 1 ELSE 0 END)`, 'acknowledged')
      .addSelect(`SUM(CASE WHEN r.status = :cleared THEN 1 ELSE 0 END)`, 'cleared')
      .addSelect(`SUM(CASE WHEN r.status = :shelved THEN 1 ELSE 0 END)`, 'shelved')
      .addSelect(`SUM(CASE WHEN r.level = :info THEN 1 ELSE 0 END)`, 'info')
      .addSelect(`SUM(CASE WHEN r.level = :warning THEN 1 ELSE 0 END)`, 'warning')
      .addSelect(`SUM(CASE WHEN r.level = :error THEN 1 ELSE 0 END)`, 'error')
      .addSelect(`SUM(CASE WHEN r.level = :critical THEN 1 ELSE 0 END)`, 'critical')
      .where('r.projectId = :projectId', { projectId })
      .setParameters({
        active: AlarmStatus.ACTIVE,
        acknowledged: AlarmStatus.ACKNOWLEDGED,
        cleared: AlarmStatus.CLEARED,
        shelved: AlarmStatus.SHELVED,
        info: AlarmLevel.INFO,
        warning: AlarmLevel.WARNING,
        error: AlarmLevel.ERROR,
        critical: AlarmLevel.CRITICAL,
      })
      .getRawOne<Record<string, string | number>>();

    const num = (key: string) => Number(raw?.[key]) || 0;

    return {
      total: num('total'),
      active: num('active'),
      acknowledged: num('acknowledged'),
      cleared: num('cleared'),
      shelved: num('shelved'),
      byLevel: {
        [AlarmLevel.INFO]: num('info'),
        [AlarmLevel.WARNING]: num('warning'),
        [AlarmLevel.ERROR]: num('error'),
        [AlarmLevel.CRITICAL]: num('critical'),
      },
      byStatus: {
        [AlarmStatus.ACTIVE]: num('active'),
        [AlarmStatus.ACKNOWLEDGED]: num('acknowledged'),
        [AlarmStatus.CLEARED]: num('cleared'),
        [AlarmStatus.SHELVED]: num('shelved'),
      },
    };
  }

  /** SQL 聚合替代全表加载：strftime 日期分组 + COUNT */
  async getTrends(projectId: string, days: number = 7): Promise<AlarmTrend[]> {
    const repo = await this.getRepo(projectId);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const raw = await repo
      .createQueryBuilder('r')
      .select("strftime('%Y-%m-%d', r.createdAt)", 'date')
      .addSelect('r.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('r.projectId = :projectId', { projectId })
      .andWhere('r.createdAt >= :since', { since: since.toISOString() })
      .groupBy('date')
      .addGroupBy('r.level')
      .orderBy('date', 'ASC')
      .addOrderBy('r.level', 'ASC')
      .getRawMany<{ date: string; level: string; count: string }>();

    return raw.map((r) => ({
      date: r.date,
      count: Number(r.count),
      level: r.level as AlarmLevel,
    }));
  }

  /** SQL 聚合替代全表加载 + JOIN：ruleId 分组 + COUNT + LIMIT + MAX(createdAt) */
  async getTopRules(projectId: string, limit: number = 10): Promise<AlarmTopRule[]> {
    const repo = await this.getRepo(projectId);

    const raw = await repo
      .createQueryBuilder('r')
      .select('r.ruleId', 'ruleId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(r.createdAt)', 'lastTriggered')
      .addSelect("COALESCE(rule.name, 'Unknown')", 'ruleName')
      .leftJoin('r.rule', 'rule')
      .where('r.projectId = :projectId', { projectId })
      .groupBy('r.ruleId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ ruleId: string; count: string; lastTriggered: string; ruleName: string }>();

    return raw.map((r) => ({
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      count: Number(r.count),
      lastTriggered: new Date(r.lastTriggered),
    }));
  }

  /** SQL 聚合替代全表加载：deviceId 分组 + COUNT + LIMIT */
  async getStatisticsByDevice(projectId: string, limit: number = 10): Promise<DeviceStats[]> {
    const repo = await this.getRepo(projectId);

    const raw = await repo
      .createQueryBuilder('r')
      .select('r.deviceId', 'deviceId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(r.deviceName)', 'deviceName')
      .where('r.projectId = :projectId', { projectId })
      .andWhere('r.deviceId IS NOT NULL')
      .groupBy('r.deviceId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ deviceId: string; count: string; deviceName: string }>();

    return raw.map((r) => ({
      deviceId: r.deviceId,
      deviceName: r.deviceName || r.deviceId,
      count: Number(r.count),
    }));
  }

  /** SQL 聚合替代全表加载：tagId 分组 + COUNT + LIMIT */
  async getStatisticsByTag(projectId: string, limit: number = 10): Promise<TagStats[]> {
    const repo = await this.getRepo(projectId);

    const raw = await repo
      .createQueryBuilder('r')
      .select('r.tagId', 'tagId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(r.tagName)', 'tagName')
      .where('r.projectId = :projectId', { projectId })
      .andWhere('r.tagId IS NOT NULL')
      .groupBy('r.tagId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ tagId: string; count: string; tagName: string }>();

    return raw.map((r) => ({
      tagId: r.tagId,
      tagName: r.tagName || r.tagId,
      count: Number(r.count),
    }));
  }

  async getAlarmRate(projectId: string, _intervalMinutes: number = 60): Promise<number> {
    const repo = await this.getRepo(projectId);
    const recentCount = await repo.count({ where: { projectId } });
    return recentCount;
  }

  /** 导出报表：添加分页限制（take/skip），避免一次性加载全表 */
  async exportReport(
    projectId: string,
    format: 'csv' | 'json',
    page: number = 1,
    pageSize: number = 1000,
  ): Promise<string> {
    const repo = await this.getRepo(projectId);
    const records = await repo.find({
      where: { projectId },
      relations: ['rule'],
      order: { createdAt: 'DESC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    if (format === 'json') {
      return JSON.stringify(
        records.map((r) => ({
          id: r.id,
          ruleName: r.rule?.name,
          level: r.level,
          status: r.status,
          message: r.message,
          triggerValue: r.triggerValue,
          acknowledgedAt: r.acknowledgedAt,
          clearedAt: r.clearedAt,
          shelvedAt: r.shelvedAt,
          shelveReason: r.shelveReason,
          createdAt: r.createdAt,
        })),
        null,
        2,
      );
    }

    let csv = 'ID,规则名称,级别,状态,消息,触发值,确认时间,清除时间,暂缓时间,暂缓原因,创建时间\n';
    for (const r of records) {
      csv += `${r.id},${r.rule?.name || ''},${r.level},${r.status},"${r.message}",${r.triggerValue},${r.acknowledgedAt || ''},${r.clearedAt || ''},${r.shelvedAt || ''},"${r.shelveReason || ''}",${r.createdAt.toISOString()}\n`;
    }

    return csv;
  }
}
