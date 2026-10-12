// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { WechatAuthService } from './wechat-auth.service';
import { WechatMockScanDto } from './dto/wechat-mock-scan.dto';

/**
 * 微信扫码登录 Controller
 *
 * 路由前缀：/api/v1/auth/wechat（继承全局 /api/v1 + AuthController 父级 /auth 不适用，直接挂在 /auth/wechat）
 *
 * 端点：
 *   1. POST /qrcode         生成二维码（返回 state + wechatUrl + mock 标识）
 *   2. GET  /status?state=  查询扫码状态（前端轮询，confirmed 时下发 Cookie）
 *   3. GET  /callback       微信回调（真实模式，微信服务器 redirect 到此）
 *   4. POST /mock-scan      Mock 扫码确认/取消（仅 WECHAT_MOCK=true 时可用）
 *
 * Cookie 下发策略沿用 S-C03：accessToken path=/ + refreshToken path=/api/v1/auth
 */
@ApiTags('认证')
@Controller('auth/wechat')
export class WechatAuthController {
  private readonly logger = new Logger(WechatAuthController.name);

  private readonly systemBaseUrl: string;

  constructor(private readonly wechatAuthService: WechatAuthService) {
    this.systemBaseUrl = process.env.SYSTEM_BASE_URL || 'http://smartsite.top:8080';
  }

  /** 从请求中提取客户端 IP（支持代理转发场景，与 AuthController 一致） */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * S-C03: 设置 HttpOnly + Secure + SameSite=Strict 的认证 Cookie
   *
   * 与 AuthController.setAuthCookies 实现一致（私有方法无法直接复用）
   */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const cookieSecure =
      process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production';
    const cookieBase = {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax' as const, // Lax：允许跨 scheme 顶层导航（HTTPS 回调 → HTTP 系统首页）
    };

    res.cookie('accessToken', accessToken, {
      ...cookieBase,
      maxAge: 15 * 60 * 1000, // 15 分钟
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
      path: '/api/v1/auth',
    });
  }

  /** 1. 生成二维码 */
  @Post('qrcode')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '生成微信扫码登录二维码（Mock/真实双模式）' })
  async generateQrcode(@Req() req: Request) {
    return this.wechatAuthService.generateQrcode({
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * 2. 轮询扫码状态
   *
   * 当 status=confirmed 时，后端在此接口直接 setAuthCookies（一次性），
   * 并返回 user 信息，前端拿到后直接跳转
   */
  @Get('status')
  @Throttle({ default: { ttl: 60000, limit: 120 } }) // 轮询高频（1.5s/次），放宽限流
  @ApiOperation({ summary: '查询扫码状态（前端轮询，confirmed 时下发 Cookie）' })
  async getScanStatus(
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!state) {
      throw new BadRequestException('state is required');
    }

    const statusResp = await this.wechatAuthService.getScanStatus(state);

    // confirmed 时一次性下发 token
    if (statusResp.status === 'confirmed' && statusResp.user) {
      const tokenResult = await this.wechatAuthService.issueTokenForConfirmedScan(state);
      if (tokenResult) {
        this.setAuthCookies(res, tokenResult.accessToken, tokenResult.refreshToken);
        this.logger.log(
          `[扫码登录成功] userId=${tokenResult.user.id} username=${tokenResult.user.username} Cookie已设置`,
        );
        return {
          ...statusResp,
          user: tokenResult.user,
        };
      }
      // state 已被消费（重复轮询），返回 expired 引导重新扫码
      return { ...statusResp, status: 'expired' as const };
    }

    return statusResp;
  }

  /**
   * 3. 微信回调（真实模式）
   *
   * 微信在 iframe 内重定向到此端点 ?code=CODE&state=STATE
   * 只处理登录（code→token→openid→创建用户→state=confirmed），不发 Token 不跳转。
   * Token 下发由前端轮询 /status 接口完成（检测到 confirmed 后 setCookie）。
   */
  @Get('callback')
  @ApiOperation({ summary: '微信扫码授权回调（真实模式）' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException('code and state are required');
    }
    // 处理微信回调（code → access_token → openid → find/create user → state=confirmed）
    await this.wechatAuthService.handleCallback(code, state);

    this.logger.log(
      `[微信回调处理完成] state=${state.slice(0, 16)}... 已标记 confirmed，等待前端轮询下发 Token`,
    );

    // 返回简单页面（iframe 内显示，实际用户看不到）
    // Token 下发由 /status 轮询接口完成，避免 HTTPS→HTTP 跳转被浏览器拦截
    res.send(this.buildCallbackHtml('授权成功，正在登录...', true, ''));
  }

  /** 构建回调结果 HTML 页面 */
  private buildCallbackHtml(message: string, success: boolean, redirectUrl: string): string {
    const redirectJs = redirectUrl
      ? `<script>setTimeout(function(){ window.location.href = '${redirectUrl}'; }, 1500);</script>`
      : '';
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Smart Site - 微信登录</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
  .card { background: white; padding: 40px 60px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
  .icon { font-size: 48px; margin-bottom: 16px; }
  .msg { font-size: 18px; color: #333; margin-bottom: 8px; }
  .hint { font-size: 13px; color: #999; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">${success ? '✓' : '✗'}</div>
  <div class="msg">${message}</div>
  <div class="hint">如未自动跳转，请手动访问系统</div>
</div>
${redirectJs}
</body>
</html>`;
  }

  /**
   * 4. Mock 扫码（仅 Mock 模式可用）
   *
   * 模拟用户用手机扫码确认/取消，便于开发调试
   */
  @Post('mock-scan')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Mock 扫码确认/取消（仅 WECHAT_MOCK=true 时可用）' })
  async mockScan(@Body() dto: WechatMockScanDto) {
    await this.wechatAuthService.handleMockScan(dto.state, dto.action);
    return { message: dto.action === 'confirm' ? '已模拟扫码确认' : '已模拟取消扫码' };
  }
}
