// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 权限码常量定义 — 与前端 packages/system/src/config/system-menu.config.ts 保持同步
 *
 * 命名规范: {module}:{action}
 * 特殊码: *:* 表示超级管理员（全部权限）
 *
 * 参考: docs/02-详细设计/00-功能整合/02-权限管理.md §3.2
 */

export const PermissionCodes = {
  // ──────── 项目管理 (project) ────────
  PROJECT_VIEW: 'project:view',
  PROJECT_CREATE: 'project:create',
  PROJECT_EDIT: 'project:edit',
  PROJECT_DELETE: 'project:delete',
  PROJECT_CONFIG: 'project:config',

  // ──────── 设备管理 (device) ────────
  DEVICE_VIEW: 'device:view',
  DEVICE_CREATE: 'device:create',
  DEVICE_EDIT: 'device:edit',
  DEVICE_DELETE: 'device:delete',
  DEVICE_IMPORT: 'device:import',
  DEVICE_EXPORT: 'device:export',
  DEVICE_CONNECT: 'device:connect',

  // ──────── 设备分组管理 (device_group) ────────
  DEVICE_GROUP_VIEW: 'device_group:view',
  DEVICE_GROUP_CREATE: 'device_group:create',
  DEVICE_GROUP_EDIT: 'device_group:edit',
  DEVICE_GROUP_DELETE: 'device_group:delete',

  // ──────── 数据标签管理 (datatag) ────────
  DATATAG_VIEW: 'datatag:view',
  DATATAG_CREATE: 'datatag:create',
  DATATAG_EDIT: 'datatag:edit',
  DATATAG_DELETE: 'datatag:delete',
  DATATAG_IMPORT: 'datatag:import',
  DATATAG_EXPORT: 'datatag:export',
  DATATAG_WRITE: 'datatag:write',

  // ──────── 报警管理 (alarm) ────────
  ALARM_VIEW: 'alarm:view',
  ALARM_ACK: 'alarm:ack',
  ALARM_CONFIGURE: 'alarm:configure',
  ALARM_RULE_VIEW: 'alarm:rule:view',
  ALARM_RULE_CREATE: 'alarm:rule:create',
  ALARM_RULE_EDIT: 'alarm:rule:edit',
  ALARM_RULE_DELETE: 'alarm:rule:delete',

  // ──────── 脚本管理 (script) ────────
  SCRIPT_VIEW: 'script:view',
  SCRIPT_CREATE: 'script:create',
  SCRIPT_EDIT: 'script:edit',
  SCRIPT_DELETE: 'script:delete',
  SCRIPT_EXECUTE: 'script:execute',

  // ──────── 趋势查看 (trend) ────────
  HISTORICAL_TREND_VIEW: 'trend:view',
  REALTIME_TREND_VIEW: 'trend:realtime:view',

  // ──────── 报表管理 (report) ────────
  REPORT_VIEW: 'report:view',
  REPORT_CREATE: 'report:create',
  REPORT_EDIT: 'report:edit',
  REPORT_DELETE: 'report:delete',
  REPORT_EXPORT: 'report:export',

  // ──────── 模板管理 (template) ────────
  TEMPLATE_VIEW: 'template:view',
  TEMPLATE_CREATE: 'template:create',
  TEMPLATE_EDIT: 'template:edit',
  TEMPLATE_DELETE: 'template:delete',
  TEMPLATE_IMPORT: 'template:import',
  TEMPLATE_EXPORT: 'template:export',

  // ──────── 采集插件管理 (plugin) ────────
  PLUGIN_VIEW: 'plugin:view',
  PLUGIN_CREATE: 'plugin:create',
  PLUGIN_EDIT: 'plugin:edit',
  PLUGIN_DELETE: 'plugin:delete',
  PLUGIN_CONFIG: 'plugin:config',

  // ──────── 系统管理 (system) ────────
  SYSTEM_USER_VIEW: 'system:user:view',
  SYSTEM_USER_CREATE: 'system:user:create',
  SYSTEM_USER_EDIT: 'system:user:edit',
  SYSTEM_USER_DELETE: 'system:user:delete',
  SYSTEM_ROLE_VIEW: 'system:role:view',
  SYSTEM_ROLE_CREATE: 'system:role:create',
  SYSTEM_ROLE_EDIT: 'system:role:edit',
  SYSTEM_ROLE_DELETE: 'system:role:delete',
  SYSTEM_POSITION_VIEW: 'system:position:view',
  SYSTEM_POSITION_CREATE: 'system:position:create',
  SYSTEM_POSITION_EDIT: 'system:position:edit',
  SYSTEM_POSITION_DELETE: 'system:position:delete',
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_DICT: 'system:dict',
  SYSTEM_MENU_CONFIG: 'system:menu:config',
  SYSTEM_MENU: 'system:menu',
  SYSTEM_AUDIT: 'system:audit',
  SYSTEM_BASE_SERVICES: 'system:base_services',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_INFO: 'system:info',
  SYSTEM_OPERATION_LOG: 'system:operation_log',

  // ──────── 特殊 ────────
  ALL: '*:*',
} as const;

export type PermissionCode = (typeof PermissionCodes)[keyof typeof PermissionCodes];

