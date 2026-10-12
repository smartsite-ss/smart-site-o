// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  UseGuards,
  Request,
  Body,
  Query,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AlarmService } from './alarm.service';
import { AlarmEscalationService } from './alarm-escalation.service';
import { AlarmSuppressionService } from './alarm-suppression.service';
import { AlarmNotificationService } from './alarm-notification.service';
import { AlarmStatisticsService } from './alarm-statistics.service';
import { JwtAuthGuard, EventBusService } from '@ss-node/ss-core';

@ApiTags('报警管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/alarms')
export class AlarmController {
  constructor(
    private readonly alarmService: AlarmService,
    private readonly escalationService: AlarmEscalationService,
    private readonly suppressionService: AlarmSuppressionService,
    private readonly notificationService: AlarmNotificationService,
    private readonly statisticsService: AlarmStatisticsService,
    @Optional() private readonly eventBus?: EventBusService,
  ) {}

  // ──────────── 报警规则 CRUD ────────────

  @Get('rules')
  @ApiOperation({ summary: '获取所有报警规则' })
  getAlarmRules(@Param('projectId') projectId: string) {
    return this.alarmService.findAllRules(projectId);
  }

  @Post('rules')
  @ApiOperation({ summary: '创建报警规则' })
  createAlarmRule(@Param('projectId') projectId: string, @Body() data: any) {
    return this.alarmService.createRule(projectId, data);
  }

  @Get('rules/:alarmRuleId')
  @ApiOperation({ summary: '获取报警规则详情' })
  getAlarmRule(@Param('projectId') projectId: string, @Param('alarmRuleId') alarmRuleId: string) {
    return this.alarmService.findOneRule(alarmRuleId, projectId);
  }

  @Put('rules/:alarmRuleId')
  @ApiOperation({ summary: '更新报警规则' })
  updateAlarmRule(
    @Param('projectId') projectId: string,
    @Param('alarmRuleId') alarmRuleId: string,
    @Body() data: any,
  ) {
    return this.alarmService.updateRule(alarmRuleId, projectId, data);
  }

  @Delete('rules/:alarmRuleId')
  @ApiOperation({ summary: '删除报警规则（级联清除活跃报警）' })
  async deleteAlarmRule(
    @Param('projectId') projectId: string,
    @Param('alarmRuleId') alarmRuleId: string,
  ) {
    await this.alarmService.deleteRule(alarmRuleId, projectId);
    return { ok: true };
  }

  @Patch('rules/:alarmRuleId/enable')
  @ApiOperation({ summary: '启用报警规则' })
  enableAlarmRule(
    @Param('projectId') projectId: string,
    @Param('alarmRuleId') alarmRuleId: string,
  ) {
    return this.alarmService.enableRule(alarmRuleId, projectId);
  }

  @Patch('rules/:alarmRuleId/disable')
  @ApiOperation({ summary: '禁用报警规则（自动清除活跃报警）' })
  disableAlarmRule(
    @Param('projectId') projectId: string,
    @Param('alarmRuleId') alarmRuleId: string,
  ) {
    return this.alarmService.disableRule(alarmRuleId, projectId);
  }

  // ──────────── 事件记录 ────────────

