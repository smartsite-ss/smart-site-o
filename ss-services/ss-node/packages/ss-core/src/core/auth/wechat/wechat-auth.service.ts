// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import { AuditLoggerService } from '../../../logger/audit-logger.service';
import { I18nService } from '@ss-node/ss-i18n';
import { WechatApiService } from './wechat-api.service';
import { WechatStateService } from './wechat-state.service';
import {
  ScanState,
  QrcodeResponse,
  ScanStatusResponse,
  WechatUserProfile,
} from './wechat-auth.types';

/**
 * 微信扫码登录业务服务
 *
 * 职责：
 *   1. 生成二维码（state + wechatUrl）
 *   2. 处理微信回调（真实模式）/ Mock 扫码（Mock 模式）
 *   3. 查找或创建用户，标记 state=confirmed
 *   4. confirmed 时下发 Token（一次性消费 state）
 *
 * Token 下发时机说明：
 *   不在 /callback 接口下发 Token，因为微信回调是服务器重定向，
 *   前端无法直接获取响应。改为在 /status 轮询接口检测到 confirmed 时下发 Cookie，
 *   前端拿到 user 后跳转，此时 setCookie 自然完成。
 */
@Injectable()
export class WechatAuthService {
  private readonly logger = new Logger(WechatAuthService.name);
  private readonly redirectUri: string;
  private readonly stateTtlMs: number;

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly wechatApi: WechatApiService,
    private readonly stateService: WechatStateService,
    @Inject(I18nService) private readonly i18n: I18nService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    this.redirectUri =
      process.env.WECHAT_REDIRECT_URI ||
      'http://localhost:5173/api/v1/auth/wechat/callback';
    this.stateTtlMs = 5 * 60 * 1000; // 5 分钟
  }

  /** 生成二维码（state + wechatUrl） */
  async generateQrcode(clientMeta: {
    ip?: string;
    userAgent?: string;
  }): Promise<QrcodeResponse> {
    const state = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const scanState: ScanState = {
      state,
      status: 'pending',
      createdAt: now,
      expiresAt: now + this.stateTtlMs,
      clientIp: clientMeta.ip,
      userAgent: clientMeta.userAgent,
    };
    await this.stateService.create(scanState);

    const wechatUrl = this.wechatApi.buildQrcodeUrl(state, this.redirectUri);
    const mock = this.wechatApi.isMockMode();

    this.logger.log(
      `[生成二维码] state=${state} mock=${mock} ip=${clientMeta.ip || 'unknown'}`,
    );

    return {
      state,
      wechatUrl,
      mock,
      expiresAt: scanState.expiresAt,
    };
  }

  /** 查询扫码状态（前端轮询） */
  async getScanStatus(state: string): Promise<ScanStatusResponse> {
    const scanState = await this.stateService.get(state);
    if (!scanState) {
      throw new BadRequestException(this.i18n.tSync('auth.wechat.invalid_state'));
    }

    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((scanState.expiresAt - now) / 1000));

    // confirmed 状态：查询用户信息返回给前端
    let user: ScanStatusResponse['user'];
    if (scanState.status === 'confirmed' && scanState.userId) {
      const userEntity = await this.userService.findById(scanState.userId);
      if (userEntity) {
        user = {
          id: userEntity.id,
          username: userEntity.username,
          displayName: userEntity.displayName || userEntity.username,
          role: userEntity.role,
          avatar: userEntity.avatar,
        };
      }
    }

    return { status: scanState.status, user, remainingSeconds };
  }

  /**
   * 微信回调处理（真实模式）
   *
   * GET /auth/wechat/callback?code=CODE&state=STATE
   * 流程：
   *   1. 校验 state 存在且 status=pending
   *   2. 标记为 scanned
   *   3. 用 code 换 access_token + openid
   *   4. 拉取用户信息
   *   5. loginOrCreateUser → 标记 confirmed
   */
  async handleCallback(code: string, state: string): Promise<void> {
    const scanState = await this.stateService.get(state);
    if (!scanState) {
      throw new BadRequestException(this.i18n.tSync('auth.wechat.invalid_state'));
    }
    if (scanState.status !== 'pending') {
      throw new BadRequestException(
        this.i18n.tSync('auth.wechat.invalid_state_status'),
      );
    }

    // 标记为已扫码（用户已确认前的中间态）
    await this.stateService.update(state, { status: 'scanned' });

    const tokenResp = await this.wechatApi.getAccessToken(code);
    const userInfo = await this.wechatApi.getUserInfo(tokenResp.access_token, tokenResp.openid);

    await this.loginOrCreateUser(state, {
      wechatOpenId: tokenResp.openid,
      wechatUnionId: tokenResp.unionid,
      nickname: userInfo.nickname,
      avatarUrl: userInfo.headimgurl,
    });
  }

  /**
   * Mock 模式模拟用户扫码确认
   *
   * POST /auth/wechat/mock-scan { state, action: 'confirm' | 'cancel' }
   */
  async handleMockScan(state: string, action: 'confirm' | 'cancel'): Promise<void> {
    if (!this.wechatApi.isMockMode()) {
      throw new UnauthorizedException(this.i18n.tSync('auth.wechat.mock_disabled'));
    }

    const scanState = await this.stateService.get(state);
    if (!scanState) {
      throw new BadRequestException(this.i18n.tSync('auth.wechat.invalid_state'));
    }
    if (scanState.status !== 'pending') {
      throw new BadRequestException(
        this.i18n.tSync('auth.wechat.invalid_state_status'),
      );
    }

    if (action === 'cancel') {
      await this.stateService.update(state, { status: 'cancelled' });
      this.logger.log(`[Mock 扫码] state=${state} 用户取消`);
      return;
    }

    // action=confirm：先标记 scanned，再走 loginOrCreateUser
    await this.stateService.update(state, { status: 'scanned' });

    // Mock 模式使用环境变量配置的默认 openid
    const mockOpenId =
      process.env.WECHAT_MOCK_DEFAULT_OPENID || 'mock_wechat_user_001';
    await this.loginOrCreateUser(state, {
      wechatOpenId: mockOpenId,
      wechatUnionId: `mock_unionid_${mockOpenId}`,
      nickname: '微信测试用户',
      avatarUrl: '',
    });
  }

  /**
   * 查找或创建用户，并标记 state=confirmed
   *
   * 查找策略：
   *   1. 按 wechatOpenId 查找
   *   2. 未找到且 unionid 存在时，按 unionid 兜底查找（跨应用识别同一用户）
   *   3. 仍未找到则创建新用户（默认 viewer 角色）
   *
   * Token 不在此处直接下发（service 层无法操作 Response），
   * 而是存到 state 中（confirmed + userId），由 controller 在 /status 接口
   * 检测到 confirmed 时调用 issueTokenForConfirmedScan 下发
   */
  private async loginOrCreateUser(
    state: string,
    profile: WechatUserProfile,
  ): Promise<void> {
    const scanState = await this.stateService.get(state);
    if (!scanState) return;

    let user = await this.userService.findByWechatOpenId(profile.wechatOpenId);
    let isNewUser = false;

    // 按 openid 未找到时，尝试 unionid 兜底查找
    if (!user && profile.wechatUnionId) {
      user = await this.userService.findByWechatUnionId(profile.wechatUnionId);
      if (user) {
        // 已有 unionid 用户，补充 openid 并刷新资料
        await this.userService.updateWechatProfile(user.id, {
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
        });
      }
    }

    if (!user) {
      // 创建新用户（默认 viewer）
      user = await this.userService.createWechatUser(profile);
      isNewUser = true;
      this.auditLogger.logSecurityEvent({
        type: 'user.created',
        severity: 'info',
        userId: user.id,
        username: user.username,
        ip: scanState.clientIp,
        userAgent: scanState.userAgent,
        details: {
          source: 'wechat_qrcode',
          role: 'viewer',
          isNewUser: true,
          wechatOpenId: profile.wechatOpenId,
        },
      });
      this.logger.log(
        `[创建新用户] userId=${user.id} username=${user.username} wechatOpenId=${profile.wechatOpenId}`,
      );
    } else {
      // 已有用户，刷新昵称/头像/unionId
      await this.userService.updateWechatProfile(user.id, {
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        unionId: profile.wechatUnionId,
      });
      this.logger.log(
        `[复用已有用户] userId=${user.id} username=${user.username} wechatOpenId=${profile.wechatOpenId}`,
      );
    }

    this.auditLogger.logSecurityEvent({
      type: 'auth.wechat.login.success',
      severity: 'info',
      userId: user.id,
      username: user.username,
      ip: scanState.clientIp,
      userAgent: scanState.userAgent,
      details: { isNewUser, wechatOpenId: profile.wechatOpenId },
    });

    // 标记为 confirmed，存 userId。Token 由 /status 接口确认时下发
    await this.stateService.update(state, {
      status: 'confirmed',
      userId: user.id,
      wechatOpenId: profile.wechatOpenId,
      wechatUnionId: profile.wechatUnionId,
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
    });
  }

  /**
   * 当 /status 接口检测到 status=confirmed 时，生成 Token 并返回 user
   *
   * 调用方（controller）负责 setAuthCookies
   * 一次性消费：发完 token 后立即删除 state，防止重复领 token
   */
  async issueTokenForConfirmedScan(state: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      username: string;
      displayName: string;
      role: string;
      avatar?: string;
    };
  } | null> {
    const scanState = await this.stateService.get(state);
    if (!scanState || scanState.status !== 'confirmed' || !scanState.userId) {
      return null;
    }
    const user = await this.userService.findById(scanState.userId);
    if (!user) return null;

    const tokens = await this.authService.generateTokensForUser({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    // 一次性：发完 token 后删除 state，防止重复领 token
    await this.stateService.delete(state);

    this.logger.log(
      `[下发 Token] userId=${user.id} username=${user.username} state=${state} 已删除`,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }
}
