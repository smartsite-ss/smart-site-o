// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 首页仪表盘聚合服务（02 模块）
 *
 * 单次聚合查询：设备五态统计（复用 DeviceService）+ 当日报警分级计数（SQL 聚合）
 * + 活跃未确认报警计数；结果带 30s 内存缓存，避免小程序高频 onShow 重复打聚合查询。
 */
import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ProjectDatabaseService } from '@ss-node/ss-core';
import { DeviceService } from '@ss-node/ss-device';
import { AlarmRecord, AlarmLevel, AlarmStatus } from '@ss-node/ss-alarm';

/** 服务端聚合缓存有效期（毫秒） */
const DASHBOARD_CACHE_TTL_MS = 30_000;

/** 仪表盘聚合摘要（与小程序 dashboard.api.ts 的 DashboardSummary 契约一致） */
export interface DashboardSummary {
  deviceTotal: number;
  deviceOnlineCount: number;
  deviceOfflineCount: number;
  deviceConnectingCount: number;
  deviceDegradedCount: number;
  deviceErrorCount: number;
  totalTagCount: number;
  /** 当日报警总数（本地时区 0 点起） */
  todayAlarmTotalCount: number;
  /** 当日报警按级别计数 */
  todayAlarmCountByLevel: Record<AlarmLevel, number>;
  /** 当前活跃未确认报警数（用于角标） */
  activeUnacknowledgedAlarmCount: number;
  /** 聚合时间戳（毫秒，缓存新鲜度标注用） */
  generatedAt: number;
}

interface CacheEntry {
  summary: DashboardSummary;
  cachedAt: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly dbMode: string;

  constructor(
    private readonly deviceService: DeviceService,
    @Inject(getRepositoryToken(AlarmRecord))
    private readonly alarmRecordRepo: Repository<AlarmRecord>,
    @Optional()
    private readonly projectDbService?: ProjectDatabaseService,
    private readonly configService?: ConfigService,
  ) {
    this.dbMode = this.configService?.get<string>('PROJECT_DB_MODE', 'isolated') ?? 'isolated';
  }

  /**
   * 获取仪表盘聚合摘要
   * @param forceRefresh true 时绕过缓存重新聚合（下拉刷新场景）
   * @param roleId 角色 ID（透传给设备统计做授权过滤）
   */
  async getSummary(
    projectId: string,
    forceRefresh: boolean = false,
    roleId?: string,
  ): Promise<DashboardSummary> {
    if (!forceRefresh) {
      const entry = this.cache.get(projectId);
      if (entry && Date.now() - entry.cachedAt < DASHBOARD_CACHE_TTL_MS) {
        return entry.summary;
      }
    }

    const summary = await this.aggregate(projectId, roleId);
    this.cache.set(projectId, { summary, cachedAt: Date.now() });
    return summary;
  }

  private async aggregate(projectId: string, roleId?: string): Promise<DashboardSummary> {
    const [deviceStats, alarmAggregation] = await Promise.all([
      this.deviceService.getDeviceStats(projectId, roleId),
      this.aggregateAlarms(projectId),
    ]);

    return {
      deviceTotal: deviceStats.total,
      deviceOnlineCount: deviceStats.online,
      deviceOfflineCount: deviceStats.offline,
      deviceConnectingCount: deviceStats.connecting,
      deviceDegradedCount: deviceStats.degraded,
      deviceErrorCount: deviceStats.error,
      totalTagCount: deviceStats.totalTags,
      todayAlarmTotalCount: alarmAggregation.todayTotal,
      todayAlarmCountByLevel: alarmAggregation.todayByLevel,
      activeUnacknowledgedAlarmCount: alarmAggregation.activeUnacknowledged,
      generatedAt: Date.now(),
    };
  }

  /**
   * 单条聚合查询：当日分级计数 + 活跃未确认计数在数据库侧完成，
   * 避免将报警记录拉入内存（同 AlarmStatisticsService 聚合模式）
   */
  private async aggregateAlarms(projectId: string): Promise<{
    todayTotal: number;
    todayByLevel: Record<AlarmLevel, number>;
    activeUnacknowledged: number;
  }> {
    const repo = await this.getRepo(projectId);
    const startOfToday = this.getStartOfToday();

    const raw = await repo
      .createQueryBuilder('r')
      .select(
        `SUM(CASE WHEN r.createdAt >= :startOfToday THEN 1 ELSE 0 END)`,
        'todayTotal',
      )
      .addSelect(
        `SUM(CASE WHEN r.createdAt >= :startOfToday AND r.level = :info THEN 1 ELSE 0 END)`,
        'todayInfo',
      )
      .addSelect(
        `SUM(CASE WHEN r.createdAt >= :startOfToday AND r.level = :warning THEN 1 ELSE 0 END)`,
        'todayWarning',
      )
      .addSelect(
        `SUM(CASE WHEN r.createdAt >= :startOfToday AND r.level = :error THEN 1 ELSE 0 END)`,
        'todayError',
      )
      .addSelect(
        `SUM(CASE WHEN r.createdAt >= :startOfToday AND r.level = :critical THEN 1 ELSE 0 END)`,
        'todayCritical',
      )
      .addSelect(
        `SUM(CASE WHEN r.status = :active THEN 1 ELSE 0 END)`,
        'activeUnacknowledged',
      )
      .where('r.projectId = :projectId', { projectId })
      .setParameters({
        startOfToday: startOfToday.toISOString(),
        info: AlarmLevel.INFO,
        warning: AlarmLevel.WARNING,
        error: AlarmLevel.ERROR,
        critical: AlarmLevel.CRITICAL,
        active: AlarmStatus.ACTIVE,
      })
      .getRawOne<Record<string, string | number>>();

    const num = (key: string) => Number(raw?.[key]) || 0;

    return {
      todayTotal: num('todayTotal'),
      todayByLevel: {
        [AlarmLevel.INFO]: num('todayInfo'),
        [AlarmLevel.WARNING]: num('todayWarning'),
        [AlarmLevel.ERROR]: num('todayError'),
        [AlarmLevel.CRITICAL]: num('todayCritical'),
      },
      activeUnacknowledged: num('activeUnacknowledged'),
    };
  }

  /** 本地时区当日 0 点（与小程序端"当日"口径一致） */
  private getStartOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  /** 项目隔离库模式：按项目取独立库的 AlarmRecord 仓储（同 AlarmStatisticsService 模式） */
  private async getRepo(projectId: string): Promise<Repository<AlarmRecord>> {
    if (this.dbMode === 'isolated' && this.projectDbService) {
      const ds = await this.projectDbService.getSystemDb(projectId);
      return ds.getRepository(AlarmRecord);
    }
    return this.alarmRecordRepo;
  }
}