  @Get('records')
  @ApiOperation({ summary: '获取事件记录（支持筛选）' })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'alarmType', required: false })
  @ApiQuery({ name: 'dispositionType', required: false })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'true=仅实时告警 / false=仅历史告警',
  })
  @ApiQuery({ name: 'limit', required: false })
  getAlarmRecords(
    @Param('projectId') projectId: string,
    @Query('level') level?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('alarmType') alarmType?: string,
    @Query('dispositionType') dispositionType?: string,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alarmService.getRecords(projectId, limit ? parseInt(limit, 10) : undefined, {
      level,
      status,
      keyword,
      startDate,
      endDate,
      alarmType,
      dispositionType,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Post('records/batch-acknowledge')
  @ApiOperation({
    summary:
      '批量确认报警（携带 requestId 时启用幂等并返回部分失败结构 {succeeded, failed}；不携带时保持旧行为返回数量）',
  })
  async batchAcknowledge(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body('ids') ids: string[],
    @Body('requestId') requestId?: string,
  ) {
    // 小程序二期（07 #10）：携带 requestId 走幂等 + 部分失败结构；
    // Web 端（ss-editor）不传 requestId，保持返回数量的旧契约。
    if (requestId) {
      const result = await this.alarmService.batchAcknowledgeIdempotent(
        ids,
        req.user.id,
        projectId,
        requestId,
      );
      if (this.eventBus) {
        for (const alarmRecordId of result.succeeded) {
          this.eventBus.emit('alarm_acknowledged', {
            alarmId: alarmRecordId,
            projectId,
            acknowledgedBy: req.user.id,
            timestamp: Date.now(),
          });
        }
      }
      return result;
    }

    const count = await this.alarmService.batchAcknowledge(ids, req.user.id, projectId);
    if (this.eventBus && ids?.length) {
      for (const id of ids) {
        this.eventBus.emit('alarm_acknowledged', {
          alarmId: id,
          projectId,
          acknowledgedBy: req.user.id,
          timestamp: Date.now(),
        });
      }
    }
    return count;
  }

  @Post('records/batch-clear')
  @ApiOperation({ summary: '批量清除报警' })
  async batchClear(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body('ids') ids: string[],
  ) {
    const count = await this.alarmService.batchClear(ids, req.user.id, projectId);
    if (this.eventBus && ids?.length) {
      for (const id of ids) {
        this.eventBus.emit('alarm.cleared', {
          alarmId: id,
          projectId,
          clearedBy: req.user.id,
          timestamp: Date.now(),
        });
      }
    }
    return count;
  }

  @Post('records/:alarmRuleId/acknowledge')
  @ApiOperation({ summary: '确认报警' })
  async acknowledgeAlarm(
    @Param('projectId') projectId: string,
    @Param('alarmRuleId') alarmRuleId: string,
    @Request() req,
  ) {
    const result = await this.alarmService.acknowledgeAlarm(alarmRuleId, req.user.id, projectId);
    this.eventBus?.emit('alarm_acknowledged', {
      alarmId: alarmRuleId,
      projectId,
      acknowledgedBy: req.user.id,
      timestamp: Date.now(),
    });
    return result;
  }

  @Post('records/:alarmRuleId/clear')
  @ApiOperation({ summary: '清除报警' })
  async clearAlarm(
    @Param('projectId') projectId: string,
    @Param('alarmRuleId') alarmRuleId: string,
    @Request() req,
  ) {
    const result = await this.alarmService.clearAlarm(alarmRuleId, req.user.id, projectId);
    this.eventBus?.emit('alarm.cleared', {
      alarmId: alarmRuleId,
      projectId,
      clearedBy: req.user.id,
      timestamp: Date.now(),
    });
    return result;
  }

  @Post('records/:alarmRuleId/shelve')
  @ApiOperation({ summary: '暂缓报警' })
  shelveAlarm(
    @Param('projectId') projectId: string,
    @Param('alarmRuleId') alarmRuleId: string,
    @Request() req,
    @Body('reason') reason: string,
    @Body('durationMs') durationMs?: number,
  ) {
    return this.alarmService.shelveAlarm(
      alarmRuleId,
      req.user.id,
      reason || '',
      projectId,
      durationMs,
    );
  }

  // ──────────── 报警升级 ────────────

  @Post('escalate')
  @ApiOperation({ summary: '执行报警升级检查' })
  triggerEscalation() {
    return this.escalationService.checkAndEscalate();
  }

  @Get('escalation-rules')
  @ApiOperation({ summary: '获取升级规则' })
  getEscalationRules() {
    return this.escalationService.getRules();
  }

  // ──────────── 报警抑制 ────────────

  @Get('suppression-rules')
  @ApiOperation({ summary: '获取抑制规则' })
  getSuppressionRules() {
    return this.suppressionService.getRules();
  }

  @Post('suppression-rules')
  @ApiOperation({ summary: '添加抑制规则' })
  addSuppressionRule(@Body() rule: any) {
    this.suppressionService.addRule(rule);
    return { ok: true };
  }

  // ──────────── 报警统计 ────────────

  @Get('statistics')
  @ApiOperation({ summary: '获取报警统计数据' })
  getStatistics(@Param('projectId') projectId: string) {
    return this.statisticsService.getStatistics(projectId);
  }

  @Get('trends')
  @ApiOperation({ summary: '获取报警趋势' })
  @ApiQuery({ name: 'days', required: false })
  getTrends(@Param('projectId') projectId: string, @Query('days') days?: string) {
    return this.statisticsService.getTrends(projectId, days ? parseInt(days, 10) : 7);
  }

  @Get('top-rules')
  @ApiOperation({ summary: '获取触发最多的报警规则' })
  getTopRules(@Param('projectId') projectId: string) {
    return this.statisticsService.getTopRules(projectId);
  }

  @Get('stats-by-device')
  @ApiOperation({ summary: '按设备统计报警数量' })
  getStatsByDevice(@Param('projectId') projectId: string) {
    return this.statisticsService.getStatisticsByDevice(projectId);
  }

  @Get('stats-by-tag')
  @ApiOperation({ summary: '按变量统计报警数量' })
  getStatsByTag(@Param('projectId') projectId: string) {
    return this.statisticsService.getStatisticsByTag(projectId);
  }

  @Get('export')
  @ApiOperation({ summary: '导出报警报表' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] })
  exportReport(@Param('projectId') projectId: string, @Query('format') format?: string) {
    return this.statisticsService.exportReport(projectId, (format as 'csv' | 'json') || 'json');
  }
}
