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
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  LatestValueRedisService,
  type LatestValueEntry,
  ProjectDatabaseService,
  EventBusService,
  AlarmRecoveredEvent,
} from '@ss-node/ss-core';
import { AlarmRule, AlarmRecord, AlarmStatus } from '../entities/alarm.entity';
import { ConditionEvaluator } from './condition-evaluator';

/**
 * AlarmReconciliationService — 告警对账服务（Phase 5.5 重启兜底）
 *
 * ## 设计目标
 * AlarmCheckStep 的恢复检测依赖内存中的 `alarmStates` Map。进程重启后该 Map 丢失，
 * 此时即使采集值已恢复正常，也无法触发 `alarm_normalized` 事件，导致告警永久停留在
 * ACTIVE 状态（无法闭环）。
 *
 * 本服务通过定时对账解决此问题：周期性扫描所有未恢复的活跃告警，读取 Redis 最新值，
 * 重新评估条件，若已恢复则补执行恢复流程。
 *
 * ## 扫描策略
 * - 每 5 分钟扫描一次（ALARM_RECONCILIATION_INTERVAL_MS 可配置，默认 300000）
 * - 仅扫描 status IN (ACTIVE, ACKNOWLEDGED) AND isActive=true 的记录
 *   （SHELVED 状态由 AlarmShelveRecoveryService 独立管理，不在此对账）
 * - 对每条记录读取 Redis 最新值：经 tree 索引(`ss:latest:tree:{projectId}`)反查 deviceCode,
 *   再 HGET 设备 Key(`ss:latest:{projectId}:{deviceCode}`)中 {tagId} 的最新值
 * - 数据新鲜度校验：超过 maxAgeMs（默认 10 分钟）的采集值视为陈旧，跳过
 *   （设备离线时数据不更新，不应基于陈旧值恢复告警）
 * - 质量校验：quality='bad'/'comm_error' 等异常质量跳过，不基于坏数据恢复
 * - 重新评估条件：若条件不再满足（normalized）且规则 autoClear=true → 执行恢复
 *
 * ## 数据库模式适配
 * - isolated 模式：遍历 ProjectDatabaseService.getLoadedProjectNames() 逐项目扫描
 * - unified 模式：直接使用全局注入的 Repository
 *
 * ## 与 AlarmRecoverySubscriber 的关系
 * - AlarmRecoverySubscriber：实时路径，监听 `alarm_normalized` 事件即时恢复（正常流程）
 * - AlarmReconciliationService：兜底路径，定时扫描补恢复（重启/漏报场景）
 * 两者最终都通过相同的字段更新逻辑完成闭环，clearReason 均为 'auto'
 */
