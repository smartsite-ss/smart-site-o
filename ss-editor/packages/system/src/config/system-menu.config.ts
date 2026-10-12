// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 系统菜单配置 — 集中化、国际化与权限控制
// DB 唯一数据源方案：菜单结构仅存储于后端 sys_menus 表，前端通过 API 获取。
// 本文件仅保留类型定义、权限码与角色权限映射，不再内置菜单默认值。

/** 系统角色枚举（与后端 UserRole 对齐） */
export type SystemRole = 'admin' | 'user' | 'viewer';

/** 系统菜单项 */
export interface SystemMenuItem {
  /** 唯一标识，对应路由 name（如 'projects'） */
  id: string;
  /** i18n 翻译 key，用于 $t(key) 获取显示文本 */
  labelKey: string;
  /** 路由路径，相对于 /system（'' 表示 /system，'/projects' 表示 /system/projects） */
  path: string;
  /** 图标名称，映射到 SystemMenuIcon 组件 */
  icon: string;
  /** 子菜单项（可选） */
  children?: SystemMenuItem[];
  /** 权限角色要求，undefined/null 表示所有用户可访问 */
  roles?: SystemRole[];
  /** 是否在顶栏导航显示（默认 true） */
  showInTopbar?: boolean;
  /** 是否在侧栏显示（默认 true） */
  showInSidebar?: boolean;
  /** 是否为详情页（不在菜单中显示，但路由存在），如 device-detail */
  isDetail?: boolean;
  /** 排序权重，数字越小越靠前 */
  order?: number;
  /** 子系统标识，NULL/undefined 表示全局菜单（所有子系统可见） */
  subsystem?: string | null;
}

// ──────────── 权限码体系（方案B增强） ────────────

/**
 * 权限码枚举
 * 格式：{模块}:{操作}
 * 用于按钮/操作级别的细粒度权限控制
 */
export const PermissionCodes = {
  // 项目管理
  PROJECT_CREATE: 'project:create',
  PROJECT_EDIT: 'project:edit',
  PROJECT_DELETE: 'project:delete',
  PROJECT_VIEW: 'project:view',
  PROJECT_CONFIG: 'project:config',

  // 设备管理
  DEVICE_CREATE: 'device:create',
  DEVICE_EDIT: 'device:edit',
  DEVICE_DELETE: 'device:delete',
  DEVICE_VIEW: 'device:view',
  DEVICE_IMPORT: 'device:import',
  DEVICE_EXPORT: 'device:export',
  DEVICE_CONNECT: 'device:connect',

  // 设备分组管理
  DEVICE_GROUP_CREATE: 'device_group:create',
  DEVICE_GROUP_EDIT: 'device_group:edit',
  DEVICE_GROUP_DELETE: 'device_group:delete',
  DEVICE_GROUP_VIEW: 'device_group:view',

  // 数据标签管理
  DATATAG_CREATE: 'datatag:create',
  DATATAG_EDIT: 'datatag:edit',
  DATATAG_DELETE: 'datatag:delete',
  DATATAG_VIEW: 'datatag:view',
  DATATAG_IMPORT: 'datatag:import',
  DATATAG_EXPORT: 'datatag:export',
  DATATAG_WRITE: 'datatag:write',

  // 采集管理
  PLUGIN_CREATE: 'plugin:create',
  PLUGIN_EDIT: 'plugin:edit',
  PLUGIN_DELETE: 'plugin:delete',
  PLUGIN_VIEW: 'plugin:view',
  PLUGIN_CONFIG: 'plugin:config',

  // 报警中心
  ALARM_VIEW: 'alarm:view',
  ALARM_ACK: 'alarm:ack',
  ALARM_CONFIGURE: 'alarm:configure',
  ALARM_RULE_VIEW: 'alarm:rule:view',
  ALARM_RULE_CREATE: 'alarm:rule:create',
  ALARM_RULE_EDIT: 'alarm:rule:edit',
  ALARM_RULE_DELETE: 'alarm:rule:delete',

  // 脚本管理
  SCRIPT_CREATE: 'script:create',
  SCRIPT_EDIT: 'script:edit',
  SCRIPT_DELETE: 'script:delete',
  SCRIPT_EXECUTE: 'script:execute',
  SCRIPT_VIEW: 'script:view',

  // 数据报表
  REPORT_CREATE: 'report:create',
  REPORT_EDIT: 'report:edit',
  REPORT_DELETE: 'report:delete',
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',

  // 模板管理
  TEMPLATE_CREATE: 'template:create',
  TEMPLATE_EDIT: 'template:edit',
  TEMPLATE_DELETE: 'template:delete',
  TEMPLATE_IMPORT: 'template:import',
  TEMPLATE_EXPORT: 'template:export',
  TEMPLATE_VIEW: 'template:view',

  // 系统管理
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_DICT: 'system:dict',
  SYSTEM_INFO: 'system:info',
  SYSTEM_MENU: 'system:menu',
  SYSTEM_MENU_CONFIG: 'system:menu:config',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_AUDIT: 'system:audit',
  SYSTEM_BASE_SERVICES: 'system:base_services',
  SYSTEM_OPERATION_LOG: 'system:operation_log',

  // 用户管理（v6.0 新增，v7.0 增强）
  USER_CREATE: 'system:user:create',
  USER_EDIT: 'system:user:edit',
  USER_DELETE: 'system:user:delete',
  USER_VIEW: 'system:user:view',
  SYSTEM_USER_CREATE: 'system:user:create',
  SYSTEM_USER_EDIT: 'system:user:edit',
  SYSTEM_USER_DELETE: 'system:user:delete',
  SYSTEM_USER_VIEW: 'system:user:view',

  // 角色管理（v6.0 新增，v7.0 增强）
  ROLE_CREATE: 'system:role:create',
  ROLE_EDIT: 'system:role:edit',
  ROLE_DELETE: 'system:role:delete',
  ROLE_VIEW: 'system:role:view',
  SYSTEM_ROLE_CREATE: 'system:role:create',
  SYSTEM_ROLE_EDIT: 'system:role:edit',
  SYSTEM_ROLE_DELETE: 'system:role:delete',
  SYSTEM_ROLE_VIEW: 'system:role:view',

  // 岗位管理（v6.0 新增）
  POSITION_CREATE: 'system:position:create',
  POSITION_EDIT: 'system:position:edit',
  POSITION_DELETE: 'system:position:delete',
  POSITION_VIEW: 'system:position:view',

  // 通用
  ALL: '*:*',

  // 历史趋势
  HISTORICAL_TREND_VIEW: 'trend:view',
  // 实时趋势
  REALTIME_TREND_VIEW: 'trend:realtime:view',
} as const;

