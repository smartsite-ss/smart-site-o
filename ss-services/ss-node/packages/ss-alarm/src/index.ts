// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export { AlarmModule } from './alarm.module';
export { AlarmService } from './alarm.service';
export { ConditionEvaluator } from './engine/condition-evaluator';
export { AlarmDebouncer } from './engine/alarm-debouncer';
export { AlarmEscalationService, EscalationRule } from './alarm-escalation.service';
export { AlarmSuppressionService, SuppressionRule } from './alarm-suppression.service';
export {
  AlarmNotificationService,
  NotificationChannel,
  NotificationPayload,
} from './alarm-notification.service';
export {
  INotificationChannel,
  NotificationPayload as ChannelNotificationPayload,
} from './channels/notification-channel.interface';
export { SmsNotificationChannel, SmsProvider } from './channels/sms-notification.channel';
export { TtsNotificationChannel, TtsProvider } from './channels/tts-notification.channel';
export {
  AlarmStatisticsService,
  AlarmStatistics,
  AlarmTrend,
  AlarmTopRule,
} from './alarm-statistics.service';
export {
  AlarmRule,
  AlarmRecord,
  AlarmLevel,
  AlarmStatus,
  AlarmCondition,
} from './entities/alarm.entity';
export { AlarmGroup } from './entities/alarm-group.entity';
export {
  AlarmGroupService,
  AlarmGroupTreeNode,
  AlarmGroupStats,
  CreateAlarmGroupDto,
  UpdateAlarmGroupDto,
} from './group/alarm-group.service';
export { AlarmGroupController } from './group/alarm-group.controller';
export { AlarmEscalatorService, EscalationConfig } from './engine/alarm-escalator.service';
export { AlarmShelveRecoveryService } from './engine/alarm-shelve-recovery.service';
export {
  AlarmSuppressionService as AlarmSuppressionEngineService,
  SuppressionRule as EngineSuppressionRule,
  AlarmEvent,
} from './engine/alarm-suppression.service';
