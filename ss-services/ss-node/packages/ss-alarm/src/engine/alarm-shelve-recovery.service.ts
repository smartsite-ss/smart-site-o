// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  Logger,
  Inject,
  Optional,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AlarmRecord, AlarmStatus } from '../entities/alarm.entity';
import { EventBusService, ProjectDatabaseService } from '@ss-node/ss-core';

/**
 * 告警暂缓自动恢复服务
 *
 * 设计目标：
 * - 替代在 shelveAlarm 中使用 setTimeout 的脆弱方案（进程重启即丢失定时器）
 * - 采用定时扫描（setInterval）周期性检查到期暂缓，重启后仍可恢复
 *
 * 扫描策略：
 * - 每 60s 扫描一次（暂缓恢复对实时性要求不高，无需像升级 30s 那样频繁）
 * - 查询 status=SHELVED 且 shelvedUntil <= now 的记录
 * - 回退到 preShelveStatus（null 时回退到 ACTIVE），清空 shelvedUntil/preShelveStatus
 * - 保留 shelvedAt/shelvedBy/shelveReason 作为审计痕迹
 *
 * 数据库模式适配：
 * - isolated 模式：遍历 ProjectDatabaseService.getLoadedProjectNames() 逐项目扫描
 * - unified 模式：直接使用全局注入的 Repository
 */
@Injectable()
export class AlarmShelveRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlarmShelveRecoveryService.name);

  /** 定时扫描间隔（ms） */
  private readonly scanIntervalMs: number;
  private periodicTimer: NodeJS.Timeout | null = null;

  private readonly dbMode: string;

  constructor(
    @Inject(getRepositoryToken(AlarmRecord))
    private readonly alarmRecordRepo: Repository<AlarmRecord>,
    private readonly eventBusService: EventBusService,
    @Optional() private readonly projectDbService?: ProjectDatabaseService,
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.scanIntervalMs = this.configService?.get<number>('ALARM_SHELVE_SCAN_INTERVAL_MS') || 60000;
    this.dbMode = this.configService?.get<string>('PROJECT_DB_MODE', 'isolated') ?? 'isolated';
  }

  onModuleInit(): void {
    this.periodicTimer = setInterval(() => {
      this.periodicCheck().catch((err) => {
        this.logger.error(`Periodic shelve recovery check failed: ${(err as Error).message}`);
      });
    }, this.scanIntervalMs);
    this.logger.log(
      `Shelve recovery scanner started (interval=${this.scanIntervalMs}ms, mode=${this.dbMode})`,
    );
  }

  onModuleDestroy(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  /**
   * 周期性扫描到期暂缓告警并自动恢复
   *
   * 遍历已加载项目（isolated 模式）或全局库（unified 模式），
   * 查找 status=SHELVED 且 shelvedUntil <= now 的记录，回退到暂缓前状态。
   */
  async periodicCheck(): Promise<void> {
    const now = new Date();
    let recovered = 0;

    if (this.dbMode === 'isolated' && this.projectDbService) {
      const projectNames = this.projectDbService.getLoadedProjectNames();
      for (const projectName of projectNames) {
        const ds = this.projectDbService.getLoadedSystemDb(projectName);
        if (!ds) continue;
        const repo = ds.getRepository(AlarmRecord);
        recovered += await this.recoverExpiredShelves(repo, projectName, now);
      }
    } else {
      recovered += await this.recoverExpiredShelves(this.alarmRecordRepo, null, now);
    }

    if (recovered > 0) {
      this.logger.log(`Recovered ${recovered} expired shelved alarm(s)`);
    }
  }

  /**
   * 恢复指定 Repository 下到期的暂缓告警
   *
   * @param repo    AlarmRecord Repository（项目级或全局）
   * @param projectId 项目标识（用于事件载荷，null 表示 unified 模式）
   * @param now     当前时间
   * @returns 恢复的记录数
   */
  private async recoverExpiredShelves(
    repo: Repository<AlarmRecord>,
    projectId: string | null,
    now: Date,
  ): Promise<number> {
    const where: FindOptionsWhere<AlarmRecord> = {
      status: AlarmStatus.SHELVED,
      // shelvedUntil <= now（SQL 中 NULL <= x 为 NULL/false，自动排除手动暂缓记录）
      shelvedUntil: LessThanOrEqual(now) as unknown as Date,
    };
    const expired = await repo.find({ where });

    if (expired.length === 0) return 0;

    for (const record of expired) {
      const targetStatus = record.preShelveStatus ?? AlarmStatus.ACTIVE;
      record.status = targetStatus;
      record.dispositionType = 'alarm.shelve.expired';
      // 清空暂缓恢复专用字段，保留 shelvedAt/shelvedBy/shelveReason 作为审计痕迹
      record.shelvedUntil = null;
      record.preShelveStatus = null;

      await repo.save(record);

      this.eventBusService.emit('alarm.shelve.expired', {
        recordId: record.id,
        projectId: projectId ?? record.projectId,
        ruleId: record.ruleId,
        recoveredTo: targetStatus,
        shelvedAt: record.shelvedAt,
        timestamp: Date.now(),
      });

      this.logger.debug(
        `Recovered shelved alarm ${record.id} → ${targetStatus}` +
          (projectId ? ` [project=${projectId}]` : ''),
      );
    }

    return expired.length;
  }
}
