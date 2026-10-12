// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DatabaseService } from './database.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';

@ApiTags('数据库运维')
@Controller('system/database')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  // ==================== 数据库状态 ====================

  @Get('status')
  @ApiOperation({ summary: '获取所有数据库运行状态' })
  getStatus() {
    return this.databaseService.getAllDatabasesStatus();
  }

  @Get('status/system')
  @ApiOperation({ summary: '获取系统数据库状态' })
  getSystemStatus() {
    return this.databaseService.getSystemDatabaseStatus();
  }

  @Get('status/projects')
  @ApiOperation({ summary: '获取所有项目数据库状态' })
  getProjectsStatus() {
    return this.databaseService.getProjectDatabasesStatus();
  }

  // ==================== 完整性检查 ====================

  @Post('integrity-check')
  @ApiOperation({ summary: '系统数据库完整性检查' })
  checkSystemIntegrity() {
    return this.databaseService.checkSystemIntegrity();
  }

  @Post('integrity-check/:projectName')
  @ApiOperation({ summary: '项目数据库完整性检查' })
  checkProjectIntegrity(@Param('projectName') projectName: string) {
    return this.databaseService.checkProjectIntegrity(projectName);
  }

  // ==================== 空间回收 ====================

  @Post('vacuum')
  @ApiOperation({ summary: '系统数据库 VACUUM 空间回收' })
  vacuumSystem() {
    return this.databaseService.vacuumSystem();
  }

  @Post('vacuum/:projectName')
  @ApiOperation({ summary: '项目数据库 VACUUM 空间回收' })
  vacuumProject(@Param('projectName') projectName: string) {
    return this.databaseService.vacuumProject(projectName);
  }

  // ==================== 清空表数据 ====================

  @Post('clear-events/:projectName')
  @ApiOperation({ summary: '清空项目告警事件表（alm_alarm_records）' })
  clearProjectEvents(@Param('projectName') projectName: string) {
    return this.databaseService.clearProjectEvents(projectName);
  }

  @Post('clear-logs/:projectName')
  @ApiOperation({ summary: '清空项目日志表（设备状态日志 + 控制操作日志）' })
  clearProjectLogs(@Param('projectName') projectName: string) {
    return this.databaseService.clearProjectLogs(projectName);
  }
}
