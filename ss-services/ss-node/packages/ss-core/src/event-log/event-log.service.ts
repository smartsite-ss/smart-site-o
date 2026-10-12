// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { randomUUID } from 'crypto';
import { EventBusService } from '../event-bus/event-bus.service';
import { EventLog, SubscriberRecord, EventLogStatus } from './entities/event-log.entity';

/**
 * 事件日志服务 — 配置变更类事件持久化 + 订阅者追踪
 *
 * 核心能力：
 * 1. 监听 EventBus 的 emit，自动记录配置变更类事件
 * 2. 提供订阅者追踪 API（recordSubscriberStart/Success/Failure）
 * 3. 提供查询 API（findByFilter / findOne / findFailed）
 * 4. 定时清理过期事件日志（R6-1: 防止 evt_event_log 表无限膨胀）
 *
 * 设计要点：
 * - 异步写入，不阻塞 EventBus 主链路
 * - 写入失败仅 warn 日志，不影响业务
 * - 通过 emitHook 机制解耦 EventBusService（避免循环依赖）
 * - 定时清理使用 setInterval（无需引入 @nestjs/schedule 依赖）
 */
@Injectable()
export class EventLogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventLogService.name);

  /**
   * 持久化事件白名单（20 个配置变更类事件）
   * 排除高频数据事件（data_point_changed、device_status_changed 等）
   * R6-1: alarm.rule_resolved 已移除（1 天 188K 条导致表膨胀）
   */
  private static readonly PERSISTED_EVENTS: ReadonlySet<string> = new Set([
    // 设备域（6 个）
    'device.created',
    'device.updated',
    'device.deleted',
    'device.tagsChanged',
    'device.enabled',
    'device.disabled',
    // 项目域（5 个）
    'project.created',
    'project.imported',
    'project:enabled',
    'project:disabled',
    'project.beforeDelete',
    // 告警域（3 个）
    'alarm.triggered',
    'alarm_acknowledged',
    'alarm.cleared',
    // R6-1: 移除 'alarm.rule_resolved' — 实测 1 天产生 188K 条（占表 99.6%），
    // 属高频告警状态变更事件，审计价值低且导致 evt_event_log 表膨胀。
    // 配置与定时器域（3 个）
    'config_changed',
    'protocol.config.updated',
    'timer:configChanged',
    // 插件域（3 个）
    'plugin.activated',
    'plugin.deactivated',
    'plugin.updated',
  ]);

  /** 最近发射事件的内存索引（用于订阅者追踪关联 logId）
   * key: `${eventType}:${projectId || 'system'}`, value: { logId, timestamp } */
  private recentEmissions = new Map<string, { logId: string; timestamp: number }>();

  /** 缓存保留时间（5 秒内的事件视为"最近发射"） */
  private static readonly RECENT_EMISSION_TTL_MS = 5000;

  /** Per-logId 互斥锁链 — 串行化 subscribers 数组的 read-modify-write 操作
   * key: logId, value: 前一个操作的 Promise（已吞掉 error，不会 reject） */
  private readonly logLocks = new Map<string, Promise<void>>();

  /** R6-1: 定时清理过期事件日志的定时器引用 */
  private cleanupTimer: NodeJS.Timeout | null = null;

  /** R6-1: 清理间隔（24 小时） */
  private static readonly CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(EventLog)
    private readonly eventLogRepo: Repository<EventLog>,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit(): void {
    // 注册 emit 钩子，监听所有事件发射
    this.eventBus.registerEmitHook(this.handleEmit.bind(this));
    this.logger.log(
      `EventLogService initialized, persisting ${EventLogService.PERSISTED_EVENTS.size} event types`,
    );

    // R6-1: 启动定时清理任务 — 每 24 小时清理一次超过保留期的事件日志
    // 首次执行延迟 5 分钟（避免启动高峰期 IO 压力）
    this.scheduleInitialCleanup();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * R6-1: 调度首次清理（延迟 5 分钟），后续每 24 小时一次
   */
  private scheduleInitialCleanup(): void {
    this.cleanupTimer = setTimeout(async () => {
      await this.cleanExpiredEvents();
      // 后续每 24 小时执行一次
      this.cleanupTimer = setInterval(() => {
        this.cleanExpiredEvents().catch((err) => {
          this.logger.warn(`Scheduled event log cleanup failed: ${(err as Error).message}`);
        });
      }, EventLogService.CLEANUP_INTERVAL_MS);
      // 不阻止进程退出
      if (this.cleanupTimer.unref) this.cleanupTimer.unref();
    }, 5 * 60 * 1000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  /**
   * 判断事件是否需要持久化
   */
  shouldPersist(eventType: string): boolean {
    return EventLogService.PERSISTED_EVENTS.has(eventType);
  }

  // ===== Phase 1: 发射时记录 =====

  /**
   * emit 钩子 — EventBusService.emit() 时自动调用
   *
   * 同步预生成 logId 并注入 payload._logId（在第一个 await 之前执行），
   * 这样 wrapSubscriber 可以直接从 payload._logId 读取，消除时序竞态。
   * 异步写入 DB，不阻塞主流程。失败仅 warn 不抛。
   */
  private async handleEmit(eventType: string, payload: any): Promise<void> {
    if (!this.shouldPersist(eventType)) return;

    // ★ 同步预生成 logId 并注入 payload（在第一个 await 之前执行）
    // 即使 triggerEmitHooks 不 await 本函数，这段代码也会同步执行完，
    // 确保 emit() → eventEmitter.emit() 时 payload._logId 已存在。
    const logId = randomUUID();
    if (payload && typeof payload === 'object') {
      payload._logId = logId;
    }

    try {
      await this.recordEmissionWithId(eventType, payload, logId);
      // 缓存到内存索引（向后兼容，findRecentLogId 仍可用于未注入 _logId 的场景）
      const key = this.buildRecentKey(eventType, payload);
      this.recentEmissions.set(key, { logId, timestamp: Date.now() });
      this.cleanupRecentEmissions();
    } catch (err) {
      this.logger.warn(`Failed to persist event ${eventType}: ${(err as Error).message}`);
    }
  }

  /**
   * 记录事件发射（写入 evt_event_log 表）
   * @returns logId（用于关联订阅者追踪），失败返回 null
   */
  async recordEmission(eventType: string, payload: any): Promise<string | null> {
    try {
      const log = this.eventLogRepo.create({
        eventType,
        projectId: payload?.projectId || null,
        payload: this.sanitizePayload(payload),
        emittedBy: this.detectEmitter(payload),
        source: this.detectSource(payload),
        eventTimestamp: this.normalizeTimestamp(payload?.timestamp),
        status: 'emitted' as EventLogStatus,
        subscribers: [],
      });
      const saved = await this.eventLogRepo.save(log);
      return saved.id;
    } catch (err) {
      this.logger.warn(`Failed to record emission for ${eventType}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * 记录事件发射（使用预生成的 logId 写入 DB）
   *
   * 与 recordEmission 的区别：使用调用方预生成的 logId，
   * 以便 payload._logId 与 DB 记录的 id 一致，
   * wrapSubscriber 可直接从 payload._logId 读取而无需查找。
   */
  async recordEmissionWithId(eventType: string, payload: any, logId: string): Promise<void> {
    try {
      const log = this.eventLogRepo.create({
        id: logId,
        eventType,
        projectId: payload?.projectId || null,
        payload: this.sanitizePayload(payload),
        emittedBy: this.detectEmitter(payload),
        source: this.detectSource(payload),
        eventTimestamp: this.normalizeTimestamp(payload?.timestamp),
        status: 'emitted' as EventLogStatus,
        subscribers: [],
      });
      await this.eventLogRepo.save(log);
    } catch (err) {
      this.logger.warn(`Failed to record emission for ${eventType}: ${(err as Error).message}`);
    }
  }

  /**
   * 查找最近的事件日志 ID（用于订阅者追踪关联）
   *
   * 按 eventType + projectId 在 5 秒内查找最近的事件。
   * 并发场景下可能查找不准确，但配置变更类事件并发极少。
   */
  async findRecentLogId(eventType: string, payload: any): Promise<string | null> {
    // 优先从内存索引查找（最快）
    const key = this.buildRecentKey(eventType, payload);
    const recent = this.recentEmissions.get(key);
    if (recent && Date.now() - recent.timestamp < EventLogService.RECENT_EMISSION_TTL_MS) {
      return recent.logId;
    }

    // 内存索引未命中，查数据库
    try {
      const log = await this.eventLogRepo.findOne({
        where: {
          eventType,
          projectId: payload?.projectId || null,
        },
        order: { createdAt: 'DESC' },
      });
      return log?.id || null;
    } catch (err) {
      this.logger.warn(`Failed to find recent log for ${eventType}: ${(err as Error).message}`);
      return null;
    }
  }

  // ===== Phase 2: 订阅者追踪 =====

  /**
   * 记录订阅者开始处理
   */
  async recordSubscriberStart(logId: string, subscriberName: string): Promise<void> {
    await this.updateSubscriberRecord(logId, subscriberName, {
      status: 'processing',
      startedAt: new Date().toISOString(),
    });
  }

  /**
   * 记录订阅者处理成功 + 业务效果
   *
   * @param result 业务效果对象（如 { connectionId, tagsLoaded, tasksRegistered }）
   */
  async recordSubscriberSuccess(
    logId: string,
    subscriberName: string,
    duration: number,
    result?: Record<string, any>,
  ): Promise<void> {
    await this.updateSubscriberRecord(logId, subscriberName, {
      status: 'processed',
      completedAt: new Date().toISOString(),
      duration,
      result,
    });
    await this.recalculateStatus(logId);
  }

  /**
   * 记录订阅者处理失败 + 部分业务效果
   *
   * @param result 失败时的部分效果（如 { oldConnectionClosed: true, newConnectionId: null }）
   */
  async recordSubscriberFailure(
    logId: string,
    subscriberName: string,
    error: string,
    result?: Record<string, any>,
  ): Promise<void> {
    await this.updateSubscriberRecord(logId, subscriberName, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      error,
      result,
    });
    await this.recalculateStatus(logId);
  }

  /**
   * 包装订阅者 handler，自动追踪处理结果
   *
   * 使用方式：
   * ```typescript
   * this.eventBus.on(
   *   'device.created',
   *   this.eventLogService.wrapSubscriber(
   *     'device.created',           // 事件类型，用于查找最近的事件日志
   *     'DeviceConfigWatcher',      // 订阅者名称
   *     async (payload) => { ... }, // 处理函数，返回业务效果对象
   *   ),
   * );
   * ```
   *
   * @param eventType       事件类型（用于查找最近发射的 logId）
   * @param subscriberName  订阅者类名（写入 subscribers 记录）
   * @param handler         处理函数，应返回业务效果对象（如 { connectionId, tagsLoaded }），
   *                        失败时抛出异常（会被本方法捕获并记录为 failed）
   */
  wrapSubscriber<T extends any[]>(
    eventType: string,
    subscriberName: string,
    handler: (...args: T) => Promise<Record<string, any> | void>,
  ): (...args: T) => Promise<void> {
    return async (...args: T) => {
      const payload = args[0];
      // ★ 优先从 payload._logId 读取（由 handleEmit 同步注入，消除时序竞态）
      let logId: string | null = payload?._logId || null;

      // 兜底：如果 _logId 不存在（非白名单事件或旧路径），尝试 findRecentLogId
      if (!logId) {
        logId = await this.findRecentLogId(eventType, payload);
      }

      if (logId) {
        await this.recordSubscriberStart(logId, subscriberName);
      }

      const startedAt = Date.now();
      try {
        const result = await handler(...args);
        if (logId) {
          await this.recordSubscriberSuccess(
            logId,
            subscriberName,
            Date.now() - startedAt,
            result as Record<string, any> | undefined,
          );
        }
      } catch (err) {
        if (logId) {
          await this.recordSubscriberFailure(
            logId,
            subscriberName,
            (err as Error).message,
          );
        }
        throw err;
      }
    };
  }

  // ===== 查询接口 =====

  /**
   * 按条件查询事件日志（分页）
   */
  async findByFilter(filter: {
    projectId?: string;
    eventType?: string;
    status?: EventLogStatus;
    emittedBy?: string;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    pageSize?: number;
    hasSubscribers?: boolean;
  }): Promise<{ items: EventLog[]; total: number }> {
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;

    const queryBuilder = this.eventLogRepo.createQueryBuilder('log');

    if (filter.projectId) {
      queryBuilder.andWhere('log.projectId = :projectId', { projectId: filter.projectId });
    }
    if (filter.eventType) {
      queryBuilder.andWhere('log.eventType = :eventType', { eventType: filter.eventType });
    }
    if (filter.status) {
      queryBuilder.andWhere('log.status = :status', { status: filter.status });
    }
    if (filter.emittedBy) {
      queryBuilder.andWhere('log.emittedBy = :emittedBy', { emittedBy: filter.emittedBy });
    }
    if (filter.startTime) {
      queryBuilder.andWhere('log.eventTimestamp >= :startTime', { startTime: filter.startTime });
    }
    if (filter.endTime) {
      queryBuilder.andWhere('log.eventTimestamp <= :endTime', { endTime: filter.endTime });
    }
    // 仅看有/无订阅者追踪记录的事件
    if (filter.hasSubscribers === true) {
      queryBuilder.andWhere("log.subscribers IS NOT NULL AND log.subscribers != '[]'");
    } else if (filter.hasSubscribers === false) {
      queryBuilder.andWhere("(log.subscribers IS NULL OR log.subscribers = '[]')");
    }

    queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  /**
   * 查询单个事件日志详情（含 subscribers 完整记录）
   */
  async findOne(id: string): Promise<EventLog | null> {
    return this.eventLogRepo.findOne({ where: { id } });
  }

  /**
   * 清空所有事件日志（运维操作，谨慎使用）
   * @returns 删除的记录数
   */
  async clearAll(): Promise<{ deleted: number }> {
    // 先统计当前记录数（clear() 不返回删除条数）
    const count = await this.eventLogRepo.count();
    // 使用 clear() 执行 TRUNCATE/DELETE FROM，避免 delete({}) 在部分驱动上不生效
    await this.eventLogRepo.clear();
    this.logger.log(`Cleared all event logs: ${count} records deleted`);
    return { deleted: count };
  }

  /**
   * R6-1: 清理过期事件日志 — 删除超过保留期的记录
   *
   * 保留期通过环境变量 EVENT_LOG_RETENTION_DAYS 配置（默认 30 天）。
   * 清理按 createdAt 字段判断（BaseEntity 的创建时间），分批删除避免单次事务过大。
   *
   * @param retentionDays 保留天数（可选，默认读 EVENT_LOG_RETENTION_DAYS 环境变量或 30）
   * @returns 删除的记录数
   */
  async cleanExpiredEvents(retentionDays?: number): Promise<{ deleted: number }> {
    const days = retentionDays ?? (Number(process.env.EVENT_LOG_RETENTION_DAYS) || 30);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      // 先统计待删除数量（用于日志和返回值）
      const count = await this.eventLogRepo.count({
        where: { createdAt: LessThan(cutoffDate) },
      });

      if (count === 0) {
        this.logger.debug(`Event log cleanup: no records older than ${days} days`);
        return { deleted: 0 };
      }

      // 分批删除（每批 5000 条），避免单次 DELETE 事务过大锁库
      // DeleteQueryBuilder 不支持 .take()，改为先查 ID 再按 ID 删除
      const BATCH_SIZE = 5000;
      let totalDeleted = 0;
      let batchCount = 0;

      while (true) {
        // 查出一批待删除记录的 ID
        const oldRecords = await this.eventLogRepo.find({
          select: ['id'],
          where: { createdAt: LessThan(cutoffDate) },
          take: BATCH_SIZE,
        });

        if (oldRecords.length === 0) break;

        const idsToDelete = oldRecords.map((r) => r.id);
        const result = await this.eventLogRepo
          .createQueryBuilder()
          .delete()
          .where('id IN (:...ids)', { ids: idsToDelete })
          .execute();

        const affected = result.affected || 0;
        totalDeleted += affected;
        batchCount++;

        if (oldRecords.length < BATCH_SIZE) break; // 没有更多待删除记录
      }

      this.logger.log(
        `Event log cleanup: deleted ${totalDeleted} records older than ${days} days ` +
          `(${batchCount} batches, cutoff=${cutoffDate.toISOString()})`,
      );
      return { deleted: totalDeleted };
    } catch (err) {
      this.logger.warn(`Event log cleanup failed: ${(err as Error).message}`);
      return { deleted: 0 };
    }
  }

  /**
   * 查询所有失败/部分失败的事件（运维快速定位问题）
   */
  async findFailed(filter?: {
    projectId?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<EventLog[]> {
    const queryBuilder = this.eventLogRepo.createQueryBuilder('log');
    queryBuilder.andWhere('log.status IN (:...statuses)', {
      statuses: ['failed', 'partial'],
    });

    if (filter?.projectId) {
      queryBuilder.andWhere('log.projectId = :projectId', { projectId: filter.projectId });
    }
    if (filter?.startTime) {
      queryBuilder.andWhere('log.eventTimestamp >= :startTime', { startTime: filter.startTime });
    }
    if (filter?.endTime) {
      queryBuilder.andWhere('log.eventTimestamp <= :endTime', { endTime: filter.endTime });
    }

    return queryBuilder.orderBy('log.createdAt', 'DESC').getMany();
  }

  // ===== 内部工具方法 =====

  /**
   * Per-logId 互斥锁 — 串行化对同一条 EventLog 的 read-modify-write 操作
   *
   * 解决多个订阅者并发更新 subscribers 数组时的竞态条件：
   * - 订阅者 A 读 log（subscribers=[]），添加 A，保存
   * - 订阅者 B 读 log（subscribers=[]，A 的保存还没落盘），添加 B，保存 → 覆盖 A
   *
   * 通过 Promise 链确保同一 logId 的操作串行执行：
   * - 每个 withLogLock 等前一个操作完成后再执行
   * - 单个操作失败不影响后续操作（error 已被吞掉）
   */
  private async withLogLock<T>(logId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.logLocks.get(logId) ?? Promise.resolve();
    const next = prev.then(() => fn());
    // 存入吞掉 error 的 Promise，防止 unhandled rejection 阻塞后续等待者
    this.logLocks.set(
      logId,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  /**
   * 更新某个订阅者的处理记录
   */
  private async updateSubscriberRecord(
    logId: string,
    subscriberName: string,
    update: Partial<SubscriberRecord>,
  ): Promise<void> {
    try {
      await this.withLogLock(logId, async () => {
        const log = await this.eventLogRepo.findOne({ where: { id: logId } });
        if (!log) return;

        const subscribers = log.subscribers || [];
        let record = subscribers.find((s) => s.name === subscriberName);
        if (!record) {
          record = { name: subscriberName, status: 'pending' };
          subscribers.push(record);
        }
        Object.assign(record, update);

        log.subscribers = subscribers;
        log.status = 'processing';
        await this.eventLogRepo.save(log);
      });
    } catch (err) {
      this.logger.warn(`Failed to update subscriber record: ${(err as Error).message}`);
    }
  }

  /**
   * 重新计算整体状态和成功率
   */
  private async recalculateStatus(logId: string): Promise<void> {
    try {
      await this.withLogLock(logId, async () => {
        const log = await this.eventLogRepo.findOne({ where: { id: logId } });
        if (!log || !log.subscribers?.length) return;

        const total = log.subscribers.length;
        const success = log.subscribers.filter((s) => s.status === 'processed').length;
        const failed = log.subscribers.filter((s) => s.status === 'failed').length;

        log.successRatio = `${success}/${total}`;

        if (success === total) {
          log.status = 'processed';
          log.errorMessage = null;
        } else if (failed === total) {
          log.status = 'failed';
          log.errorMessage = log.subscribers
            .filter((s) => s.status === 'failed')
            .map((s) => `${s.name}: ${s.error}`)
            .join('; ');
        } else {
          log.status = 'partial';
          log.errorMessage = log.subscribers
            .filter((s) => s.status === 'failed')
            .map((s) => `${s.name}: ${s.error}`)
            .join('; ');
        }

        await this.eventLogRepo.save(log);
      });
    } catch (err) {
      this.logger.warn(`Failed to recalculate status: ${(err as Error).message}`);
    }
  }

  /**
   * 清理过期的内存索引
   */
  private cleanupRecentEmissions(): void {
    const now = Date.now();
    for (const [key, value] of this.recentEmissions) {
      if (now - value.timestamp > EventLogService.RECENT_EMISSION_TTL_MS) {
        this.recentEmissions.delete(key);
      }
    }
  }

  private buildRecentKey(eventType: string, payload: any): string {
    const projectId = payload?.projectId || 'system';
    return `${eventType}:${projectId}`;
  }

  /**
   * 检测事件发起者（用户 ID / 系统服务名）
   */
  private detectEmitter(payload: any): string | null {
    if (!payload) return null;
    return payload.userId || payload.emittedBy || payload.sourceInstance || null;
  }

  /**
   * 检测事件来源
   */
  private detectSource(payload: any): string {
    if (!payload) return 'system';
    if (payload.userId) return 'rest_api';
    if (payload.sourceInstance) return 'system';
    if (payload.tagId && payload.deviceId) return 'pipeline';
    return 'system';
  }

  /**
   * 标准化 timestamp — 兼容 number/string/Date 三种格式
   */
  private normalizeTimestamp(ts: number | string | Date | undefined): Date {
    if (!ts) return new Date();
    if (ts instanceof Date) return ts;
    if (typeof ts === 'number') return new Date(ts);
    if (typeof ts === 'string') return new Date(ts);
    return new Date();
  }

  /**
   * 清理 payload，避免存储过大的对象
   */
  private sanitizePayload(payload: any): Record<string, any> {
    if (!payload || typeof payload !== 'object') return { value: payload };

    // 移除内部追踪字段
    const { _logId, ...cleanPayload } = payload;

    // 序列化检测大小（粗略估算）
    const jsonStr = JSON.stringify(cleanPayload);
    if (jsonStr.length > 65536) {
      // 超过 64KB，截断 tags 等大数组
      this.logger.warn(`Payload too large (${jsonStr.length} chars), truncating`);
      const truncated = { ...cleanPayload };
      if (Array.isArray(truncated.tags)) {
        truncated.tags = truncated.tags.slice(0, 100);
        truncated._tagsTruncated = true;
      }
      return truncated;
    }

    return cleanPayload;
  }
}
