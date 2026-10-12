// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlarmRecord } from '../entities/alarm.entity';
import { ProjectDatabaseService } from '@ss-node/ss-core';
import { ConfigService } from '@nestjs/config';

export interface LevelStatistics {
  level: string;
  count: number;
}

export interface DeviceStatistics {
  deviceId: string;
  count: number;
}

export interface TimeSeriesPoint {
  time: string;
  count: number;
}

export interface TrendAnalysis {
  currentPeriod: { startDate: string; endDate: string; count: number };
  previousPeriod: { startDate: string; endDate: string; count: number };
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TopAlarm {
  ruleName: string;
  message: string;
  count: number;
  level: string;
}

export interface ResponseTimeStats {
  average: number;
  median: number;
  max: number;
  min: number;
  totalSamples: number;
}

export interface AlarmSummary {
  projectId: string;
  totalAlarms: number;
  byLevel: Record<string, number>;
  byDevice: Record<string, number>;
  trend: TrendAnalysis;
  topAlarms: TopAlarm[];
  responseTime: ResponseTimeStats;
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
    @Optional()
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

  private buildDateFilter(startDate?: string, endDate?: string): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (startDate) {
      filter['createdAt'] = { $gte: new Date(startDate) };
    }
    if (endDate) {
      filter['createdAt'] = {
        ...((filter['createdAt'] as Record<string, unknown>) || {}),
        $lte: new Date(endDate),
      };
    }
    return filter;
  }

