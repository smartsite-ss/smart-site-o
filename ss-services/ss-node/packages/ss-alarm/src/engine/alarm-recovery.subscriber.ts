// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Optional, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { In } from 'typeorm';
import {
  EventBusService,
  ProjectDatabaseService,
  AlarmNormalizedEvent,
  AlarmRecoveredEvent,
} from '@ss-node/ss-core';
import { AlarmRule, AlarmRecord, AlarmStatus } from '../entities/alarm.entity';

/**
 * AlarmRecoverySubscriber — 告警自动恢复订阅器（Phase 5 状态机闭环）
 *
 * 监听采集管道发出的 `alarm_normalized` 事件（由 AlarmCheckStep 检测到条件恢复正常时发出），
 * 将该标签的所有活跃告警（ACTIVE / ACKNOWLEDGED）自动恢复为 CLEARED，完成告警闭环。
 *
 * 闭环流程：
 * 1. AlarmCheckStep 检测到值不再满足告警条件 → 发出 `alarm_normalized` 事件
 * 2. 本订阅器收到事件 → 查询该项目该 tag 的所有活跃告警
 * 3. 对每条告警检查规则的 autoClear 配置：
 *    - autoClear=true（默认）：自动恢复，设置 clearReason='auto' + recoveredAt + recoveredValue
 *    - autoClear=false：跳过（需人工确认）
 * 4. 发出 `alarm.recovered` 事件 → 供 WebSocket 推送 + 通知服务使用
 *
 * 项目隔离：通过 ProjectDatabaseService.getSystemDb(projectId) 获取项目级 DataSource
 */
@Injectable()
export class AlarmRecoverySubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlarmRecoverySubscriber.name);

  constructor(
    @Optional() private readonly eventBus?: EventBusService,
    @Optional() private readonly projectDbService?: ProjectDatabaseService,
  ) {}

  onModuleInit(): void {
    if (this.eventBus) {
      this.eventBus.on('alarm_normalized', this.handleNormalized.bind(this));
      this.logger.log('Subscribed to alarm_normalized events (Phase 5 auto-recovery)');
    }
  }

  onModuleDestroy(): void {
    if (this.eventBus) {
      this.eventBus.off('alarm_normalized', this.handleNormalized);
    }
  }

  private async handleNormalized(event: AlarmNormalizedEvent): Promise<void> {
    this.logger.debug(
      `Received alarm_normalized: tagId=${event.tagId} ` +
        `projectId=${event.projectId} value=${event.value} ` +
        `conditionType=${event.conditionType} message="${event.message}"`,
    );

    if (!this.projectDbService || !event.projectId) {
      this.logger.warn(
        `Skipped alarm_normalized: projectDbService=${!!this.projectDbService} projectId=${event.projectId}`,
      );
      return;
    }

    try {
      const ds = await this.projectDbService.getSystemDb(event.projectId);
      const recordRepo = ds.getRepository(AlarmRecord);
      const ruleRepo = ds.getRepository(AlarmRule);

      // 查找该标签的所有活跃告警（ACTIVE + ACKNOWLEDGED 均可自动恢复）
      const activeRecords = await recordRepo.find({
        where: {
          tagId: event.tagId,
          projectId: event.projectId,
          status: In([AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED]),
          isActive: true,
        },
      });

      if (activeRecords.length === 0) {
        this.logger.debug(
          `No active alarms found for tagId=${event.tagId} in project=${event.projectId}, skipping`,
        );
        return;
      }

      // 批量加载相关规则（用于 autoClear 检查）
      const ruleIds = [...new Set(activeRecords.map((r) => r.ruleId).filter(Boolean))] as string[];
      const rules = ruleIds.length > 0 ? await ruleRepo.find({ where: { id: In(ruleIds) } }) : [];
      const ruleMap = new Map(rules.map((r) => [r.id, r]));

      const recoveredValue = String(event.value);
      const recoveredAt = new Date();
      const recoveredRecords: AlarmRecord[] = [];

      for (const record of activeRecords) {
        // 检查规则是否允许自动恢复
        const rule = record.ruleId ? ruleMap.get(record.ruleId) : undefined;
        if (rule && !rule.autoClear) {
          this.logger.debug(
            `Alarm ${record.id} skipped: rule ${rule.id} has autoClear=false (manual confirmation required)`,
          );
          continue;
        }

        // 执行自动恢复 — 与 AlarmService.recoverAlarm() 逻辑一致
        record.status = AlarmStatus.CLEARED;
        record.clearedAt = recoveredAt;
        record.clearedBy = 'auto';
        record.isActive = false;
        record.clearReason = 'auto';
        record.recoveredAt = recoveredAt;
        record.recoveredValue = recoveredValue;
        record.dispositionType = 'alarm.cleared';

        recoveredRecords.push(record);
      }

      if (recoveredRecords.length > 0) {
        await recordRepo.save(recoveredRecords);

        // 发出 alarm.recovered 事件（供 WebSocket 推送 + 通知服务使用）
        for (const record of recoveredRecords) {
          const recoveredEvent: AlarmRecoveredEvent = {
            recordId: record.id,
            tagId: record.tagId ?? event.tagId,
            deviceId: record.deviceId ?? event.deviceId,
            projectId: event.projectId,
            recoveredValue,
            recoveredAt,
            ruleId: record.ruleId ?? undefined,
            ruleName: ruleMap.get(record.ruleId ?? '')?.name,
          };
          if (this.eventBus) {
            this.eventBus.emit('alarm.recovered', recoveredEvent);
          }
        }

        this.logger.log(
          `Auto-recovered ${recoveredRecords.length} alarm(s) for tagId=${event.tagId} ` +
            `in project=${event.projectId} (value=${recoveredValue})`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Failed to auto-recover alarms for tagId=${event.tagId}: ${error.message}`);
    }
  }
}