/**
 * 预设角色 → 权限码默认映射
 * 与设计文档 §3.3 保持一致
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  admin: [PermissionCodes.ALL],

  user: [
    PermissionCodes.DEVICE_CREATE,
    PermissionCodes.DEVICE_EDIT,
    PermissionCodes.DEVICE_DELETE,
    PermissionCodes.DEVICE_VIEW,
    PermissionCodes.DEVICE_IMPORT,
    PermissionCodes.DEVICE_EXPORT,
    PermissionCodes.DEVICE_CONNECT,
    PermissionCodes.DEVICE_GROUP_CREATE,
    PermissionCodes.DEVICE_GROUP_EDIT,
    PermissionCodes.DEVICE_GROUP_DELETE,
    PermissionCodes.DEVICE_GROUP_VIEW,
    PermissionCodes.DATATAG_VIEW,
    PermissionCodes.DATATAG_WRITE,
    PermissionCodes.PLUGIN_VIEW,
    PermissionCodes.PLUGIN_CREATE,
    PermissionCodes.PLUGIN_EDIT,
    PermissionCodes.PLUGIN_DELETE,
    PermissionCodes.PLUGIN_CONFIG,
    PermissionCodes.ALARM_VIEW,
    PermissionCodes.ALARM_ACK,
    PermissionCodes.ALARM_CONFIGURE,
    PermissionCodes.ALARM_RULE_VIEW,
    PermissionCodes.ALARM_RULE_CREATE,
    PermissionCodes.ALARM_RULE_EDIT,
    PermissionCodes.ALARM_RULE_DELETE,
    PermissionCodes.SCRIPT_CREATE,
    PermissionCodes.SCRIPT_EDIT,
    PermissionCodes.SCRIPT_DELETE,
    PermissionCodes.SCRIPT_EXECUTE,
    PermissionCodes.SCRIPT_VIEW,
    PermissionCodes.HISTORICAL_TREND_VIEW,
    PermissionCodes.REALTIME_TREND_VIEW,
    PermissionCodes.REPORT_VIEW,
    PermissionCodes.REPORT_CREATE,
    PermissionCodes.REPORT_EDIT,
    PermissionCodes.REPORT_DELETE,
    PermissionCodes.REPORT_EXPORT,
    PermissionCodes.TEMPLATE_VIEW,
    PermissionCodes.TEMPLATE_CREATE,
    PermissionCodes.TEMPLATE_EDIT,
    PermissionCodes.TEMPLATE_DELETE,
    PermissionCodes.TEMPLATE_IMPORT,
    PermissionCodes.TEMPLATE_EXPORT,
    PermissionCodes.SYSTEM_INFO,
  ],

  viewer: [
    PermissionCodes.DEVICE_VIEW,
    PermissionCodes.DEVICE_GROUP_VIEW,
    PermissionCodes.DATATAG_VIEW,
    PermissionCodes.PLUGIN_VIEW,
    PermissionCodes.ALARM_VIEW,
    PermissionCodes.SCRIPT_VIEW,
    PermissionCodes.HISTORICAL_TREND_VIEW,
    PermissionCodes.REALTIME_TREND_VIEW,
    PermissionCodes.REPORT_VIEW,
    PermissionCodes.TEMPLATE_VIEW,
    PermissionCodes.SYSTEM_INFO,
  ],
};

/**
 * 权限码所属模块分类（用于 UI 权限编辑面板的树形结构）
 */
export const PERMISSION_CATEGORIES: { module: string; label: string; codes: string[] }[] = [
  {
    module: 'project',
    label: '项目管理',
    codes: ['project:view', 'project:create', 'project:edit', 'project:delete', 'project:config'],
  },
  {
    module: 'device',
    label: '设备管理',
    codes: [
      'device:view',
      'device:create',
      'device:edit',
      'device:delete',
      'device:import',
      'device:export',
      'device:connect',
    ],
  },
  {
    module: 'device_group',
    label: '设备分组管理',
    codes: ['device_group:view', 'device_group:create', 'device_group:edit', 'device_group:delete'],
  },
  {
    module: 'datatag',
    label: '数据标签管理',
    codes: [
      'datatag:view',
      'datatag:create',
      'datatag:edit',
      'datatag:delete',
      'datatag:import',
      'datatag:export',
      'datatag:write',
    ],
  },
  {
    module: 'alarm',
    label: '报警管理',
    codes: [
      'alarm:view',
      'alarm:ack',
      'alarm:configure',
      'alarm:rule:view',
      'alarm:rule:create',
      'alarm:rule:edit',
      'alarm:rule:delete',
    ],
  },
  {
    module: 'script',
    label: '脚本管理',
    codes: ['script:view', 'script:create', 'script:edit', 'script:delete', 'script:execute'],
  },
  {
    module: 'trend',
    label: '趋势查看',
    codes: ['trend:view', 'trend:realtime:view'],
  },
  {
    module: 'report',
    label: '报表管理',
    codes: ['report:view', 'report:create', 'report:edit', 'report:delete', 'report:export'],
  },
  {
    module: 'template',
    label: '模板管理',
    codes: [
      'template:view',
      'template:create',
      'template:edit',
      'template:delete',
      'template:import',
      'template:export',
    ],
  },
  {
    module: 'plugin',
    label: '采集插件管理',
    codes: ['plugin:view', 'plugin:create', 'plugin:edit', 'plugin:delete', 'plugin:config'],
  },
  {
    module: 'system',
    label: '系统管理',
    codes: [
      'system:user:view',
      'system:user:create',
      'system:user:edit',
      'system:user:delete',
      'system:role:view',
      'system:role:create',
      'system:role:edit',
      'system:role:delete',
      'system:position:view',
      'system:position:create',
      'system:position:edit',
      'system:position:delete',
      'system:menu:config',
      'system:menu',
      'system:settings',
      'system:dict',
      'system:config',
      'system:audit',
      'system:base_services',
      'system:info',
      'system:operation_log',
    ],
  },
];
