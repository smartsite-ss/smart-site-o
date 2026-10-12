// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * S-M02: 审计上下文 — 从 Controller 传递给 Service 的请求级安全信息
 *
 * 用于在安全事件触发时记录客户端 IP 和 User-Agent，
 * 便于合规审查和攻击溯源。
 */
export interface AuditContext {
  /** 客户端 IP（支持代理转发场景，由 Controller 的 getClientIp 提取） */
  ip?: string;
  /** User-Agent（浏览器/客户端标识） */
  userAgent?: string;
}
