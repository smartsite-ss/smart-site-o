// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse, LoginDto, RegisterDto, AuthResult } from '../types/api';

/**
 * 微信扫码二维码响应
 */
export interface WechatQrcodeResult {
  /** state 参数（CSRF 防护 + 会话标识） */
  state: string;
  /** 微信扫码授权 URL（真实模式嵌入 iframe；Mock 模式为 mock:// 协议） */
  wechatUrl: string;
  /** 是否为 Mock 模式（前端据此显示模拟按钮或 iframe） */
  mock: boolean;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
}

/**
 * 微信扫码状态查询响应
 */
export interface WechatScanStatusResult {
  /** 扫码状态：pending/scanned/confirmed/expired/cancelled */
  status: 'pending' | 'scanned' | 'confirmed' | 'expired' | 'cancelled';
  /** 剩余有效秒数 */
  remainingSeconds: number;
  /** confirmed 时填充的用户信息 */
  user?: {
    id: string;
    username: string;
    displayName: string;
    role: string;
    avatar?: string;
  };
}

/**
 * 登录功能开关（登录页初始化时查询，决定是否显示微信扫码/短信登录入口）
 */
export interface LoginFeatures {
  /** 微信扫码登录是否启用（WECHAT_LOGIN_ENABLED） */
  wechatLoginEnabled: boolean;
  /** 短信验证码登录是否启用（SMS_LOGIN_ENABLED，§2.7 预留） */
  smsLoginEnabled: boolean;
}

export const authApi = {
  login(dto: LoginDto): Promise<ApiResponse<AuthResult>> {
    return client.post('/auth/login', dto).then((res) => res.data);
  },

  register(dto: RegisterDto): Promise<ApiResponse<AuthResult>> {
    return client.post('/auth/register', dto).then((res) => res.data);
  },

  /**
   * S-C03: refreshToken 通过 HttpOnly Cookie 自动传输，无需在 body 中传递
   */
  refreshToken(): Promise<ApiResponse<{ message: string }>> {
    return client.post('/auth/refresh', {}).then((res) => res.data);
  },

  /**
   * S-C03: Cookie 模式下 refreshToken 通过 HttpOnly Cookie 自动传输；
   * Bearer 模式（桌面端）下需通过 body 显式传入以撤销服务端的刷新令牌。
   */
  logout(refreshToken?: string): Promise<void> {
    return client.post('/auth/logout', refreshToken ? { refreshToken } : {});
  },

  // ── 微信扫码登录 ──

  /**
   * 生成微信扫码二维码
   * 后端返回 state + wechatUrl + mock 标识，前端据此渲染 iframe 或 Mock 按钮
   */
  generateWechatQrcode(): Promise<WechatQrcodeResult> {
    return client
      .post('/auth/wechat/qrcode', {})
      .then((res) => (res.data as any)?.data ?? res.data);
  },

  /**
   * 查询扫码状态（前端轮询，confirmed 时后端一次性下发 HttpOnly Cookie）
   */
  getWechatScanStatus(state: string): Promise<WechatScanStatusResult> {
    return client
      .get('/auth/wechat/status', { params: { state } })
      .then((res) => (res.data as any)?.data ?? res.data);
  },

  /**
   * Mock 扫码确认/取消（仅 WECHAT_MOCK=true 时可用，开发调试用）
   */
  wechatMockScan(
    state: string,
    action: 'confirm' | 'cancel',
  ): Promise<{ message: string }> {
    return client
      .post('/auth/wechat/mock-scan', { state, action })
      .then((res) => (res.data as any)?.data ?? res.data);
  },

  /**
   * 获取登录功能开关（公开接口，登录前调用）
   * 后端 GET /auth/features 返回 { wechatLoginEnabled, smsLoginEnabled }
   */
  getLoginFeatures(): Promise<LoginFeatures> {
    return client
      .get('/auth/features')
      .then((res) => (res.data as any)?.data ?? res.data);
  },
};