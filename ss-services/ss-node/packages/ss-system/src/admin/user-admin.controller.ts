// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserAdminService, UserQuery } from './user-admin.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';

@ApiTags('用户管理')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class UserAdminController {
  constructor(private readonly userAdminService: UserAdminService) {}

  @Get()
  @ApiOperation({ summary: '全量用户列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async listUsers(@Query() query: UserQuery) {
    return this.userAdminService.listUsers(query);
  }

  @Get(':userId')
  @ApiOperation({ summary: '用户详情' })
  async getUserDetail(@Param('userId') userId: string) {
    return this.userAdminService.getUserDetail(userId);
  }

  @Patch(':userId/status')
  @ApiOperation({ summary: '启用/禁用用户' })
  async toggleStatus(@Param('userId') userId: string, @Body() body: { isActive: boolean }) {
    return this.userAdminService.toggleUserStatus(userId, body.isActive);
  }

  @Patch(':userId/role')
  @ApiOperation({ summary: '修改用户角色' })
  async updateRole(@Param('userId') userId: string, @Body() body: { role: UserRole }) {
    return this.userAdminService.updateUserRole(userId, body.role);
  }

  @Patch(':userId/reset-password')
  @ApiOperation({ summary: '重置用户密码' })
  async resetPassword(@Param('userId') userId: string) {
    return this.userAdminService.resetPassword(userId);
  }

  @Delete(':userId')
  @ApiOperation({ summary: '删除用户' })
  async deleteUser(@Param('userId') userId: string) {
    await this.userAdminService.deleteUser(userId);
    return { ok: true };
  }
}
