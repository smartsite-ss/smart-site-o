// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Optional, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventBusService, EventLogService } from '@ss-node/ss-core';
import { AlarmNotificationService, NotificationPayload } from '../alarm-notification.service';
import type { AlarmRuleResolvedEvent } from '@ss-node/ss-core';

/**
 * AlarmNotificationSubscriber — 告警通知自动触发订阅器（Phase 6 通知接线）
 *
 * 监听 `alarm.rule_resolved`（P1-4 优化后）和 `alarm.escalated` 事件，自动调用
 * `AlarmNotificationService.sendNotification` 完成 6 通道通知（email/sound/popup/sms/tts/webhook）
 * 的自动触发。
 *
 * P1-4 优化：不再独立查询规则表，直接使用 AlarmEventSubscriber 通过 alarm.rule_resolved
 * 事件预解析的规则数据（含 notifyChannels），消除重复 DB 查询。
 *
 * 通知渠道决策（规则级配置 ∩ 全局启用渠道）：
 * 1. 使用事件中预解析的 rule.notifyChannels
 * 2. 规则 notifyChannels ∩ AlarmNotificationService 启用渠道 = 实际通知渠道
 * 3. 规则未找到或 notifyChannels 为空时，回退到全局启用渠道
 * 4. 无启用渠道则跳过通知
 */
@Injectable()
export class AlarmNotificationSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlarmNotificationSubscriber.name);
  private readonly triggeredHandler: (event: any) => void;
  private readonly escalatedHandler: (event: any) => void;
  /** wrapSubscriber 包装后的 handler（off 时需用此引用） */
  private wrappedTriggeredHandler?: (event: any) => Promise<void>;

  constructor(
    @Optional() private readonly eventBus?: EventBusService,
    @Optional() private readonly notificationService?: AlarmNotificationService,
    @Optional() private readonly eventLogService?: EventLogService,
  ) {
    this.triggeredHandler = this.handleAlarmRuleResolved.bind(this);
    this.escalatedHandler = this.handleAlarmEscalated.bind(this);
  }

  onModuleInit(): void {
    if (this.eventBus && this.notificationService) {
      // wrap helper：alarm.rule_resolved 在事件日志白名单中，用 wrapSubscriber 追踪处理结果
      const wrap = <T extends any[]>(
        eventType: string,
        handler: (...args: T) => Promise<Record<string, any> | void>,
      ): ((...args: T) => Promise<void>) => {
        const traced = this.eventLogService
          ? this.eventLogService.wrapSubscriber(eventType, 'AlarmNotificationSubscriber', handler)
          : async (...args: T) => { await handler(...args); };
        return async (...args: T) => {
          try { await traced(...args); }
          catch (err) { this.logger.error(`Handler for ${eventType} failed: ${(err as Error).message}`); }
        };
      };

      this.wrappedTriggeredHandler = wrap('alarm.rule_resolved', async (event: any) => {
        await this.triggeredHandler(event);
        return { notificationDispatched: true };
      });
      this.eventBus.on('alarm.rule_resolved', this.wrappedTriggeredHandler);
      // alarm.escalated 不在事件日志白名单中，无需 wrapSubscriber
      this.eventBus.on('alarm.escalated', this.escalatedHandler);
      this.logger.log(
        'Subscribed to alarm.rule_resolved + alarm.escalated for notification dispatch',
      );
    }
  }

  onModuleDestroy(): void {
    if (this.eventBus) {
      if (this.wrappedTriggeredHandler) {
        this.eventBus.off('alarm.rule_resolved', this.wrappedTriggeredHandler);
      }
      this.eventBus.off('alarm.escalated', this.escalatedHandler);
    }
  }

  /**
   * 计算实际通知渠道：规则渠道 ∩ service 启用渠道。规则渠道为空时回退到全局启用渠道。
   * 微信订阅消息为订阅制通道（接收人由用户授权决定，不参与规则级渠道配置），
   * 全局启用时始终并入，避免被规则 notifyChannels 交集过滤。
   */
  private resolveChannels(ruleChannels?: string[]): string[] {
    const enabled = this.notificationService!.getEnabledChannels();
    if (enabled.length === 0) return [];
    if (!ruleChannels || ruleChannels.length === 0) return enabled;
    const resolved = ruleChannels.filter((c) => enabled.includes(c));
    if (enabled.includes('wechatSubscribe') && !resolved.includes('wechatSubscribe')) {
      resolved.push('wechatSubscribe');
    }
    return resolved;
  }

  /** 处理 alarm.rule_resolved 事件 → 派发通知（P1-4 优化：直接使用预解析规则数据） */
  private async handleAlarmRuleResolved(event: AlarmRuleResolvedEvent): Promise<void> {
    if (!this.notificationService) return;

    const { alarmId, projectId, level, message, value, timestamp, rule } = event;

    this.logger.debug(
      `Received alarm.rule_resolved: alarmId=${alarmId} projectId=${projectId} ` +
        `level=${level} ruleId=${rule?.id ?? 'none'}`,
    );

    try {
      const channels = this.resolveChannels(rule?.notifyChannels);

      if (channels.length === 0) {
        this.logger.debug(`No enabled notification channels for alarm ${alarmId}, skipping`);
        return;
      }

      const payload: NotificationPayload = {
        alarmId,
        ruleName: rule?.name || message || '告警通知',
        level,
        message,
        value: value ?? 0,
        timestamp: new Date(timestamp),
        channels,
      };

      await this.notificationService.sendNotification(payload);
      this.logger.log(`Notification dispatched for alarm ${alarmId} via [${channels.join(',')}]`);
    } catch (err: any) {
      this.logger.error(`Failed to dispatch notification for alarm ${alarmId}: ${err.message}`);
    }
  }

  /** 处理告警升级事件 → 派发升级通知（升级事件无预解析规则，回退到全局启用渠道） */
  private async handleAlarmEscalated(event: any): Promise<void> {
    if (!this.notificationService) return;

    const projectId = event.projectId;
    const alarmId = event.recordId || '';
    const fromLevel = event.fromLevel || '';
    const toLevel = event.toLevel || 'warning';
    const message = event.message || '';
    const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();

    this.logger.debug(
      `Received alarm.escalated: alarmId=${alarmId} projectId=${projectId} ${fromLevel} → ${toLevel}`,
    );

    try {
      // 升级事件无预解析规则，回退到全局启用渠道
      const channels = this.resolveChannels();

      if (channels.length === 0) {
        this.logger.debug(
          `No enabled notification channels for escalated alarm ${alarmId}, skipping`,
        );
        return;
      }

      const payload: NotificationPayload = {
        alarmId,
        ruleName: '告警升级',
        level: toLevel,
        message: `[升级 ${fromLevel}→${toLevel}] ${message}`,
        value: 0,
        timestamp,
        channels,
      };

      await this.notificationService.sendNotification(payload);
      this.logger.log(
        `Escalation notification dispatched for alarm ${alarmId} via [${channels.join(',')}]`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to dispatch escalation notification for alarm ${alarmId}: ${err.message}`,
      );
    }
  }
}
