// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type EventType =
  | 'data_point_changed'
  | 'device_status_changed'
  | 'device:statusChange'
  | 'device:statusChanged'
  | 'device:retry'
  | 'device.created'
  | 'device.updated'
  | 'device.deleted'
  | 'device.enabled'
  | 'device.disabled'
  | 'device.tagsChanged'
  | 'alarm_triggered'
  | 'alarm_acknowledged'
  | 'alarm.escalated'
  | 'alarm.notification.sent'
  | 'alarm.sound.trigger'
  | 'alarm.popup.show'
  | 'alarm.triggered'
  | 'alarm.cleared'
  | 'alarm.shelve.expired'
  | 'alarm_normalized'
  | 'alarm.recovered'
  | 'alarm.rule_resolved'
  | 'tag.change'
  | 'device.status'
  | 'system.startup'
  | 'protocol.config.updated'
  | 'config_changed'
  | 'processing_error'
  | 'health_degraded'
  | 'health_recovered'
  | 'plugin.discovered'
  | 'plugin.registered'
  | 'plugin.activated'
  | 'plugin.deactivated'
  | 'plugin.error'
  | 'plugin.unregistered'
  | 'plugin.updated'
  | 'plugin.isolation.crash'
  | 'plugin.isolation.restart'
  | 'plugin.isolation.dead'
  | 'plugin.isolation.alarm'
  | 'user.joined'
  | 'user.left'
  | 'project.beforeDelete'
  | 'project.created'
  | 'project.imported'
  | 'project:enabled'
  | 'project:disabled'
  | 'template.devices-synced'
  | 'timer:configChanged';

/**
 * 数据点变更事件
 *
 * 改造（P2-2）：与 @ss-node/ss-collector-sdk 的 TagUpdatePayload 保持字段一致，
 * 由 PublishStep 推送。timestamp 为 ISO 8601 字符串（避免 Date 序列化歧义）。
 *
 * 历史兼容：原 timestamp 为 number 类型，订阅者若按 number 解析需迁移为 string。
 * 旧订阅者读取的 timestamp 字段现在为 ISO 字符串，可通过 new Date(timestamp) 转回。
 */
export interface DataPointChangedEvent {
  tagId: string;
  deviceId: string;
  projectId: string;
  value: number | null;
  /** 显示值（已格式化），由 FormatStep 生成 */
  displayValue?: string;
  quality: string;
  /** ISO 8601 字符串 */
  timestamp: string;
  /** 本次 Pipeline 周期产生的错误（无错误时为 undefined） */
  errors?: Array<{ step: string; message: string; code?: string }>;
}

export interface DeviceStatusChangedEvent {
  deviceId: string;
  projectId: string;
  status: 'online' | 'offline' | 'connecting' | 'error' | 'degraded';
  previousStatus?: string;
  errorMessage?: string;
  timestamp: number;
}

export interface AlarmTriggeredEvent {
  alarmId: string;
  tagId: string;
  deviceId: string;
  projectId: string;
  level: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: number;
  value?: number;
  limit?: number;
}

export interface AlarmAcknowledgedEvent {
  alarmId: string;
  acknowledgedBy: string;
  acknowledgedAt: number;
}

/** 告警条件恢复正常事件（由 AlarmCheckStep 在采集管道中检测到条件恢复时发出）。
 *  Phase 5 新增：AlarmRecoverySubscriber 订阅此事件后执行自动恢复 */
export interface AlarmNormalizedEvent {
  tagId: string;
  deviceId?: string;
  projectId: string;
  /** 恢复时的采集值 */
  value: number;
  timestamp: Date;
  message: string;
  /** 触发此恢复的告警条件类型（limit/deviation/rate/digital） */
  conditionType?: string;
}

/** 告警已自动恢复事件（由 AlarmRecoverySubscriber 执行自动恢复后发出）。
 *  Phase 5 新增：前端/通知订阅此事件感知告警闭环完成 */
