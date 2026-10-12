// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * 获取登录功能开关（公开接口，登录前调用）
   *
   * 前端 LoginView 初始化时查询此接口，根据 wechatLoginEnabled 决定是否显示微信扫码 tab。
   * 关闭时后端不注册 WechatAuthModule（app.module.ts 条件注册），前端也不显示入口。
   */
  @Get('features')
  @Public()
  @ApiOperation({ summary: '获取登录功能开关（公开，登录前调用）' })
  getLoginFeatures() {
    return {
      wechatLoginEnabled: process.env.WECHAT_LOGIN_ENABLED === 'true',
      // 为 §2.7 短信验证码登录预留（当前固定 false，短信登录实现后读取 SMS_LOGIN_ENABLED）
      smsLoginEnabled: process.env.SMS_LOGIN_ENABLED === 'true',
    };
  }

  /**
   * 从请求中提取客户端 IP（支持代理转发场景）
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 检查请求中 Cookie 和 Authorization Header 的存在性（用于日志诊断，不泄露值）
   */
  private describeAuthSources(req: Request): string {
    const parts: string[] = [];
    if (req.cookies?.accessToken) parts.push('cookie[accessToken]=yes');
    else parts.push('cookie[accessToken]=no');
    if (req.cookies?.refreshToken) parts.push('cookie[refreshToken]=yes');
    else parts.push('cookie[refreshToken]=no');
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) parts.push('header[Bearer]=yes');
    else parts.push('header[Bearer]=no');
    return parts.join(' | ');
  }

  /**
   * S-C03: 设置 HttpOnly + Secure + SameSite=Strict 的认证 Cookie
   *
   * accessToken Cookie：path=/，所有 API 端点可用
   * refreshToken Cookie：path=/api/v1/auth，仅认证端点可用（缩小攻击面）
   *
   * Secure 标志策略（CODE-10 修复）：
   *   - 生产环境默认 secure=true（要求 HTTPS 部署）
   *   - HTTP 部署（如 http://ip）必须通过环境变量 COOKIE_SECURE=false 显式关闭，
   *     否则浏览器会丢弃 Secure Cookie，导致登录会话无法维持（表象：登录后立即 401、反复重试超时）
   *   - 开发环境默认 secure=false
   */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    // COOKIE_SECURE 显式配置优先；未配置时生产默认 true（HTTPS），开发默认 false
    const cookieSecure =
      process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : isProduction;
    const cookieBase = {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict' as const,
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

    this.logger.debug(
      `[Cookie] 已设置认证 Cookie | accessToken: httpOnly=true secure=${cookieSecure} sameSite=strict maxAge=15min path=/ | refreshToken: httpOnly=true secure=${cookieSecure} sameSite=strict maxAge=7d path=/api/v1/auth`,
    );
  }

  /**
   * S-C03: 清除认证 Cookie
   * clearCookie 需与设置时的 path 一致才能正确清除；secure 标志不影响清除。
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  }

  /**
   * 桌面端（Tauri）检测：页面源为 tauri.localhost，与后端跨站，
   * SameSite=Strict 的 HttpOnly Cookie 无法随跨站 XHR 发送，
   * 因此改为 Bearer Token 模式：token 通过响应体下发，前端存内存走 Authorization 头。
   * Web 端（同源）不受影响，仍使用 Cookie 模式。
   */
  private isTauriClient(req: Request): boolean {
    const origin = req.headers.origin || '';
    return origin.includes('tauri.localhost') || origin.startsWith('tauri://');
  }

  /**
   * 小程序客户端检测：微信小程序请求无 Origin 头，且 UA 含 miniProgram 标识，
   * 无 Cookie 能力，同样改为 Bearer 模式：token 通过响应体下发。
   * 仅在无 Origin 时判断（避免误伤 Web 端；Web 同源请求带 Origin 且有 Cookie）。
   */
  private isWechatMpClient(req: Request): boolean {
    const origin = req.headers.origin || '';
    const userAgent = req.headers['user-agent'] || '';
    return !origin && /miniProgram/i.test(userAgent);
  }

  /** 非浏览器客户端（桌面端/小程序）：Cookie 不可用，Token 走响应体下发 */
  private isBearerTokenClient(req: Request): boolean {
    return this.isTauriClient(req) || this.isWechatMpClient(req);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '用户登录（S-C03: Token 通过 HttpOnly Cookie 下发）' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientIp = this.getClientIp(req);
    this.logger.log(
      `[POST /auth/login] 收到登录请求 | username="${loginDto.username}" ip=${clientIp} userAgent="${req.headers['user-agent']?.slice(0, 50) || 'unknown'}"`,
    );

    const result = await this.authService.login(loginDto, {
      ip: clientIp,
      userAgent: req.headers['user-agent'],
    });

    // 非浏览器客户端（桌面端 Tauri / 小程序）：Cookie 不可用，改为响应体下发 token（Bearer 模式）
    if (this.isBearerTokenClient(req)) {
      this.logger.log(
        `[POST /auth/login] 登录响应（桌面端/小程序 Bearer 模式） | userId="${result.user.id}" username="${result.user.username}" role="${result.user.role}"`,
      );
      return {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    }

    // S-C03: Token 写入 HttpOnly Cookie，响应体仅返回 user 信息
    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    this.logger.log(
      `[POST /auth/login] 登录响应 | userId="${result.user.id}" username="${result.user.username}" role="${result.user.role}" | Cookie已设置 | 响应体仅含user信息`,
    );
    return { user: result.user };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册（S-C03: Token 通过 HttpOnly Cookie 下发）' })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);
    // 非浏览器客户端（桌面端 Tauri / 小程序）：Cookie 不可用，改为响应体下发 token（Bearer 模式）
    if (this.isBearerTokenClient(req)) {
      return {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    }
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新令牌（S-C03: 从 HttpOnly Cookie 读取 refreshToken）' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: RefreshTokenDto,
  ) {
    const clientIp = this.getClientIp(req);
    const authSources = this.describeAuthSources(req);
    this.logger.log(`[POST /auth/refresh] 收到刷新请求 | ip=${clientIp} | ${authSources}`);

    // S-C03: 优先从 Cookie 读取 refreshToken，兼容 body 传参（Swagger 调试 / Bearer 客户端）
    const refreshTokenFromBody = body?.refreshToken;
    const refreshToken = req.cookies?.refreshToken || refreshTokenFromBody;
    if (!refreshToken) {
      this.logger.warn(
        `[POST /auth/refresh] 无 refreshToken | 来源: cookie=${!!req.cookies?.refreshToken} body=${!!refreshTokenFromBody} | ip=${clientIp}`,
      );
      return { message: '无 refresh token' };
    }

    // 标识 refreshToken 来源（Cookie 还是 Body），方便排查 Cookie 传输问题
    const tokenSource = req.cookies?.refreshToken ? 'cookie' : 'body';
    this.logger.debug(`[POST /auth/refresh] refreshToken 来源=${tokenSource} | ip=${clientIp}`);

    const result = await this.authService.refreshToken(refreshToken, {
      ip: clientIp,
      userAgent: req.headers['user-agent'],
    });

    // 非浏览器客户端（桌面端 / 小程序 / H5）：新 token 对通过响应体下发（前端持久化后用于会话恢复）。
    // H5 浏览器请求带 Origin，isTauriClient / isWechatMpClient 均不命中；但 H5 无 Cookie 会话
    // （token 由 login-password 等接口经响应体下发），refresh 时必然通过 body 提交 refreshToken，
    // 因此 body 提供 refreshToken 即视为 Bearer 模式，避免响应体缺 token 对导致前端会话恢复失败。
    if (this.isBearerTokenClient(req) || !!refreshTokenFromBody) {
      this.logger.log(
        `[POST /auth/refresh] 刷新成功（Bearer 模式：桌面端/小程序/H5） | ip=${clientIp}`,
      );
      return {
        message: '令牌已刷新',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    }

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    this.logger.log(`[POST /auth/refresh] 刷新成功 | Cookie已更新 | ip=${clientIp}`);
    return { message: '令牌已刷新' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '退出登录（S-C03: 清除 HttpOnly Cookie）' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: RefreshTokenDto,
  ) {
    const clientIp = this.getClientIp(req);
    this.logger.log(
      `[POST /auth/logout] 收到登出请求 | ip=${clientIp} | ${this.describeAuthSources(req)}`,
    );

    const refreshToken = req.cookies?.refreshToken || body?.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken, {
        ip: clientIp,
        userAgent: req.headers['user-agent'],
      });
    } else {
      this.logger.debug(`[POST /auth/logout] 无 refreshToken，仅清除 Cookie | ip=${clientIp}`);
    }
    this.clearAuthCookies(res);

    this.logger.log(`[POST /auth/logout] 登出完成 | Cookie已清除 | ip=${clientIp}`);
    return { message: '已退出登录' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '修改密码（S-C03: 成功后刷新 Cookie）' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @Req() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientIp = this.getClientIp(req);
    const result = await this.authService.changePassword(req.user.id, changePasswordDto, {
      ip: clientIp,
      userAgent: req.headers['user-agent'],
    });
    // 密码修改后旧 Token 已撤销，需重新生成并下发
    // changePassword 内部已撤销旧 refresh token，这里重新生成
    const { password: _pw, ...userWithoutPw } = req.user;
    const tokens = await this.authService.generateTokensForUser(userWithoutPw);
    // 非浏览器客户端（桌面端 / 小程序）：新 token 对通过响应体下发，否则维持 Cookie 模式
    if (this.isBearerTokenClient(req)) {
      return { ...result, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return result;
  }
}
