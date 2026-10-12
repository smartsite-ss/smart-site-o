// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';
import { AlarmEvent, NormalizedAlarmEvent } from '../pipeline.types';
import { EventBusService } from '@ss-node/ss-core';
import { TagUpdatePayload } from '../interfaces';

/**
 * PublishStep — 数据发布步骤
 *
 * 改造（P2-2）：使用统一的 TagUpdatePayload 类型，与 PersistStep 的 DataPoint
 * 构造逻辑保持字段命名一致，便于跨步骤追踪与序列化。
 */
@Injectable()
export class PublishStep implements PipelineStep {
  readonly name = 'Publish';
  readonly order = 8;

  private readonly logger = new Logger(PublishStep.name);

  constructor(private readonly eventBus?: EventBusService) {}

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    if (!ctx.shouldPersist) {
      return ctx;
    }

    try {
      const triggeredAlarms = (ctx as any).triggeredAlarms as AlarmEvent[] | undefined;

      const payload: TagUpdatePayload = {
        tagId: ctx.tagId,
        deviceId: ctx.deviceId,
        projectId: ctx.projectId,
        value: ctx.transformedValue,
        displayValue: ctx.formattedValue ?? ctx.transformedValue?.toString(),
        quality: ctx.quality,
        timestamp: new Date().toISOString(),
        errors: ctx.errors.length > 0 ? ctx.errors : undefined,
      };

      // 有告警时才附带 activeAlarms，无告警不包含此字段（零开销）
      if (triggeredAlarms && triggeredAlarms.length > 0) {
        payload.activeAlarms = triggeredAlarms.map((a) => ({
          alarmId: a.alarmId,
          level: a.condition.severity,
          condition: a.condition.type,
          message: a.message,
        }));
      }

      // 1. WebSocket 推送（实时数据）
      if (this.eventBus) {
        this.eventBus.emit('data_point_changed', payload);
      }

      // 2. 报警事件推送
      if (triggeredAlarms && triggeredAlarms.length > 0) {
        for (const alarm of triggeredAlarms) {
          this.logger.debug(
            `Alarm event: alarmId=${alarm.alarmId} tagId=${alarm.tagId} ` +
              `severity=${alarm.condition.severity} type=${alarm.condition.type} ` +
              `message="${alarm.message}"`,
          );
          if (this.eventBus) {
            this.eventBus.emit('alarm_triggered', alarm);
          }
        }
      }

      // 3. Phase 5: 告警条件恢复正常事件推送
      const normalizedAlarms = (ctx as any).normalizedAlarms as NormalizedAlarmEvent[] | undefined;
      if (normalizedAlarms && normalizedAlarms.length > 0) {
        for (const normalized of normalizedAlarms) {
          this.logger.debug(
            `Alarm normalized: tagId=${normalized.tagId} ` +
              `conditionType=${normalized.conditionType} value=${normalized.value} ` +
              `message="${normalized.message}"`,
          );
          if (this.eventBus) {
            this.eventBus.emit('alarm_normalized', normalized);
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown publish error';
      this.logger.error(`Publish error for tag ${ctx.tagId}: ${errorMsg}`);
      ctx.errors.push({ step: this.name, message: errorMsg, code: 'PUBLISH_ERROR' });
      // 发布异常不中断 Pipeline
    }

    return ctx;
  }
}
