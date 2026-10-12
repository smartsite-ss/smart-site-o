// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    // 标准角色（admin/user/viewer）：按角色 code 检查
    if (requiredRoles.some((role) => user?.role === role)) {
      return true;
    }
    // v7.2: 自建角色（role code 不在标准 UserRole 枚举，如 test）按实际 permissions 兜底。
    // JwtStrategy.validate 已通过 findById 加载 roleEntity，可直接读取 permissions。
    if (user?.role && !Object.values(UserRole).includes(user.role as UserRole)) {
      const permissions: string[] = user?.roleEntity?.permissions || [];
      // admin 级别（*:*）：放行所有
      if (permissions.includes('*:*')) {
        return true;
      }
      // ReadRoles（含 VIEWER）：已授权自建角色（permissions 非空）放行读操作。
      // 写操作（WriteRoles/AdminRoles 不含 VIEWER）仍需 *:* 或改用 @Permissions 细粒度校验。
      if (requiredRoles.includes(UserRole.VIEWER) && permissions.length > 0) {
        return true;
      }
    }
    return false;
  }
}
