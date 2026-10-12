// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 事件类型分组、状态徽章映射等纯函数。
 * 与后端 PERSISTED_EVENTS 白名单、前端 EventLogListView 分组对齐，便于单测。
 */

import type { SubscriberRecord } from '@scada-editor/system';

export type EventTypeGroupId = 'device' | 'project' | 'alarm' | 'config' | 'plugin';

export interface EventTypeGroup {
  id: EventTypeGroupId;
  label: string;
  labelKey: string;
  items: string[];
}

/** 事件类型分组（与后端持久化事件白名单对齐） */
export const EVENT_TYPE_GROUPS: EventTypeGroup[] = [
  {
    id: 'device',
    label: '设备',
    labelKey: 'eventPanel.groups.device',
    items: [
      'device.created',
      'device.updated',
      'device.deleted',
      'device.tagsChanged',
      'device.enabled',
      'device.disabled',
    ],
  },
  {
    id: 'project',
    label: '项目',
    labelKey: 'eventPanel.groups.project',
    items: [
      'project.created',
      'project.imported',
      'project:enabled',
      'project:disabled',
      'project.beforeDelete',
    ],
  },
  {
    id: 'alarm',
    label: '告警',
    labelKey: 'eventPanel.groups.alarm',
    items: ['alarm.triggered', 'alarm_acknowledged', 'alarm.cleared'],
  },
  {
    id: 'config',
    label: '配置与定时器',
    labelKey: 'eventPanel.groups.config',
    items: ['config_changed', 'protocol.config.updated', 'timer:configChanged'],
  },
  {
    id: 'plugin',
    label: '插件',
    labelKey: 'eventPanel.groups.plugin',
    items: ['plugin.activated', 'plugin.deactivated', 'plugin.updated'],
  },
];

/** 事件日志实时状态列表（未闭环：仅已发射/处理中，与 EventLogStatus 对齐） */
export const EVENT_STATUS_LIST = ['emitted', 'processing'] as const;

/** 事件类型 → 域 CSS 类（按域着色，与 EventLogListView 一致） */
export function getEventTypeClass(eventType: string): string {
  if (eventType.startsWith('device.')) return 'event-type-device';
  if (eventType.startsWith('project') || eventType.startsWith('project:')) return 'event-type-project';
  if (eventType.startsWith('alarm')) return 'event-type-alarm';
  if (eventType.startsWith('plugin.')) return 'event-type-plugin';
  if (
    eventType.startsWith('config') ||
    eventType.startsWith('protocol.') ||
    eventType.startsWith('timer:')
  ) {
    return 'event-type-config';
  }
  return 'event-type-other';
}

/** 事件状态 → CSS 类（徽章着色） */
export function getStatusClass(status: string): string {
  return `status-${status}`;
}

/** 计算订阅者最大耗时（毫秒），无订阅者返回 '-' */
export function getMaxDuration(subscribers?: SubscriberRecord[]): string {
  if (!subscribers || subscribers.length === 0) return '-';
  const max = subscribers.reduce((maxDuration, subscriber) => {
    return subscriber.duration !== undefined && subscriber.duration > maxDuration
      ? subscriber.duration
      : maxDuration;
  }, 0);
  return max > 0 ? `${max}ms` : '-';
}

/** 成功率（如 '2/3'）→ CSS 类（全成功/部分成功/全失败） */
export function getRatioClass(ratio: string): string {
  const match = ratio.match(/^(\d+)\/(\d+)$/);
  if (!match) return '';
  const success = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  if (success === total) return 'ratio-success';
  if (success === 0) return 'ratio-failed';
  return 'ratio-partial';
}
