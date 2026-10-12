// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';
import { TimerConfigService, TimerEntry } from './timer-config.service';

@ApiTags('定时任务配置')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('system/timer-configs')
export class TimerConfigController {
  constructor(private readonly timerConfigService: TimerConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取所有定时任务配置' })
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  findAll(): TimerEntry[] {
    return this.timerConfigService.getAll();
  }

  @Get(':timerId')
  @ApiOperation({ summary: '获取单个定时任务配置' })
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  findOne(@Param('timerId') timerId: string): TimerEntry {
    const entry = this.timerConfigService.getById(timerId);
    if (!entry) {
      throw new Error(`Timer "${timerId}" not found`);
    }
    return entry;
  }

  @Put(':timerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新定时任务间隔（持久化到数据库，重启后仍生效）' })
  async updateInterval(
    @Param('timerId') timerId: string,
    @Body() body: { interval: number },
  ): Promise<TimerEntry> {
    return this.timerConfigService.updateInterval(timerId, body.interval);
  }

  @Post(':timerId/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置定时任务为默认值' })
  async resetInterval(@Param('timerId') timerId: string): Promise<TimerEntry> {
    return this.timerConfigService.resetInterval(timerId);
  }
}
