// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Post, Body, Req, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { WechatMpAuthService } from './wechat-mp-auth.service';
import { WechatMpLoginDto, WechatMpBindAccountDto, WechatMpPasswordLoginDto } from './dto/wechat-mp-auth.dto';
import { Public } from '../decorators/public.decorator';

/** JWT 鉴权后守卫挂载的用户载荷（JwtStrategy 写入） */
interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; role: string };
}

/**
 * 小程序微信登录 Controller（01-账号与认证）
 *
 * 路由前缀：/auth/wechat（与扫码登录共用前缀，端点无冲突）
 *
 * 端点：
 *   1. POST /login            wx.login code → 已绑定签发双 Token / 未绑定引导账密绑定
 *   2. POST /bind             账密绑定（提交时新取 code）+ 签发双 Token
 *   3. POST /login-password   账密登录（不依赖微信 code，直接用系统账号密码登录）
 *   4. POST /unbind           解绑（需登录，Bearer accessToken）
 *
 * 小程序无 Cookie 能力，Token 一律通过响应体下发（Bearer 模式），
 * 与桌面端 Tauri 的下发策略一致，不走 setAuthCookies。
 */
@ApiTags('认证')
@Controller('auth/wechat')
export class WechatMpAuthController {
  private readonly logger = new Logger(WechatMpAuthController.name);

  constructor(private readonly wechatMpAuthService: WechatMpAuthService) {}

  /** 从请求中提取客户端 IP（支持代理转发场景，与 AuthController 一致） */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /** 1. 小程序微信登录（公开，限流防爆破） */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '小程序微信登录（code2session，未绑定时引导账密绑定）' })
  async login(@Body() dto: WechatMpLoginDto, @Req() req: Request) {
    const result = await this.wechatMpAuthService.login(dto.loginCode, {
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    this.logger.log(
      `[POST /auth/wechat/login] 小程序登录响应 | bindingRequired=${result.bindingRequired} authenticated=${result.tokenPair !== null}`,
    );
    return result;
  }

  /** 2. 账密绑定并登录（公开，限流防密码爆破） */
  @Post('bind')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '小程序账号绑定（微信 openid 绑定系统账号并签发 Token）' })
  async bind(@Body() dto: WechatMpBindAccountDto, @Req() req: Request) {
    return this.wechatMpAuthService.bind(dto.loginCode, dto.username, dto.password, {
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  /** 3. 小程序账密登录（公开，限流防密码爆破） */
  @Post('login-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '小程序账密登录（系统账号密码直接登录，不依赖微信 code）' })
  async loginWithPassword(@Body() dto: WechatMpPasswordLoginDto, @Req() req: Request) {
    const result = await this.wechatMpAuthService.loginWithPassword(dto.username, dto.password, {
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    this.logger.log(
      `[POST /auth/wechat/login-password] 账密登录响应 | userId="${result.userInformation.userId}" username="${result.userInformation.username}"`,
    );
    return result;
  }

  /** 4. 解绑当前登录用户的小程序微信（需登录） */
  @Post('unbind')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '解除小程序微信绑定（需登录）' })
  async unbind(@Req() req: AuthenticatedRequest) {
    return this.wechatMpAuthService.unbind(req.user.id, {
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }
}