export interface AlarmRecoveredEvent {
  recordId: string;
  tagId: string;
  deviceId?: string;
  projectId: string;
  /** 恢复时的采集值 */
  recoveredValue: string;
  recoveredAt: Date;
  ruleId?: string;
  /** 关联的规则名称（便于前端展示） */
  ruleName?: string;
}

export interface ConfigChangedEvent {
  configType: 'tag' | 'device' | 'alarm' | 'system';
  targetId: string;
  changes: Record<string, any>;
  timestamp: number;
}

export interface ProcessingErrorEvent {
  step: string;
  error: Error;
  timestamp: number;
  context?: Record<string, any>;
}

export interface HealthEvent {
  checks: HealthCheck[];
  timestamp: number;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  error?: string;
  latency?: number;
  details?: Record<string, any>;
}

/** 设备创建事件 */
export interface DeviceCreatedEvent {
  deviceId: string;
  projectId: string;
  protocol: string;
  connection: Record<string, any>;
  scanRate: number;
  templateId?: string;
  templateVersion?: string;
  tags?: Array<{ tagId: string; address: string; dataType: string }>;
  timestamp: number;
}

/** 设备更新事件 */
export interface DeviceUpdatedEvent {
  deviceId: string;
  projectId: string;
  protocol: string;
  changedFields: Array<'connection' | 'scanRate' | 'status' | 'name' | 'groupId' | 'tags'>;
  connection?: Record<string, any>;
  scanRate?: number;
  status?: string;
  changes: Record<string, { old: any; new: any }>;
  timestamp: number;
}

/** 设备删除事件 */
export interface DeviceDeletedEvent {
  deviceId: string;
  projectId: string;
  protocol: string;
  timestamp: number;
}

/** 设备标签变更事件（模板同步 / 标签手动修改 → 采集层重载任务） */
export interface DeviceTagsChangedEvent {
  deviceId: string;
  projectId: string;
  protocol: string;
  /** 触发来源：template_sync | template_apply | tag_manual | driver_switch */
  changeType: 'template_sync' | 'template_apply' | 'tag_manual' | 'driver_switch';
  timestamp: number;
}

/** 插件生命周期事件 */
export interface PluginLifecycleEvent {
  protocol: string;
  displayName: string;
  version: string;
  category: string;
  status: string;
  timestamp: number;
  errorMessage?: string;
  previousStatus?: string;
  newVersion?: string;
  oldVersion?: string;
}

/** 隔离执行器健康状态 */
export interface ExecutorHealth {
  mode: string;
  status: 'healthy' | 'degraded' | 'dead' | 'starting';
  uptime: number;
  requestCount: number;
  errorCount: number;
  avgLatencyMs: number;
  pid?: number;
  threadId?: number;
  restartCount: number;
}

/** 隔离体崩溃事件 */
export interface IsolationCrashEvent {
  protocol: string;
  mode: string;
  restartCount: number;
  error?: string;
  timestamp: number;
}

/** 告警规则已解析事件（内部优化事件）
 *  由 AlarmEventSubscriber 在解析规则后发出，AlarmNotificationSubscriber 直接使用预解析数据，
 *  避免重复查询规则表。 */
export interface AlarmRuleResolvedEvent {
  alarmId: string;
  tagId: string;
  deviceId: string;
  projectId: string;
  level: string;
  message: string;
  timestamp: number;
  value?: number;
  limit?: number;
  /** 预解析的报警规则 */
  rule: {
    id: string;
    name: string;
    alarmType: string;
    notifyChannels: string[];
    escalationRules?: any[];
    suppressionRules?: any[];
  } | null;
}

