// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ScriptService } from './script.service';
import { ScriptValidatorService } from './script-validator.service';
import { ScriptMetricsService } from './script-metrics.service';
import { ScriptAuditService } from './script-audit.service';
import { ScriptTemplateService } from './script-template.service';
import { ExecutionQueueService } from './execution-queue.service';
import {
  CreateScriptDto,
  UpdateScriptDto,
  ExecuteScriptDto,
  ValidateScriptDto,
} from './dto/script.dto';
import {
  CreateScriptTemplateDto,
  UpdateScriptTemplateDto,
  InstantiateTemplateDto,
} from './dto/script-template.dto';
import { JwtAuthGuard, RolesGuard, Roles, UserRole, ReadRoles, WriteRoles } from '@ss-node/ss-core';

@ApiTags('脚本引擎')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/scripts')
export class ScriptController {
  constructor(
    private readonly scriptService: ScriptService,
    private readonly validatorService: ScriptValidatorService,
    private readonly metricsService: ScriptMetricsService,
    private readonly auditService: ScriptAuditService,
    private readonly templateService: ScriptTemplateService,
    private readonly queueService: ExecutionQueueService,
  ) {}

  @Post()
  @WriteRoles()
  @ApiOperation({ summary: '创建脚本' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateScriptDto) {
    return this.scriptService.create({ ...dto, projectId });
  }

  @Get()
  @ReadRoles()
  @ApiOperation({ summary: '获取所有脚本' })
  findAll(@Param('projectId') projectId: string) {
    return this.scriptService.findAll(projectId);
  }

  // ==================== 脚本模板 ====================
  // 注意: 模板路由必须放在 :scriptId 路由之前，避免 "templates" 被匹配为 scriptId 参数

  @Get('templates')
  @ReadRoles()
  @ApiOperation({ summary: '获取脚本模板列表' })
  listTemplates(@Query('category') category?: string, @Query('keyword') keyword?: string) {
    return this.templateService.listTemplates({ category, keyword });
  }

  @Get('templates/:scriptId')
  @ReadRoles()
  @ApiOperation({ summary: '获取脚本模板详情' })
  getTemplate(@Param('scriptId') scriptId: string) {
    return this.templateService.getTemplate(scriptId);
  }

  @Post('templates')
  @WriteRoles()
  @ApiOperation({ summary: '创建脚本模板' })
  createTemplate(@Body() dto: CreateScriptTemplateDto) {
    return this.templateService.createTemplate(dto);
  }

  @Patch('templates/:scriptId')
  @WriteRoles()
  @ApiOperation({ summary: '更新脚本模板' })
  updateTemplate(@Param('scriptId') scriptId: string, @Body() dto: UpdateScriptTemplateDto) {
    return this.templateService.updateTemplate(scriptId, dto);
  }

  @Delete('templates/:scriptId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除脚本模板' })
  deleteTemplate(@Param('scriptId') scriptId: string) {
    return this.templateService.deleteTemplate(scriptId);
  }

  @Post('templates/:scriptId/instantiate')
  @WriteRoles()
  @ApiOperation({ summary: '从模板创建脚本' })
  instantiateTemplate(
    @Param('projectId') projectId: string,
    @Param('scriptId') scriptId: string,
    @Body() dto: InstantiateTemplateDto,
  ) {
    return this.templateService.instantiateTemplate(scriptId, dto.name, projectId);
  }

  @Get(':scriptId')
  @ReadRoles()
  @ApiOperation({ summary: '获取单个脚本' })
  findOne(@Param('projectId') projectId: string, @Param('scriptId') scriptId: string) {
    return this.scriptService.findOne(scriptId, projectId);
  }

  @Patch(':scriptId')
  @WriteRoles()
  @ApiOperation({ summary: '更新脚本' })
  update(
    @Param('projectId') projectId: string,
    @Param('scriptId') scriptId: string,
    @Body() dto: UpdateScriptDto,
  ) {
    return this.scriptService.update(scriptId, dto, projectId);
  }

  @Delete(':scriptId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除脚本' })
  remove(@Param('projectId') projectId: string, @Param('scriptId') scriptId: string) {
    return this.scriptService.remove(scriptId, projectId);
  }

  @Post(':scriptId/execute')
  @WriteRoles()
  @ApiOperation({ summary: '执行脚本（支持同步/异步、优先级）' })
  execute(
    @Param('projectId') projectId: string,
    @Param('scriptId') scriptId: string,
    @Body() dto?: ExecuteScriptDto,
  ) {
    return this.scriptService.executeScript(scriptId, projectId, dto);
  }

  @Get(':scriptId/executions/:executionId')
  @ReadRoles()
  @ApiOperation({ summary: '获取执行记录详情（异步执行结果查询）' })
  getExecution(
    @Param('projectId') projectId: string,
    @Param('scriptId') _scriptId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.scriptService.getExecution(executionId, projectId);
  }

  @Delete(':scriptId/executions/:executionId')
  @WriteRoles()
  @ApiOperation({ summary: '取消异步执行' })
  cancelExecution(
    @Param('projectId') projectId: string,
    @Param('scriptId') _scriptId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.scriptService.cancelExecution(executionId, projectId);
  }

  @Get(':scriptId/history')
  @ReadRoles()
  @ApiOperation({ summary: '获取脚本执行历史' })
  getHistory(@Param('projectId') projectId: string, @Param('scriptId') scriptId: string) {
    return this.scriptService.getExecutionHistory(scriptId);
  }

  @Get('api/functions')
  @ReadRoles()
  @ApiOperation({ summary: '获取可用的 ScriptAPI 函数列表' })
  getApiFunctions() {
    return this.scriptService.getApiFunctions();
  }

  // ==================== 脚本验证 ====================

  @Post('validate')
  @WriteRoles()
  @ApiOperation({ summary: '验证脚本语法' })
  validate(@Body() dto: ValidateScriptDto) {
    return this.validatorService.validate(dto.code);
  }

  @Post('dry-run')
  @WriteRoles()
  @ApiOperation({ summary: '干运行脚本（不写入DB）' })
  dryRun(@Body() dto: ValidateScriptDto) {
    return this.validatorService.dryRun(dto.code, undefined, dto.allowNetwork, dto.allowFileSystem);
  }

  // ==================== 监控与统计 ====================

  @Get('metrics/overview')
  @ReadRoles()
  @ApiOperation({ summary: '获取脚本执行指标' })
  getMetrics() {
    const queueStats = this.queueService.getStats();
    return this.metricsService.getMetrics(queueStats.queueLength, queueStats.activeJobs);
  }

  // ==================== 执行队列 ====================

  @Get('queue/status')
  @WriteRoles()
  @ApiOperation({ summary: '获取执行队列状态' })
  getQueueStatus() {
    return this.queueService.getStats();
  }

  // ==================== 安全审计 ====================

  @Get('audit/logs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取审计日志' })
  getAuditLogs() {
    return this.auditService.getAuditLogs();
  }

  @Get('audit/permissions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取脚本类型权限' })
  getAuditPermissions() {
    return this.auditService.getAllPermissions();
  }

  @Get('audit/whitelist')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取API白名单配置' })
  getApiWhitelist() {
    return this.auditService.getApiWhitelist();
  }
}
