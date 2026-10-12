// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Optional, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventBusService, ProjectDatabaseService } from '@ss-node/ss-core';
import { AlarmRule, AlarmRecord, AlarmStatus } from './entities/alarm.entity';
import { Device, DataTag } from '@ss-node/ss-device';

/**
 * AlarmEventSubscriber
 *
 * 监听采集管道发出的 `alarm_triggered` 事件，将报警记录持久化到项目数据库。
 *
 * 事件来源：采集管道 PublishStep 中通过 EventBus 发出的 AlarmEvent
 * 事件格式：{ tagId, deviceId, projectId, condition: { severity, type }, value, timestamp, message }
 *
 * 持久化逻辑：
 * 1. 根据 tagId 查找匹配的 AlarmRule（获取 ruleId）
 * 2. 同一 ruleId 的活跃报警做抑制去重（更新 triggerValue / message）
 * 3. 无匹配规则时仍创建记录（ruleId 为 null，level 取自 condition.severity）
 */
@Injectable()
export class AlarmEventSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlarmEventSubscriber.name);

  constructor(
    @Optional() private readonly eventBus?: EventBusService,
    @Optional() private readonly projectDbService?: ProjectDatabaseService,
  ) {}

  onModuleInit(): void {
    if (this.eventBus) {
      this.eventBus.on('alarm_triggered', this.handleAlarmTriggered.bind(this));
      this.logger.log('Subscribed to alarm_triggered events');
    }
  }

  onModuleDestroy(): void {
    if (this.eventBus) {
      this.eventBus.off('alarm_triggered', this.handleAlarmTriggered);
    }
  }

  private async handleAlarmTriggered(event: any): Promise<void> {
    this.logger.debug(
      `Received alarm_triggered: tagId=${event.tagId} ` +
        `deviceId=${event.deviceId} projectId=${event.projectId} ` +
        `severity=${event.condition?.severity} type=${event.condition?.type} ` +
        `value=${event.value} message="${event.message}"`,
    );

    if (!this.projectDbService || !event.projectId) {
      this.logger.warn(
        `Skipped alarm_triggered: projectDbService=${!!this.projectDbService} projectId=${event.projectId}`,
      );
      return;
    }

    try {
      const ds = await this.projectDbService.getSystemDb(event.projectId);
      const repo = ds.getRepository(AlarmRecord);
      const ruleRepo = ds.getRepository(AlarmRule);

      // 根据 tagId 查找匹配的报警规则
      const rule = await ruleRepo.findOne({
        where: { tagId: event.tagId, projectId: event.projectId },
      });

      // P1-4 优化：发射 alarm.rule_resolved 内部事件，携带预解析的规则数据，
      // 避免 AlarmNotificationSubscriber 等下游订阅者重复查询规则表
      this.eventBus?.emit('alarm.rule_resolved', {
        alarmId: event.alarmId,
        tagId: event.tagId,
        deviceId: event.deviceId,
        projectId: event.projectId,
        level: event.condition?.severity ?? 'warning',
        message: event.message,
        timestamp: event.timestamp ?? Date.now(),
        value: event.value,
        rule: rule
          ? {
              id: rule.id,
              name: rule.name,
              alarmType: rule.alarmType,
              notifyChannels: rule.notifyChannels ?? [],
            }
          : null,
      });

      // 抑制重复：同一 ruleId 的活跃报警不重复创建，只更新 triggerValue / message
      if (rule) {
        const existing = await repo.findOne({
          where: { ruleId: rule.id, projectId: event.projectId, status: AlarmStatus.ACTIVE },
        });
        if (existing) {
          existing.triggerValue = String(event.value ?? existing.triggerValue ?? '');
          existing.message = event.message;
          existing.dispositionType = 'alarm.triggered'; // 重新触发，重置处置类型
          await repo.save(existing);
          return;
        }
      }

      // 按 alarmId 去重：系统生成的告警（设备通讯/系统健康）已由对应订阅器直接持久化，
      // 此处 emit('alarm_triggered') 仅用于 WebSocket 实时推送，跳过重复持久化
      if (event.alarmId) {
        const existingById = await repo.findOne({
          where: { id: event.alarmId, projectId: event.projectId },
        });
        if (existingById) {
          this.logger.debug(
            `AlarmRecord ${event.alarmId} already exists (source: system subscriber), skipping`,
          );
          return;
        }
      }

      // 查找设备名称和标签名称
      let deviceName: string | null = null;
      let tagName: string | null = null;
      try {
        if (event.deviceId) {
          const deviceRepo = ds.getRepository(Device);
          const device = await deviceRepo.findOne({ where: { id: event.deviceId } });
          deviceName = device?.deviceName ?? null;
        }
        if (event.tagId) {
          const tagRepo = ds.getRepository(DataTag);
          const tag = await tagRepo.findOne({ where: { id: event.tagId } });
          tagName = tag?.name ?? null;
        }
      } catch (lookupErr: any) {
        this.logger.warn(`Failed to lookup device/tag names: ${lookupErr.message}`);
      }

      // 创建新记录 — triggerValue 统一转字符串，支持 number/boolean/string 类型
      // 使用 AlarmCheckStep 预生成的 alarmId 作为主键，实现告警与实时数据的双向关联
      const record = repo.create({
        id: event.alarmId,
        projectId: event.projectId,
        ruleId: rule?.id ?? null,
        deviceId: event.deviceId ?? null,
        deviceName,
        tagId: event.tagId ?? null,
        tagName,
        level: event.condition?.severity ?? 'warning',
        message: event.message,
        triggerValue: String(event.value ?? ''),
        status: AlarmStatus.ACTIVE,
        // 告警类型映射：limit（超高限/高限/低限/低低限）→ overlimit，统一归入超限告警分类；
        // 其余类型沿用规则定义，无规则（脚本触发等）默认 custom
        alarmType: event.condition?.type === 'limit' ? 'overlimit' : (rule?.alarmType ?? 'custom'),
        // 处置类型初始化为"告警触发"
        dispositionType: 'alarm.triggered',
      });
      await repo.save(record);
      this.logger.debug(
        `AlarmRecord persisted: id=${record.id} tag=${event.tagId} ` +
          `level=${record.level} ruleId=${record.ruleId} status=${record.status}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to persist alarm record: ${error.message}`);
    }
  }
}
