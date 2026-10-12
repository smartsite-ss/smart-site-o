// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ResourceMonitorService } from './resource-monitor.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';

@ApiTags('资源监控')
@Controller('system/monitor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ResourceMonitorController {
  constructor(private readonly monitorService: ResourceMonitorService) {}

  @Get('latest')
  @ApiOperation({ summary: '获取最新资源快照' })
  async getLatest() {
    return this.monitorService.getLatest();
  }

  @Get('history')
  @ApiOperation({ summary: '获取历史监控数据' })
  @ApiQuery({ name: 'hours', required: false })
  async getHistory(@Query('hours') hours: string) {
    return this.monitorService.getHistory(parseInt(hours, 10) || 24);
  }
}
