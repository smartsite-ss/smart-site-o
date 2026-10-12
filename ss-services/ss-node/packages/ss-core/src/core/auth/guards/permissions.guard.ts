// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, CanActivate, ExecutionContext, Inject, Optional, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Role } from '../../user/entities/role.entity';

/**
 * 权限码守卫
 * 与 @Permissions() 装饰器配合使用
 *
 * 权限码读取优先级（v8.0：DB 为唯一数据源，不再 fallback 硬编码）：
 *  1. 从 DB roles 表读取（user.roleId → role.permissions）
 *  2. DB 不可用时返回空数组（拒绝所有请求，避免静默授权）
 *
 * 用法:
 *   @UseGuards(JwtAuthGuard, PermissionsGuard)
 *   @Permissions('project:create')
 *   async create() { ... }
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    @Optional()
    @Inject(getRepositoryToken(Role))
    private roleRepository?: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const userPermissions = await this.getUserPermissions(user);
    // admin 拥有所有权限
    if (userPermissions.includes('*:*')) return true;

    return required.some((code) => userPermissions.includes(code));
  }

  /**
   * 获取用户权限码列表（v8.0：DB 为唯一数据源）
   * DB 不可用时返回空数组，拒绝所有请求，避免硬编码 fallback 导致静默授权。
   */
  private async getUserPermissions(user: any): Promise<string[]> {
    if (user.roleId && this.roleRepository) {
      try {
        const role = await this.roleRepository.findOne({ where: { id: user.roleId } });
        if (role && role.permissions && role.permissions.length > 0) {
          return role.permissions;
        }
      } catch (error: any) {
        this.logger.warn(`Failed to load permissions for user ${user.username || user.id}: ${error.message}`);
      }
    }
    // v8.0：不再 fallback 到硬编码，DB 不可用时拒绝所有请求
    if (!user.roleId) {
      this.logger.warn(`User ${user.username || user.id} has no roleId, denying all permissions`);
    }
    return [];
  }
}
