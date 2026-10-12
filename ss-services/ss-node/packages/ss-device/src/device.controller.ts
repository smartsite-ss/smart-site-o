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
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { DeviceDiagnosticService } from './device-diagnostic.service';
import { DeviceDataService } from './data/device-data.service';
import { DeviceSimulationService } from './simulation/device-simulation.service';
import { DeviceGateway } from './device.gateway';
import { DeviceControlService } from './control/device-control.service';
import { WriteTagDto } from './dto/write-tag.dto';
import { QueryControlLogDto } from './dto/query-control-log.dto';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { QueryDeviceTagsDto } from './dto/query-device-tags.dto';
import { CreateDataTagDto, UpdateDataTagDto } from '@ss-node/ss-datatag';
import { CreateDeviceGroupDto } from './dto/create-device-group.dto';
import { UpdateDeviceGroupDto } from './dto/update-device-group.dto';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';
import { DeviceImportExportService } from './import-export/device-import-export.service';
import type { Response } from 'express';

@ApiTags('设备管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/devices')
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly diagnosticService: DeviceDiagnosticService,
    private readonly deviceDataService: DeviceDataService,
    private readonly simulationService: DeviceSimulationService,
    private readonly deviceGateway: DeviceGateway,
    private readonly importExportService: DeviceImportExportService,
    private readonly controlService: DeviceControlService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '创建设备' })
  create(@Param('projectId') projectId: string, @Body() createDeviceDto: CreateDeviceDto) {
    return this.deviceService.create(createDeviceDto, projectId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取设备列表（支持分页+过滤+搜索）' })
  findAll(
    @Param('projectId') projectId: string,
    @Query() query?: QueryDeviceDto,
    @Req() req?: any,
  ) {
    return this.deviceService.findAll(projectId, query, req?.user?.roleId);
  }

  // ──────────── 设备分组管理 ────────────
  // 注意：精确匹配路由必须放在 :deviceId 通配路由之前，否则会被 :deviceId 拦截

  @Post('groups')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '创建设备分组' })
  createGroup(@Param('projectId') projectId: string, @Body() dto: CreateDeviceGroupDto) {
    return this.deviceService.createGroup(dto, projectId);
  }

  @Get('groups')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取所有设备分组' })
  findAllGroups(@Param('projectId') projectId: string) {
    return this.deviceService.findAllGroups(projectId);
  }

  @Get('groups/tree')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取设备分组树形结构（三级：项目→分组→设备）' })
  getGroupTree(@Param('projectId') projectId: string, @Req() req?: any) {
    return this.deviceService.getGroupTree(projectId, undefined, req?.user?.roleId);
  }

  @Get('groups/:groupId/path')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取分组的完整路径（从根到当前，多级分组）' })
  getGroupPath(@Param('projectId') projectId: string, @Param('groupId') groupId: string) {
    return this.deviceService.getGroupPath(groupId, projectId);
  }

  @Get('groups/:groupId')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取单个设备分组' })
  findOneGroup(@Param('projectId') projectId: string, @Param('groupId') groupId: string) {
    return this.deviceService.findOneGroup(groupId, projectId);
  }

  @Patch('groups/:groupId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '更新设备分组' })
  updateGroup(
    @Param('projectId') projectId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateDeviceGroupDto,
  ) {
    return this.deviceService.updateGroup(groupId, dto, projectId);
  }

  @Delete('groups/:groupId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除设备分组' })
  removeGroup(@Param('projectId') projectId: string, @Param('groupId') groupId: string) {
    return this.deviceService.removeGroup(groupId, projectId);
  }

  // ──────────── 导入导出 ────────────

  @Get('export/csv')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '导出设备为CSV' })
  async exportCsv(
    @Param('projectId') projectId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.importExportService.exportToCsv(projectId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="devices-${projectId}.csv"`);
    return csv;
  }

  @Get('export/json')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '导出设备为JSON' })
  async exportJson(@Param('projectId') projectId: string) {
    const data = await this.importExportService.exportToJson(projectId);
    return { code: 0, data, message: 'ok' };
  }

  @Post('import/csv')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '从CSV导入设备' })
  async importCsv(@Param('projectId') projectId: string, @Body() body: { content: string }) {
    const result = await this.importExportService.importFromCsv(projectId, body.content);
    return { code: 0, data: result, message: result.success ? 'ok' : 'partial' };
  }

  @Post('import/json')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '从JSON导入设备' })
  async importJson(@Param('projectId') projectId: string, @Body() body: { data: any[] }) {
    const result = await this.importExportService.importFromJson(projectId, body.data);
    return { code: 0, data: result, message: result.success ? 'ok' : 'partial' };
  }

  // ──────────── 设备统计（系统概览） ────────────

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取设备统计信息（总数、各状态数量、标签总数）' })
  getDeviceStats(@Param('projectId') projectId: string, @Req() req?: any) {
    return this.deviceService.getDeviceStats(projectId, req?.user?.roleId);
  }

  // ──────────── 设备反控与操作日志 ────────────
  // 注意：精确匹配路由必须放在 :deviceId 通配路由之前

  @Post(':deviceId/tags/:tagId/write')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '反控写入设备标签值（通过协议适配器写入真实设备）' })
  async controlWriteTag(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Param('tagId') tagId: string,
    @Body() dto: WriteTagDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const result = await this.controlService.writeTagValue({
      projectId,
      deviceId,
      tagId,
      value: dto.value,
      reason: dto.reason,
      operatorId: user?.sub || 'unknown',
      operatorName: user?.username || 'unknown',
      ipAddress: req.ip || req.connection?.remoteAddress,
    });
    return result;
  }

  @Get('control-logs')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '查询项目级操作日志（分页，跨设备）' })
  async queryProjectControlLogs(
    @Param('projectId') projectId: string,
    @Query() dto: QueryControlLogDto,
  ) {
    return this.controlService.queryLogs(projectId, undefined, dto);
  }

  @Get(':deviceId/control-logs')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '查询操作日志（分页，单设备）' })
  async queryControlLogs(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Query() dto: QueryControlLogDto,
  ) {
    return this.controlService.queryLogs(projectId, deviceId, dto);
  }

  // ──────────── 设备 CRUD（注意：:deviceId 通配路由必须在精确路由之后） ────────────

  @Get(':deviceId')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取单个设备' })
  findOne(@Param('projectId') projectId: string, @Param('deviceId') deviceId: string) {
    return this.deviceService.findOne(deviceId, projectId);
  }

  @Patch(':deviceId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '更新设备' })
  update(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    return this.deviceService.update(deviceId, updateDeviceDto, projectId);
  }

  @Delete(':deviceId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除设备' })
  remove(@Param('projectId') projectId: string, @Param('deviceId') deviceId: string) {
    return this.deviceService.remove(deviceId, projectId);
  }

  @Post(':deviceId/move')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '移动设备到指定分组（支持多级分组）' })
  moveDevice(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Body() body: { targetGroupId?: string | null },
  ) {
    return this.deviceService.moveDevice(deviceId, body.targetGroupId ?? null, projectId);
  }

  @Get(':deviceId/tags')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取设备下的数据标签列表（管理端与移动端共用入口）' })
  @ApiQuery({ name: 'page', required: false, description: '页码（默认 1）' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数（上限 100）' })
  @ApiQuery({ name: 'keyword', required: false, description: '按标签名称模糊匹配' })
  @ApiQuery({ name: 'dataType', required: false, description: '按数据类型过滤' })
  @ApiQuery({ name: 'enabled', required: false, description: '按启用状态过滤' })
  findTagsByDevice(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Query() query: QueryDeviceTagsDto,
  ) {
    return this.deviceService.findTagsByDevice(projectId, deviceId, query);
  }

  @Post(':deviceId/tags')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '添加数据标签' })
  addTag(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Body() dto: CreateDataTagDto,
  ) {
    dto.deviceId = deviceId;
    dto.projectId = projectId;
    return this.deviceService.addTag(deviceId, dto, projectId);
  }

  @Post(':deviceId/tags/batch')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '批量添加数据标签' })
  addTags(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Body() dtos: CreateDataTagDto[],
  ) {
    for (const dto of dtos) {
      dto.deviceId = deviceId;
      dto.projectId = projectId;
    }
    return this.deviceService.addTags(deviceId, dtos, projectId);
  }

  @Patch(':deviceId/tags/:tagId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '更新数据标签' })
  updateTag(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Param('tagId') tagId: string,
    @Body() dto: UpdateDataTagDto,
  ) {
    return this.deviceService.updateDataTag(tagId, deviceId, dto, projectId);
  }

  @Delete(':deviceId/tags/:tagId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除数据标签' })
  removeTag(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.deviceService.removeTag(tagId, deviceId, projectId);
  }

  // ──────────── 设备诊断 ────────────

  @Post(':deviceId/diagnostic')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '运行设备诊断' })
  runDiagnostic(@Param('projectId') projectId: string, @Param('deviceId') deviceId: string) {
    return this.diagnosticService.runDiagnostic({
      id: deviceId,
      deviceName: deviceId,
      type: 'unknown',
    });
  }

  @Post(':deviceId/ping')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Ping 设备网络连通性' })
  @ApiQuery({ name: 'host', required: true })
  @ApiQuery({ name: 'port', required: false })
  pingDevice(@Query('host') host: string, @Query('port') port?: string) {
    return this.diagnosticService.ping(host, port ? parseInt(port, 10) : undefined);
  }

  // ──────────── 数据访问 ────────────

  @Get(':deviceId/data/latest')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取设备最新值' })
  getLatestValues(@Param('projectId') projectId: string, @Param('deviceId') deviceId: string) {
    return this.deviceDataService.getDeviceLatestValues(deviceId, projectId);
  }

  @Get(':deviceId/data/history')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取设备历史数据' })
  getHistory(
    @Param('deviceId') deviceId: string,
    @Query('tagId') tagId: string,
    @Query('start') start: Date,
    @Query('end') end: Date,
  ) {
    return this.deviceDataService.getTagHistory(tagId, { start, end });
  }

  @Post(':deviceId/data/write')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '写入设备标签值' })
  async writeTagValue(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Body() body: { tagId: string; value: any },
  ) {
    await this.deviceDataService.updateLatestValue(
      body.tagId,
      deviceId,
      body.value,
      'good',
      projectId,
    );
    return { success: true };
  }

  // ──────────── 模板实例化 ────────────

  @Post(':deviceId/templates/:templateId/apply')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '应用模板到设备，实例化标签' })
  applyTemplate(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Param('templateId') templateId: string,
  ) {
    return this.deviceService.applyTemplate(deviceId, templateId, projectId);
  }

  @Post(':deviceId/templates/:templateId/sync')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '同步模板变更到已有标签' })
  syncTemplate(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Param('templateId') templateId: string,
  ) {
    return this.deviceService.syncTemplateTags(deviceId, templateId, projectId);
  }

  @Delete(':deviceId/templates/unbind')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '解绑设备模板，可选删除模板生成的标签' })
  unbindTemplate(
    @Param('projectId') projectId: string,
    @Param('deviceId') deviceId: string,
    @Query('deleteTags') deleteTags?: string,
  ) {
    return this.deviceService.unbindTemplate(deviceId, projectId, deleteTags === 'true');
  }

  // ──────────── 设备仿真 ────────────

  @Post(':deviceId/simulation/start')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '启动设备仿真' })
  startSimulation(
    @Param('deviceId') deviceId: string,
    @Body() config: { mode: string; minValue?: number; maxValue?: number; interval?: number },
  ) {
    this.simulationService.startSimulation(deviceId, {
      enabled: true,
      mode: config.mode as any,
      minValue: config.minValue,
      maxValue: config.maxValue,
      interval: config.interval,
    });
    return { success: true, message: `Simulation started for device ${deviceId}` };
  }

  @Post(':deviceId/simulation/stop')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '停止设备仿真' })
  stopSimulation(@Param('deviceId') deviceId: string) {
    this.simulationService.stopSimulation(deviceId);
    return { success: true, message: `Simulation stopped for device ${deviceId}` };
  }

  @Get(':deviceId/simulation/status')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取仿真状态' })
  getSimulationStatus(@Param('deviceId') deviceId: string) {
    return { simulating: this.simulationService.isSimulating(deviceId) };
  }

  // ──────────── 项目级数据 ────────────

  @Get('/data/snapshot')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '导出项目数据快照' })
  exportSnapshot(@Param('projectId') projectId: string) {
    return this.deviceDataService.exportProjectSnapshot(projectId);
  }

  // ──────────── 设备诊断增强 ────────────

  @Post(':deviceId/diagnostic/read-tag')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '诊断-读取标签值' })
  readTag(
    @Param('deviceId') deviceId: string,
    @Body() body: { tagId: string; address: string; dataType: string },
  ) {
    return this.diagnosticService.readTag({ id: deviceId, type: 'unknown', ...body } as any);
  }

  @Post(':deviceId/diagnostic/write-tag')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '诊断-写入标签值' })
  writeTag(
    @Param('deviceId') deviceId: string,
    @Body() body: { tagId: string; address: string; dataType: string; value: any },
  ) {
    return this.diagnosticService.writeTag({ id: deviceId, type: 'unknown', ...body } as any);
  }

  @Post(':deviceId/diagnostic/scan-addresses')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '诊断-扫描地址' })
  scanAddresses(
    @Param('deviceId') deviceId: string,
    @Body() body: { startAddress?: number; endAddress?: number; dataType?: string },
  ) {
    return this.diagnosticService.scanAddresses(
      null,
      {},
      body.startAddress,
      body.endAddress,
      body.dataType,
    );
  }
}
