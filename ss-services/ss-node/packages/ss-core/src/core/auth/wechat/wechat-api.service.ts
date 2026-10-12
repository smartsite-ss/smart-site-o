// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { httpRequest, HttpError } from '../../../ai/http-client.util';
import {
  WechatAccessTokenResponse,
  WechatUserInfoResponse,
  WechatMpCode2SessionResponse,
} from './wechat-auth.types';

/**
 * 微信 API 调用封装 — 真实 + Mock 双模式
 *
 * 通过 WECHAT_MOCK 环境变量切换：
 *   - true：返回固定假 openid，便于开发调试（无需真实微信资质）
 *   - false：调用真实微信 API（需配置 WECHAT_APPID/SECRET）
 *
 * 凭证配置（小程序与开放平台网站应用分属不同体系）：
 *   - 小程序：优先 WECHAT_MP_APPID/WECHAT_MP_SECRET，未配置时回退 WECHAT_APPID/WECHAT_SECRET
 *   - 网站应用（扫码登录）：WECHAT_APPID/WECHAT_SECRET
 *
 * 复用项目自研 httpRequest 工具（ai/http-client.util.ts），
 * 避免引入 axios 等额外依赖（遵循项目设计哲学）。
 */
@Injectable()
export class WechatApiService {
  private readonly logger = new Logger(WechatApiService.name);
  private readonly isMock: boolean;
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly mpAppId: string;
  private readonly mpAppSecret: string;
  private readonly mockDefaultOpenId: string;

  constructor() {
    this.isMock = process.env.WECHAT_MOCK === 'true';
    this.appId = process.env.WECHAT_APPID || '';
    this.appSecret = process.env.WECHAT_SECRET || '';
    this.mpAppId = process.env.WECHAT_MP_APPID || this.appId;
    this.mpAppSecret = process.env.WECHAT_MP_SECRET || this.appSecret;
    this.mockDefaultOpenId = process.env.WECHAT_MOCK_DEFAULT_OPENID || 'mock_wechat_user_001';
    this.validateConfig();
  }

  /** 启动时校验配置，真实模式要求 APPID/SECRET 必填 */
  private validateConfig(): void {
    if (!this.isMock) {
      if (!this.appId || !this.appSecret) {
        this.logger.error(
          'WECHAT_APPID / WECHAT_SECRET 未配置，真实模式无法工作。如需 Mock 模式请设置 WECHAT_MOCK=true',
        );
      } else {
        this.logger.log(
          `微信扫码登录运行于真实模式 | appId=${this.appId.slice(0, 6)}...`,
        );
      }
      if (!this.mpAppId || !this.mpAppSecret) {
        this.logger.error(
          '小程序凭证未配置（WECHAT_MP_APPID / WECHAT_MP_SECRET，或回退的 WECHAT_APPID / WECHAT_SECRET），小程序登录无法工作',
        );
      } else {
        this.logger.log(
          `微信小程序登录运行于真实模式 | mpAppId=${this.mpAppId.slice(0, 6)}...`,
        );
      }
    } else {
      this.logger.warn(
        `⚠️ 微信登录运行于 Mock 模式（扫码 + 小程序） | defaultOpenId=${this.mockDefaultOpenId} | 生产环境禁止使用`,
      );
    }
  }

  /** 是否为 Mock 模式（供 Controller 和 Service 查询） */
  isMockMode(): boolean {
    return this.isMock;
  }

  /** 获取 AppId（前端 WxLogin JS 需要） */
  getAppId(): string {
    return this.appId;
  }

  /**
   * 构造微信扫码授权 URL
   *
   * 真实模式：https://open.weixin.qq.com/connect/qrconnect?appid=...&redirect_uri=...&response_type=code&scope=snsapi_login&state=...#wechat_redirect
   * Mock 模式：返回占位 URL（前端不会实际跳转，仅显示 Mock 占位 UI）
   */
  buildQrcodeUrl(state: string, redirectUri: string): string {
    if (this.isMock) {
      return `mock://wechat-login?state=${state}`;
    }
    const encoded = encodeURIComponent(redirectUri);
    // self_redirect=true：微信在 iframe 内重定向到回调 URL
    // 回调端点只处理登录（code→token→openid→创建用户→state=confirmed），不发 Token 不跳转
    // 前端轮询 /status 检测到 confirmed 后下发 Cookie 并跳转系统首页
    return `https://open.weixin.qq.com/connect/qrconnect?appid=${this.appId}&redirect_uri=${encoded}&response_type=code&scope=snsapi_login&state=${state}&self_redirect=true#wechat_redirect`;
  }

