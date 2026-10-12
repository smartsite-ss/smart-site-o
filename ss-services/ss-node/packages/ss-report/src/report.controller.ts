// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '@ss-node/ss-core';
import { ReportType } from './report.entity';
import {
  GenerateDailyReportDto,
  GenerateMonthlyReportDto,
  GenerateCustomReportDto,
  ExportReportDto,
  AlarmReportDto,
  TrendReportDto,
  ReportQueryDto,
  SaveReportConfigDto,
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  ReportTemplateQueryDto,
  CreateScheduleDto,
} from './report.dto';

@ApiTags('报表管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ==================== 日报 ====================

  @Post('daily')
  @ApiOperation({ summary: '生成日报' })
  generateDaily(@Param('projectId') projectId: string, @Body() dto: GenerateDailyReportDto) {
    return this.reportService.generateDailyReport(projectId, dto.date);
  }

  // ==================== 月报 ====================

  @Post('monthly')
  @ApiOperation({ summary: '生成月报' })
  generateMonthly(@Param('projectId') projectId: string, @Body() dto: GenerateMonthlyReportDto) {
    return this.reportService.generateMonthlyReport(projectId, dto.month);
  }

  // ==================== 自定义报表 ====================

  @Post('custom')
  @ApiOperation({ summary: '生成自定义报表' })
  generateCustom(@Param('projectId') projectId: string, @Body() dto: GenerateCustomReportDto) {
    return this.reportService.generateCustomReport(projectId, dto);
  }

  // ==================== 报表导出 ====================

  @Post(':reportId/export')
  @ApiOperation({ summary: '导出报表' })
  exportReport(@Param('reportId') reportId: string, @Body() dto: ExportReportDto) {
    return this.reportService.exportReport(reportId, dto.format);
  }

  @Get(':reportId/download')
  @ApiOperation({ summary: '下载报表导出文件（query：fileName）' })
  downloadExportFile(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @Query('fileName') fileName: string,
    @Res() response: Response,
  ): void {
    if (!fileName) {
      throw new BadRequestException('Missing fileName query');
    }
    const filePath = this.reportService.getExportFileAbsolute(projectId, reportId, fileName);
    response.sendFile(filePath);
  }

  // ==================== 告警报表 ====================

  @Post('alarm')
  @ApiOperation({ summary: '生成告警报表' })
  generateAlarmReport(@Param('projectId') projectId: string, @Body() dto: AlarmReportDto) {
    return this.reportService.generateAlarmReport(projectId, dto);
  }

  // ==================== 趋势报表 ====================

  @Post('trend')
  @ApiOperation({ summary: '生成趋势报表' })
  generateTrendReport(@Param('projectId') projectId: string, @Body() dto: TrendReportDto) {
    return this.reportService.generateTrendReport(projectId, dto);
  }

  // ==================== 查询报表 ====================

  @Get()
  @ApiOperation({ summary: '查询报表列表' })
  @ApiQuery({ name: 'type', required: false, enum: ReportType })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  queryReports(@Param('projectId') projectId: string, @Query() query: ReportQueryDto) {
    return this.reportService.queryReports(projectId, query);
  }

  // ==================== 报表配置 ====================

  @Post('configs')
  @ApiOperation({ summary: '保存报表配置' })
  saveReportConfig(@Param('projectId') projectId: string, @Body() dto: SaveReportConfigDto) {
    return this.reportService.saveReportConfig(projectId, dto);
  }

  @Get('configs')
  @ApiOperation({ summary: '获取报表配置列表' })
  getReportConfigs(@Param('projectId') projectId: string) {
    return this.reportService.getReportConfigs(projectId);
  }

  @Delete('configs/:configId')
  @ApiOperation({ summary: '删除报表配置' })
  deleteReportConfig(@Param('projectId') projectId: string, @Param('configId') configId: string) {
    return this.reportService.deleteReportConfig(projectId, configId);
  }

  // ==================== 报表模板 ====================

  @Post('templates')
  @ApiOperation({ summary: '创建报表模板' })
  createTemplate(@Param('projectId') projectId: string, @Body() dto: CreateReportTemplateDto) {
    return this.reportService.createTemplate(projectId, dto);
  }

  @Get('templates')
  @ApiOperation({ summary: '查询报表模板列表' })
  @ApiQuery({ name: 'type', required: false, enum: ReportType })
  getTemplates(@Param('projectId') projectId: string, @Query() query: ReportTemplateQueryDto) {
    return this.reportService.getTemplates(projectId, query);
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: '获取报表模板详情' })
  getTemplate(@Param('projectId') projectId: string, @Param('templateId') templateId: string) {
    return this.reportService.getTemplate(projectId, templateId);
  }

  @Put('templates/:templateId')
  @ApiOperation({ summary: '更新报表模板' })
  updateTemplate(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateReportTemplateDto,
  ) {
    return this.reportService.updateTemplate(projectId, templateId, dto);
  }

  @Delete('templates/:templateId')
  @ApiOperation({ summary: '删除报表模板' })
  deleteTemplate(@Param('projectId') projectId: string, @Param('templateId') templateId: string) {
    return this.reportService.deleteTemplate(projectId, templateId);
  }

  // ==================== 定时导出 ====================

  @Post('schedules')
  @ApiOperation({ summary: '注册定时导出任务' })
  scheduleReportExport(@Param('projectId') projectId: string, @Body() dto: CreateScheduleDto) {
    return this.reportService.scheduleReportExport(projectId, dto);
  }

  @Get('schedules')
  @ApiOperation({ summary: '查询定时导出任务列表' })
  getScheduledExports(@Param('projectId') projectId: string) {
    return this.reportService.getScheduledExports(projectId);
  }

  @Delete('schedules/:scheduleId')
  @ApiOperation({ summary: '取消定时导出任务' })
  unscheduleReportExport(@Param('scheduleId') scheduleId: string) {
    return this.reportService.unscheduleReportExport(scheduleId);
  }
}
