// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlarmRule, AlarmRecord } from './entities/alarm.entity';
import { AlarmGroup } from './entities/alarm-group.entity';
import { AlarmService } from './alarm.service';
import { AlarmController } from './alarm.controller';
import { ConditionEvaluator } from './engine/condition-evaluator';
import { AlarmDebouncer } from './engine/alarm-debouncer';
import { AlarmEscalationService } from './alarm-escalation.service';
import { AlarmSuppressionService as AlarmSuppressionServiceLegacy } from './alarm-suppression.service';
import { AlarmNotificationService } from './alarm-notification.service';
import { AlarmStatisticsService } from './alarm-statistics.service';
import { AlarmStatisticsService as AlarmStatsService } from './statistics/alarm-statistics.service';
import { AlarmStatisticsController } from './statistics/alarm-statistics.controller';
import { AlarmGroupService } from './group/alarm-group.service';
import { AlarmGroupController } from './group/alarm-group.controller';
import { AlarmEscalatorService } from './engine/alarm-escalator.service';
import { AlarmSuppressionService } from './engine/alarm-suppression.service';
import { DeviceOfflineSuppressionService } from './engine/device-offline-suppression.service';
import { AlarmShelveRecoveryService } from './engine/alarm-shelve-recovery.service';
import { AlarmRecoverySubscriber } from './engine/alarm-recovery.subscriber';
import { AlarmReconciliationService } from './engine/alarm-reconciliation.service';
import { EventBusModule, ProjectDatabaseService } from '@ss-node/ss-core';
import { SystemModule, SystemConfigService } from '@ss-node/ss-system';
import { SmsNotificationChannel } from './channels/sms-notification.channel';
import { TtsNotificationChannel } from './channels/tts-notification.channel';
import { AlarmEventSubscriber } from './alarm-event.subscriber';
import { DeviceCommunicationAlarmSubscriber } from './engine/device-communication-alarm.subscriber';
import { SystemHealthAlarmSubscriber } from './engine/system-health-alarm.subscriber';
import { AlarmNotificationSubscriber } from './engine/alarm-notification.subscriber';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlarmRule, AlarmRecord, AlarmGroup]),
    EventBusModule,
    SystemModule,
  ],
  controllers: [AlarmController, AlarmGroupController, AlarmStatisticsController],
  providers: [
    AlarmService,
    ConditionEvaluator,
    AlarmDebouncer,
    AlarmEscalationService,
    AlarmSuppressionServiceLegacy,
    AlarmNotificationService,
    AlarmStatisticsService,
    AlarmStatsService,
    AlarmGroupService,
    AlarmEscalatorService,
    AlarmSuppressionService,
    DeviceOfflineSuppressionService,
    AlarmShelveRecoveryService,
    AlarmRecoverySubscriber,
    AlarmReconciliationService,
    SmsNotificationChannel,
    TtsNotificationChannel,
    AlarmEventSubscriber,
    DeviceCommunicationAlarmSubscriber,
    SystemHealthAlarmSubscriber,
    AlarmNotificationSubscriber,
    // 字符串令牌别名：通道通过 @Inject('SystemConfigService') 注入，
    // 避免在通道文件中直接导入 ss-system 造成循环依赖与单元测试加载问题
    {
      provide: 'SystemConfigService',
      useExisting: SystemConfigService,
    },
  ],
  exports: [
    AlarmService,
    ConditionEvaluator,
    AlarmDebouncer,
    AlarmEscalationService,
    AlarmSuppressionServiceLegacy,
    AlarmNotificationService,
    AlarmStatisticsService,
    AlarmStatsService,
    AlarmGroupService,
    AlarmEscalatorService,
    AlarmSuppressionService,
    DeviceOfflineSuppressionService,
    AlarmShelveRecoveryService,
    SmsNotificationChannel,
    TtsNotificationChannel,
  ],
})
export class AlarmModule implements OnModuleInit {
  constructor(private readonly projectDbService: ProjectDatabaseService) {}

  onModuleInit(): void {
    this.projectDbService.registerSystemEntities([AlarmRule, AlarmRecord, AlarmGroup]);
  }
}
