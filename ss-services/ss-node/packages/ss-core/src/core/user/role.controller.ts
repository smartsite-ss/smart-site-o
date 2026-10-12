// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { RoleService, CreateRoleDto, UpdateRoleDto } from './role.service';
import {
  AuthorizationService,
  ProjectAuthDto,
  DeviceAuthDto,
} from './authorization.service';
import { PermissionAuditService, AuditLogQueryDto } from './permission-audit.service';

@ApiTags('角色管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly authService: AuthorizationService,
    private readonly auditService: PermissionAuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取角色列表' })
  async findAll() {
    return this.roleService.findAll();
  }

  // ──────── 权限审计日志（必须在 :id 路由之前） ────────

  @Get('audit-logs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '查询权限审计日志（管理员）' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数' })
  @ApiQuery({ name: 'operatorId', required: false, description: '操作人 ID' })
  @ApiQuery({ name: 'action', required: false, description: '操作类型' })
  @ApiQuery({ name: 'targetType', required: false, description: '目标类型' })
  @ApiQuery({ name: 'targetId', required: false, description: '目标 ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('operatorId') operatorId?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const query: AuditLogQueryDto = {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      operatorId,
      action,
      targetType,
      targetId,
      startDate,
      endDate,
    };
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取角色详情' })
  async findById(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建角色（管理员）' })
  async create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新角色（管理员）' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除角色（管理员）' })
  async delete(@Param('id') id: string) {
    await this.roleService.delete(id);
    return { ok: true };
  }

  // ──────── 项目授权 ────────

  @Get(':id/project-auths')
  @ApiOperation({ summary: '获取角色项目授权' })
  async getProjectAuths(@Param('id') id: string) {
    return this.authService.getProjectAuths(id);
  }

  @Put(':id/project-auths')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '设置角色项目授权（管理员）' })
  async setProjectAuths(@Param('id') id: string, @Body() auths: ProjectAuthDto[]) {
    await this.authService.setProjectAuths(id, auths);
    return { ok: true };
  }

  // ──────── 设备授权 ────────

  @Get(':id/device-auths')
  @ApiOperation({ summary: '获取角色在项目下的设备授权' })
  @ApiQuery({ name: 'projectId', required: true, description: '项目 ID' })
  async getDeviceAuths(@Param('id') id: string, @Query('projectId') projectId: string) {
    return this.authService.getDeviceAuths(id, projectId);
  }

  @Put(':id/device-auths')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '设置角色设备授权（管理员）' })
  @ApiQuery({ name: 'projectId', required: true, description: '项目 ID' })
  async setDeviceAuths(
    @Param('id') id: string,
    @Query('projectId') projectId: string,
    @Body() auths: DeviceAuthDto[],
  ) {
    await this.authService.setDeviceAuths(id, projectId, auths);
    return { ok: true };
  }

  // ──────── 设备分组 ID 推导（v8.0：从设备授权推导，废弃独立分组授权表） ────────

  @Get(':id/device-group-ids')
  @ApiOperation({ summary: '获取角色在项目下可见的设备分组 ID（从设备授权推导）' })
  @ApiQuery({ name: 'projectId', required: true, description: '项目 ID' })
  async getDeviceGroupIds(@Param('id') id: string, @Query('projectId') projectId: string) {
    return this.authService.getAccessibleDeviceGroupIds(id, projectId);
  }
}
