// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UserService } from '../../user/user.service';
import { I18nService } from '@ss-node/ss-i18n';

/**
 * S-C03: JWT 提取器
 *
 * 优先从 HttpOnly Cookie 读取 accessToken（主路径，XSS 安全），
 * 若 Cookie 不存在则回退到 Authorization: Bearer Header（兼容 Swagger 调试和 API 客户端）。
 *
 * 日志：在请求上标注 Token 来源（cookie / bearer / none），供 validate() 使用。
 */
function extractJwtFromRequest(req: Request): string | null {
  // 1. 优先从 HttpOnly Cookie 提取
  if (req.cookies?.accessToken) {
    (req as any)._jwtSource = 'cookie';
    return req.cookies.accessToken as string;
  }

  // 2. 回退到 Authorization Bearer Header（Swagger / API 客户端）
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    (req as any)._jwtSource = 'bearer';
    return authHeader.slice(7);
  }

  (req as any)._jwtSource = 'none';
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private userService: UserService,
    @Inject(I18nService)
    private i18nService: I18nService,
  ) {
    super({
      jwtFromRequest: extractJwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    // payload 由 JWT 解码得到，此时签名已验证通过
    // payload.exp 可能为 undefined（测试 payload 或无过期时间的 token），需防御性处理
    const expStr = payload.exp
      ? new Date(payload.exp * 1000).toISOString()
      : 'N/A';
    this.logger.debug(
      `[JWT验证] Token 有效 | userId="${payload.sub}" username="${payload.username}" role="${payload.role}" | exp=${expStr}`,
    );

    const user = await this.userService.findById(payload.sub);
    if (!user) {
      this.logger.warn(
        `[JWT验证] 用户不存在 | userId="${payload.sub}" username="${payload.username}"`,
      );
      throw new UnauthorizedException(this.i18nService.tSync('auth.login.failed_not_found'));
    }

    return user;
  }
}
