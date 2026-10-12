// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ExtractJwt } from 'passport-jwt';
import { UserRole } from '../../user/entities/user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// ⚠️  debug-mock-token 仅非生产环境下生效：
//     前端 VITE_DEBUG_SKIP_AUTH（.env.development） → 注入 debug-mock-token
//     后端 isDevMode() → NODE_ENV !== 'production' 才识别
//     若生产构建时前端误启用了 VITE_DEBUG_SKIP_AUTH=true，前端会跳过登录
//     但后端 isDevMode()=false → 走真实 JWT 校验 → 401 Unauthorized → 获取不到任何数据
//     详见: ss-editor/apps/web/.env.full 及 package.json 构建脚本注释
const DEBUG_TOKEN = 'debug-mock-token';

const MOCK_DEBUG_USER = {
  id: 'debug-user',
  username: 'debug',
  email: 'debug@local.dev',
  displayName: 'Debug User',
  role: UserRole.ADMIN,
  isActive: true,
};

function isDevMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Public() 装饰器标记的路由跳过 JWT 鉴权
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    if (!isDevMode()) {
      return super.canActivate(context) as Promise<boolean>;
    }

    const request = context.switchToHttp().getRequest();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (token === DEBUG_TOKEN) {
      request.user = MOCK_DEBUG_USER;
      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }

  /**
   * 重写 handleRequest：将 TokenExpiredError 等 passport 异常转为 401
   * 确保前端 401 拦截器能正确触发 token 自动刷新
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    _info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (err || !user) {
      if (err) {
        // TokenExpiredError / JsonWebTokenError / NotBeforeError 等
        throw new UnauthorizedException(err.message || 'Token 验证失败');
      }
      throw new UnauthorizedException('未登录或登录已过期');
    }
    return user;
  }
}