  async getStatisticsByLevel(
    projectId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<LevelStatistics[]> {
    const where: Record<string, unknown> = {};
    if (projectId) {
      where['projectId'] = projectId;
    }
    Object.assign(where, this.buildDateFilter(startDate, endDate));

    const repo = projectId ? await this.getRepo(projectId) : this.alarmRecordRepo;
    const records = await repo.find({ where: where as any });

    const levelMap = new Map<string, number>();
    for (const record of records) {
      levelMap.set(record.level, (levelMap.get(record.level) || 0) + 1);
    }

    return Array.from(levelMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getStatisticsByDevice(
    deviceId: string,
    projectId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DeviceStatistics> {
    const where: Record<string, unknown> = { deviceId };
    if (projectId) {
      where['projectId'] = projectId;
    }
    Object.assign(where, this.buildDateFilter(startDate, endDate));

    const repo = projectId ? await this.getRepo(projectId) : this.alarmRecordRepo;
    const count = await repo.count({ where: where as any });

    return { deviceId, count };
  }

  async getStatisticsByTime(
    projectId?: string,
    startDate?: string,
    endDate?: string,
    interval: 'hourly' | 'daily' = 'daily',
  ): Promise<TimeSeriesPoint[]> {
    const where: Record<string, unknown> = {};
    if (projectId) {
      where['projectId'] = projectId;
    }
    Object.assign(where, this.buildDateFilter(startDate, endDate));

    const repo = projectId ? await this.getRepo(projectId) : this.alarmRecordRepo;
    const records = await repo.find({ where: where as any });

    const timeMap = new Map<string, number>();
    for (const record of records) {
      const key = this.getTimeKey(record.createdAt, interval);
      timeMap.set(key, (timeMap.get(key) || 0) + 1);
    }

    return Array.from(timeMap.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  async getTrendAnalysis(
    startDate: string,
    endDate: string,
    projectId?: string,
  ): Promise<TrendAnalysis> {
    const currentStart = new Date(startDate);
    const currentEnd = new Date(endDate);
    const duration = currentEnd.getTime() - currentStart.getTime();
    const previousStart = new Date(currentStart.getTime() - duration);
    const previousEnd = new Date(currentStart.getTime() - 1);

    const repo = projectId ? await this.getRepo(projectId) : this.alarmRecordRepo;

    const baseWhere: Record<string, unknown> = {};
    if (projectId) {
      baseWhere['projectId'] = projectId;
    }

    const currentWhere = { ...baseWhere, createdAt: { $gte: currentStart, $lte: currentEnd } };
    const previousWhere = {
      ...baseWhere,
      createdAt: { $gte: previousStart, $lte: previousEnd },
    };

    const currentCount = await repo.count({ where: currentWhere as any });
    const previousCount = await repo.count({ where: previousWhere as any });

    const change = currentCount - previousCount;
    const changePercent =
      previousCount === 0 ? (currentCount > 0 ? 100 : 0) : (change / previousCount) * 100;

    let trend: 'up' | 'down' | 'stable';
    if (changePercent > 5) {
      trend = 'up';
    } else if (changePercent < -5) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    return {
      currentPeriod: {
        startDate: currentStart.toISOString(),
        endDate: currentEnd.toISOString(),
        count: currentCount,
      },
      previousPeriod: {
        startDate: previousStart.toISOString(),
        endDate: previousEnd.toISOString(),
        count: previousCount,
      },
      change,
      changePercent: Math.round(changePercent * 100) / 100,
      trend,
    };
  }

  async getTopAlarms(
    limit: number = 10,
    projectId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<TopAlarm[]> {
    const where: Record<string, unknown> = {};
    if (projectId) {
      where['projectId'] = projectId;
    }
    Object.assign(where, this.buildDateFilter(startDate, endDate));

    const repo = projectId ? await this.getRepo(projectId) : this.alarmRecordRepo;
    const records = await repo.find({ where: where as any });

    const messageMap = new Map<string, { count: number; ruleName: string; level: string }>();
    for (const record of records) {
      const key = record.message;
      const existing = messageMap.get(key) || {
        count: 0,
        ruleName: record.rule?.name || '',
        level: record.level,
      };
      existing.count++;
      messageMap.set(key, existing);
    }

    return Array.from(messageMap.entries())
      .map(([message, data]) => ({
        ruleName: data.ruleName,
        message,
        count: data.count,
        level: data.level,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getResponseTimeStats(
    projectId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ResponseTimeStats> {
    const where: Record<string, unknown> = {};
    if (projectId) {
      where['projectId'] = projectId;
    }
    Object.assign(where, this.buildDateFilter(startDate, endDate));

    const repo = projectId ? await this.getRepo(projectId) : this.alarmRecordRepo;
    const records = await repo.find({
      where: {
        ...where,
        acknowledgedAt: { $ne: null },
      } as any,
    });

    if (records.length === 0) {
      return { average: 0, median: 0, max: 0, min: 0, totalSamples: 0 };
    }

    const responseTimes = records.map((r) => r.acknowledgedAt!.getTime() - r.createdAt.getTime());
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const sum = responseTimes.reduce((a, b) => a + b, 0);
    const average = sum / responseTimes.length;
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const max = sorted[sorted.length - 1];
    const min = sorted[0];

    return {
      average: Math.round(average),
      median: Math.round(median),
      max: Math.round(max),
      min: Math.round(min),
      totalSamples: records.length,
    };
  }

  async getAlarmSummary(
    projectId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AlarmSummary> {
    const repo = await this.getRepo(projectId);
    const where: Record<string, unknown> = { projectId };
    Object.assign(where, this.buildDateFilter(startDate, endDate));

    const records = await repo.find({ where: where as any });

    const byLevel: Record<string, number> = {};
    const byDevice: Record<string, number> = {};

    for (const record of records) {
      byLevel[record.level] = (byLevel[record.level] || 0) + 1;
      if (record.deviceId) {
        byDevice[record.deviceId] = (byDevice[record.deviceId] || 0) + 1;
      }
    }

    const trend = await this.getTrendAnalysis(
      startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
      projectId,
    );

    const topAlarms = await this.getTopAlarms(5, projectId, startDate, endDate);
    const responseTime = await this.getResponseTimeStats(projectId, startDate, endDate);

    return {
      projectId,
      totalAlarms: records.length,
      byLevel,
      byDevice,
      trend,
      topAlarms,
      responseTime,
    };
  }

  private getTimeKey(date: Date, interval: 'hourly' | 'daily'): string {
    const iso = date.toISOString();
    if (interval === 'hourly') {
      return iso.substring(0, 13) + ':00:00.000Z';
    }
    return iso.substring(0, 10) + 'T00:00:00.000Z';
  }
}
