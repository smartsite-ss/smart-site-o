// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

﻿import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@ss-node/ss-core';
import {
  AlarmStatisticsService,
  LevelStatistics,
  DeviceStatistics,
  TimeSeriesPoint,
  TrendAnalysis,
  TopAlarm,
  ResponseTimeStats,
  AlarmSummary,
} from './alarm-statistics.service';

@ApiTags('报警统计')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alarms/statistics')
export class AlarmStatisticsController {
  constructor(private readonly statisticsService: AlarmStatisticsService) {}

  @Get('by-level')
  @ApiOperation({ summary: '按级别统计报警' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目 ID（可选，不传则查询全局）' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 ISO 格式' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 ISO 格式' })
  async getByLevel(
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<LevelStatistics[]> {
    return this.statisticsService.getStatisticsByLevel(projectId, startDate, endDate);
  }

  @Get('by-device/:deviceId')
  @ApiOperation({ summary: '按设备统计报警' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目 ID（可选，不传则查询全局）' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 ISO 格式' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 ISO 格式' })
  async getByDevice(
    @Param('deviceId') deviceId: string,
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<DeviceStatistics> {
    return this.statisticsService.getStatisticsByDevice(deviceId, projectId, startDate, endDate);
  }

  @Get('by-time')
  @ApiOperation({ summary: '按时间统计报警时间序列' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目 ID（可选，不传则查询全局）' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 ISO 格式' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 ISO 格式' })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['hourly', 'daily'],
    description: '时间间隔',
  })
  async getByTime(
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('interval') interval?: 'hourly' | 'daily',
  ): Promise<TimeSeriesPoint[]> {
    return this.statisticsService.getStatisticsByTime(projectId, startDate, endDate, interval);
  }

  @Get('trend')
  @ApiOperation({ summary: '获取报警趋势分析' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目 ID（可选，不传则查询全局）' })
  @ApiQuery({ name: 'startDate', required: true, description: '开始日期 ISO 格式' })
  @ApiQuery({ name: 'endDate', required: true, description: '结束日期 ISO 格式' })
  async getTrend(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('projectId') projectId?: string,
  ): Promise<TrendAnalysis> {
    return this.statisticsService.getTrendAnalysis(startDate, endDate, projectId);
  }

  @Get('top')
  @ApiOperation({ summary: '获取最频繁报警列表' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目 ID（可选，不传则查询全局）' })
  @ApiQuery({ name: 'limit', required: false, description: '返回数量限制' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 ISO 格式' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 ISO 格式' })
  async getTopAlarms(
    @Query('projectId') projectId?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TopAlarm[]> {
    return this.statisticsService.getTopAlarms(
      limit ? parseInt(limit, 10) : 10,
      projectId,
      startDate,
      endDate,
    );
  }

  @Get('response-time')
  @ApiOperation({ summary: '获取响应时间统计' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目 ID（可选，不传则查询全局）' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 ISO 格式' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 ISO 格式' })
  async getResponseTime(
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ResponseTimeStats> {
    return this.statisticsService.getResponseTimeStats(projectId, startDate, endDate);
  }

  @Get('summary/:projectId')
  @ApiOperation({ summary: '获取报警综合汇总' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 ISO 格式' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 ISO 格式' })
  async getSummary(
    @Param('projectId') projectId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AlarmSummary> {
    return this.statisticsService.getAlarmSummary(projectId, startDate, endDate);
  }
}