@Injectable()
export class AlarmReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlarmReconciliationService.name);

  /** 定时扫描间隔（ms），默认 5 分钟 */
  private readonly scanIntervalMs: number;
  /** 采集值最大允许陈旧时间（ms），默认 10 分钟 */
  private readonly maxAgeMs: number;
  /** 单次扫描每项目最大处理记录数，防止大项目卡死 */
  private readonly batchLimit: number;

  private periodicTimer: NodeJS.Timeout | null = null;
  private readonly dbMode: string;

  constructor(
    @Inject(getRepositoryToken(AlarmRecord))
    private readonly alarmRecordRepo: Repository<AlarmRecord>,
    @Optional() private readonly latestValueRedisService?: LatestValueRedisService,
    @Optional() private readonly projectDbService?: ProjectDatabaseService,
    @Optional() private readonly eventBus?: EventBusService,
    private readonly conditionEvaluator?: ConditionEvaluator,
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.scanIntervalMs =
      this.configService?.get<number>('ALARM_RECONCILIATION_INTERVAL_MS') || 300000;
    this.maxAgeMs = this.configService?.get<number>('ALARM_RECONCILIATION_MAX_AGE_MS') || 600000;
    this.batchLimit = this.configService?.get<number>('ALARM_RECONCILIATION_BATCH_LIMIT') || 500;
    this.dbMode = this.configService?.get<string>('PROJECT_DB_MODE', 'isolated') ?? 'isolated';
  }

  onModuleInit(): void {
    // Redis 未配置时对账无意义（无法读取最新值），但仍启动定时器以便日志提示
    this.periodicTimer = setInterval(() => {
      this.reconcile().catch((err) => {
        this.logger.error(`Periodic reconciliation failed: ${(err as Error).message}`);
      });
    }, this.scanIntervalMs);
    this.logger.log(
      `Reconciliation scanner started (interval=${this.scanIntervalMs}ms, ` +
        `maxAge=${this.maxAgeMs}ms, batchLimit=${this.batchLimit}, ` +
        `redis=${this.latestValueRedisService?.enabled ? 'enabled' : 'disabled'}, mode=${this.dbMode})`,
    );
  }

  onModuleDestroy(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  /**
   * 执行一次对账扫描
   *
   * 遍历已加载项目（isolated 模式）或全局库（unified 模式），
   * 查找未恢复的活跃告警，读取 Redis 最新值重新评估条件，补执行恢复。
   */
  async reconcile(): Promise<void> {
    if (!this.latestValueRedisService?.enabled) {
      this.logger.debug('Reconciliation skipped: Redis latest value service not configured');
      return;
    }
    if (!this.conditionEvaluator) {
      this.logger.warn('Reconciliation skipped: ConditionEvaluator not available');
      return;
    }

    let recovered = 0;
    const startedAt = Date.now();

    if (this.dbMode === 'isolated' && this.projectDbService) {
      const projectNames = this.projectDbService.getLoadedProjectNames();
      for (const projectName of projectNames) {
        const ds = this.projectDbService.getLoadedSystemDb(projectName);
        if (!ds) continue;
        const recordRepo = ds.getRepository(AlarmRecord);
        const ruleRepo = ds.getRepository(AlarmRule);
        recovered += await this.reconcileProject(recordRepo, ruleRepo, projectName);
      }
    } else {
      // unified 模式：使用全局注入的 Repository，ruleRepo 通过 recordRepo.manager 获取
      const ruleRepo = this.alarmRecordRepo.manager.getRepository(AlarmRule);
      recovered += await this.reconcileProject(this.alarmRecordRepo, ruleRepo, null);
    }

    const elapsed = Date.now() - startedAt;
    if (recovered > 0) {
      this.logger.log(`Reconciliation completed: recovered ${recovered} alarm(s) in ${elapsed}ms`);
    } else {
      this.logger.debug(`Reconciliation completed: no alarms to recover (${elapsed}ms)`);
    }
  }

  /**
   * 对账单个项目（或全局库）的活跃告警
   *
   * @param recordRepo  AlarmRecord Repository（项目级或全局）
   * @param ruleRepo    AlarmRule Repository
   * @param projectId   项目标识（用于 Redis Key + 事件载荷，null 表示 unified 模式）
   * @returns 恢复的记录数
   */
  private async reconcileProject(
    recordRepo: Repository<AlarmRecord>,
    ruleRepo: Repository<AlarmRule>,
    projectId: string | null,
  ): Promise<number> {
    // 查询未恢复的活跃告警（ACTIVE + ACKNOWLEDGED，排除 SHELVED）
    const records = await recordRepo.find({
      where: {
        status: In([AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED]),
        isActive: true,
      },
      take: this.batchLimit,
      order: { createdAt: 'ASC' },
    });

    if (records.length === 0) return 0;

    // 批量加载相关规则（用于 condition / conditionValue / autoClear）
    const ruleIds = [...new Set(records.map((r) => r.ruleId).filter(Boolean))] as string[];
    const rules = ruleIds.length > 0 ? await ruleRepo.find({ where: { id: In(ruleIds) } }) : [];
    const ruleMap = new Map(rules.map((r) => [r.id, r]));

    const recoveredRecords: AlarmRecord[] = [];
    const now = new Date();
    const staleThreshold = now.getTime() - this.maxAgeMs;

    for (const record of records) {
      // 缺少 tagId / deviceId 无法查 Redis，跳过
      if (!record.tagId || !record.deviceId) continue;
      // 查规则：找不到或 autoClear=false 的不自动恢复
      const rule = record.ruleId ? ruleMap.get(record.ruleId) : undefined;
      if (rule && !rule.autoClear) continue;

      const effectiveProjectId = projectId ?? record.projectId;
      let latest: LatestValueEntry | null;
      try {
        // v3: readTag 需要 deviceCode,告警记录持 deviceId,
        // 用 readTagByDeviceId 经 tree 索引反查 deviceCode 后读取
        latest = await this.latestValueRedisService!.readTagByDeviceId(
          effectiveProjectId,
          record.deviceId,
          record.tagId,
        );
      } catch (err) {
        // Redis 读取失败时跳过该记录(不中断整个对账扫描)
        const msg = err instanceof Error ? err.message : 'Unknown';
        this.logger.debug(`readTag failed for record ${record.id}: ${msg}`);
        continue;
      }
      if (!latest) continue;

      // 质量校验：坏质量数据不可信，跳过
      if (latest.quality && latest.quality !== 'good' && latest.quality !== 'unknown') continue;

      // 陈旧数据校验：超过 maxAgeMs 的采集值视为陈旧
      const valueTime = latest.timestamp.getTime();
      if (isNaN(valueTime) || valueTime < staleThreshold) continue;

      // 重新评估条件
      const condition = rule?.condition ?? record.rule?.condition;
      const conditionValue = rule?.conditionValue ?? record.rule?.conditionValue;
      if (!condition || conditionValue === undefined || conditionValue === null) continue;

      // 将最新值转换为数值用于条件评估(number 直接用;boolean→0/1;string→parseFloat)
      // null 或无法解析为数值的值跳过(无法评估数值型告警条件)
      const numericValue =
        typeof latest.value === 'number'
          ? latest.value
          : typeof latest.value === 'boolean'
            ? latest.value
              ? 1
              : 0
            : typeof latest.value === 'string'
              ? parseFloat(latest.value)
              : NaN;
      if (Number.isNaN(numericValue)) continue;

      const stillTriggered = this.conditionEvaluator!.evaluate(
        numericValue,
        condition,
        conditionValue,
      );

      if (stillTriggered) continue; // 条件仍满足，未恢复

      // 条件已恢复正常 → 执行恢复（与 AlarmRecoverySubscriber 字段更新逻辑一致）
      const recoveredValue = String(latest.value);
      record.status = AlarmStatus.CLEARED;
      record.clearedAt = now;
      record.clearedBy = 'auto';
      record.isActive = false;
      record.clearReason = 'auto';
      record.recoveredAt = now;
      record.recoveredValue = recoveredValue;
      record.dispositionType = 'alarm.cleared';
      recoveredRecords.push(record);

      this.logger.debug(
        `Reconciled alarm ${record.id} (tag=${record.tagId}, ` +
          `project=${effectiveProjectId}, value=${recoveredValue})`,
      );
    }

    if (recoveredRecords.length > 0) {
      await recordRepo.save(recoveredRecords);

      // 发出 alarm.recovered 事件（供 WebSocket 推送 + 通知服务使用）
      if (this.eventBus) {
        for (const record of recoveredRecords) {
          const event: AlarmRecoveredEvent = {
            recordId: record.id,
            tagId: record.tagId ?? '',
            deviceId: record.deviceId,
            projectId: projectId ?? record.projectId,
            recoveredValue: record.recoveredValue ?? '',
            recoveredAt: now,
            ruleId: record.ruleId ?? undefined,
            ruleName: ruleMap.get(record.ruleId ?? '')?.name,
          };
          this.eventBus.emit('alarm.recovered', event);
        }
      }
    }

    return recoveredRecords.length;
  }
}
