// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Optional, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventBusService, SystemEventService } from '@ss-node/ss-core';
import { AlarmLevel } from '@ss-node/ss-sdk';

/**
 * 系统健康告警订阅器
 *
 * 监听 health_degraded / health_recovered 事件：
 * - 核心服务（SQLite/InfluxDB/Redis 等）健康检查失败 → 写入全局 sys_events 表
 * - 核心服务恢复 → 标记对应事件为 RECOVERED
 *
 * 系统健康事件是全局事件，不归属任何项目，统一存储在全局 ss-node.db 的 sys_events 表中。
 * 事件 ID 格式：`sys-health-{checkName}`（确定性 ID，便于去重和恢复时查找）。
 */
@Injectable()
export class SystemHealthAlarmSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemHealthAlarmSubscriber.name);
  private readonly degradedHandler: (event: any) => void;
  private readonly recoveredHandler: (event: any) => void;

  constructor(
    @Optional() private readonly eventBus?: EventBusService,
    @Optional() private readonly systemEventService?: SystemEventService,
  ) {
    this.degradedHandler = this.handleHealthDegraded.bind(this);
    this.recoveredHandler = this.handleHealthRecovered.bind(this);
  }

  onModuleInit(): void {
    if (this.eventBus) {
      this.eventBus.on('health_degraded', this.degradedHandler);
      this.eventBus.on('health_recovered', this.recoveredHandler);
      this.logger.log(
        'SystemHealthAlarmSubscriber initialized — listening for health_degraded/health_recovered',
      );
    }
  }

  onModuleDestroy(): void {
    if (this.eventBus) {
      this.eventBus.off('health_degraded', this.degradedHandler);
      this.eventBus.off('health_recovered', this.recoveredHandler);
    }
  }

  /**
   * 系统健康劣化 → 写入全局 sys_events 表
   */
  private async handleHealthDegraded(event: {
    checks: Array<{ name: string; status: string; error?: string; latency?: number }>;
    timestamp: number;
  }): Promise<void> {
    if (!this.systemEventService) {
      this.logger.warn('Skipped health alarm: systemEventService not available');
      return;
    }

    const unhealthyChecks = event.checks.filter((c) => c.status === 'unhealthy');
    if (unhealthyChecks.length === 0) {
      return;
    }

    for (const check of unhealthyChecks) {
      const eventId = `sys-health-${check.name}`;
      const message = check.error
        ? `系统服务异常: ${check.name} - ${check.error}`
        : `系统服务异常: ${check.name}`;

      try {
        await this.systemEventService.create({
          deterministicId: eventId,
          eventType: 'health',
          subType: check.name,
          level: AlarmLevel.CRITICAL,
          message,
          source: 'health-checker',
          metadata: {
            latency: check.latency,
            timestamp: event.timestamp,
          },
        });

        this.logger.warn(`System health event created: ${eventId} service=${check.name}`);
      } catch (error: any) {
        this.logger.error(`Failed to create health event ${eventId}: ${error.message}`);
      }
    }
  }

  /**
   * 系统健康恢复 → 标记对应事件为 RECOVERED
   */
  private async handleHealthRecovered(event: {
    checks: Array<{ name: string; status: string }>;
    timestamp: number;
  }): Promise<void> {
    if (!this.systemEventService) {
      return;
    }

    const recoveredChecks = event.checks.filter((c) => c.status === 'healthy');
    let totalRecovered = 0;

    for (const check of recoveredChecks) {
      const eventId = `sys-health-${check.name}`;
      try {
        const result = await this.systemEventService.recover(eventId);
        if (result) {
          totalRecovered++;
          this.logger.log(`System health event recovered: ${eventId}`);
        }
      } catch (error: any) {
        this.logger.error(`Failed to recover health event ${eventId}: ${error.message}`);
      }
    }

    if (totalRecovered > 0) {
      this.logger.log(`System health recovered — cleared ${totalRecovered} events`);
    }
  }
}