  /**
   * 用 code 换 access_token
   *
   * GET https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
   */
  async getAccessToken(code: string): Promise<WechatAccessTokenResponse> {
    if (this.isMock) {
      this.logger.log(`[Mock] getAccessToken | code=${code} → openid=${this.mockDefaultOpenId}`);
      return {
        access_token: `mock_access_token_${Date.now()}`,
        expires_in: 7200,
        refresh_token: `mock_refresh_token_${Date.now()}`,
        openid: this.mockDefaultOpenId,
        scope: 'snsapi_login',
        unionid: `mock_unionid_${this.mockDefaultOpenId}`,
      };
    }

    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}&secret=${this.appSecret}&code=${code}&grant_type=authorization_code`;
    try {
      const resp = await httpRequest({ method: 'GET', url, timeoutMs: 10000 });
      const data = JSON.parse(resp.body) as WechatAccessTokenResponse;
      if (data.errcode) {
        throw new BadRequestException(`微信换 token 失败：[${data.errcode}] ${data.errmsg}`);
      }
      return data;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof HttpError) {
        this.logger.error(`微信 getAccessToken HTTP 错误：${err.statusCode} ${err.body.slice(0, 200)}`);
        throw new BadRequestException(`微信 API 调用失败：HTTP ${err.statusCode}`);
      }
      throw new BadRequestException(`微信 API 调用异常：${(err as Error).message}`);
    }
  }

  /**
   * 小程序 wx.login code → code2session 换 openid（session_key 仅后端持有，不下发）
   *
   * GET https://api.weixin.qq.com/sns/jscode2session?appid=APPID&secret=SECRET&js_code=JSCODE&grant_type=authorization_code
   *
   * 错误码处理（微信官方）：
   *   - 40029 code 无效/过期（5 分钟时效）→ WECHAT_CODE_INVALID（前端重取 code 重试一次）
   *   - 45011 接口限频（100 次/分钟）→ WECHAT_API_RATE_LIMITED
   *   - 40226 高风险用户 → WECHAT_USER_BLOCKED
   */
  async getCode2Session(loginCode: string): Promise<WechatMpCode2SessionResponse> {
    if (this.isMock) {
      this.logger.log(`[Mock] getCode2Session | code=${loginCode.slice(0, 8)}... → openid=${this.mockDefaultOpenId}`);
      return {
        openid: this.mockDefaultOpenId,
        session_key: `mock_session_key_${Date.now()}`,
        unionid: `mock_unionid_${this.mockDefaultOpenId}`,
      };
    }
    if (!this.mpAppId || !this.mpAppSecret) {
      throw new BadRequestException('小程序微信凭证未配置（WECHAT_MP_APPID / WECHAT_MP_SECRET）');
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.mpAppId}&secret=${this.mpAppSecret}&js_code=${encodeURIComponent(loginCode)}&grant_type=authorization_code`;
    try {
      const resp = await httpRequest({ method: 'GET', url, timeoutMs: 10000 });
      const data = JSON.parse(resp.body) as WechatMpCode2SessionResponse;
      if (data.errcode) {
        switch (data.errcode) {
          case 40029:
            throw new BadRequestException({
              code: 'WECHAT_CODE_INVALID',
              message: `微信登录凭证无效或已过期：[${data.errcode}] ${data.errmsg}`,
            });
          case 45011:
            throw new BadRequestException({
              code: 'WECHAT_API_RATE_LIMITED',
              message: `微信接口限频，请稍后重试：[${data.errcode}] ${data.errmsg}`,
            });
          case 40226:
            throw new BadRequestException({
              code: 'WECHAT_USER_BLOCKED',
              message: `高风险用户，小程序登录被拦截：[${data.errcode}] ${data.errmsg}`,
            });
          default:
            throw new BadRequestException(`微信 code2session 失败：[${data.errcode}] ${data.errmsg}`);
        }
      }
      return data;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof HttpError) {
        this.logger.error(`微信 code2session HTTP 错误：${err.statusCode} ${err.body.slice(0, 200)}`);
        throw new BadRequestException(`微信 API 调用失败：HTTP ${err.statusCode}`);
      }
      throw new BadRequestException(`微信 API 调用异常：${(err as Error).message}`);
    }
  }

  /**
   * 用 access_token 拉取用户信息
   *
   * GET https://api.weixin.qq.com/sns/userinfo?access_token=ACCESS_TOKEN&openid=OPENID
   */
  async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfoResponse> {
    if (this.isMock) {
      return {
        openid: this.mockDefaultOpenId,
        nickname: '微信测试用户',
        sex: 0,
        province: '',
        city: '',
        country: '',
        headimgurl: '',
        privilege: [],
        unionid: `mock_unionid_${this.mockDefaultOpenId}`,
      };
    }

    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`;
    try {
      const resp = await httpRequest({ method: 'GET', url, timeoutMs: 10000 });
      const data = JSON.parse(resp.body) as WechatUserInfoResponse;
      if (data.errcode) {
        throw new BadRequestException(`微信拉取用户信息失败：[${data.errcode}] ${data.errmsg}`);
      }
      return data;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof HttpError) {
        this.logger.error(`微信 getUserInfo HTTP 错误：${err.statusCode} ${err.body.slice(0, 200)}`);
        throw new BadRequestException(`微信 API 调用失败：HTTP ${err.statusCode}`);
      }
      throw new BadRequestException(`微信 API 调用异常：${(err as Error).message}`);
    }
  }
}
