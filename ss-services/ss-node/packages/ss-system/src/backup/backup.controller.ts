// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Res,
  UseGuards,
  StreamableFile,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';

@ApiTags('数据备份')
@Controller('system/backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  // ==================== 备份配置 ====================

  @Get('config')
  @ApiOperation({ summary: '获取备份配置（全局+项目）' })
  getBackupConfig() {
    return this.backupService.getBackupConfig();
  }

  @Post('config')
  @ApiOperation({ summary: '保存备份配置（全局+项目）' })
  saveBackupConfig(@Body() config: Record<string, any>) {
    return this.backupService.saveBackupConfig(config);
  }

  @Get('cron-status')
  @ApiOperation({ summary: '获取定时任务状态（全局+项目）' })
  getCronStatus() {
    return this.backupService.getCronJobStatus();
  }

  // ==================== 备份统计 ====================

  @Get('stats')
  @ApiOperation({ summary: '获取备份统计信息' })
  getStats() {
    return this.backupService.getBackupStats();
  }

  // ==================== 备份日志 ====================

  @Get('logs')
  @ApiOperation({ summary: '查询备份日志' })
  getBackupLogs(
    @Query('dbType') dbType?: 'system' | 'project',
    @Query('backupType') backupType?: 'auto' | 'manual',
    @Query('projectName') projectName?: string,
    @Query('status') status?: 'success' | 'failed',
    @Query('limit') limit?: number,
  ) {
    return this.backupService.getBackupLogs({ dbType, backupType, projectName, status, limit });
  }

  // ==================== 备份列表 ====================

  @Get()
  @ApiOperation({ summary: '备份列表（可按 dbType 过滤）' })
  listBackups(@Query('dbType') dbType?: 'system' | 'project') {
    return this.backupService.listBackups(dbType);
  }

  // ==================== 手动备份 ====================

  @Post('system')
  @ApiOperation({ summary: '手动创建系统数据库备份' })
  createSystemBackup() {
    return this.backupService.createSystemBackup('manual', 'admin');
  }

  @Post('project/:projectName')
  @ApiOperation({ summary: '手动创建项目数据库备份' })
  createProjectBackup(@Param('projectName') projectName: string) {
    return this.backupService.createProjectBackup(projectName, 'manual', 'admin');
  }

  @Post('all-projects')
  @ApiOperation({ summary: '备份所有项目数据库' })
  backupAllProjects() {
    return this.backupService.backupAllProjects('manual', 'admin');
  }

  @Post('selected-projects')
  @ApiOperation({ summary: '备份选定的项目数据库列表' })
  backupSelectedProjects(@Body() body: { projectNames: string[] }) {
    return this.backupService.backupSelectedProjects(body.projectNames || [], 'manual', 'admin');
  }

  // ==================== 下载 ====================

  @Get(':filename/download')
  @ApiOperation({ summary: '下载备份文件' })
  downloadBackup(@Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    const filePath = this.backupService.getBackupPath(filename);
    res.set({
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    const fs = require('fs');
    const file = fs.createReadStream(filePath);
    return new StreamableFile(file);
  }

  // ==================== 删除 ====================

  @Delete(':filename')
  @ApiOperation({ summary: '删除备份文件' })
  async deleteBackup(@Param('filename') filename: string) {
    await this.backupService.deleteBackup(filename);
    return { ok: true };
  }

  // ==================== 恢复 ====================

  @Post(':filename/restore')
  @ApiOperation({ summary: '恢复系统数据库备份' })
  async restoreBackup(@Param('filename') filename: string) {
    await this.backupService.restoreBackup(filename);
    return { ok: true, message: '恢复成功，请重启服务以使更改生效' };
  }

  @Post(':filename/restore-project/:projectName')
  @ApiOperation({ summary: '恢复项目数据库备份' })
  async restoreProjectBackup(
    @Param('filename') filename: string,
    @Param('projectName') projectName: string,
  ) {
    await this.backupService.restoreProjectBackup(filename, projectName);
    return { ok: true, message: '项目数据库恢复成功' };
  }

  // ==================== 清理 ====================

  @Delete('cleanup/:dbType/:days')
  @ApiOperation({ summary: '清理过期备份（按类型）' })
  async cleanupExpired(@Param('dbType') dbType: 'system' | 'project', @Param('days') days: string) {
    const count = await this.backupService.cleanupExpired(dbType, parseInt(days, 10) || 30);
    return { ok: true, deleted: count };
  }
}
