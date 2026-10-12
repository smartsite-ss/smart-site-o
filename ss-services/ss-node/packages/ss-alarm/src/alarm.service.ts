// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Like, In } from 'typeorm';
import { AlarmRule, AlarmRecord, AlarmStatus, AlarmLevel } from './entities/alarm.entity';
import { I18nService } from '@ss-node/ss-i18n';
import { ErrorFactory, ProjectDatabaseService } from '@ss-node/ss-core';
import { ConfigService } from '@nestjs/config';
/** 合法的状态流转映射 */
const VALID_TRANSITIONS: Record<AlarmStatus, AlarmStatus[]> = {
  [AlarmStatus.ACTIVE]: [AlarmStatus.ACKNOWLEDGED, AlarmStatus.SHELVED, AlarmStatus.CLEARED],
  [AlarmStatus.ACKNOWLEDGED]: [AlarmStatus.CLEARED, AlarmStatus.SHELVED],
  [AlarmStatus.SHELVED]: [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED, AlarmStatus.CLEARED],
  [AlarmStatus.CLEARED]: [],
};

export interface AlarmRecordsFilter {
  level?: string;
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  alarmType?: string;
  dispositionType?: string;
  /** 是否实时告警：true=仅实时(active/acknowledged/shelved) / false=仅历史(cleared)。
   *  Phase 5 新增：显式区分实时/历史，查询效率高于 status IN (...) */
  isActive?: boolean;
}

/** 批量确认单条失败项（小程序二期：部分失败结构，不整体抛错） */
export interface BatchAcknowledgeFailureItem {
  alarmRecordId: string;
  reason: 'not_found' | 'already_acknowledged' | 'already_cleared' | 'invalid_status';
}

/** 批量确认结果（幂等接口返回结构） */
export interface BatchAcknowledgeResult {
  succeeded: string[];
  failed: BatchAcknowledgeFailureItem[];
}

/** 幂等键缓存 TTL（10 分钟，覆盖网络重试窗口） */
const BATCH_ACKNOWLEDGE_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

interface AlarmRepos {
  alarmRuleRepo: Repository<AlarmRule>;
  alarmRecordRepo: Repository<AlarmRecord>;
}

@Injectable()
export class AlarmService {
  private readonly logger = new Logger(AlarmService.name);
  private readonly err: ErrorFactory;
  private readonly dbMode: string;

  /** 批量确认幂等键缓存：`{projectId}:{requestId}` → 首次结果（进程内内存，重启失效不影响正确性） */
  private readonly batchAcknowledgeIdempotencyCache = new Map<
    string,
    { result: BatchAcknowledgeResult; expireAt: number }
  >();

  constructor(
    @Inject(getRepositoryToken(AlarmRule))
    private alarmRuleRepository: Repository<AlarmRule>,
    @Inject(getRepositoryToken(AlarmRecord))
    private alarmRecordRepository: Repository<AlarmRecord>,
    @Inject(I18nService)
    private i18nService: I18nService,
    @Optional()
    private projectDbService?: ProjectDatabaseService,
    private configService?: ConfigService,
  ) {
    this.err = new ErrorFactory(this.i18nService);
    this.dbMode = this.configService?.get<string>('PROJECT_DB_MODE', 'isolated') ?? 'isolated';
  }

  /**
   * 根据项目ID获取对应的 Repository 集合
   * - isolated 模式：通过 ProjectDatabaseService 获取项目级 DataSource
   * - unified 模式：使用全局注入的 Repository（兼容旧行为）
   */
  private async getRepos(projectId: string): Promise<AlarmRepos> {
    if (this.dbMode === 'isolated' && this.projectDbService) {
      const ds = await this.projectDbService.getSystemDb(projectId);
      return {
        alarmRuleRepo: ds.getRepository(AlarmRule),
        alarmRecordRepo: ds.getRepository(AlarmRecord),
      };
    }
    return {
      alarmRuleRepo: this.alarmRuleRepository,
      alarmRecordRepo: this.alarmRecordRepository,
    };
  }

  // ==================== 规则查询 ====================

  async findAllRules(projectId: string): Promise<AlarmRule[]> {
    const { alarmRuleRepo } = await this.getRepos(projectId);
    return alarmRuleRepo.find({ where: { projectId }, relations: ['tag'] });
  }

  async findOneRule(id: string, projectId: string): Promise<AlarmRule> {
    const { alarmRuleRepo } = await this.getRepos(projectId);
    const rule = await alarmRuleRepo.findOne({
      where: { id, projectId },
      relations: ['tag'],
    });
    if (!rule) this.err.notFound('alarm.rule.not_found', { id });
    return rule;
  }

