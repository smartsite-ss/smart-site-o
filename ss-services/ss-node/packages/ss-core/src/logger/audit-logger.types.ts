// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * S-M02: 审计日志类型定义
 *
 * 安全事件独立通道，支持哈希链防篡改和合规审查。
 * 每条审计日志包含 prevHash + hash 形成哈希链，任何篡改都会导致链断裂。
 */

/**
 * 审计事件严重级别
 * - info: 常规安全事件（登录成功、登出等）
 * - warning: 可疑事件（登录失败、密码验证失败等）
 * - critical: 严重安全事件（账户锁定、Token 被撤销后仍尝试使用等）
 */
export type AuditSeverity = 'info' | 'warning' | 'critical';

/**
 * 审计事件类型
 *
 * 命名规范：{模块}.{动作}.{结果}
 * 例如 auth.login.success、auth.password.failed
 */
export type AuditEventType =
  // 认证事件
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.login.locked'
  | 'auth.refresh.success'
  | 'auth.refresh.failed'
  | 'auth.logout'
  | 'auth.password.changed'
  | 'auth.password.failed'
  // 微信扫码登录事件
  | 'auth.wechat.login.success'
  | 'auth.wechat.login.failed'
  | 'auth.wechat.user_created'
  // 小程序微信登录事件（01-账号与认证）
  | 'auth.wechat_mp.login.success'
  | 'auth.wechat_mp.login.failed'
  | 'auth.wechat_mp.login.binding_required'
  | 'auth.wechat_mp.bind.success'
  | 'auth.wechat_mp.bind.failed'
  | 'auth.wechat_mp.password_login.success'
  | 'auth.wechat_mp.password_login.failed'
  | 'auth.wechat_mp.unbind'
  // 用户管理事件
  | 'user.created'
  | 'user.deleted'
  | 'user.role_changed'
  // 权限事件
  | 'permission.denied'
  | 'permission.granted'
  // 系统事件
  | 'system.config_changed'
  | 'system.data_exported';

/**
 * 审计事件 — 调用方传入的数据
 */
export interface AuditEvent {
  /** 事件类型 */
  type: AuditEventType;
  /** 严重级别 */
  severity: AuditSeverity;
  /** 用户 ID */
  userId?: string;
  /** 用户名 */
  username?: string;
  /** 客户端 IP */
  ip?: string;
  /** User-Agent */
  userAgent?: string;
  /** 事件详情（任意结构化数据，用于合规审查） */
  details?: Record<string, any>;
}

/**
 * 审计日志条目 — 写入磁盘的完整记录（含哈希链字段）
 */
export interface AuditLogEntry extends AuditEvent {
  /** ISO 8601 时间戳 */
  timestamp: string;
  /** 哈希链：前一条记录的 hash（创世记录为 64 个 '0'） */
  prevHash: string;
  /** 哈希链：当前记录的 hash = SHA256(prevHash + canonical_json(entry_without_hash)) */
  hash: string;
}

/**
 * 哈希链验证结果
 */
export interface AuditChainVerificationResult {
  /** 哈希链是否完整（未被篡改） */
  valid: boolean;
  /** 验证的日志条目总数 */
  totalEntries: number;
  /** 首次断裂位置（1-based 索引），valid=true 时为 null */
  brokenAtIndex: number | null;
  /** 断裂原因描述 */
  brokenReason?: string;
  /** 验证的日期（YYYY-MM-DD） */
  date: string;
}

/**
 * 审计日志查询筛选条件
 */
export interface AuditLogQueryFilter {
  /** 日期（YYYY-MM-DD），默认今天 */
  date?: string;
  /** 开始时间（YYYY-MM-DD 或 ISO 8601），与 date 互斥（优先使用 startTime/endTime） */
  startTime?: string;
  /** 结束时间（YYYY-MM-DD 或 ISO 8601） */
  endTime?: string;
  /** 事件类型筛选 */
  type?: string;
  /** 严重级别筛选（info/warning/critical） */
  severity?: string;
  /** 用户 ID 筛选 */
  userId?: string;
  /** 用户名筛选 */
  username?: string;
  /** 页码（默认 1） */
  page?: number;
  /** 每页条数（默认 20，最大 100） */
  pageSize?: number;
}

/**
 * 审计日志查询结果（分页）
 */
export interface AuditLogQueryResult {
  /** 当前页的审计条目列表（倒序，最新在前） */
  items: AuditLogEntry[];
  /** 符合筛选条件的总条目数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 查询的日期（YYYY-MM-DD） */
  date: string;
}

/**
 * 审计日志统计信息
 */
export interface AuditLogStats {
  /** 当天审计日志总条目数 */
  total: number;
  /** 按事件类型统计 */
  byType: Record<string, number>;
  /** 按严重级别统计 */
  bySeverity: Record<string, number>;
  /** 哈希链是否完整 */
  chainValid: boolean;
  /** 统计的日期（YYYY-MM-DD） */
  date: string;
}