export type PermissionCode = (typeof PermissionCodes)[keyof typeof PermissionCodes];

/**
 * 角色 → 权限码默认映射
 *
 * @deprecated v8.0：DB 为权限码唯一数据源，ROLE_PERMISSIONS 仅作为后端种子数据参考，
 *             不再用于前端运行时权限判断。保留此常量供测试代码使用。
 */
export const ROLE_PERMISSIONS: Record<SystemRole, PermissionCode[]> = {
  admin: [PermissionCodes.ALL],

  user: [
    // device:*
    PermissionCodes.DEVICE_CREATE, PermissionCodes.DEVICE_EDIT,
    PermissionCodes.DEVICE_DELETE, PermissionCodes.DEVICE_VIEW,
    PermissionCodes.DEVICE_IMPORT, PermissionCodes.DEVICE_EXPORT,
    PermissionCodes.DEVICE_CONNECT,
    // device_group:*
    PermissionCodes.DEVICE_GROUP_CREATE, PermissionCodes.DEVICE_GROUP_EDIT,
    PermissionCodes.DEVICE_GROUP_DELETE, PermissionCodes.DEVICE_GROUP_VIEW,
    // datatag:view
    PermissionCodes.DATATAG_VIEW,
    // plugin:*
    PermissionCodes.PLUGIN_CREATE, PermissionCodes.PLUGIN_EDIT,
    PermissionCodes.PLUGIN_DELETE, PermissionCodes.PLUGIN_VIEW,
    PermissionCodes.PLUGIN_CONFIG,
    // alarm:*
    PermissionCodes.ALARM_VIEW, PermissionCodes.ALARM_ACK,
    PermissionCodes.ALARM_RULE_VIEW, PermissionCodes.ALARM_RULE_CREATE,
    PermissionCodes.ALARM_RULE_EDIT, PermissionCodes.ALARM_RULE_DELETE,
    // script:*
    PermissionCodes.SCRIPT_CREATE, PermissionCodes.SCRIPT_EDIT,
    PermissionCodes.SCRIPT_DELETE, PermissionCodes.SCRIPT_EXECUTE,
    PermissionCodes.SCRIPT_VIEW,
    // report:*
    PermissionCodes.REPORT_VIEW, PermissionCodes.REPORT_CREATE,
    PermissionCodes.REPORT_EDIT, PermissionCodes.REPORT_DELETE,
    PermissionCodes.REPORT_EXPORT,
    // template:*
    PermissionCodes.TEMPLATE_CREATE, PermissionCodes.TEMPLATE_EDIT,
    PermissionCodes.TEMPLATE_DELETE, PermissionCodes.TEMPLATE_IMPORT,
    PermissionCodes.TEMPLATE_EXPORT, PermissionCodes.TEMPLATE_VIEW,
    // system:info
    PermissionCodes.SYSTEM_INFO,
    // 历史趋势
    PermissionCodes.HISTORICAL_TREND_VIEW,
    // 实时趋势
    PermissionCodes.REALTIME_TREND_VIEW,
  ],

  viewer: [
    PermissionCodes.DEVICE_VIEW,
    PermissionCodes.DEVICE_GROUP_VIEW,
    PermissionCodes.DATATAG_VIEW,
    PermissionCodes.PLUGIN_VIEW,
    PermissionCodes.ALARM_VIEW,
    PermissionCodes.SCRIPT_VIEW,
    PermissionCodes.REPORT_VIEW,
    PermissionCodes.TEMPLATE_VIEW,
    PermissionCodes.SYSTEM_INFO,
    // 历史趋势
    PermissionCodes.HISTORICAL_TREND_VIEW,
    // 实时趋势
    PermissionCodes.REALTIME_TREND_VIEW,
  ],
};