  // ==================== 规则 CRUD ====================

  async createRule(projectId: string, data: Partial<AlarmRule>): Promise<AlarmRule> {
    const { alarmRuleRepo } = await this.getRepos(projectId);
    const rule = alarmRuleRepo.create({
      name: data.name,
      description: data.description,
      level: data.level,
      condition: data.condition,
      conditionValue: data.conditionValue,
      enabled: data.enabled ?? true,
      projectId,
      tagId: data.tagId,
      debounceMs: data.debounceMs ?? 5000,
      debounceCount: data.debounceCount ?? 0,
      alarmType: data.alarmType ?? 'data',
      autoClear: data.autoClear ?? true,
    });
    return alarmRuleRepo.save(rule);
  }

  async updateRule(id: string, projectId: string, data: Partial<AlarmRule>): Promise<AlarmRule> {
    const { alarmRuleRepo } = await this.getRepos(projectId);
    const rule = await this.findOneRule(id, projectId);
    Object.assign(rule, data);
    return alarmRuleRepo.save(rule);
  }

  async deleteRule(id: string, projectId: string): Promise<void> {
    const { alarmRuleRepo, alarmRecordRepo } = await this.getRepos(projectId);
    const rule = await this.findOneRule(id, projectId);
    // 级联删除活跃报警记录
    await alarmRecordRepo.delete({ ruleId: id, projectId });
    await alarmRuleRepo.remove(rule);
  }

  async enableRule(id: string, projectId: string): Promise<AlarmRule> {
    const { alarmRuleRepo } = await this.getRepos(projectId);
    const rule = await this.findOneRule(id, projectId);
    if (rule.enabled) {
      this.err.badRequest('alarm.rule.already_enabled', { id });
    }
    rule.enabled = true;
    return alarmRuleRepo.save(rule);
  }

  async disableRule(id: string, projectId: string): Promise<AlarmRule> {
    const { alarmRuleRepo, alarmRecordRepo } = await this.getRepos(projectId);
    const rule = await this.findOneRule(id, projectId);
    if (!rule.enabled) {
      this.err.badRequest('alarm.rule.already_disabled', { id });
    }
    rule.enabled = false;
    // 禁用规则时清除活跃报警（标记为规则禁用导致的清除）
    await alarmRecordRepo.update(
      { ruleId: id, projectId, status: AlarmStatus.ACTIVE },
      {
        status: AlarmStatus.CLEARED,
        clearedAt: new Date(),
        isActive: false,
        clearReason: 'rule_disabled',
        dispositionType: 'alarm.cleared',
      },
    );
    return alarmRuleRepo.save(rule);
  }

  // ==================== 报警记录查询 ====================

  async getRecords(
    projectId: string,
    limit?: number,
    filter?: AlarmRecordsFilter,
  ): Promise<AlarmRecord[]> {
    const { alarmRecordRepo } = await this.getRepos(projectId);
    const where: FindOptionsWhere<AlarmRecord> = { projectId };

    if (filter?.level) {
      where.level = filter.level as AlarmLevel;
    }
    if (filter?.status) {
      where.status = filter.status as AlarmStatus;
    }
    if (filter?.alarmType) {
      where.alarmType = filter.alarmType;
    }
    if (filter?.dispositionType) {
      where.dispositionType = filter.dispositionType;
    }
    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }
    if (filter?.keyword) {
      // TypeORM 不支持 OR 条件直接放在 FindOptionsWhere，用数组形式
      (where as any).message = Like(`%${filter.keyword}%`);
    }
    if (filter?.startDate) {
      (where as any).createdAt = MoreThanOrEqual(new Date(filter.startDate));
    }
    if (filter?.endDate) {
      (where as any).createdAt = LessThanOrEqual(new Date(filter.endDate));
    }

