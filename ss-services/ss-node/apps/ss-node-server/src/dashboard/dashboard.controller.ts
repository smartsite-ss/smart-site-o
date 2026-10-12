// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 首页仪表盘聚合接口（02 模块）
 *
 * GET /projects/:projectId/dashboard/summary
 * 返回设备五态统计 + 当日报警分级计数 + 活跃未确认报警数（服务端 30s 缓存）
 */
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';
import { DashboardService, DashboardSummary } from './dashboard.service';

@ApiTags('仪表盘')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取仪表盘聚合摘要（30s 服务端缓存）' })
  @ApiQuery({ name: 'refresh', required: false, description: 'true 时绕过缓存重新聚合' })
  getSummary(
    @Param('projectId') projectId: string,
    @Query('refresh') refresh?: string,
    @Req() req?: any,
  ): Promise<DashboardSummary> {
    return this.dashboardService.getSummary(projectId, refresh === 'true', req?.user?.roleId);
  }
}