export interface EventPayloadMap {
  data_point_changed: DataPointChangedEvent;
  device_status_changed: DeviceStatusChangedEvent;
  'device:statusChange': any;
  'device:statusChanged': any;
  'device:retry': any;
  'device.created': DeviceCreatedEvent;
  'device.updated': DeviceUpdatedEvent;
  'device.deleted': DeviceDeletedEvent;
  'device.enabled': DeviceCreatedEvent;
  'device.disabled': DeviceDeletedEvent;
  'device.tagsChanged': DeviceTagsChangedEvent;
  alarm_triggered: AlarmTriggeredEvent;
  alarm_acknowledged: AlarmAcknowledgedEvent;
  'alarm.escalated': any;
  'alarm.notification.sent': any;
  'alarm.sound.trigger': any;
  'alarm.popup.show': any;
  'alarm.triggered': any;
  'alarm.cleared': any;
  'alarm.shelve.expired': any;
  alarm_normalized: AlarmNormalizedEvent;
  'alarm.recovered': AlarmRecoveredEvent;
  'alarm.rule_resolved': AlarmRuleResolvedEvent;
  'tag.change': any;
  'device.status': any;
  'system.startup': any;
  'protocol.config.updated': any;
  config_changed: ConfigChangedEvent;
  processing_error: ProcessingErrorEvent;
  health_degraded: HealthEvent;
  health_recovered: HealthEvent;
  'plugin.discovered': PluginLifecycleEvent;
  'plugin.registered': PluginLifecycleEvent;
  'plugin.activated': PluginLifecycleEvent;
  'plugin.deactivated': PluginLifecycleEvent;
  'plugin.error': PluginLifecycleEvent;
  'plugin.unregistered': PluginLifecycleEvent;
  'plugin.updated': PluginLifecycleEvent;
  'plugin.isolation.crash': IsolationCrashEvent;
  'plugin.isolation.restart': IsolationCrashEvent;
  'plugin.isolation.dead': IsolationCrashEvent;
  'plugin.isolation.alarm': any;
  'user.joined': RoomEvent;
  'user.left': RoomEvent;
  'project.beforeDelete': ProjectBeforeDeleteEvent;
  'project.created': ProjectCreatedEvent;
  'project.imported': ProjectCreatedEvent;
  'project:enabled': ProjectEnabledEvent;
  'project:disabled': ProjectDisabledEvent;
  'template.devices-synced': TemplateDevicesSyncedEvent;
  'timer:configChanged': TimerConfigChangedEvent;
}

export interface RoomEvent {
  socketId: string;
  userId?: string;
  username?: string;
  room: string;
  timestamp: number;
}

/** 项目删除前事件 — 通知各模块关闭该项目占用的资源（如 DataSource） */
export interface ProjectBeforeDeleteEvent {
  projectId: string;
  /** 多租户预留（当前 = projectId） */
  tenantId?: string;
  timestamp: number;
}

/** 项目创建事件 */
export interface ProjectCreatedEvent {
  projectId: string;
  /** 多租户预留（当前 = projectId） */
  tenantId?: string;
  projectName: string;
}

/**
 * 项目启用状态变更事件
 *
 * 由 ProjectService.update() 在 enabled 字段变化时通过 EventBus 发射，
 * 采集层（DeviceCollectorBootstrap）订阅后动态启停采集任务。
 */
export interface ProjectEnabledEvent {
  projectId: string;
}

/** 项目停用事件 — 采集层停止该项目所有设备的采集任务并注销状态记录 */
export interface ProjectDisabledEvent {
  projectId: string;
}

/** 定时器配置变更事件 */
export interface TimerConfigChangedEvent {
  id: string;
  interval: number;
}

/** 模板同步完成事件 — 通知采集端批量重载设备点表 */
export interface TemplateDevicesSyncedEvent {
  /** 模板 ID */
  templateId: string;
  /** 受影响的设备 ID 列表 */
  deviceIds: string[];
  /** 项目 ID */
  projectId: string;
  /** 协议类型 */
  protocol: string;
  /** 变更类型 */
  changeType: 'template_sync';
  /** 变更统计（可选） */
  summary?: {
    updated: number;
    added: number;
    removed: number;
  };
  timestamp: number;
}

export type EventPayload<T extends EventType> = EventPayloadMap[T];
