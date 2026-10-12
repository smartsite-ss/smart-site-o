// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 微信扫码登录类型定义
 *
 * 个人微信开放平台网站应用 OAuth2 流程：
 *   1. 前端请求二维码 → 后端生成 state（CSRF 防护）+ wechatUrl
 *   2. 用户扫码确认 → 微信回调后端 /callback?code=CODE&state=STATE
 *   3. 后端用 code 换 access_token + openid，拉取用户信息
 *   4. 按 openid 查找/创建用户，标记 state=confirmed
 *   5. 前端轮询 /status，confirmed 时后端下发 Cookie + 返回 user
 */

/**
 * 扫码状态枚举
 * - pending：已生成二维码，等待用户扫码
 * - scanned：用户已扫码，等待手机确认（真实模式中间态）
 * - confirmed：用户已确认，登录成功，可下发 Token
 * - expired：二维码已过期（5 分钟）
 * - cancelled：用户取消扫码
 */
export type ScanStatus = 'pending' | 'scanned' | 'confirmed' | 'expired' | 'cancelled';

/**
 * 扫码会话状态（存储在 Redis/内存 Map 中）
 *
 * 生命周期：generateQrcode 创建 → 用户扫码更新为 scanned →
 * 确认后更新为 confirmed → /status 接口下发 Token 后删除（一次性消费）
 */
export interface ScanState {
  /** state 参数（CSRF 防护 + 会话标识，32 字符随机串） */
  state: string;
  /** 当前状态 */
  status: ScanStatus;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 过期时间戳（毫秒，创建后 5 分钟） */
  expiresAt: number;
  /** 扫码确认后填充：微信 openid */
  wechatOpenId?: string;
  /** 扫码确认后填充：微信 unionid（可选） */
  wechatUnionId?: string;
  /** 扫码确认后填充：微信昵称 */
  nickname?: string;
  /** 扫码确认后填充：微信头像 URL */
  avatarUrl?: string;
  /** confirmed 后填充：本系统 userId */
  userId?: string;
  /** 客户端 IP（审计用） */
  clientIp?: string;
  /** User-Agent（审计用） */
  userAgent?: string;
}

/**
 * 微信 OAuth2 access_token 响应
 *
 * GET https://api.weixin.qq.com/sns/oauth2/access_token 返回结构
 */
export interface WechatAccessTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
  /** 错误时存在的字段 */
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信 OAuth2 userinfo 响应
 *
 * GET https://api.weixin.qq.com/sns/userinfo 返回结构
 */
export interface WechatUserInfoResponse {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
  /** 错误时存在的字段 */
  errcode?: number;
  errmsg?: string;
}

/**
 * 二维码生成响应
 *
 * Mock 模式下 mock=true，前端显示占位 UI + "模拟扫码"按钮
 * 真实模式 mock=false，前端加载 wxLogin.js 渲染内嵌二维码
 */
export interface QrcodeResponse {
  /** state 参数（前端轮询 /status 时传回） */
  state: string;
  /** 微信扫码授权 URL（真实模式前端用 WxLogin JS 渲染） */
  wechatUrl: string;
  /** 是否为 Mock 模式（前端据此决定渲染方式） */
  mock: boolean;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
}

/**
 * 扫码状态查询响应
 *
 * confirmed 时 user 字段非空，前端拿到后跳转
 */
export interface ScanStatusResponse {
  status: ScanStatus;
  /** confirmed 时返回 user 信息（前端用于直接展示和跳转） */
  user?: {
    id: string;
    username: string;
    displayName: string;
    role: string;
    avatar?: string;
  };
  /** 剩余有效秒数（前端用于倒计时显示） */
  remainingSeconds: number;
}

/**
 * 微信用户资料（loginOrCreateUser 接收参数）
 */
export interface WechatUserProfile {
  wechatOpenId: string;
  wechatUnionId?: string;
  nickname?: string;
  avatarUrl?: string;
}

// ──────── 小程序登录（01-账号与认证）────────

/**
 * 小程序 code2session 响应
 *
 * GET https://api.weixin.qq.com/sns/jscode2session 返回结构
 * session_key 仅后端持有（解密用户敏感数据用），严禁下发前端
 */
export interface WechatMpCode2SessionResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  /** 错误时存在的字段 */
  errcode?: number;
  errmsg?: string;
}

/** 双 Token 对（复用 ss-data 机制：Access 15min + Refresh 7d） */
export interface WechatMpTokenPair {
  accessToken: string;
  refreshToken: string;
}

/** 小程序登录用户信息（与前端 LoginUserInfo 对齐） */
export interface WechatMpLoginUserInfo {
  userId: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  roleNames: string[];
}

/** 授权项目（数据权限快照：项目级 read/write/admin） */
export interface WechatMpAuthorizedProject {
  projectId: string;
  projectName: string;
  permissionLevel: 'read' | 'write' | 'admin';
}

/** 小程序登录响应（已绑定签发 Token；未绑定 bindingRequired=true） */
export interface WechatMpLoginResponse {
  tokenPair: WechatMpTokenPair | null;
  userInformation: WechatMpLoginUserInfo | null;
  bindingRequired: boolean;
  authorizedProjects: WechatMpAuthorizedProject[];
}

/** 绑定/换绑响应 */
export interface WechatMpBindResponse {
  tokenPair: WechatMpTokenPair;
  userInformation: WechatMpLoginUserInfo;
  authorizedProjects: WechatMpAuthorizedProject[];
}
