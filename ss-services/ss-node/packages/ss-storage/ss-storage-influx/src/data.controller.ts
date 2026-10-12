// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Param, Query, UseGuards, Post, Body, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { DataService } from './data.service';
import { DataQueryService, AggregationType, InterpolationType } from './data-query.service';
import { JwtAuthGuard } from '@ss-node/ss-core';

@ApiTags('数据查询')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('data')
export class DataController {
  constructor(
    private readonly dataService: DataService,
    private readonly dataQueryService: DataQueryService,
  ) {}

  @Get('historical/:tagId')
  @ApiOperation({ summary: '查询历史数据 (带分页)' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'projectId', required: false, description: '项目ID（isolated模式必须）' })
  getHistoricalData(
    @Param('tagId') tagId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.dataQueryService.queryTimeRange({
      tagId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      projectId,
    });
  }

  @Get('latest/:tagId')
  @ApiOperation({ summary: '获取最新一条数据' })
  getLatestData(@Param('tagId') tagId: string) {
    return this.dataService.getLatestData(tagId);
  }

  @Get('aggregate/:tagId')
  @ApiOperation({ summary: '聚合查询 (avg/max/min/sum/count)' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  @ApiQuery({ name: 'type', required: true, enum: ['avg', 'max', 'min', 'sum', 'count'] })
  getAggregate(
    @Param('tagId') tagId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('type') type: string,
  ) {
    const aggType = type as AggregationType;
    if (!Object.values(AggregationType).includes(aggType)) {
      throw new Error(`Invalid aggregation type: ${type}`);
    }
    return this.dataQueryService.aggregate(tagId, new Date(startTime), new Date(endTime), aggType);
  }

  @Get('aggregate/:tagId/window')
  @ApiOperation({ summary: '时间窗口聚合 (按时间间隔分组)' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  @ApiQuery({ name: 'type', required: true })
  @ApiQuery({ name: 'windowMs', required: true, description: '窗口大小(毫秒), e.g. 60000=1分钟' })
  getAggregateWindow(
    @Param('tagId') tagId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('type') type: string,
    @Query('windowMs') windowMs: string,
  ) {
    const aggType = type as AggregationType;
    return this.dataQueryService.aggregateWindow(
      tagId,
      new Date(startTime),
      new Date(endTime),
      parseInt(windowMs, 10),
      aggType,
    );
  }

  @Post('batch/latest')
  @ApiOperation({ summary: '批量查询多个标签的最新值' })
  batchQueryLatest(@Body() body: { tagIds: string[]; projectId?: string }) {
    return this.dataQueryService.batchQueryLatest(body.tagIds, body.projectId);
  }

  @Post('batch/historical')
  @ApiOperation({ summary: '批量查询多个标签的历史数据' })
  batchQueryHistorical(
    @Body() body: { tagIds: string[]; startTime: string; endTime: string; projectId?: string },
  ) {
    return this.dataQueryService.batchQueryTimeRange(
      body.tagIds,
      new Date(body.startTime),
      new Date(body.endTime),
      body.projectId,
    );
  }

  @Get('stats/:tagId')
  @ApiOperation({ summary: '获取标签统计概览 (avg/max/min/sum/count)' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  @ApiQuery({ name: 'projectId', required: false })
  getTagStats(
    @Param('tagId') tagId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.dataQueryService.getTagStats(
      tagId,
      new Date(startTime),
      new Date(endTime),
      projectId,
    );
  }

  // ──────────── 趋势图专用接口 ────────────

  @Post('trend/query')
  @ApiOperation({ summary: '趋势图批量查询（带 LTTB 降采样 + 插值 + 可选窗口聚合）' })
  async trendQuery(
    @Body()
    body: {
      tagIds: string[];
      startTime: string;
      endTime: string;
      maxPoints?: number;
      projectId?: string;
      /** 插值方式：raw（原始值，默认）| linear（线性插值）| step（阶梯插值） */
      interpolation?: string;
      /** 插值间隔（毫秒），linear/step 模式生效，默认 1000 */
      interval?: number;
      /** 窗口聚合参数（三期增强）：携带时跳过插值与降采样，逐标签按窗口聚合 */
      aggregation?: { type: string; windowMs: number };
    },
  ) {
    let aggregation: { type: AggregationType; windowMs: number } | undefined;
    if (body.aggregation) {
      const aggregationType = body.aggregation.type as AggregationType;
      if (!Object.values(AggregationType).includes(aggregationType)) {
        throw new BadRequestException(`Invalid aggregation type: ${body.aggregation.type}`);
      }
      if (!Number.isFinite(body.aggregation.windowMs) || body.aggregation.windowMs <= 0) {
        throw new BadRequestException(`Invalid aggregation windowMs: ${body.aggregation.windowMs}`);
      }
      aggregation = { type: aggregationType, windowMs: Math.floor(body.aggregation.windowMs) };
    }

    return await this.dataQueryService.queryTrendData({
      tagIds: body.tagIds,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      maxPoints: body.maxPoints ?? 1000,
      projectId: body.projectId,
      interpolation: body.interpolation as InterpolationType | undefined,
      interval: body.interval,
      aggregation,
    });
  }

  // ──────────── 数据导出接口 ────────────

  @Get('export/:tagId/csv')
  @ApiOperation({ summary: '导出标签历史数据为 CSV 文件' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  async exportCsv(
    @Param('tagId') tagId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Res() res: Response,
  ) {
    const { csv, filename } = await this.dataQueryService.exportCsv(
      tagId,
      new Date(startTime),
      new Date(endTime),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(csv);
  }

  @Get('export/:tagId/json')
  @ApiOperation({ summary: '导出标签历史数据为 JSON 文件' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  async exportJson(
    @Param('tagId') tagId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Res() res: Response,
  ) {
    const { json, filename } = await this.dataQueryService.exportJson(
      tagId,
      new Date(startTime),
      new Date(endTime),
    );
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(json);
  }

  @Post('export/batch/json')
  @ApiOperation({ summary: '批量导出多个标签历史数据为 JSON 文件' })
  async exportBatchJson(
    @Body() body: { tagIds: string[]; startTime: string; endTime: string; projectId?: string },
    @Res() res: Response,
  ) {
    const { json, filename } = await this.dataQueryService.exportBatchJson(
      body.tagIds,
      new Date(body.startTime),
      new Date(body.endTime),
      body.projectId,
    );
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(json);
  }
}
