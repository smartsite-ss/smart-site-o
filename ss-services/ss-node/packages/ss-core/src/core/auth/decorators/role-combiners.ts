// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { applyDecorators } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { UserRole } from '../../user/entities/user.entity';

/**
 * 只读角色组合装饰器
 *
 * 等价于 `@Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)`，
 * 适用于 GET 查询类端点。
 *
 * 使用方式：
 * ```typescript
 * @Get()
 * @ReadRoles()
 * async findAll(...) { ... }
 * ```
 */
export function ReadRoles() {
  return applyDecorators(Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER));
}

/**
 * 读写角色组合装饰器
 *
 * 等价于 `@Roles(UserRole.ADMIN, UserRole.USER)`，
 * 适用于 POST/PATCH/DELETE 等修改类端点。
 *
 * 使用方式：
 * ```typescript
 * @Post()
 * @WriteRoles()
 * async create(...) { ... }
 * ```
 */
export function WriteRoles() {
  return applyDecorators(Roles(UserRole.ADMIN, UserRole.USER));
}