    return alarmRecordRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit || 50,
      relations: ['rule'],
    });
  }

  /** 批量确认报警 */
  async batchAcknowledge(ids: string[], userId: string, projectId: string): Promise<number> {
    const { alarmRecordRepo } = await this.getRepos(projectId);
    const records = await alarmRecordRepo.find({
      where: { id: In(ids), projectId, status: AlarmStatus.ACTIVE },
    });
    for (const r of records) {
      r.status = AlarmStatus.ACKNOWLEDGED;
      r.acknowledgedAt = new Date();
      r.acknowledgedBy = userId;
    }
    if (records.length > 0) {
      await alarmRecordRepo.save(records);
    }
    return records.length;
  }

  /**
   * 批量确认报警（幂等 + 部分失败结构，小程序二期 07 #10）
   *
   * - requestId 幂等：同一 `{projectId}:{requestId}` 在 10 分钟内重复请求直接返回首次结果，
   *   避免网络重试导致重复确认/重复事件广播。
   * - 部分失败：状态冲突（已确认/已清除/其他状态）与不存在记录归入 failed，不整体抛错。
   */
  async batchAcknowledgeIdempotent(
    ids: string[],
    userId: string,
    projectId: string,
    requestId?: string,
  ): Promise<BatchAcknowledgeResult> {
    const idempotencyKey = requestId ? `${projectId}:${requestId}` : undefined;
    if (idempotencyKey) {
      this.pruneExpiredIdempotencyEntries();
      const cached = this.batchAcknowledgeIdempotencyCache.get(idempotencyKey);
      if (cached && cached.expireAt > Date.now()) {
        this.logger.debug(`[BATCH-ACK] 幂等命中：requestId=${requestId}，返回首次结果`);
        return cached.result;
      }
    }

    const result = await this.executeBatchAcknowledge(ids, userId, projectId);

    if (idempotencyKey) {
      this.batchAcknowledgeIdempotencyCache.set(idempotencyKey, {
        result,
        expireAt: Date.now() + BATCH_ACKNOWLEDGE_IDEMPOTENCY_TTL_MS,
      });
    }
    return result;
  }

  /** 执行批量确认：仅 ACTIVE 记录可确认，其余归入失败项 */
  private async executeBatchAcknowledge(
    ids: string[],
    userId: string,
    projectId: string,
  ): Promise<BatchAcknowledgeResult> {
    const { alarmRecordRepo } = await this.getRepos(projectId);
    const uniqueIds = Array.from(new Set(ids ?? []));
    const records = await alarmRecordRepo.find({
      where: { id: In(uniqueIds), projectId },
    });
    const recordById = new Map(records.map((record) => [record.id, record]));

    const succeeded: string[] = [];
    const failed: BatchAcknowledgeFailureItem[] = [];
    const recordsToSave: AlarmRecord[] = [];

    for (const alarmRecordId of uniqueIds) {
      const record = recordById.get(alarmRecordId);
      if (!record) {
        failed.push({ alarmRecordId, reason: 'not_found' });
        continue;
      }
      if (record.status === AlarmStatus.ACTIVE) {
        record.status = AlarmStatus.ACKNOWLEDGED;
        record.acknowledgedAt = new Date();
        record.acknowledgedBy = userId;
        record.dispositionType = 'alarm.acknowledged';
        recordsToSave.push(record);
        succeeded.push(alarmRecordId);
      } else if (record.status === AlarmStatus.ACKNOWLEDGED) {
        failed.push({ alarmRecordId, reason: 'already_acknowledged' });
      } else if (record.status === AlarmStatus.CLEARED) {
        failed.push({ alarmRecordId, reason: 'already_cleared' });
      } else {
        failed.push({ alarmRecordId, reason: 'invalid_status' });
      }
    }

    if (recordsToSave.length > 0) {
      await alarmRecordRepo.save(recordsToSave);
    }
    return { succeeded, failed };
  }

  /** 清理过期幂等缓存项（惰性清理，随每次幂等请求触发） */
  private pruneExpiredIdempotencyEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.batchAcknowledgeIdempotencyCache) {
      if (entry.expireAt <= now) {
        this.batchAcknowledgeIdempotencyCache.delete(key);
      }
    }
  }

  /** 批量清除报警 */
  async batchClear(ids: string[], userId: string, projectId: string): Promise<number> {
    const { alarmRecordRepo } = await this.getRepos(projectId);
    const allowedStatuses = [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED];
    const records = await alarmRecordRepo.find({
      where: { id: In(ids), projectId, status: In(allowedStatuses) },
    });
    for (const r of records) {
      r.status = AlarmStatus.CLEARED;
      r.clearedAt = new Date();
      r.clearedBy = userId;
      r.isActive = false;
      r.clearReason = 'manual';
      r.dispositionType = 'alarm.cleared';
    }
    if (records.length > 0) {
      await alarmRecordRepo.save(records);
    }
    return records.length;
  }

  // ==================== 报警生命周期管理（含状态机校验） ====================

  /** 校验状态流转是否合法 */
  private validateTransition(current: AlarmStatus, target: AlarmStatus): void {
    const allowed = VALID_TRANSITIONS[current] ?? [];
    if (!allowed.includes(target)) {
      this.err.badRequest('alarm.invalid_transition', {
        current,
        target,
      });
    }
  }

  async acknowledgeAlarm(id: string, userId: string, projectId: string): Promise<AlarmRecord> {
    const { alarmRecordRepo } = await this.getRepos(projectId);
    const record = await alarmRecordRepo.findOne({ where: { id, projectId } });
    if (!record) this.err.notFound('alarm.record.not_found', { id });

    this.validateTransition(record.status, AlarmStatus.ACKNOWLEDGED);

    record.status = AlarmStatus.ACKNOWLEDGED;
    record.acknowledgedAt = new Date();
    record.acknowledgedBy = userId;
    record.dispositionType = 'alarm.acknowledged';
    return alarmRecordRepo.save(record);
  }

  async clearAlarm(id: string, userId: string, projectId: string): Promise<AlarmRecord> {
    const { alarmRecordRepo } = await this.getRepos(projectId);
    const record = await alarmRecordRepo.findOne({ where: { id, projectId } });
    if (!record) this.err.notFound('alarm.record.not_found', { id });

    this.validateTransition(record.status, AlarmStatus.CLEARED);

    record.status = AlarmStatus.CLEARED;
    record.clearedAt = new Date();
    record.clearedBy = userId;
    record.isActive = false;
    record.clearReason = 'manual';
    record.dispositionType = 'alarm.cleared';
    return alarmRecordRepo.save(record);
  }

  async shelveAlarm(
    id: string,
    userId: string,
    reason: string,
    projectId: string,
    durationMs?: number,
  ): Promise<AlarmRecord> {
    const { alarmRecordRepo } = await this.getRepos(projectId);
    const record = await alarmRecordRepo.findOne({ where: { id, projectId } });
    if (!record) this.err.notFound('alarm.record.not_found', { id });

    this.validateTransition(record.status, AlarmStatus.SHELVED);

    // 记录暂缓前状态，自动恢复时回退（仅 ACTIVE / ACKNOWLEDGED 可转入 SHELVED）
    record.preShelveStatus = record.status;
    record.status = AlarmStatus.SHELVED;
    record.shelvedAt = new Date();
    record.shelvedBy = userId;
    record.shelveReason = reason;
    // 注：暂缓动作不更新 dispositionType —— alarmActionType 字典中无"告警暂缓"动作值，
    // 仅有恢复值 alarm.shelve.expired，故暂缓时保持前值，仅恢复时更新（见 AlarmShelveRecoveryService）
    // 设置定时自动恢复：durationMs > 0 时记录到期时间，由 AlarmShelveRecoveryService 扫描恢复
    record.shelvedUntil = durationMs && durationMs > 0 ? new Date(Date.now() + durationMs) : null;
    return alarmRecordRepo.save(record);
  }

  /**
   * 自动恢复告警（Phase 5 状态机闭环）
   *
   * 由 AlarmRecoverySubscriber 在检测到条件恢复正常时调用，完成告警闭环：
   * - status → CLEARED
   * - isActive → false（标记为历史告警）
   * - clearReason → 'auto'（条件自动恢复）
   * - recoveredAt → 当前时间（恢复时间，闭环关键字段）
   * - recoveredValue → 恢复时的采集值
   *
   * 注意：此方法不校验 VALID_TRANSITIONS，因为自动恢复可从 ACTIVE/ACKNOWLEDGED 直接到 CLEARED
   */
  async recoverAlarm(record: AlarmRecord, recoveredValue: string): Promise<AlarmRecord> {
    record.status = AlarmStatus.CLEARED;
    record.clearedAt = new Date();
    record.clearedBy = 'auto';
    record.isActive = false;
    record.clearReason = 'auto';
    record.recoveredAt = new Date();
    record.recoveredValue = recoveredValue;
    record.dispositionType = 'alarm.cleared';
    return record;
  }

  // ==================== 重复报警抑制 ====================

  /** 检查是否已存在该规则的活跃报警 */
  async hasActiveAlarm(ruleId: string, projectId: string): Promise<boolean> {
    const { alarmRecordRepo } = await this.getRepos(projectId);
    const count = await alarmRecordRepo.count({
      where: { ruleId, projectId, status: AlarmStatus.ACTIVE },
    });
    return count > 0;
  }
}
